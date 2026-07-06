"use client";
import { useState } from "react";

export interface BookmarkEntry {
  id: string;
  fileId: string;
  filePath: string;
  line: number;
  label: string;
}

export default function BookmarkPanel({
  bookmarks,
  onSelect,
  onRemove,
  onLabelChange,
}: {
  bookmarks: BookmarkEntry[];
  onSelect: (fileId: string, line: number) => void;
  onRemove: (id: string) => void;
  onLabelChange: (id: string, label: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  if (bookmarks.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bookmarks</span>
          <span className="text-[10px] text-gray-600">0 saved</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 text-center">
          <div>
            <p className="text-xs text-gray-600">No bookmarks yet</p>
            <p className="text-[10px] text-gray-700 mt-1">Press Ctrl+Shift+B on any line to add one</p>
          </div>
        </div>
      </div>
    );
  }

  const byFile = bookmarks.reduce<Record<string, BookmarkEntry[]>>((acc, bm) => {
    (acc[bm.filePath] ??= []).push(bm);
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bookmarks</span>
        <span className="text-[10px] text-gray-600">{bookmarks.length} saved</span>
      </div>

      <div className="flex-1 overflow-auto">
        {Object.entries(byFile).map(([filePath, entries]) => {
          const filename = filePath.split("/").pop()!;
          const dir = filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/")) : "";
          return (
            <div key={filePath}>
              <div className="px-2 pt-2 pb-0.5">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  {filename}
                  {dir && <span className="text-gray-700 normal-case font-normal"> — {dir}</span>}
                </span>
              </div>
              {entries.map((bm) => (
                <div
                  key={bm.id}
                  className="group flex items-center gap-1 px-2 py-1 hover:bg-gray-800 transition-colors border-b border-gray-800/40"
                >
                  <button
                    onClick={() => onSelect(bm.fileId, bm.line)}
                    className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                    title={`${filePath}:${bm.line}`}
                  >
                    <span className="text-yellow-500/80 shrink-0 text-[10px]">★</span>
                    {editingId === bm.id ? (
                      <input
                        autoFocus
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onBlur={() => {
                          onLabelChange(bm.id, editVal.trim());
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { onLabelChange(bm.id, editVal.trim()); setEditingId(null); }
                          if (e.key === "Escape") setEditingId(null);
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-gray-700 text-white text-xs px-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-xs text-gray-300 truncate group-hover:text-white flex-1">
                        {bm.label || <span className="text-gray-600 italic">line {bm.line}</span>}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-600 tabular-nums shrink-0 ml-auto">:{bm.line}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(bm.id);
                      setEditVal(bm.label);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-300 text-[10px] px-0.5"
                    title="Edit label"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(bm.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 text-[10px] px-0.5"
                    title="Remove bookmark"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
