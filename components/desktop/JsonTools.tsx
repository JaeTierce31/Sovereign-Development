"use client";
import { useMemo, useState } from "react";

type Indent = 2 | 4;

interface JsonToolsProps {
  initialContent?: string | null;
  onClose: () => void;
}

function tryParse(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try { return { ok: true, value: JSON.parse(text) }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export default function JsonTools({ initialContent, onClose }: JsonToolsProps) {
  const [input, setInput] = useState(() => initialContent?.trim() ?? "");
  const [indent, setIndent] = useState<Indent>(2);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"format" | "minify" | "sort">("format");

  const parsed = useMemo(() => tryParse(input), [input]);

  const output = useMemo(() => {
    if (!parsed.ok || !input.trim()) return null;
    try {
      const val = mode === "sort" ? sortKeys(parsed.value) : parsed.value;
      if (mode === "minify") return JSON.stringify(val);
      return JSON.stringify(val, null, indent);
    } catch { return null; }
  }, [parsed, input, mode, indent]);

  function copy() {
    const text = output ?? input;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function applyOutput() {
    if (output) setInput(output);
  }

  const lineCount = input.trim() ? input.split("\n").length : 0;
  const outputLineCount = output ? output.split("\n").length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">JSON Tools</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        {/* Mode + indent */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700 shrink-0 flex-wrap">
          {(["format", "minify", "sort"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-xs px-2.5 py-1 rounded transition-colors capitalize ${
                mode === m ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {m === "sort" ? "Sort Keys" : m === "minify" ? "Minify" : "Format"}
            </button>
          ))}
          {mode === "format" && (
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[10px] text-gray-500">Indent:</span>
              {([2, 4] as Indent[]).map((n) => (
                <button
                  key={n}
                  onClick={() => setIndent(n)}
                  className={`text-[10px] w-6 h-5 rounded transition-colors ${indent === n ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {output && (
              <button
                onClick={applyOutput}
                className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
                title="Replace input with output"
              >
                ← Apply
              </button>
            )}
            <button
              onClick={copy}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${copied ? "bg-green-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0 gap-0">
          {/* Input */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-700">
            <div className="px-3 py-1.5 border-b border-gray-700/50 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Input</span>
              <span className="text-[10px] text-gray-600">{lineCount} lines</span>
            </div>
            <textarea
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={'{\n  "paste": "your JSON here"\n}'}
              className="flex-1 resize-none bg-transparent px-3 py-2 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none placeholder-gray-700"
              spellCheck={false}
            />
            {input.trim() && !parsed.ok && (
              <div className="px-3 py-2 border-t border-red-900/40 bg-red-900/10 text-[10px] text-red-400 font-mono shrink-0">
                ✖ {parsed.error}
              </div>
            )}
          </div>

          {/* Output */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-3 py-1.5 border-b border-gray-700/50 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Output</span>
              {output && <span className="text-[10px] text-gray-600">{outputLineCount} lines</span>}
            </div>
            {output ? (
              <pre className="flex-1 overflow-auto px-3 py-2 text-xs text-green-300 font-mono leading-relaxed whitespace-pre-wrap bg-gray-950/40">
                {output}
              </pre>
            ) : (
              <div className="flex-1 flex items-center justify-center px-4 text-center">
                <p className="text-[10px] text-gray-600">
                  {input.trim()
                    ? parsed.ok ? "Processing…" : "Fix the JSON error to see output"
                    : "Paste JSON on the left to get started"}
                </p>
              </div>
            )}
            {output && parsed.ok && (
              <div className="px-3 py-1.5 border-t border-gray-700/50 shrink-0 text-[10px] text-green-600">
                ✓ Valid JSON
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
