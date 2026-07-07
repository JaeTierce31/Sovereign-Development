"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface ProjectFile {
  id: string;
  path: string;
}

interface FileFinderProps {
  files: ProjectFile[];
  onSelect: (id: string) => void;
  onClose: () => void;
  openTabs?: string[];
}

interface FuzzyMatch {
  file: ProjectFile;
  score: number;
  indices: number[]; // matched char positions in path
  isRecent?: boolean;
}

function fuzzyMatch(path: string, query: string): { score: number; indices: number[] } | null {
  if (!query) return { score: 0, indices: [] };

  const lPath = path.toLowerCase();
  const lQuery = query.toLowerCase();

  let pi = 0; // path index
  const indices: number[] = [];

  for (let qi = 0; qi < lQuery.length; qi++) {
    const ch = lQuery[qi];
    const found = lPath.indexOf(ch, pi);
    if (found === -1) return null;
    indices.push(found);
    pi = found + 1;
  }

  // Score: higher is better
  let score = 0;
  const filename = path.split("/").pop()!.toLowerCase();

  // Bonus: all matches are in the filename part
  const filenameStart = path.length - filename.length;
  const allInFilename = indices.every((i) => i >= filenameStart);
  if (allInFilename) score += 30;

  // Bonus: query matches start of filename
  if (filename.startsWith(lQuery.slice(0, 2))) score += 20;

  // Bonus for consecutive matches
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === indices[i - 1] + 1) score += 8;
  }

  // Bonus for matches at word boundaries (/, -, _, ., uppercase transitions)
  for (const idx of indices) {
    if (idx === 0) { score += 5; continue; }
    const prev = path[idx - 1];
    if (/[\/\-_.]/.test(prev)) score += 5;
    // camelCase boundary
    if (/[a-z]/.test(prev) && /[A-Z]/.test(path[idx])) score += 3;
  }

  // Penalty for distance (spread-out matches rank lower)
  const spread = indices[indices.length - 1] - indices[0];
  score -= spread * 0.1;

  // Penalty for longer paths
  score -= path.length * 0.05;

  return { score, indices };
}

function FuzzyHighlight({ path, indices }: { path: string; indices: number[] }) {
  if (indices.length === 0) return <span>{path}</span>;
  const matched = new Set(indices);
  const parts: React.ReactNode[] = [];

  let buf = "";
  let inMatch = false;

  for (let i = 0; i < path.length; i++) {
    const isM = matched.has(i);
    if (isM !== inMatch) {
      if (buf) {
        parts.push(
          inMatch
            ? <span key={i} className="text-blue-300 font-semibold">{buf}</span>
            : <span key={i}>{buf}</span>
        );
      }
      buf = path[i];
      inMatch = isM;
    } else {
      buf += path[i];
    }
  }
  if (buf) {
    parts.push(
      inMatch
        ? <span key="last-m" className="text-blue-300 font-semibold">{buf}</span>
        : <span key="last">{buf}</span>
    );
  }

  return <>{parts}</>;
}

export default function FileFinder({ files, onSelect, onClose, openTabs = [] }: FileFinderProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matches = useMemo<FuzzyMatch[]>(() => {
    if (!query.trim()) {
      // No query: open tabs first (most-recently activated = last in array → reversed), then all others
      const tabFiles = openTabs
        .slice()
        .reverse()
        .map((id) => files.find((f) => f.id === id))
        .filter((f): f is ProjectFile => !!f)
        .map((f) => ({ file: f, score: 0, indices: [], isRecent: true }));
      const rest = files
        .filter((f) => !openTabs.includes(f.id))
        .map((f) => ({ file: f, score: 0, indices: [], isRecent: false }));
      return [...tabFiles, ...rest];
    }

    const results: FuzzyMatch[] = [];
    for (const f of files) {
      const m = fuzzyMatch(f.path, query.trim());
      if (m) results.push({ file: f, score: m.score, indices: m.indices });
    }
    return results.sort((a, b) => b.score - a.score);
  }, [query, files, openTabs]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const confirm = useCallback(
    (idx: number) => {
      const m = matches[idx];
      if (m) { onSelect(m.file.id); onClose(); }
    },
    [matches, onSelect, onClose]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      confirm(selected);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  useEffect(() => {
    const item = listRef.current?.children[selected] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const firstNonRecentIdx = !query.trim()
    ? matches.findIndex((m) => !m.isRecent)
    : -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gray-900 border border-gray-600 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
          <span className="text-gray-500 text-sm shrink-0">⌘P</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Go to file… (fuzzy)"
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-gray-500 hover:text-gray-300 text-xs">
              Clear
            </button>
          )}
        </div>

        <div ref={listRef} className="max-h-72 overflow-auto">
          {!query.trim() && openTabs.length > 0 && (
            <div className="px-4 pt-2 pb-1">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Open tabs</span>
            </div>
          )}
          {matches.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-600">No matching files</div>
          ) : (
            matches.map((m, i) => {
              const parts = m.file.path.split("/");
              const filename = parts.pop() ?? m.file.path;
              const dir = parts.join("/");
              const showDivider = i === firstNonRecentIdx && firstNonRecentIdx > 0;

              // For fuzzy highlight: compute per-path indices
              const filenameStart = m.file.path.length - filename.length;
              const fileIndices = m.indices
                .filter((idx) => idx >= filenameStart)
                .map((idx) => idx - filenameStart);
              const dirIndices = m.indices.filter((idx) => idx < filenameStart);

              return (
                <div key={m.file.id}>
                  {showDivider && (
                    <div className="px-4 pt-2 pb-1">
                      <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">All files</span>
                    </div>
                  )}
                  <button
                    onClick={() => confirm(i)}
                    onMouseEnter={() => setSelected(i)}
                    className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                      i === selected ? "bg-blue-600/20 text-white" : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <span className="text-sm truncate flex-1 min-w-0">
                      {query ? (
                        <FuzzyHighlight path={filename} indices={fileIndices} />
                      ) : filename}
                    </span>
                    {dir && (
                      <span className="text-xs text-gray-500 truncate shrink-0">
                        {query ? <FuzzyHighlight path={dir} indices={dirIndices} /> : dir}
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-700 flex gap-4 text-xs text-gray-600">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>Esc close</span>
          {query && matches.length > 0 && (
            <span className="ml-auto">{matches.length} match{matches.length !== 1 ? "es" : ""}</span>
          )}
        </div>
      </div>
    </div>
  );
}
