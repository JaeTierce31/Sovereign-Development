"use client";
import { useMemo, useState } from "react";

interface CronExplainerProps {
  onClose: () => void;
}

const PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every day at midnight", value: "0 0 * * *" },
  { label: "Every day at noon", value: "0 12 * * *" },
  { label: "Every Sunday at midnight", value: "0 0 * * 0" },
  { label: "Every weekday at 9am", value: "0 9 * * 1-5" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "1st of every month", value: "0 0 1 * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
];

interface ParsedCron {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

function parseCron(expr: string): ParsedCron | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  return { minute: parts[0], hour: parts[1], dayOfMonth: parts[2], month: parts[3], dayOfWeek: parts[4] };
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function describeField(field: string, unit: string, names?: string[], min = 0, max = 59): string {
  if (field === "*") return `every ${unit}`;
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2));
    return `every ${step} ${unit}${step !== 1 ? "s" : ""}`;
  }
  if (field.includes("-")) {
    const [a, b] = field.split("-").map(Number);
    const na = names ? names[a - min] : String(a);
    const nb = names ? names[b - min] : String(b);
    return `${na}–${nb}`;
  }
  if (field.includes(",")) {
    return field.split(",").map((v) => (names ? names[parseInt(v) - min] ?? v : v)).join(", ");
  }
  const n = parseInt(field);
  if (!isNaN(n)) return names ? (names[n - min] ?? String(n)) : String(n);
  return field;
}

function explainCron(parsed: ParsedCron): string {
  const { minute, hour, dayOfMonth, month, dayOfWeek } = parsed;

  const minuteDesc = describeField(minute, "minute", undefined, 0, 59);
  const hourDesc = describeField(hour, "hour", undefined, 0, 23);
  const domDesc = describeField(dayOfMonth, "day", undefined, 1, 31);
  const monthDesc = describeField(month, "month", MONTH_NAMES, 1, 12);
  const dowDesc = describeField(dayOfWeek, "day-of-week", DOW_NAMES, 0, 6);

  const parts: string[] = ["At"];

  if (minute === "*" && hour === "*") {
    parts.push("every minute");
  } else if (minute.startsWith("*/")) {
    parts.push(minuteDesc);
    if (hour !== "*") parts.push(`past ${hourDesc}`);
  } else {
    const m = minute === "*" ? "0" : minute;
    if (hour === "*") {
      parts.push(`minute ${m} of every hour`);
    } else {
      const h = parseInt(hour);
      const ampm = isNaN(h) ? hour : h === 0 ? "12:00 AM" : h < 12 ? `${h}:${m.padStart(2, "0")} AM` : h === 12 ? `12:${m.padStart(2, "0")} PM` : `${h - 12}:${m.padStart(2, "0")} PM`;
      parts.push(ampm);
    }
  }

  if (dayOfMonth !== "*") parts.push(`on the ${domDesc}`);
  if (month !== "*") parts.push(`in ${monthDesc}`);
  if (dayOfWeek !== "*") parts.push(`on ${dowDesc}`);

  return parts.join(" ");
}

