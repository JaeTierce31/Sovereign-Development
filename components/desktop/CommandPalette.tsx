"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { ProjectFile } from "@/components/desktop/FileTree";
import type { OutlineSymbol } from "./OutlinePanel";

const KIND_BADGE: Record<OutlineSymbol["kind"], { label: string; className: string }> = {
  class:     { label: "C", className: "text-orange-400" },
  function:  { label: "ƒ", className: "text-blue-400" },
  method:    { label: "m", className: "text-blue-300" },
  variable:  { label: "v", className: "text-gray-400" },
  interface: { label: "I", className: "text-purple-400" },
  type:      { label: "T", className: "text-purple-300" },
  enum:      { label: "E", className: "text-yellow-400" },
  module:    { label: "M", className: "text-green-400" },
  constant:  { label: "K", className: "text-teal-400" },
  property:  { label: "p", className: "text-gray-300" },
};

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  action: () => void;
}

interface CommandPaletteProps {
  files: ProjectFile[];
  onOpenFile: (id: string) => void;
  onClose: () => void;
  commands?: Command[];
  activeFileSymbols?: OutlineSymbol[];
  onGoToLine?: (line: number) => void;
}

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t === q) return 1000;
  if (t.includes(q)) return 500 + (q.length / t.length) * 100;
  let qi = 0;
  let score = 0;
  let lastMatch = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += lastMatch === ti - 1 ? 10 : 1;
      lastMatch = ti;
      qi++;
    }
  }
  return qi === q.length ? score : -1;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Contiguous match — highlight the substring
  const idx = t.indexOf(q);
  if (idx !== -1) {
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-white font-semibold">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  }

  // Scattered fuzzy match — highlight individual chars
  const result: React.ReactNode[] = [];
  let qi = 0;
  for (let i = 0; i < text.length; i++) {
    if (qi < q.length && t[i] === q[qi]) {
      result.push(<span key={i} className="text-white font-semibold">{text[i]}</span>);
      qi++;
    } else {
      result.push(text[i]);
    }
  }
  return <>{result}</>;
}

type ResultItem =
  | { kind: "file"; file: ProjectFile; score: number }
  | { kind: "command"; command: Command; score: number }
  | { kind: "symbol"; symbol: OutlineSymbol; score: number };

