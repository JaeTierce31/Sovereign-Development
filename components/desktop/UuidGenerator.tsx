"use client";
import { useMemo, useState } from "react";

interface UuidGeneratorProps {
  onClose: () => void;
}

// ── UUID generation ────────────────────────────────────────────────────────────

function uuidV4(): string {
  return crypto.randomUUID();
}

function uuidV1(): string {
  const GREGORIAN = 122192928000000000n;
  const ts = BigInt(Date.now()) * 10000n + GREGORIAN;
  const tl = (ts & 0xffffffffn).toString(16).padStart(8, "0");
  const tm = ((ts >> 32n) & 0xffffn).toString(16).padStart(4, "0");
  const thv = (((ts >> 48n) & 0x0fffn) | 0x1000n).toString(16).padStart(4, "0");
  const cs = (BigInt(Math.floor(Math.random() * 0x3fff)) | 0x8000n).toString(16).padStart(4, "0");
  const node = Array.from(crypto.getRandomValues(new Uint8Array(6)));
  node[0] |= 0x01;
  const n = node.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${tl}-${tm}-${thv}-${cs}-${n}`;
}

function uuidV7(): string {
  const ms = BigInt(Date.now());
  const rand = crypto.getRandomValues(new Uint8Array(10));
  const msBuf = new Uint8Array(8);
  new DataView(msBuf.buffer).setBigUint64(0, ms);
  const r = new Uint8Array(16);
  r[0] = msBuf[2]; r[1] = msBuf[3]; r[2] = msBuf[4]; r[3] = msBuf[5];
  r[4] = msBuf[6]; r[5] = msBuf[7];
  r[6] = 0x70 | (rand[0] & 0x0f);
  r[7] = rand[1];
  r[8] = 0x80 | (rand[2] & 0x3f);
  r[9] = rand[3]; r[10] = rand[4]; r[11] = rand[5];
  r[12] = rand[6]; r[13] = rand[7]; r[14] = rand[8]; r[15] = rand[9];
  const h = Array.from(r).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const NIL_UUID = "00000000-0000-0000-0000-000000000000";

// ── UUID inspection ────────────────────────────────────────────────────────────

interface UuidInfo {
  version: number | null;
  variant: string;
  valid: boolean;
  timestamp?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function inspectUuid(raw: string): UuidInfo {
  const s = raw.trim().toLowerCase();
  if (s === NIL_UUID) return { version: 0, variant: "N/A (Nil UUID)", valid: true };
  if (!UUID_RE.test(s)) return { version: null, variant: "—", valid: false };
  const hex = s.replace(/-/g, "");
  const v = parseInt(hex[12], 16);
  const varBits = parseInt(hex[16], 16) >> 2;
  const variant =
    varBits <= 7  ? "NCS backward-compat"
    : varBits <= 11 ? "RFC 4122"
    : varBits <= 13 ? "Microsoft COM"
    : "Reserved";
  let timestamp: string | undefined;
  if (v === 1) {
    const ts = BigInt("0x" + hex.slice(13, 16) + hex.slice(8, 12) + hex.slice(0, 8)) - 122192928000000000n;
    timestamp = new Date(Number(ts / 10000n)).toISOString();
  } else if (v === 7) {
    timestamp = new Date(parseInt(hex.slice(0, 12), 16)).toISOString();
  }
  return { version: v, variant, valid: true, timestamp };
}

// ── Component ─────────────────────────────────────────────────────────────────

type UuidVersion = "v4" | "v7" | "v1" | "nil";
type UuidFormat = "standard" | "upper" | "nodash";
const COUNTS = [1, 5, 10, 25, 100] as const;

function generate(ver: UuidVersion): string {
  if (ver === "v1") return uuidV1();
  if (ver === "v7") return uuidV7();
  if (ver === "nil") return NIL_UUID;
  return uuidV4();
}

function applyFormat(uuid: string, fmt: UuidFormat): string {
  if (fmt === "upper") return uuid.toUpperCase();
  if (fmt === "nodash") return uuid.replace(/-/g, "");
  return uuid;
}

export default function UuidGenerator({ onClose }: UuidGeneratorProps) {
  const [version, setVersion]   = useState<UuidVersion>("v4");
  const [count, setCount]       = useState<number>(1);
  const [format, setFormat]     = useState<UuidFormat>("standard");
  const [uuids, setUuids]       = useState<string[]>(() => [uuidV4()]);
  const [copied, setCopied]     = useState<string | null>(null);
  const [inspectInput, setInspectInput] = useState("");

  const inspectResult = useMemo(
    () => (inspectInput.trim() ? inspectUuid(inspectInput) : null),
    [inspectInput],
  );

  function generateAll() {
    setUuids(Array.from({ length: count }, () => applyFormat(generate(version), format)));
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">UUID Generator</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-3 gap-3">
            {/* Version */}
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Version</div>
              <div className="flex flex-col gap-1">
                {([
                  ["v4", "random"],
                  ["v7", "time-ordered"],
                  ["v1", "time-based"],
                  ["nil", "all zeros"],
                ] as [UuidVersion, string][]).map(([v, hint]) => (
                  <button
                    key={v}
                    onClick={() => setVersion(v)}
                    className={`text-[10px] px-2 py-1 rounded text-left transition-colors ${version === v ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                  >
                    <span className="font-mono">{v === "nil" ? "Nil" : v.toUpperCase()}</span>
                    <span className="text-[9px] ml-1 opacity-70">{hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Count</div>
              <div className="flex flex-col gap-1">
                {COUNTS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`text-[10px] px-2 py-1 rounded font-mono transition-colors ${count === n ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Format</div>
              <div className="flex flex-col gap-1">
                {([
                  ["standard", "xxxxxxxx-…"],
                  ["upper",    "XXXXXXXX-…"],
                  ["nodash",   "xxxxxxxx…"],
                ] as [UuidFormat, string][]).map(([f, label]) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`text-[10px] px-2 py-1 rounded font-mono text-left transition-colors ${format === f ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={generateAll}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
          >
            Generate {count === 1 ? "UUID" : `${count} UUIDs`}
          </button>

          {/* Results */}
          {uuids.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  {uuids.length === 1 ? "Result" : `Results (${uuids.length})`}
                </span>
                {uuids.length > 1 && (
                  <button
                    onClick={() => copy(uuids.join("\n"), "all")}
                    className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${copied === "all" ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                  >
                    {copied === "all" ? "✓ copied all" : "copy all"}
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-52 overflow-auto">
                {uuids.map((uuid, i) => (
                  <div
                    key={i}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/30 hover:border-gray-600/50 transition-colors"
                  >
                    <span className="text-xs font-mono text-gray-300 flex-1 select-all break-all">{uuid}</span>
                    <button
                      onClick={() => copy(uuid, `uuid-${i}`)}
                      className={`text-[9px] px-1.5 py-0.5 rounded transition-colors shrink-0 opacity-0 group-hover:opacity-100 ${copied === `uuid-${i}` ? "bg-green-700 text-white opacity-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                    >
                      {copied === `uuid-${i}` ? "✓" : "copy"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inspector */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Inspect UUID</div>
            <input
              value={inspectInput}
              onChange={(e) => setInspectInput(e.target.value)}
              placeholder="Paste a UUID to inspect version, variant, timestamp…"
              className="w-full bg-gray-800 border border-gray-600 rounded px-2.5 py-1.5 text-xs font-mono text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-600"
              spellCheck={false}
            />
            {inspectResult && (
              <div className="mt-2 bg-gray-800/50 border border-gray-700/40 rounded-lg overflow-hidden">
                {([
                  ["Valid",      inspectResult.valid ? "✓ Yes" : "✗ Invalid format"],
                  ["Version",    inspectResult.version !== null ? String(inspectResult.version) : "—"],
                  ["Variant",    inspectResult.variant],
                  ...(inspectResult.timestamp ? [["Timestamp", inspectResult.timestamp]] : []),
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex items-center gap-3 px-3 py-1.5 border-b border-gray-700/30 last:border-0">
                    <span className="text-[10px] text-gray-500 w-20 shrink-0">{label}</span>
                    <span className={`text-xs font-mono break-all ${label === "Valid" ? (inspectResult.valid ? "text-green-400" : "text-red-400") : "text-gray-300"}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-700 shrink-0 flex items-center gap-3">
          <span className="text-[10px] text-gray-600">v4 random · v7 time-ordered · v1 time-based</span>
        </div>
      </div>
    </div>
  );
}