function nextRuns(parsed: ParsedCron, count = 5): Date[] {
  const results: Date[] = [];
  const now = new Date();
  now.setSeconds(0, 0);

  function matches(date: Date, p: ParsedCron): boolean {
    const m = date.getMinutes();
    const h = date.getHours();
    const dom = date.getDate();
    const mo = date.getMonth() + 1;
    const dow = date.getDay();

    function matchField(field: string, val: number, min = 0): boolean {
      if (field === "*") return true;
      if (field.startsWith("*/")) return (val - min) % parseInt(field.slice(2)) === 0;
      if (field.includes("-")) {
        const [a, b] = field.split("-").map(Number);
        return val >= a && val <= b;
      }
      if (field.includes(",")) return field.split(",").map(Number).includes(val);
      return parseInt(field) === val;
    }

    return matchField(p.minute, m) && matchField(p.hour, h) && matchField(p.dayOfMonth, dom, 1) &&
      matchField(p.month, mo, 1) && matchField(p.dayOfWeek, dow);
  }

  const cursor = new Date(now.getTime() + 60000);
  let attempts = 0;
  while (results.length < count && attempts < 525600) {
    if (matches(cursor, parsed)) results.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 1);
    attempts++;
  }
  return results;
}

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CronExplainer({ onClose }: CronExplainerProps) {
  const [expr, setExpr] = useState("*/5 * * * *");
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => parseCron(expr), [expr]);
  const explanation = useMemo(() => (parsed ? explainCron(parsed) : null), [parsed]);
  const runs = useMemo(() => (parsed ? nextRuns(parsed) : []), [parsed]);

  const fields = parsed
    ? [
        { label: "Minute", value: parsed.minute, range: "0–59" },
        { label: "Hour", value: parsed.hour, range: "0–23" },
        { label: "Day (month)", value: parsed.dayOfMonth, range: "1–31" },
        { label: "Month", value: parsed.month, range: "1–12" },
        { label: "Day (week)", value: parsed.dayOfWeek, range: "0–6 (Sun=0)" },
      ]
    : [];

  function copy() {
    navigator.clipboard.writeText(expr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const isValid = parsed !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Cron Expression Explainer</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Input */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={expr}
                onChange={(e) => setExpr(e.target.value)}
                className={`flex-1 bg-gray-800 border rounded px-3 py-2 text-sm font-mono text-gray-100 focus:outline-none focus:ring-1 ${
                  isValid ? "border-gray-600 focus:ring-blue-500" : "border-red-700 focus:ring-red-500"
                }`}
                placeholder="* * * * *"
                spellCheck={false}
              />
              <button
                onClick={copy}
                className={`text-xs px-2.5 py-2 rounded transition-colors shrink-0 ${copied ? "bg-green-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            {!isValid && (
              <p className="mt-1 text-[10px] text-red-400">Invalid — must have exactly 5 fields: minute hour day month weekday</p>
            )}
          </div>

          {/* Field breakdown */}
          {isValid && (
            <div className="px-4 pb-3 flex gap-2 flex-wrap">
              {fields.map((f) => (
                <div key={f.label} className="bg-gray-800 rounded px-2.5 py-1.5 flex flex-col items-center min-w-[60px]">
                  <span className="text-xs font-mono text-blue-300 font-bold">{f.value}</span>
                  <span className="text-[9px] text-gray-500 mt-0.5">{f.label}</span>
                  <span className="text-[8px] text-gray-700">{f.range}</span>
                </div>
              ))}
            </div>
          )}

          {/* Explanation */}
          {explanation && (
            <div className="mx-4 mb-3 bg-blue-950/40 border border-blue-800/40 rounded-lg px-4 py-3">
              <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1">Plain English</div>
              <div className="text-sm text-white font-medium">{explanation}</div>
            </div>
          )}

          {/* Next runs */}
          {runs.length > 0 && (
            <div className="px-4 pb-4">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Next 5 runs (local time)</div>
              <div className="space-y-1">
                {runs.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="text-gray-600 w-4 text-right shrink-0">{i + 1}.</span>
                    <span className="text-gray-300 font-mono">{formatDate(d)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Presets */}
          <div className="px-4 pb-4 border-t border-gray-700/50 pt-3">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Common presets</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setExpr(p.value)}
                  className={`text-[10px] px-2 py-1 rounded transition-colors font-mono ${
                    expr === p.value ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                  title={p.value}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div className="px-4 pb-4 border-t border-gray-700/50 pt-3">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick reference</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[10px] font-mono text-gray-500">
              {[
                ["*", "any value"],
                ["*/n", "every n units"],
                ["a-b", "range a to b"],
                ["a,b,c", "specific values"],
                ["0 0 * * *", "daily midnight"],
                ["0 9 * * 1-5", "weekdays 9am"],
              ].map(([ex, desc]) => (
                <div key={ex} className="flex items-baseline gap-2">
                  <span className="text-gray-300 shrink-0">{ex}</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
