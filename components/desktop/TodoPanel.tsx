"use client";
import { useMemo, useState } from "react";

const TODO_RE = /\b(TODO|FIXME|HACK|NOTE|XXX)\b[:\s]*(.*)/i;

const TAG_STYLES: Record<string, { bg: string; text: string }> = {
  TODO:  { bg: "bg-blue-900/50",   text: "text-blue-400" },
  FIXME: { bg: "bg-red-900/50",    text: "text-red-400" },
  HACK:  { bg: "bg-orange-900/50", text: "text-orange-400" },
  NOTE:  { bg: "bg-green-900/50",  text: "text-green-400" },
  XXX:   { bg: "bg-purple-900/50", text: "text-purple-400" },
};

interface TodoItem {
  fileId: string;
  filePath: string;
  line: number;
  tag: string;
  text: string;
}

interface ProjectFile {
  id: string;
  path: string;
  content: string | null;
  language: string | null;
}

export default function TodoPanel({
  files,
  onSelect,
}: {
  files: ProjectFile[];
  onSelect: (fileId: string, line: number) => void;
}) {
  const [filter, setFilter] = useState<string | null>(null);

  const items = useMemo(() => {
    const results: TodoItem[] = [];
    for (const file of files) {
      if (!file.content) continue;
      const lines = file.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(TODO_RE);
        if (m) {
          results.push({
            fileId: file.id,
            filePath: file.path,
            line: i + 1,
            tag: m[1].toUpperCase(),
            text: m[2].trim(),
          });
        }
      }
    }
    return results;
  }, [files]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const item of items) c[item.tag] = (c[item.tag] ?? 0) + 1;
    return c;
  }, [items]);

  const filtered = filter ? items.filter((item) => item.tag === filter) : items;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">TODOs</span>
        <span className="text-[10px] text-gray-600">{items.length} found</span>
      </div>

      {items.length > 0 && (
        <div className="flex gap-1 px-2 py-1.5 border-b border-gray-700/50 flex-wrap shrink-0">
          <button
            onClick={() => setFilter(null)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              !filter ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            All
          </button>
          {Object.entries(counts).map(([tag, count]) => {
            const style = TAG_STYLES[tag] ?? { bg: "bg-gray-800", text: "text-gray-400" };
            return (
              <button
                key={tag}
                onClick={() => setFilter(filter === tag ? null : tag)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  filter === tag
                    ? `${style.bg} ${style.text}`
                    : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                }`}
              >
                {tag} {count}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-3 text-center">
          <p className="text-xs text-gray-600">
            {items.length === 0 ? "No TODO comments found" : `No ${filter} comments`}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {filtered.map((item, i) => {
            const style = TAG_STYLES[item.tag] ?? { bg: "bg-gray-800", text: "text-gray-400" };
            const filename = item.filePath.split("/").pop()!;
            const dir = item.filePath.includes("/")
              ? item.filePath.slice(0, item.filePath.lastIndexOf("/"))
              : "";
            return (
              <button
                key={i}
                onClick={() => onSelect(item.fileId, item.line)}
                className="w-full text-left px-2 py-1.5 hover:bg-gray-800 transition-colors border-b border-gray-800/50 group"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[10px] font-bold px-1 rounded shrink-0 ${style.bg} ${style.text}`}>
                    {item.tag}
                  </span>
                  <span className="text-xs text-gray-300 truncate group-hover:text-white flex-1">
                    {item.text || "(no message)"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-600">
                  <span className="truncate">{filename}</span>
                  {dir && <span className="text-gray-700 truncate">— {dir}</span>}
                  <span className="ml-auto shrink-0 tabular-nums">:{item.line}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
