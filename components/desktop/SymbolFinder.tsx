"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { parseSymbols, type OutlineSymbol } from "./OutlinePanel";

const KIND_ICON: Record<OutlineSymbol["kind"], { icon: string; color: string }> = {
  class:     { icon: "C", color: "text-orange-400" },
  function:  { icon: "ƒ", color: "text-blue-400" },
  method:    { icon: "m", color: "text-blue-300" },
  variable:  { icon: "v", color: "text-gray-400" },
  interface: { icon: "I", color: "text-purple-400" },
  type:      { icon: "T", color: "text-purple-300" },
  enum:      { icon: "E", color: "text-yellow-400" },
  module:    { icon: "M", color: "text-green-400" },
  constant:  { icon: "K", color: "text-teal-400" },
  property:  { icon: "p", color: "text-gray-300" },
};

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const lq = query.toLowerCase();
  const idx = lower.indexOf(lq);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-blue-300 font-semibold">{text.slice(idx, idx + lq.length)}</span>
      {text.slice(idx + lq.length)}
    </>
  );
}

export default function SymbolFinder({
  content,
  language,
  filePath,
  onGoToLine,
  onClose,
}: {
  content: string;
  language: string | null;
  filePath: string;
  onGoToLine: (line: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const symbols = useMemo(() => parseSymbols(content, language), [content, language]);

  const filtered = useMemo<OutlineSymbol[]>(() => {
    if (!query.trim()) return symbols;
    const lq = query.trim().toLowerCase();
    return symbols.filter((s) => s.name.toLowerCase().includes(lq));
  }, [symbols, query]);

  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    const item = listRef.current?.children[selected] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  function confirm(idx: number) {
    const sym = filtered[idx];
    if (sym) { onGoToLine(sym.line); onClose(); }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      confirm(selected);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  const filename = filePath.split("/").pop() ?? filePath;

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
          <span className="text-gray-500 text-sm shrink-0">@</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Go to symbol in ${filename}…`}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-gray-500 hover:text-gray-300 text-xs">
              Clear
            </button>
          )}
        </div>

        <div ref={listRef} className="max-h-72 overflow-auto">
          {symbols.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-600">
              No symbols found in this file
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-600">
              No matching symbols
            </div>
          ) : (
            filtered.map((sym, i) => {
              const { icon, color } = KIND_ICON[sym.kind];
              return (
                <button
                  key={`${sym.name}-${sym.line}`}
                  onClick={() => confirm(i)}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full text-left px-4 py-1.5 flex items-center gap-3 transition-colors ${
                    i === selected ? "bg-blue-600/20 text-white" : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <span
                    className={`w-4 text-center text-xs font-bold shrink-0 font-mono ${color}`}
                    title={sym.kind}
                  >
                    {icon}
                  </span>
                  <span className="text-sm flex-1 truncate font-mono">
                    {highlightMatch(sym.name, query.trim())}
                  </span>
                  <span className="text-xs text-gray-600 shrink-0 tabular-nums">
                    :{sym.line}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-700 flex gap-4 text-xs text-gray-600">
          <span>↑↓ navigate</span>
          <span>↵ jump</span>
          <span>Esc close</span>
          {filtered.length > 0 && (
            <span className="ml-auto">{filtered.length} symbol{filtered.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </div>
  );
}
