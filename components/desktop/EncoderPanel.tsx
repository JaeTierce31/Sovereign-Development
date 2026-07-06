"use client";
import { useState, useMemo } from "react";

interface EncoderPanelProps {
  initialContent?: string | null;
  onClose: () => void;
}

type Mode = "base64" | "url" | "html" | "hex" | "jwt";

function encodeBase64(s: string): string {
  try { return btoa(unescape(encodeURIComponent(s))); } catch { return ""; }
}
function decodeBase64(s: string): string {
  try { return decodeURIComponent(escape(atob(s.trim()))); } catch { return ""; }
}
function encodeUrl(s: string): string {
  try { return encodeURIComponent(s); } catch { return ""; }
}
function decodeUrl(s: string): string {
  try { return decodeURIComponent(s); } catch { return ""; }
}
function encodeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
function encodeHex(s: string): string {
  return Array.from(new TextEncoder().encode(s)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function decodeHex(s: string): string {
  const hex = s.trim().replace(/\s+/g, "");
  if (hex.length % 2 !== 0) return "";
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return new TextDecoder().decode(bytes);
  } catch { return ""; }
}

interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  valid: boolean;
}

function decodeJwt(token: string): JwtParts | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;
  try {
    const decode = (s: string) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))));
    return { header: decode(parts[0]), payload: decode(parts[1]), signature: parts[2], valid: true };
  } catch { return null; }
}

function formatExp(ts: number): string {
  try {
    const d = new Date(ts * 1000);
    const now = Date.now();
    const expired = ts * 1000 < now;
    return `${d.toUTCString()}${expired ? " (EXPIRED)" : " (valid)"}`;
  } catch { return String(ts); }
}

export default function EncoderPanel({ initialContent, onClose }: EncoderPanelProps) {
  const [mode, setMode] = useState<Mode>("base64");
  const [direction, setDirection] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState(initialContent?.trim() ?? "");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    if (!input) return "";
    if (mode === "jwt") return "";
    try {
      if (mode === "base64") return direction === "encode" ? encodeBase64(input) : decodeBase64(input);
      if (mode === "url") return direction === "encode" ? encodeUrl(input) : decodeUrl(input);
      if (mode === "html") return direction === "encode" ? encodeHtml(input) : decodeHtml(input);
      if (mode === "hex") return direction === "encode" ? encodeHex(input) : decodeHex(input);
    } catch { return ""; }
    return "";
  }, [input, mode, direction]);

  const jwt = useMemo(() => mode === "jwt" ? decodeJwt(input) : null, [input, mode]);

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function applyOutput() {
    if (output) setInput(output);
  }

  const MODES: { id: Mode; label: string }[] = [
    { id: "base64", label: "Base64" },
    { id: "url", label: "URL" },
    { id: "html", label: "HTML Entities" },
    { id: "hex", label: "Hex" },
    { id: "jwt", label: "JWT" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Encoder / Decoder</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        {/* Mode + direction */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700 shrink-0 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setDirection("encode"); }}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${
                mode === m.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {m.label}
            </button>
          ))}
          {mode !== "jwt" && (
            <div className="ml-2 flex items-center gap-1">
              {(["encode", "decode"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirection(d)}
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors capitalize ${
                    direction === d ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {output && (
              <button
                onClick={applyOutput}
                className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
                title="Replace input with output"
              >
                ← Apply
              </button>
            )}
            <button
              onClick={() => copy(output || input)}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${copied ? "bg-green-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          {mode === "jwt" ? (
            /* JWT decode view */
            <div className="flex-1 flex min-h-0 gap-0">
              <div className="flex-1 flex flex-col min-w-0 border-r border-gray-700">
                <div className="px-3 py-1.5 border-b border-gray-700/50 shrink-0">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">JWT Token</span>
                </div>
                <textarea
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="flex-1 resize-none bg-transparent px-3 py-2 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none placeholder-gray-700"
                  spellCheck={false}
                />
              </div>
              <div className="flex-1 flex flex-col min-w-0 overflow-auto">
                <div className="px-3 py-1.5 border-b border-gray-700/50 shrink-0">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Decoded</span>
                </div>
                {!input.trim() ? (
                  <div className="flex-1 flex items-center justify-center text-[10px] text-gray-600">
                    Paste a JWT token to decode
                  </div>
                ) : !jwt ? (
                  <div className="px-3 py-2 text-[10px] text-red-400 font-mono">Invalid JWT — must have 3 base64url parts separated by dots</div>
                ) : (
                  <div className="px-3 py-3 space-y-3 overflow-auto">
                    <JwtSection title="Header" data={jwt.header} onCopy={copy} />
                    <JwtSection title="Payload" data={jwt.payload} onCopy={copy} />
                    {typeof jwt.payload.exp === "number" && (
                      <div className="text-[10px] font-mono text-yellow-500">
                        exp → {formatExp(jwt.payload.exp as number)}
                      </div>
                    )}
                    <div>
                      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Signature</div>
                      <div className="text-[10px] text-gray-500 font-mono break-all">{jwt.signature}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* encode/decode split view */
            <div className="flex-1 flex min-h-0 gap-0">
              <div className="flex-1 flex flex-col min-w-0 border-r border-gray-700">
                <div className="px-3 py-1.5 border-b border-gray-700/50 shrink-0 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Input</span>
                  <span className="text-[10px] text-gray-600">{input.length} chars</span>
                </div>
                <textarea
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste text here…"
                  className="flex-1 resize-none bg-transparent px-3 py-2 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none placeholder-gray-700"
                  spellCheck={false}
                />
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <div className="px-3 py-1.5 border-b border-gray-700/50 shrink-0 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    {direction === "encode" ? "Encoded" : "Decoded"}
                  </span>
                  {output && <span className="text-[10px] text-gray-600">{output.length} chars</span>}
                </div>
                {output ? (
                  <pre className="flex-1 overflow-auto px-3 py-2 text-xs text-green-300 font-mono leading-relaxed whitespace-pre-wrap bg-gray-950/40">
                    {output}
                  </pre>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[10px] text-gray-600 px-4 text-center">
                    {input ? "Could not process — check input format" : "Paste input on the left"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function JwtSection({ title, data, onCopy }: { title: string; data: Record<string, unknown>; onCopy: (s: string) => void }) {
  const formatted = JSON.stringify(data, null, 2);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{title}</div>
        <button
          onClick={() => onCopy(formatted)}
          className="text-[9px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          copy
        </button>
      </div>
      <pre className="text-[10px] text-blue-300 font-mono bg-gray-950/60 rounded px-2 py-1.5 overflow-auto whitespace-pre-wrap">
        {formatted}
      </pre>
    </div>
  );
}
