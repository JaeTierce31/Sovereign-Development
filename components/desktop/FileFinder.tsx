"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface ProjectFile {
  id: string;
  path: string;
}

interface FileFinderProps {
  files: ProjectFile[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function FileFinder({ files, onSelect, onClose }: FileFinderProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matches = query.trim()
    ? files.filter((f) => f.path.toLowerCase().includes(query.toLowerCase()))
    : files;

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const confirm = useCallback(
    (idx: number) => {
      const file = matches[idx];
      if (file) { onSelect(file.id); onClose(); }
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
            placeholder="Go to file…"
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-gray-500 hover:text-gray-300 text-xs">
              Clear
            </button>
          )}
        </div>

        <div ref={listRef} className="max-h-72 overflow-auto">
          {matches.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-600">No matching files</div>
          ) : (
            matches.map((f, i) => {
              const parts = f.path.split("/");
              const filename = parts.pop() ?? f.path;
              const dir = parts.join("/");
              return (
                <button
                  key={f.id}
                  onClick={() => confirm(i)}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                    i === selected ? "bg-blue-600/20 text-white" : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <span className="text-sm truncate">{filename}</span>
                  {dir && <span className="text-xs text-gray-500 truncate">{dir}</span>}
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-700 flex gap-4 text-xs text-gray-600">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}
