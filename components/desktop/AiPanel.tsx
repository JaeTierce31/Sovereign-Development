"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { getAiHeaders } from "@/lib/userApiKey";

function MessageContent({
  content,
  onApply,
}: {
  content: string;
  onApply?: (code: string) => void;
}) {
  const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);
  return (
    <span>
      {parts.map((part, i) => {
        const codeMatch = part.match(/^```([\w]*)\n([\s\S]*?)```$/);
        if (codeMatch) {
          const code = codeMatch[2];
          return (
            <span key={i} className="block my-2">
              <span className="flex items-center justify-between bg-gray-900 rounded-t px-2 py-0.5">
                <span className="text-gray-500 text-[10px]">{codeMatch[1] || "code"}</span>
                <span className="flex items-center gap-2">
                  {onApply && (
                    <button
                      onClick={() => onApply(code)}
                      className="text-blue-400 hover:text-blue-300 text-[10px] transition-colors"
                    >
                      Apply
                    </button>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="text-gray-500 hover:text-gray-300 text-[10px] transition-colors"
                  >
                    Copy
                  </button>
                </span>
              </span>
              <code className="block bg-gray-900 rounded-b px-3 py-2 text-[11px] text-gray-100 overflow-x-auto whitespace-pre font-mono">
                {code}
              </code>
            </span>
          );
        }
        return <span key={i} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{part}</span>;
      })}
    </span>
  );
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ProjectFile {
  path: string;
  content: string | null;
}

interface AiPanelProps {
  fileContent: string;
  language: string;
  onClose: () => void;
  editorRef?: React.RefObject<unknown>;
  projectId?: string;
  allFiles?: ProjectFile[];
}

export default function AiPanel({ fileContent, language, onClose, editorRef, projectId, allFiles }: AiPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);
  const [useProjectContext, setUseProjectContext] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function applyToEditor(code: string) {
    const editor = editorRef?.current as {
      executeEdits?: (source: string, edits: unknown[]) => void;
      getSelection?: () => unknown;
      getModel?: () => { getFullModelRange?: () => unknown } | null;
    } | null;
    if (!editor?.executeEdits || !editor?.getModel) return;

    const model = editor.getModel();
    if (!model) return;

    const selection = editor.getSelection?.() ?? model.getFullModelRange?.();
    editor.executeEdits("ai-apply", [{ range: selection, text: code }]);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const projectFiles = useProjectContext && allFiles
      ? allFiles.filter((f) => f.content).map((f) => ({ path: f.path, content: f.content! }))
      : undefined;

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAiHeaders() },
        body: JSON.stringify({ message: text, fileContent, language, history, projectFiles }),
        signal: abortRef.current.signal,
      });

      if (res.status === 503) {
        setUnconfigured(true);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: "Error: could not get response." } : m
          )
        );
      }
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, fileContent, language, useProjectContext, allFiles]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const SUGGESTIONS = ["Explain this code", "Find potential bugs", "Add TypeScript types", "Write tests"];

  return (
    <div className="h-full flex flex-col bg-gray-950 border-l border-gray-700 w-80 shrink-0">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold text-gray-300">Peregrine AI</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>
        {allFiles && allFiles.length > 1 && (
          <button
            onClick={() => setUseProjectContext((v) => !v)}
            className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded transition-colors ${
              useProjectContext
                ? "bg-blue-600/20 text-blue-400 border border-blue-600/40"
                : "text-gray-600 hover:text-gray-400 border border-transparent"
            }`}
            title={useProjectContext ? "Disable project-wide context" : "Include all files as context"}
          >
            <span>{useProjectContext ? "⊕" : "⊕"}</span>
            {useProjectContext ? `Project context (${allFiles.length} files)` : "Add project context"}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-3 py-3 space-y-4">
        {messages.length === 0 && !unconfigured && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-xs mb-3">Ask anything about your code.</p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 0); }}
                  className="block w-full text-left px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {unconfigured && (
          <div className="rounded-lg bg-yellow-900/30 border border-yellow-700/50 px-3 py-3">
            <p className="text-yellow-400 text-xs font-medium mb-1">AI not configured</p>
            <p className="text-yellow-600 text-xs">
              Add <code className="font-mono bg-yellow-900/50 px-1 rounded">ANTHROPIC_API_KEY</code> to
              Vercel environment variables to enable the AI assistant.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col gap-1 ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-full rounded-lg px-3 py-2 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-100"
              }`}
            >
              {m.content ? (
                m.role === "assistant" ? <MessageContent content={m.content} onApply={editorRef ? applyToEditor : undefined} /> : <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</span>
              ) : (streaming && m.role === "assistant" ? (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              ) : "")}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-gray-700 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about this file… (Enter to send)"
            rows={1}
            disabled={streaming}
            className="flex-1 bg-gray-800 border border-gray-600 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 resize-none focus:outline-none disabled:opacity-50"
            style={{ minHeight: "36px", maxHeight: "120px" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          {streaming ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors shrink-0"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs rounded-lg transition-colors shrink-0"
            >
              Send
            </button>
          )}
        </div>
        <p className="text-gray-600 text-xs mt-1.5">Shift+Enter for newline</p>
      </div>
    </div>
  );
}
