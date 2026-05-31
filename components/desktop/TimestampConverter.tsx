"use client";
import { useMemo, useState } from "react";

interface TimestampConverterProps {
  onClose: () => void;
}

type Unit = "s" | "ms" | "μs" | "ns";

const UNIT_LABEL: Record<Unit, string> = { s: "seconds", ms: "milliseconds", μs: "microseconds", ns: "nanoseconds" };
const UNIT_DIVISOR: Record<Unit, number> = { s: 1, ms: 1e3, μs: 1e6, ns: 1e9 };

function parseTimestamp(raw: string, unit: Unit): Date | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n)) return null;
  const ms = (n / UNIT_DIVISOR[unit]) * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d;
}

function formatIso(d: Date): string { return d.toISOString(); }
function formatUtc(d: Date): string { return d.toUTCString(); }
function formatLocal(d: Date): string {
  return d.toLocaleString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" });
}
function formatRelative(d: Date): string {
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const past = diff < 0;
  if (abs < 60_000) return past ? "just now" : "in a few seconds";
  if (abs < 3_600_000) { const m = Math.round(abs / 60_000); return past ? `${m} minute${m !== 1 ? "s" : ""} ago` : `in ${m} minute${m !== 1 ? "s" : ""}`; }
  if (abs < 86_400_000) { const h = Math.round(abs / 3_600_000); return past ? `${h} hour${h !== 1 ? "s" : ""} ago` : `in ${h} hour${h !== 1 ? "s" : ""}`; }
  const days = Math.round(abs / 86_400_000);
  return past ? `${days} day${days !== 1 ? "s" : ""} ago` : `in ${days} day${days !== 1 ? "s" : ""}`;
}

function toUnit(d: Date, unit: Unit): string {
  const ms = d.getTime();
  const val = ms * (UNIT_DIVISOR[unit] / 1000);
  return unit === "s" ? Math.floor(val).toString() : Math.floor(val).toString();
}

function dateToInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function TimestampConverter({ onClose }: TimestampConverterProps) {
  const [mode, setMode] = useState<"epoch-to-date" | "date-to-epoch">("epoch-to-date");
  const [raw, setRaw] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [unit, setUnit] = useState<Unit>("s");
  const [dateInput, setDateInput] = useState(() => dateToInputValue(new Date()));
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const parsedDate = useMemo(() => {
    if (mode === "epoch-to-date") return parseTimestamp(raw, unit);
    try { return new Date(dateInput); } catch { return null; }
  }, [mode, raw, unit, dateInput]);

  const epochOutputs = useMemo(() => {
    if (!parsedDate || isNaN(parsedDate.getTime())) return null;
    return {
      s: toUnit(parsedDate, "s"),
      ms: toUnit(parsedDate, "ms"),
      μs: toUnit(parsedDate, "μs"),
      ns: toUnit(parsedDate, "ns"),
    };
  }, [parsedDate]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  }

  function setNow() {
    const now = Date.now();
    if (mode === "epoch-to-date") {
      setRaw(String(Math.floor(now * (UNIT_DIVISOR[unit] / 1000))));
    } else {
      setDateInput(dateToInputValue(new Date(now)));
    }
  }

  const isValid = parsedDate !== null && !isNaN(parsedDate.getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Timestamp Converter</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Mode selector */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-3">
            {(["epoch-to-date", "date-to-epoch"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  mode === m ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {m === "epoch-to-date" ? "Epoch → Date" : "Date → Epoch"}
              </button>
            ))}
            <button
              onClick={setNow}
              className="ml-auto text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300 transition-colors"
            >
              Use Now
            </button>
          </div>

          {/* Input */}
          <div className="px-4 pb-4">
            {mode === "epoch-to-date" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    className={`flex-1 bg-gray-800 border rounded px-3 py-2 text-sm font-mono text-gray-100 focus:outline-none focus:ring-1 ${
                      isValid || !raw.trim() ? "border-gray-600 focus:ring-blue-500" : "border-red-700 focus:ring-red-500"
                    }`}
                    placeholder="1748649600"
                    spellCheck={false}
                  />
                </div>
                {/* Unit picker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-600">Unit:</span>
                  {(["s", "ms", "μs", "ns"] as Unit[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      className={`text-[10px] px-2 py-0.5 rounded transition-colors font-mono ${
                        unit === u ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                  <span className="text-[10px] text-gray-700 ml-1">({UNIT_LABEL[unit]})</span>
                </div>
                {raw.trim() && !isValid && (
                  <p className="text-[10px] text-red-400">Invalid timestamp</p>
                )}
              </div>
            ) : (
              <input
                autoFocus
                type="datetime-local"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
          </div>

          {/* Results */}
          {isValid && parsedDate && (
            <div className="px-4 pb-4 space-y-3">
              {/* Date representations */}
              {mode === "epoch-to-date" && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Date &amp; Time</div>
                  <div className="space-y-1.5">
                    {[
                      { key: "iso", label: "ISO 8601", value: formatIso(parsedDate) },
                      { key: "utc", label: "UTC", value: formatUtc(parsedDate) },
                      { key: "local", label: "Local", value: formatLocal(parsedDate) },
                      { key: "relative", label: "Relative", value: formatRelative(parsedDate) },
                    ].map(({ key, label, value }) => (
                      <div key={key} className="flex items-start gap-2 group">
                        <span className="text-[10px] text-gray-600 w-14 shrink-0 pt-0.5">{label}</span>
                        <span className="text-xs text-gray-300 font-mono flex-1 break-all">{value}</span>
                        <button
                          onClick={() => copy(value, key)}
                          className={`text-[9px] shrink-0 px-1.5 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                            copiedKey === key ? "bg-green-700 text-white opacity-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                          }`}
                        >
                          {copiedKey === key ? "✓" : "copy"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Epoch values */}
              {epochOutputs && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {mode === "date-to-epoch" ? "Epoch Values" : "Other Units"}
                  </div>
                  <div className="space-y-1.5">
                    {(["s", "ms", "μs", "ns"] as Unit[]).map((u) => (
                      <div key={u} className="flex items-center gap-2 group">
                        <span className="text-[10px] text-gray-600 w-14 shrink-0">{u} ({UNIT_LABEL[u].slice(0, 2)}…)</span>
                        <span className="text-xs text-blue-300 font-mono flex-1 truncate">{epochOutputs[u]}</span>
                        <button
                          onClick={() => copy(epochOutputs[u], `epoch-${u}`)}
                          className={`text-[9px] shrink-0 px-1.5 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                            copiedKey === `epoch-${u}` ? "bg-green-700 text-white opacity-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                          }`}
                        >
                          {copiedKey === `epoch-${u}` ? "✓" : "copy"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Date breakdown */}
              {mode === "epoch-to-date" && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">UTC Breakdown</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Year", value: parsedDate.getUTCFullYear() },
                      { label: "Month", value: parsedDate.getUTCMonth() + 1 },
                      { label: "Day", value: parsedDate.getUTCDate() },
                      { label: "Hour", value: parsedDate.getUTCHours() },
                      { label: "Minute", value: parsedDate.getUTCMinutes() },
                      { label: "Second", value: parsedDate.getUTCSeconds() },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-800 rounded px-2 py-1.5 flex flex-col items-center">
                        <span className="text-sm font-mono text-gray-200 font-semibold">{value}</span>
                        <span className="text-[9px] text-gray-600 mt-0.5">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
