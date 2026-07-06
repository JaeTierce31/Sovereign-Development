"use client";
import { useEffect, useRef, useState } from "react";
import { timeAgo } from "@/lib/timeAgo";

export interface Snapshot {
  savedAt: number;
  content: string;
}

interface LocalHistoryPanelProps {
  fileId: string;
  currentContent: string;
  snapshots: Snapshot[];
  onRestore: (content: string) => void;
  onClose: () => void;
}

const MAX_LINE_PREVIEW = 5;

function diffLines(a: string, b: string): { added: number; removed: number } {
  const la = a.split("\n");
  const lb = b.split("\n");
  const setA = new Set(la);
  const setB = new Set(lb);
  const added = lb.filter((l) => !setA.has(l)).length;
  const removed = la.filter((l) => !setB.has(l)).length;
  return { added, removed };
}

export default function LocalHistoryPanel({
  fileId,
  currentContent,
  snapshots,
  onRestore,
  onClose,
}: LocalHistoryPanelProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const previewRef = useRef<HTMLPreElement>(null);

  // Reset selection when file changes
  useEffect(() => {
    setSelectedIdx(null);
  }, [fileId]);

  const selected = selectedIdx !== null ? snapshots[selectedIdx] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-white font-semibold text-sm">Local History</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Snapshot list */}
          <div className="w-48 shrink-0 border-r border-gray-700 overflow-auto flex flex-col">
            {snapshots.length === 0 && (
              <div className="px-3 py-6 text-xs text-gray-600 text-center">
                No snapshots yet.<br />Press ⌘/Ctrl S to save one.
              </div>
            )}
            {/* Current state entry */}
            {snapshots.length > 0 && (
              <button
                onClick={() => setSelectedIdx(null)}
                className={`text-left px-3 py-2 border-b border-gray-800 transition-colors ${selectedIdx === null ? "bg-blue-600/20 border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent hover:bg-gray-800"}`}
              >
                <div className="text-xs text-green-400 font-medium">Current</div>
                <div className="text-[10px] text-gray-600 mt-0.5">{currentContent.split("\n").length} lines</div>
              </button>
            )}
            {snapshots.map((snap, i) => {
              const diff = i === 0
                ? diffLines(snap.content, currentContent)
                : diffLines(snap.content, snapshots[i - 1].content);
              return (
                <button
                  key={snap.savedAt}
                  onClick={() => setSelectedIdx(i)}
                  className={`text-left px-3 py-2 border-b border-gray-800 transition-colors ${selectedIdx === i ? "bg-blue-600/20 border-l-2 border-l-blue-500" : "border-l-2 border-l-transparent hover:bg-gray-800"}`}
                >
                  <div className="text-xs text-gray-300">{timeAgo(snap.savedAt)}</div>
                  <div className="flex gap-2 mt-0.5">
                    {diff.added > 0 && <span className="text-[10px] text-green-500">+{diff.added}</span>}
                    {diff.removed > 0 && <span className="text-[10px] text-red-500">−{diff.removed}</span>}
                    {diff.added === 0 && diff.removed === 0 && <span className="text-[10px] text-gray-600">no change</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview pane */}
          <div className="flex-1 min-w-0 flex flex-col">
            {selected ? (
              <>
                <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between shrink-0">
                  <span className="text-xs text-gray-400">
                    Saved {new Date(selected.savedAt).toLocaleString()} · {selected.content.split("\n").length} lines
                  </span>
                  <button
                    onClick={() => { onRestore(selected.content); onClose(); }}
                    className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                  >
                    Restore this version
                  </button>
                </div>
                <pre
                  ref={previewRef}
                  className="flex-1 overflow-auto p-4 text-xs text-gray-300 font-mono leading-relaxed bg-gray-950"
                >
                  {selected.content.split("\n").slice(0, 500).join("\n")}
                  {selected.content.split("\n").length > 500 && "\n… (truncated)"}
                </pre>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-gray-600 text-center px-8">
                  {snapshots.length === 0
                    ? "Snapshots are captured automatically each time you press ⌘/Ctrl S. Up to 20 versions are kept per file."
                    : "Select a snapshot on the left to preview it, then click “Restore” to roll back."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {snapshots.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-800 text-[10px] text-gray-600 shrink-0">
            {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""} · stored in memory (cleared on page reload)
          </div>
        )}
      </div>
    </div>
  );
}
