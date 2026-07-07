"use client";
import { useMemo } from "react";

interface ProjectFile {
  id: string;
  path: string;
  content: string | null;
  language: string | null;
}

interface ProjectStatsPanelProps {
  files: ProjectFile[];
  projectName: string;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const LANG_COLORS: Record<string, string> = {
  typescript: "bg-blue-400",
  javascript: "bg-yellow-400",
  python: "bg-green-400",
  css: "bg-purple-400",
  html: "bg-orange-400",
  markdown: "bg-gray-400",
  json: "bg-orange-300",
  shell: "bg-gray-300",
  plaintext: "bg-gray-600",
};

export default function ProjectStatsPanel({ files, projectName, onClose }: ProjectStatsPanelProps) {
  const stats = useMemo(() => {
    let totalLines = 0;
    let totalChars = 0;
    const langMap = new Map<string, { files: number; lines: number; chars: number }>();

    for (const f of files) {
      const content = f.content ?? "";
      const lang = f.language ?? "plaintext";
      const lines = content ? content.split("\n").length : 0;
      const chars = content.length;
      totalLines += lines;
      totalChars += chars;
      const prev = langMap.get(lang) ?? { files: 0, lines: 0, chars: 0 };
      langMap.set(lang, { files: prev.files + 1, lines: prev.lines + lines, chars: prev.chars + chars });
    }

    const langEntries = [...langMap.entries()]
      .map(([lang, d]) => ({ lang, ...d, pct: totalLines > 0 ? Math.round((d.lines / totalLines) * 100) : 0 }))
      .sort((a, b) => b.lines - a.lines);

    return { totalLines, totalChars, langEntries };
  }, [files]);

  const loadedFiles = files.filter((f) => f.content !== null);
  const emptyFiles = files.filter((f) => !f.content?.trim());
  const largestFiles = [...files]
    .filter((f) => f.content)
    .sort((a, b) => (b.content?.length ?? 0) - (a.content?.length ?? 0))
    .slice(0, 5);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-sm bg-gray-950 border-l border-gray-700 shadow-2xl overflow-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Project Stats</div>
            <div className="text-sm text-white font-medium truncate max-w-[200px]">{projectName || "Untitled"}</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-lg leading-none px-1"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-4 space-y-5">
          {/* Top-level numbers */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Files", value: files.length },
              { label: "Lines", value: stats.totalLines.toLocaleString() },
              { label: "Size", value: formatBytes(stats.totalChars) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-900 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-semibold text-white">{value}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>

          {/* Language breakdown */}
          {stats.langEntries.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Languages
              </div>
              {/* Progress bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden mb-3 gap-px">
                {stats.langEntries.map(({ lang, pct }) => (
                  <div
                    key={lang}
                    className={`${LANG_COLORS[lang] ?? "bg-gray-500"} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${lang}: ${pct}%`}
                  />
                ))}
              </div>
              <div className="space-y-1.5">
                {stats.langEntries.map(({ lang, files: fCount, lines, pct }) => (
                  <div key={lang} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${LANG_COLORS[lang] ?? "bg-gray-500"}`} />
                    <span className="text-xs text-gray-300 flex-1 capitalize">{lang}</span>
                    <span className="text-[10px] text-gray-500">{fCount} {fCount === 1 ? "file" : "files"}</span>
                    <span className="text-[10px] text-gray-500 w-16 text-right">{lines.toLocaleString()} lines</span>
                    <span className="text-[10px] text-gray-600 w-8 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Largest files */}
          {largestFiles.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Largest Files
              </div>
              <div className="space-y-1">
                {largestFiles.map((f) => {
                  const parts = f.path.split("/");
                  const name = parts.pop() ?? f.path;
                  const dir = parts.join("/");
                  const lines = (f.content ?? "").split("\n").length;
                  return (
                    <div key={f.id} className="flex items-center gap-2 py-1">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-300 truncate">{name}</div>
                        {dir && <div className="text-[10px] text-gray-600 truncate">{dir}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-gray-400">{lines.toLocaleString()} ln</div>
                        <div className="text-[10px] text-gray-600">{formatBytes(f.content?.length ?? 0)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* File summary */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Summary
            </div>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Loaded files</span>
                <span className="text-gray-300">{loadedFiles.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Empty files</span>
                <span className="text-gray-300">{emptyFiles.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg lines / file</span>
                <span className="text-gray-300">
                  {loadedFiles.length > 0
                    ? Math.round(stats.totalLines / loadedFiles.length).toLocaleString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg size / file</span>
                <span className="text-gray-300">
                  {loadedFiles.length > 0
                    ? formatBytes(Math.round(stats.totalChars / loadedFiles.length))
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
