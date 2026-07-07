"use client";
import { useMemo, useState } from "react";

interface Match {
  index: number;
  end: number;
  full: string;
  groups: string[];
}

function buildRegex(pattern: string, flags: string): RegExp | null {
  try { return new RegExp(pattern, flags); } catch { return null; }
}

function getMatches(re: RegExp, text: string): Match[] {
  const results: Match[] = [];
  if (!re.global) {
    const m = re.exec(text);
    if (m) results.push({ index: m.index, end: m.index + m[0].length, full: m[0], groups: m.slice(1).map((g) => g ?? "") });
    return results;
  }
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    results.push({ index: m.index, end: m.index + m[0].length, full: m[0], groups: m.slice(1).map((g) => g ?? "") });
    if (m[0].length === 0) re.lastIndex++;
  }
  return results;
}

function highlightMatches(text: string, matches: Match[]): React.ReactNode[] {
  if (matches.length === 0) return [<span key="all">{text}</span>];
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.index > cursor) parts.push(<span key={`pre-${i}`}>{text.slice(cursor, m.index)}</span>);
    parts.push(
      <mark key={`match-${i}`} className="bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5">
        {text.slice(m.index, m.end)}
      </mark>
    );
    cursor = m.end;
  });
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
  return parts;
}

export default function RegexTester({ onClose }: { onClose: () => void }) {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [testText, setTestText] = useState("The quick brown fox\njumps over the lazy dog.");
  const [replacement, setReplacement] = useState("");
  const [showReplace, setShowReplace] = useState(false);

  const flagList: { flag: string; title: string }[] = [
    { flag: "g", title: "global — find all matches" },
    { flag: "i", title: "case insensitive" },
    { flag: "m", title: "multiline — ^ and $ match line boundaries" },
  ];

  function toggleFlag(f: string) {
    setFlags((prev) => prev.includes(f) ? prev.replace(f, "") : prev + f);
  }

  const re = useMemo(() => pattern ? buildRegex(pattern, flags) : null, [pattern, flags]);
  const isInvalid = pattern.length > 0 && re === null;
  const matches = useMemo(() => re && testText ? getMatches(re, testText) : [], [re, testText]);

  const replaceResult = useMemo(() => {
    if (!re || !showReplace) return null;
    try { return testText.replace(re, replacement); } catch { return null; }
  }, [re, testText, replacement, showReplace]);

  const hasGroups = matches.some((m) => m.groups.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Regex Tester</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto flex flex-col gap-4 p-4">
          {/* Pattern input */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Pattern</label>
            <div className={`flex items-center bg-gray-950 border rounded-lg overflow-hidden ${isInvalid ? "border-red-600" : "border-gray-700 focus-within:border-blue-500"}`}>
              <span className="px-3 text-gray-500 text-sm select-none">/</span>
              <input
                autoFocus
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="([a-z]+)\s+(\w+)"
                className="flex-1 bg-transparent py-2 text-sm text-gray-100 font-mono placeholder-gray-700 focus:outline-none"
              />
              <span className="px-3 text-gray-500 text-sm select-none">/</span>
              <span className="pr-3 text-blue-400 text-sm font-mono">{flags}</span>
            </div>
            {isInvalid && <p className="text-[10px] text-red-400 mt-1">Invalid regular expression</p>}

            {/* Flags */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-gray-600">Flags:</span>
              {flagList.map(({ flag, title }) => (
                <button
                  key={flag}
                  onClick={() => toggleFlag(flag)}
                  title={title}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${flags.includes(flag) ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                >
                  {flag}
                </button>
              ))}
              <div className="ml-auto">
                {matches.length > 0 ? (
                  <span className="text-[10px] text-green-400 font-semibold">{matches.length} match{matches.length !== 1 ? "es" : ""}</span>
                ) : pattern && re ? (
                  <span className="text-[10px] text-gray-600">No matches</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Test string */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Test String</label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={4}
              className="w-full bg-gray-950 border border-gray-700 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono placeholder-gray-700 resize-y focus:outline-none"
              placeholder="Paste text to test against…"
            />
          </div>

          {/* Match preview */}
          {re && testText && (
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Match Preview</label>
              <div className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-300 whitespace-pre-wrap leading-relaxed min-h-[3rem]">
                {highlightMatches(testText, matches)}
              </div>
            </div>
          )}

          {/* Match groups */}
          {hasGroups && (
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Capture Groups</label>
              <div className="space-y-1">
                {matches.map((m, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-xs">
                    <span className="text-gray-500 w-20 shrink-0">Match {i + 1}</span>
                    <span className="font-mono text-yellow-300 flex-1 truncate">{JSON.stringify(m.full)}</span>
                    {m.groups.map((g, j) => (
                      <span key={j} className="font-mono text-blue-300 bg-blue-900/20 px-1 rounded shrink-0">
                        ${j + 1}: {JSON.stringify(g)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Replace */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Replace</label>
              <button
                onClick={() => setShowReplace((v) => !v)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${showReplace ? "bg-blue-600/30 text-blue-400" : "bg-gray-800 text-gray-500 hover:bg-gray-700"}`}
              >
                {showReplace ? "Hide" : "Show"}
              </button>
            </div>
            {showReplace && (
              <>
                <input
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  placeholder="Replacement string ($1, $2… for groups)"
                  className="w-full bg-gray-950 border border-gray-700 focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono placeholder-gray-700 focus:outline-none mb-2"
                />
                {replaceResult !== null && (
                  <div className="bg-gray-950 border border-green-900/50 rounded-lg px-3 py-2 text-sm font-mono text-green-300 whitespace-pre-wrap leading-relaxed">
                    {replaceResult}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
