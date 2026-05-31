"use client";
import { useMemo, useState } from "react";

interface JwtDecoderProps {
  onClose: () => void;
}

function base64UrlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  try {
    return decodeURIComponent(
      atob(b64 + pad)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
  } catch {
    return atob(b64 + pad);
  }
}

function tryParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

interface DecodedJwt {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string;
  parts: [string, string, string];
}

function decodeJwt(token: string): DecodedJwt | null {
  const trimmed = token.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 3) return null;
  try {
    const [h, p, sig] = parts as [string, string, string];
    const headerStr  = base64UrlDecode(h);
    const payloadStr = base64UrlDecode(p);
    return {
      header:    tryParse(headerStr) as Record<string, unknown> | null,
      payload:   tryParse(payloadStr) as Record<string, unknown> | null,
      signature: sig,
      parts:     [h, p, sig],
    };
  } catch {
    return null;
  }
}

function formatTs(ts: unknown): string {
  if (typeof ts !== "number") return String(ts);
  const d = new Date(ts * 1000);
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function relativeTs(ts: unknown): { label: string; expired: boolean } | null {
  if (typeof ts !== "number") return null;
  const diff = ts * 1000 - Date.now();
  const abs = Math.abs(diff);
  const expired = diff < 0;
  const s = Math.floor(abs / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  let label: string;
  if (d > 0)      label = `${d}d ${h % 24}h`;
  else if (h > 0) label = `${h}h ${m % 60}m`;
  else if (m > 0) label = `${m}m ${s % 60}s`;
  else            label = `${s}s`;
  return { label: expired ? `${label} ago` : `in ${label}`, expired };
}

const TS_CLAIMS = ["iat", "exp", "nbf", "auth_time", "updated_at"];

function JsonValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null) return <span className="text-gray-500">null</span>;
  if (typeof value === "boolean") return <span className="text-yellow-400">{String(value)}</span>;
  if (typeof value === "number")  return <span className="text-green-400">{String(value)}</span>;
  if (typeof value === "string")  return <span className="text-orange-300">&quot;{value}&quot;</span>;
  if (Array.isArray(value)) {
    return (
      <span>
        {"["}
        {value.map((v, i) => (
          <span key={i}>{i > 0 && ", "}<JsonValue value={v} depth={depth + 1} /></span>
        ))}
        {"]"}
      </span>
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (depth > 0) return <span className="text-gray-400">{"{ … }"}</span>;
    return (
      <span>
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-start gap-1.5 py-0.5">
            <span className="text-blue-300 shrink-0">{k}:</span>
            <JsonValue value={v} depth={depth + 1} />
          </div>
        ))}
      </span>
    );
  }
  return <span>{String(value)}</span>;
}

type Tab = "payload" | "header" | "raw";

