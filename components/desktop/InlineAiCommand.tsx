"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { getAiHeaders } from "@/lib/userApiKey";

interface MonacoEditor {
  getSelection(): { isEmpty(): boolean; startLineNumber: number; endLineNumber: number; startColumn: number; endColumn: number } | null;
  getModel(): { getValueInRange(range: object): string; getValue(): string; getLinesContent(): string[] } | null;
  executeEdits(source: string, edits: Array<{ range: object; text: string }>): void;
  getPosition(): { lineNumber: number; column: number } | null;
  revealPosition(pos: { lineNumber: number; column: number }): void;
  focus(): void;
}

interface Props {
  language: string;
  editorRef: React.RefObject<unknown>;
  onClose: () => void;
}

export default function InlineAiCommand({ language, editorRef, onClose }: Props) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const getEditorContext = useCallback(() => {
    const editor = editorRef.current as MonacoEditor | null;
    if (!editor) return { selection: "", context: "" };
    const sel = editor.getSelection();
    const model = editor.getModel();
    if (!model) return { selection: "", context: "" };
    const selection = sel && !sel.isEmpty() ? model.getValueInRange(sel) : "";
    const lines = model.getLinesContent();
    const pos = editor.getPosition();
    const center = pos ? pos.lineNumber - 1 : 0;
    const contextLines = lines.slice(Math.max(0, center - 30), Math.min(lines.length, center + 30));
    return { selection, context: contextLines.join("\n") };
  }, [editorRef]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setResult("");
    setError("");
    setDone(false);
    abortRef.current = new AbortController();
    const { selection, context } = getEditorContext();
    try {
      const res = await fetch("/api/ai/inline", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAiHeaders() },
        body: JSON.stringify({ prompt: prompt.trim(), selection, language, context }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        setError(msg ?? "Request failed");
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done: rdone, value } = await reader.read();
        if (rdone) break;
        accumulated += decoder.decode(value, { stream: true });
        setResult(accumulated);
      }
      setDone(true);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  function applyResult(replace: boolean) {
    const editor = editorRef.current as MonacoEditor | null;
    if (!editor || !result) return;
    const sel = editor.getSelection();
    const model = editor.getModel();
    if (!model) return;
    let range: object;
    if (replace && sel && !sel.isEmpty()) {
      range = sel;
    } else {
      const pos = editor.getPosition() ?? { lineNumber: 1, column: 1 };
      range = { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column };
    }
    editor.executeEdits("inline-ai", [{ range, text: result }]);
    editor.focus();
    onClose();
  }

  const hasSelection = (() => {
    const editor = editorRef.current as MonacoEditor | null;
    if (!editor) return false;
    const sel = editor.getSelection();
    return sel ? !sel.isEmpty() : false;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700 bg-gray-950">
          <span className="text-xs text-indigo-400 font-medium">✦ Inline AI</span>
          {hasSelection && <span className="text-xs text-gray-500">· selection ready</span>}
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-gray-300 text-sm">×</button>
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <input
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={hasSelection ? "Instruction for selection…" : "What should I write here?"}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors shrink-0"
          >
            {loading ? "…" : "Generate"}
          </button>
        </form>

        {error && (
          <div className="px-4 py-2 text-xs text-red-400 bg-red-900/20 border-b border-gray-800">
            {error}
          </div>
        )}

        {result && (
          <>
            <div className="max-h-64 overflow-auto bg-gray-950 px-4 py-3">
              <pre className="text-xs text-gray-200 font-mono whitespace-pre-wrap break-words">{result}</pre>
            </div>
            {done && (
              <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-800 bg-gray-900">
                {hasSelection && (
                  <button
                    onClick={() => applyResult(true)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors"
                  >
                    Replace selection
                  </button>
                )}
                <button
                  onClick={() => applyResult(false)}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors"
                >
                  Insert at cursor
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(result)}
                  className="px-3 py-1 text-gray-500 hover:text-gray-300 text-xs transition-colors"
                >
                  Copy
                </button>
                <button onClick={onClose} className="ml-auto text-xs text-gray-500 hover:text-gray-300">
                  Discard
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
