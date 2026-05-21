"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { SearchResult } from "@/app/api/projects/[id]/search/route";

interface GroupedResults {
  path: string;
  fileId: string;
  matches: SearchResult[];
}

export default function GlobalSearch({
  projectId,
  onSelect,
  onClose,
}: {
  projectId: string;
  onSelect: (fileId: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!q.trim() || q.length < 2) { setResults([]); return; }

      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/projects/${projectId}/search?q=${encodeURIComponent(q)}`
          );
          if (res.ok) {
            const data = await res.json();
            setResults(data.results ?? []);
          }
        } finally {
          setLoading(false);
        }
      }, 200);
    },
    [projectId]
  );

  useEffect(() => {
    search(query);
  }, [query, search]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all files…"
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
          />
          {loading && <span className="text-gray-600 text-xs">Searching…</span>}
          {!loading && query.length >= 2 && (
            <span className="text-gray-600 text-xs">{results.length} match{results.length !== 1 ? "es" : ""}</span>
          )}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-auto">
          {grouped.length === 0 && query.length >= 2 && !loading && (
            <div className="px-4 py-8 text-center text-gray-600 text-sm">No matches found</div>
          )}
          {grouped.length === 0 && query.length < 2 && (
            <div className="px-4 py-8 text-center text-gray-600 text-sm">Type at least 2 characters to search</div>
          )}
          {grouped.map((group) => (
            <div key={group.fileId} className="border-b border-gray-800 last:border-0">
              <div className="px-4 py-1.5 text-xs font-medium text-blue-400 bg-gray-800/50 sticky top-0">
                {group.path}
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