export default function JwtDecoder({ onClose }: JwtDecoderProps) {
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("payload");

  const decoded = useMemo(() => (token.trim() ? decodeJwt(token) : null), [token]);

  const isValid  = token.trim() === "" || decoded !== null;
  const isEmpty  = token.trim() === "";

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const payload = decoded?.payload ?? null;
  const header  = decoded?.header ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">JWT Decoder</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Token input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Token</span>
              {decoded && (
                <button
                  onClick={() => copy(token.trim(), "token")}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${copied === "token" ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                >
                  {copied === "token" ? "✓" : "copy"}
                </button>
              )}
            </div>
            <textarea
              autoFocus
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste a JWT here…"
              rows={3}
              className={`w-full resize-none bg-gray-800 border rounded px-3 py-2 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none focus:ring-1 placeholder-gray-700 break-all ${
                isValid || isEmpty ? "border-gray-600 focus:ring-blue-500" : "border-red-700 focus:ring-red-500"
              }`}
              spellCheck={false}
            />
            {!isEmpty && !isValid && (
              <p className="text-[10px] text-red-400 mt-1">Invalid JWT — must have exactly 3 base64url-encoded parts separated by dots</p>
            )}
          </div>

          {decoded && (
            <>
              {/* Expiry banner */}
              {payload && typeof payload.exp === "number" && (() => {
                const rel = relativeTs(payload.exp);
                if (!rel) return null;
                return (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${rel.expired ? "bg-red-900/30 border border-red-700/40 text-red-300" : "bg-green-900/20 border border-green-700/30 text-green-300"}`}>
                    <span>{rel.expired ? "⚠ Expired" : "✓ Valid"}</span>
                    <span className="text-gray-500">·</span>
                    <span className="font-mono">{rel.label}</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-[10px] opacity-70">{formatTs(payload.exp)}</span>
                  </div>
                );
              })()}

              {/* Tabs */}
              <div>
                <div className="flex items-center gap-1 mb-3">
                  {(["payload", "header", "raw"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`text-xs px-2.5 py-1 rounded transition-colors capitalize ${tab === t ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {tab === "payload" && payload && (
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
                    {Object.entries(payload).map(([k, v]) => {
                      const isTs = TS_CLAIMS.includes(k) && typeof v === "number";
                      const rel  = isTs ? relativeTs(v) : null;
                      const key  = `claim-${k}`;
                      const copyVal = typeof v === "object" ? JSON.stringify(v) : String(v);
                      return (
                        <div key={k} className="group flex items-start gap-2 px-3 py-2 border-b border-gray-700/30 last:border-0 hover:bg-gray-800/40">
                          <span className="text-[10px] text-blue-400 w-28 shrink-0 font-mono pt-0.5">{k}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-mono text-gray-300 break-all">
                              {isTs ? formatTs(v) : <JsonValue value={v} />}
                            </div>
                            {rel && (
                              <div className={`text-[9px] mt-0.5 ${rel.expired ? "text-red-400" : "text-green-500"}`}>{rel.label}</div>
                            )}
                          </div>
                          <button
                            onClick={() => copy(copyVal, key)}
                            className={`text-[9px] shrink-0 px-1.5 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 mt-0.5 ${copied === key ? "bg-green-700 text-white opacity-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                          >
                            {copied === key ? "✓" : "copy"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {tab === "header" && header && (
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
                    {Object.entries(header).map(([k, v]) => {
                      const key = `hdr-${k}`;
                      const copyVal = typeof v === "object" ? JSON.stringify(v) : String(v);
                      return (
                        <div key={k} className="group flex items-center gap-2 px-3 py-2 border-b border-gray-700/30 last:border-0 hover:bg-gray-800/40">
                          <span className="text-[10px] text-blue-400 w-28 shrink-0 font-mono">{k}</span>
                          <span className="text-xs font-mono text-gray-300 flex-1 break-all"><JsonValue value={v} /></span>
                          <button
                            onClick={() => copy(copyVal, key)}
                            className={`text-[9px] shrink-0 px-1.5 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${copied === key ? "bg-green-700 text-white opacity-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                          >
                            {copied === key ? "✓" : "copy"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {tab === "raw" && (
                  <div className="space-y-2">
                    {(["Header", "Payload", "Signature"] as const).map((label, i) => {
                      const part = decoded.parts[i];
                      const key  = `raw-${i}`;
                      const decoded_str = i < 2 ? (() => {
                        try { return JSON.stringify(tryParse(base64UrlDecode(part)), null, 2); } catch { return base64UrlDecode(part); }
                      })() : part;
                      const colors = ["text-pink-400", "text-purple-400", "text-cyan-400"];
                      return (
                        <div key={label} className="group">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-semibold ${colors[i]}`}>{label}</span>
                            <button
                              onClick={() => copy(i < 2 ? (decoded_str ?? part) : part, key)}
                              className={`text-[9px] px-1.5 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${copied === key ? "bg-green-700 text-white opacity-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                            >
                              {copied === key ? "✓" : "copy"}
                            </button>
                          </div>
                          <pre className="text-[11px] font-mono text-gray-400 bg-gray-800/60 border border-gray-700/40 rounded px-2.5 py-2 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed select-all">
                            {i < 2 ? decoded_str : part}
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Signature note */}
              <div className="text-[10px] text-gray-600 flex items-center gap-1.5">
                <span className="text-yellow-600">⚠</span>
                Signature is not verified — this tool only decodes; it does not validate the secret/key.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
