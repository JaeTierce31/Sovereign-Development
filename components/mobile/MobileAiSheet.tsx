"use client";
import { useRef, useState, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function MobileMessageContent({
  content,
  onApply,
}: {
  content: string;
  onApply?: (code: string) => void;
}) {
  const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        const codeMatch = part.match(/^```([\w]*)\n([\s\S]*?)```$/);
        if (codeMatch) {
          const code = codeMatch[2];
          return (
            <span key={i} className="block my-2 text-left">
              <span className="flex items-center justify-between bg-gray-900 rounded-t px-2 py-1">
                <span className="text-gray-500 text-[10px]">{codeMatch[1] || "code"}</span>
                <span className="flex items-center gap-3">
                  {onApply && (
                    <button
                      onClick={() => onApply(code)}
                      className="text-blue-400 text-[11px]"
                    >
                      Apply
                    </button>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="text-gray-400 text-[11px]"
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
    </>
  );
}

export default function MobileAiSheet({
  fileContent,
  language,
  onClose,
  onApplyCode,
}: {
  fileContent: string;
  language: string;
  onClose: () => void;
  onApplyCode?: (code: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: msg };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, fileContent, language, history }),
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
          prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        );
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: "Error: could not get response." } : m)
        );
      }
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, fileContent, language]);

  const SUGGESTIONS = ["Explain this code", "Find bugs", "Add TypeScript types", "Write tests"];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="bg-gray-950 border-t border-gray-700 flex flex-col" style={{ height: "70vh" }}>
        {/* Handle + header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-white">Peregrine AI</span>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
          {messages.length === 0 && !unconfigured && (
            <div className="pt-4">
              <p className="text-gray-500 text-xs text-center mb-3">Ask anything about your code.</p>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left px-3 py-2 text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
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
                Add <code className="font-mono bg-yellow-900/50 px-1 rounded">ANTHROPIC_API_KEY</code> to enable AI.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
                }`}
              >
                {m.content ? (
                  m.role === "assistant"
                    ? <MobileMessageContent content={m.content} onApply={onApplyCode} />
                    : <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</span>
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
        <div className="px-4 py-3 border-t border-gray-800 shrink-0 pb-safe">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
              placeholder="Ask about this file…"
              disabled={streaming}
              className="flex-1 bg-gray-800 border border-gray-600 focus:border-blue-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none disabled:opacity-50"
            />
            {streaming ? (
              <button
                onClick={() => abortRef.current?.abort()}
                className="px-4 py-2.5 bg-gray-700 text-white text-sm rounded-xl"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className="px-4 py-2.5 bg-blue-600 disabled:opacity-40 text-white text-sm rounded-xl"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
