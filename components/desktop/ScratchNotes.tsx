"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface ScratchNotesProps {
  projectId: string;
}

const STORAGE_KEY = (id: string) => `peregrine:notes:${id}`;

export default function ScratchNotes({ projectId }: ScratchNotesProps) {
  const [text, setText] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(STORAGE_KEY(projectId)) ?? "";
  });
  const [preview, setPreview] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save to localStorage
  const scheduleSave = useCallback((value: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY(projectId), value); } catch {}
    }, 500);
  }, [projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    scheduleSave(e.target.value);
    setConfirmClear(false);
  };

  // Reload when project changes
  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY(projectId)) ?? "") : "";
    setText(saved);
    setConfirmClear(false);
    setPreview(false);
  }, [projectId]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return; }
    setText("");
    try { localStorage.removeItem(STORAGE_KEY(projectId)); } catch {}
    setConfirmClear(false);
    textareaRef.current?.focus();
  }

  // Minimal markdown-to-HTML for preview (headings, bold, italic, code, links)
  function renderMarkdown(md: string): string {
    return md
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
      .replace(/\n\n/g, "<br/><br/>")
      .replace(/\n/g, "<br/>");
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 shrink-0 gap-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scratch Notes</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setPreview((v) => !v); setConfirmClear(false); }}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${preview ? "bg-blue-600/30 text-blue-400" : "bg-gray-800 text-gray-500 hover:bg-gray-700"}`}
            title={preview ? "Edit" : "Preview (Markdown)"}
          >
            {preview ? "Edit" : "Preview"}
          </button>
          {text && (
            <button
              onClick={handleClear}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${confirmClear ? "bg-red-700 text-white" : "bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-red-400"}`}
              title={confirmClear ? "Click again to confirm clear" : "Clear notes"}
            >
              {confirmClear ? "Confirm?" : "Clear"}
            </button>
          )}
        </div>
      </div>

      {/* Editor or Preview */}
      {preview ? (
        <div
          className="flex-1 overflow-auto px-3 py-2 text-xs text-gray-300 leading-relaxed prose-invert"
          style={{ wordBreak: "break-word" }}
          dangerouslySetInnerHTML={{ __html: text ? renderMarkdown(text) : '<span style="color:#4b5563">Nothing to preview.</span>' }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onBlur={() => setConfirmClear(false)}
          placeholder={"Paste snippets, URLs, ideas…\n\nMarkdown supported — use Preview to render."}
          className="flex-1 resize-none bg-transparent text-xs text-gray-300 placeholder-gray-700 focus:outline-none px-3 py-2 font-mono leading-relaxed"
          spellCheck={false}
        />
      )}

      {/* Footer */}
      <div className="px-3 py-1 border-t border-gray-700/50 flex items-center gap-2 text-[10px] text-gray-700 shrink-0">
        <span>{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{charCount} char{charCount !== 1 ? "s" : ""}</span>
        {saveTimerRef.current && <span className="ml-auto text-gray-700">saving…</span>}
      </div>
    </div>
  );
}
