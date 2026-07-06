"use client";
import { useMemo, useState } from "react";

interface StringInspectorProps {
  onClose: () => void;
}

// ── Transforms ────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s]+/g, "-");
}

function camelCase(s: string): string {
  return s
    .trim()
    .replace(/[-_\s]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c: string) => c.toLowerCase());
}

function pascalCase(s: string): string {
  const cc = camelCase(s);
  return cc.charAt(0).toUpperCase() + cc.slice(1);
}

function snakeCase(s: string): string {
  return s
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
}

function countBytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

interface Stats {
  chars: number;
  bytes: number;
  words: number;
  lines: number;
  sentences: number;
  paragraphs: number;
  uniqueChars: number;
  avgWordLen: number;
  longestWord: string;
}

function analyse(s: string): Stats {
  const chars = s.length;
  const bytes = countBytes(s);
  const words = s.trim() ? s.trim().split(/\s+/).length : 0;
  const lines = s ? s.split("\n").length : 0;
  const sentences = s.trim() ? (s.match(/[.!?]+/g) ?? []).length : 0;
  const paragraphs = s.trim() ? s.split(/\n\s*\n/).filter(Boolean).length : 0;
  const uniqueChars = new Set(s).size;
  const wordList = s.trim() ? s.trim().split(/\s+/) : [];
  const totalWordLen = wordList.reduce((acc, w) => acc + w.length, 0);
  const avgWordLen = words > 0 ? totalWordLen / words : 0;
  const longestWord = wordList.reduce((a, b) => (b.length > a.length ? b : a), "");
  return { chars, bytes, words, lines, sentences, paragraphs, uniqueChars, avgWordLen, longestWord };
}

interface FreqEntry { char: string; count: number; pct: number }

function charFrequency(s: string, topN = 20): FreqEntry[] {
  const map = new Map<string, number>();
  for (const c of s) map.set(c, (map.get(c) ?? 0) + 1);
  const total = s.length || 1;
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([char, count]) => ({ char, count, pct: (count / total) * 100 }));
}

type TransformKey = "trim" | "upper" | "lower" | "title" | "reverse" | "slug" | "camel" | "pascal" | "snake" | "noSpaces" | "noNewlines" | "escape" | "unescape";

const TRANSFORMS: { key: TransformKey; label: string; fn: (s: string) => string }[] = [
  { key: "trim",       label: "Trim",          fn: (s) => s.trim() },
  { key: "upper",      label: "UPPERCASE",      fn: (s) => s.toUpperCase() },
  { key: "lower",      label: "lowercase",      fn: (s) => s.toLowerCase() },
  { key: "title",      label: "Title Case",     fn: (s) => s.replace(/\b\w/g, (c) => c.toUpperCase()) },
  { key: "reverse",    label: "esreveR",        fn: (s) => [...s].reverse().join("") },
  { key: "slug",       label: "slug-case",      fn: slugify },
  { key: "camel",      label: "camelCase",      fn: camelCase },
  { key: "pascal",     label: "PascalCase",     fn: pascalCase },
  { key: "snake",      label: "snake_case",     fn: snakeCase },
  { key: "noSpaces",   label: "No spaces",      fn: (s) => s.replace(/\s/g, "") },
  { key: "noNewlines", label: "No newlines",    fn: (s) => s.replace(/\n/g, " ") },
  { key: "escape",     label: "JS escape",      fn: (s) => JSON.stringify(s).slice(1, -1) },
  { key: "unescape",   label: "JS unescape",    fn: (s) => { try { return JSON.parse(`"${s}"`); } catch { return s; } } },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function StringInspector({ onClose }: StringInspectorProps) {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showFreq, setShowFreq] = useState(false);

  const stats = useMemo(() => analyse(input), [input]);
  const freq  = useMemo(() => (showFreq ? charFrequency(input) : []), [input, showFreq]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const statRows: [string, string][] = [
    ["Characters",    stats.chars.toLocaleString()],
    ["Bytes (UTF-8)", stats.bytes.toLocaleString()],
    ["Words",         stats.words.toLocaleString()],
    ["Lines",         stats.lines.toLocaleString()],
    ["Sentences",     stats.sentences.toLocaleString()],
    ["Paragraphs",    stats.paragraphs.toLocaleString()],
    ["Unique chars",  stats.uniqueChars.toLocaleString()],
    ["Avg word len",  stats.avgWordLen.toFixed(1)],
    ["Longest word",  stats.longestWord || "—"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">String Inspector</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Input</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-600">{stats.chars.toLocaleString()} chars</span>
                {input && (
                  <button
                    onClick={() => copy(input, "input")}
                    className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${copied === "input" ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                  >
                    {copied === "input" ? "✓" : "copy"}
                  </button>
                )}
              </div>
            </div>
            <textarea
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste or type any string…"
              rows={4}
              className="w-full resize-none bg-gray-800 border border-gray-600 rounded px-3 py-2 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-700"
              spellCheck={false}
            />
          </div>

          {/* Stats grid */}
          {input && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Statistics</div>
              <div className="grid grid-cols-3 gap-px bg-gray-700/30 border border-gray-700/30 rounded-lg overflow-hidden">
                {statRows.map(([label, value]) => (
                  <div key={label} className="bg-gray-800/50 px-3 py-2">
                    <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
                    <div className="text-sm font-mono text-gray-200 truncate" title={value}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transforms */}
          {input && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Transforms</div>
              <div className="space-y-1">
                {TRANSFORMS.map(({ key, label, fn }) => {
                  let result = "";
                  try { result = fn(input); } catch { result = ""; }
                  const changed = result !== input;
                  return (
                    <div key={key} className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/40 border border-gray-700/20 hover:border-gray-600/40 transition-colors">
                      <span className="text-[10px] text-gray-500 w-24 shrink-0 font-mono">{label}</span>
                      <span className={`text-xs font-mono flex-1 truncate ${changed ? "text-gray-300" : "text-gray-600"}`}>
                        {result || "—"}
                      </span>
                      {changed && (
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copy(result, key)}
                            className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${copied === key ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                          >
                            {copied === key ? "✓" : "copy"}
                          </button>
                          <button
                            onClick={() => setInput(result)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-blue-800/60 text-blue-300 hover:bg-blue-700 transition-colors"
                          >
                            use
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Character frequency */}
          {input && (
            <div>
              <button
                onClick={() => setShowFreq((v) => !v)}
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showFreq ? "▾" : "▸"} Character frequency (top 20)
              </button>
              {showFreq && freq.length > 0 && (
                <div className="mt-2 space-y-1">
                  {freq.map(({ char, count, pct }) => {
                    const display = char === " " ? "·" : char === "\n" ? "↵" : char === "\t" ? "→" : char;
                    return (
                      <div key={char} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-blue-300 w-6 text-center shrink-0">{display}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 w-8 text-right shrink-0">{count}</span>
                        <span className="text-[10px] text-gray-600 w-10 text-right shrink-0">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
