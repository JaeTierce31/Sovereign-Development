"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { SearchResult } from "@/app/api/projects/[id]/search/route";

interface GroupedResults {
  path: string;
  fileId: string;
  matches: SearchResult[];
}

interface ProjectFile {
  id: string;
  path: string;
  content: string | null;
  language: string | null;
}

export default function GlobalSearch({
  projectId,
  files,
  onSelect,
  onClose,
  onFileSave,
}: {
  projectId: string;
  files: ProjectFile[];
  onSelect: (fileId: string) => void;
  onClose: () => void;
  onFileSave?: (fileId: string, content: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regexError, setRegexError] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [replacedCount, setReplacedCount] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (showReplace) setTimeout(() => replaceRef.current?.focus(), 0);
  }, [showReplace]);

  const minLen = useRegex ? 1 : 2;

  const search = useCallback(
    (q: string, regex: boolean, cs: boolean) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setReplacedCount(null);
      setRegexError(false);
      if (!q.trim() || q.length < (regex ? 1 : 2)) { setResults([]); return; }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const url = `/api/projects/${projectId}/search?q=${encodeURIComponent(q)}${regex ? "&regex=1" : ""}${cs ? "&cs=1" : ""}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            setResults(data.results ?? []);
          } else if (res.status === 400) {
            setRegexError(true);
            setResults([]);
          }
        } finally {
          setLoading(false);
        }
      }, 200);
    },
    [projectId]
  );

  useEffect(() => {
    search(query, useRegex, caseSensitive);
  }, [query, useRegex, caseSensitive, search]);

  const grouped: GroupedResults[] = [];
  for (const r of results) {
    const existing = grouped.find((g) => g.fileId === r.fileId);
    if (existing) {
      existing.matches.push(r);
    } else {
      grouped.push({ path: r.path, fileId: r.fileId, matches: [r] });
    }
  }

  function highlight(line: string, start: number, end: number) {
    return (
      <>
        <span className="text-gray-500">{line.slice(0, start)}</span>
        <span className="text-yellow-300 font-medium">{line.slice(start, end)}</span>
        <span className="text-gray-500">{line.slice(end)}</span>
      </>
    );
  }

  function buildReplaceRegex(q: string): RegExp {
    const pattern = useRegex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(pattern, caseSensitive ? "g" : "gi");
  }

  async function replaceInFile(fileId: string, replacement: string): Promise<number> {
    const file = files.find((f) => f.id === fileId);
    if (!file || !file.content) return 0;
    let regex: RegExp;
    try { regex = buildReplaceRegex(query); } catch { return 0; }
    const count = (file.content.match(regex) ?? []).length;
    if (count === 0) return 0;
    const newContent = file.content.replace(regex, replacement);
    await fetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    onFileSave?.(fileId, newContent);
    return count;
  }

  async function handleReplaceAllInFile(fileId: string) {
    if (!query || replaceText === "") return;
    setReplacing(true);
    try {
      const n = await replaceInFile(fileId, replaceText);
      setReplacedCount((prev) => (prev ?? 0) + n);
      setResults((prev) => prev.filter((r) => r.fileId !== fileId));
    } finally {
      setReplacing(false);
    }
  }

  async function handleReplaceAll() {
    if (!query || replaceText === "") return;
    setReplacing(true);
    let total = 0;
    try {
      const fileIds = [...new Set(results.map((r) => r.fileId))];
      for (const fid of fileIds) {
        total += await replaceInFile(fid, replaceText);
      }
      setReplacedCount(total);
      setResults([]);
    } finally {
      setReplacing(false);
    }
  }

  const ToggleBtn = ({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      title={title}
      className={`px-1.5 py-0.5 text-xs rounded font-mono transition-colors shrink-0 ${active ? "bg-blue-600/40 text-blue-300 border border-blue-600/50" : "text-gray-600 hover:text-gray-300 border border-transparent"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search row */}
        <div className={`flex items-center gap-2 px-4 py-3 border-b ${regexError ? "border-red-800" : "border-gray-700"}`}>
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={useRegex ? "Search with regex…" : "Search across all files…"}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none min-w-0"
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
          />
          <ToggleBtn active={caseSensitive} onClick={() => setCaseSensitive((v) => !v)} title="Case sensitive">Aa</ToggleBtn>
          <ToggleBtn active={useRegex} onClick={() => setUseRegex((v) => !v)} title="Use regex">.*</ToggleBtn>
          {loading && <span className="text-gray-600 text-xs shrink-0">Searching…</span>}
          {regexError && <span className="text-red-500 text-xs shrink-0">Bad regex</span>}
          {!loading && !regexError && query.length >= minLen && replacedCount === null && (
            <span className="text-gray-600 text-xs shrink-0">{results.length} match{results.length !== 1 ? "es" : ""}</span>
          )}
          {replacedCount !== null && (
            <span className="text-green-500 text-xs shrink-0">{replacedCount} replaced</span>
          )}
          <button
            onClick={() => setShowReplace((v) => !v)}
            className={`text-xs px-2 py-0.5 rounded transition-colors shrink-0 ${showReplace ? "bg-blue-600/30 text-blue-300" : "text-gray-500 hover:text-gray-300"}`}
            title="Toggle replace"
          >
            Replace
          </button>
        </div>

        {/* Replace row */}
        {showReplace && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700 bg-gray-800/50">
            <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <input
              ref={replaceRef}
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder={useRegex ? "Replace (supports $1 capture groups)…" : "Replace with…"}
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
              onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
            />
            {grouped.length > 0 && (
              <button
                onClick={handleReplaceAll}
                disabled={replacing || !query}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded transition-colors shrink-0"
              >
                {replacing ? "…" : `Replace all (${results.length})`}
              </button>
            )}
          </div>
        )}

        {/* Results */}
        <div className="max-h-96 overflow-auto">
          {grouped.length === 0 && query.length >= minLen && !loading && !regexError && replacedCount === null && (
            <div className="px-4 py-8 text-center text-gray-600 text-sm">No matches found</div>
          )}
          {grouped.length === 0 && query.length >= minLen && !loading && replacedCount !== null && (
            <div className="px-4 py-8 text-center text-green-600 text-sm">
              Replaced {replacedCount} occurrence{replacedCount !== 1 ? "s" : ""}
            </div>
          )}
          {grouped.length === 0 && query.length < minLen && !regexError && (
            <div className="px-4 py-8 text-center text-gray-600 text-sm">
              {useRegex ? "Type a regex pattern to search" : "Type at least 2 characters to search"}
            </div>
          )}
          {regexError && (
            <div className="px-4 py-8 text-center text-red-600 text-sm">Invalid regular expression</div>
          )}
          {grouped.map((group) => (
            <div key={group.fileId} className="border-b border-gray-800 last:border-0">
              <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800/50 sticky top-0">
                <span className="text-xs font-medium text-blue-400">{group.path}</span>
                {showReplace && (
                  <button
                    onClick={() => handleReplaceAllInFile(group.fileId)}
                    disabled={replacing || !query}
                    className="text-xs text-gray-500 hover:text-gray-200 disabled:opacity-40 transition-colors shrink-0 ml-2"
                  >
                    Replace in file ({group.matches.length})
                  </button>
                )}
              </div>
              {group.matches.map((match, i) => (
                <button
                  key={i}
                  onClick={() => { onSelect(match.fileId); onClose(); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="text-gray-600 text-xs w-8 shrink-0 text-right">{match.lineNumber}</span>
                    <span className="text-xs font-mono truncate">
                      {highlight(match.lineText.trimStart(), Math.max(0, match.matchStart - (match.lineText.length - match.lineText.trimStart().length)), match.matchEnd - (match.lineText.length - match.lineText.trimStart().length))}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
