"use client";
import { useEffect, useState } from "react";

interface HashCalculatorProps {
  onClose: () => void;
}

type Algorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

const ALGORITHMS: Algorithm[] = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

async function computeHash(text: string, algo: Algorithm): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(algo, buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function HashCalculator({ onClose }: HashCalculatorProps) {
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<Partial<Record<Algorithm, string>>>({});
  const [compareVal, setCompareVal] = useState("");
  const [compareAlgo, setCompareAlgo] = useState<Algorithm>("SHA-256");
  const [compareResult, setCompareResult] = useState<boolean | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [uppercase, setUppercase] = useState(false);

  // Recompute all hashes whenever input changes
  useEffect(() => {
    if (!input) { setHashes({}); return; }
    let cancelled = false;
    Promise.all(
      ALGORITHMS.map(async (algo) => {
        const h = await computeHash(input, algo);
        return [algo, h] as [Algorithm, string];
      })
    ).then((results) => {
      if (!cancelled) setHashes(Object.fromEntries(results));
    });
    return () => { cancelled = true; };
  }, [input]);

  // Recompute compare result
  useEffect(() => {
    if (!input || !compareVal.trim()) { setCompareResult(null); return; }
    const h = hashes[compareAlgo];
    if (!h) { setCompareResult(null); return; }
    const target = compareVal.trim().toLowerCase();
    setCompareResult(h === target || compareVal.trim() === input);
  }, [hashes, compareVal, compareAlgo, input]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function display(h: string): string {
    return uppercase ? h.toUpperCase() : h;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Hash Calculator</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
                className="w-3 h-3 accent-blue-500"
              />
              <span className="text-[10px] text-gray-400">Uppercase</span>
            </label>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Input Text</span>
              <span className="text-[10px] text-gray-600">{input.length} chars</span>
            </div>
            <textarea
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or paste text to hash…"
              className="w-full h-24 resize-none bg-gray-800 border border-gray-600 rounded px-3 py-2 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-700"
              spellCheck={false}
            />
          </div>

          {/* Hash outputs */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Hashes</div>
            <div className="space-y-2">
              {ALGORITHMS.map((algo) => {
                const h = hashes[algo];
                const key = `hash-${algo}`;
                return (
                  <div key={algo} className="group">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-gray-500 font-mono">{algo}</span>
                      {h && (
                        <button
                          onClick={() => copy(display(h), key)}
                          className={`text-[9px] px-1.5 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                            copied === key ? "bg-green-700 text-white opacity-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                          }`}
                        >
                          {copied === key ? "✓" : "copy"}
                        </button>
                      )}
                    </div>
                    <div
                      className={`text-[11px] font-mono px-2.5 py-1.5 rounded bg-gray-800/70 border ${
                        h ? "border-gray-700/50 text-blue-300" : "border-gray-800 text-gray-700"
                      } break-all leading-relaxed select-all`}
                    >
                      {h ? display(h) : input ? "computing…" : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compare */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Verify / Compare</div>
            <div className="flex items-center gap-2 mb-2">
              {ALGORITHMS.map((algo) => (
                <button
                  key={algo}
                  onClick={() => setCompareAlgo(algo)}
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors font-mono ${
                    compareAlgo === algo ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                  }`}
                >
                  {algo}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={compareVal}
                onChange={(e) => setCompareVal(e.target.value)}
                placeholder={`Paste a ${compareAlgo} hash to verify…`}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-xs font-mono text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-700"
                spellCheck={false}
              />
              {compareResult !== null && (
                <span className={`text-xs font-semibold shrink-0 ${compareResult ? "text-green-400" : "text-red-400"}`}>
                  {compareResult ? "✓ Match" : "✗ No match"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