export default function CommandPalette({ files, onOpenFile, onClose, commands = [], activeFileSymbols = [], onGoToLine }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isCommand = query.startsWith(">");
  const isSymbol = query.startsWith("@");
  const searchQuery = isCommand ? query.slice(1).trimStart() : isSymbol ? query.slice(1) : query;

  const results: ResultItem[] = (() => {
    if (isSymbol) {
      const q = searchQuery.toLowerCase().trim();
      return activeFileSymbols
        .map((sym) => {
          const score = q ? fuzzyScore(q, sym.name) : 1;
          return { kind: "symbol" as const, symbol: sym, score };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => (b.symbol.line - a.symbol.line === 0 ? b.score - a.score : b.score - a.score));
    }

    if (isCommand) {
      return commands
        .map((c) => {
          const score = searchQuery
            ? fuzzyScore(searchQuery, c.label)
            : 1;
          return { kind: "command" as const, command: c, score };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score);
    }

    if (!searchQuery) {
      // Show recently-modified files when query is empty
      return [...files]
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
        .slice(0, 20)
        .map((f) => ({ kind: "file" as const, file: f, score: 1 }));
    }

    return files
      .map((f) => {
        const filename = f.path.split("/").pop() ?? f.path;
        const filenameScore = fuzzyScore(searchQuery, filename) * 2;
        const pathScore = fuzzyScore(searchQuery, f.path);
        const score = Math.max(filenameScore, pathScore);
        return { kind: "file" as const, file: f, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  })();

  // Reset selection when results change
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const confirm = useCallback((idx: number) => {
    const item = results[idx];
    if (!item) return;
    if (item.kind === "file") {
      onOpenFile(item.file.id);
    } else if (item.kind === "symbol") {
      onGoToLine?.(item.symbol.line);
    } else {
      item.command.action();
    }
    onClose();
  }, [results, onOpenFile, onClose, onGoToLine]);

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        confirm(selectedIdx);
        break;
      case "Escape":
        onClose();
        break;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
          {isCommand ? (
            <span className="text-blue-400 text-sm shrink-0 font-mono">&gt;</span>
          ) : isSymbol ? (
            <span className="text-purple-400 text-sm shrink-0 font-mono">@</span>
          ) : (
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCommand ? "Type a command…" : isSymbol ? "Go to symbol in file…" : "Go to file… (> commands, @ symbols)"}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-gray-600 hover:text-gray-400 text-xs shrink-0"
            >
              ✕
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-auto">
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-600 text-sm">No results</div>
          )}
          {!isCommand && !isSymbol && !query && results.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] text-gray-600 uppercase tracking-wider border-b border-gray-800">
              Recent files
            </div>
          )}
          {isCommand && !searchQuery && results.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] text-gray-600 uppercase tracking-wider border-b border-gray-800">
              Commands
            </div>
          )}
          {isSymbol && !searchQuery && results.length > 0 && (
            <div className="px-3 py-1.5 text-[10px] text-gray-600 uppercase tracking-wider border-b border-gray-800">
              Symbols in file
            </div>
          )}
          {results.map((item, i) => {
            const isSelected = i === selectedIdx;
            if (item.kind === "file") {
              const filename = item.file.path.split("/").pop() ?? item.file.path;
              const dir = item.file.path.includes("/")
                ? item.file.path.substring(0, item.file.path.lastIndexOf("/"))
                : "";
              return (
                <button
                  key={item.file.id}
                  onClick={() => confirm(i)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                    isSelected ? "bg-blue-600/20 border-l-2 border-blue-500" : "border-l-2 border-transparent hover:bg-gray-800"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${isSelected ? "text-blue-200" : "text-gray-300"}`}>
                      {highlightMatch(filename, searchQuery)}
                    </div>
                    {dir && (
                      <div className="text-[11px] text-gray-600 truncate">
                        {highlightMatch(dir, searchQuery)}
                      </div>
                    )}
                  </div>
                </button>
              );
            } else if (item.kind === "symbol") {
              const badge = KIND_BADGE[item.symbol.kind];
              return (
                <button
                  key={`${item.symbol.name}-${item.symbol.line}`}
                  onClick={() => confirm(i)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                    isSelected ? "bg-blue-600/20 border-l-2 border-blue-500" : "border-l-2 border-transparent hover:bg-gray-800"
                  }`}
                  style={{ paddingLeft: `${16 + item.symbol.indent}px` }}
                >
                  <span className={`text-[10px] font-bold w-4 shrink-0 text-right leading-none ${badge.className}`}>
                    {badge.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${isSelected ? "text-blue-200" : "text-gray-300"}`}>
                      {highlightMatch(item.symbol.name, searchQuery)}
                    </div>
                    <div className="text-[11px] text-gray-600">{item.symbol.kind}</div>
                  </div>
                  <span className="text-[10px] text-gray-600 shrink-0 tabular-nums">:{item.symbol.line}</span>
                </button>
              );
            } else {
              return (
                <button
                  key={item.command.id}
                  onClick={() => confirm(i)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                    isSelected ? "bg-blue-600/20 border-l-2 border-blue-500" : "border-l-2 border-transparent hover:bg-gray-800"
                  }`}
                >
                  {item.command.icon && (
                    <span className="text-gray-500 text-sm shrink-0">{item.command.icon}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${isSelected ? "text-blue-200" : "text-gray-300"}`}>
                      {highlightMatch(item.command.label, searchQuery)}
                    </div>
                    {item.command.description && (
                      <div className="text-[11px] text-gray-600">{item.command.description}</div>
                    )}
                  </div>
                </button>
              );
            }
          })}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-800 flex gap-4 text-[10px] text-gray-700">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
          {!isCommand && !isSymbol && <span><kbd className="font-mono">&gt;</kbd> commands</span>}
          {!isCommand && !isSymbol && <span><kbd className="font-mono">@</kbd> symbols</span>}
        </div>
      </div>
    </div>
  );
}
