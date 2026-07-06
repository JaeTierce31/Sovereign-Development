"use client";
import { useMemo, useState } from "react";

interface ColorSwatchPanelProps {
  content: string | null;
  filePath: string;
  onClose: () => void;
}

interface ColorEntry {
  raw: string;
  normalized: string;
  lines: number[];
  count: number;
}

// Extract all color literals from source text
const HEX_RE = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB_RE = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)/gi;
const HSL_RE = /hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*[\d.]+)?\s*\)/gi;

function normalizeHex(raw: string): string {
  const h = raw.slice(1);
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  if (h.length === 4) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  return raw.toLowerCase();
}

function extractColors(content: string): ColorEntry[] {
  const lines = content.split("\n");
  const map = new Map<string, { raw: string; lines: Set<number> }>();

  function add(raw: string, normalized: string, lineNum: number) {
    const existing = map.get(normalized);
    if (existing) {
      existing.lines.add(lineNum);
    } else {
      map.set(normalized, { raw, lines: new Set([lineNum]) });
    }
  }

  lines.forEach((line, i) => {
    const lineNum = i + 1;
    let m: RegExpExecArray | null;

    HEX_RE.lastIndex = 0;
    while ((m = HEX_RE.exec(line)) !== null) {
      add(m[0], normalizeHex(m[0]), lineNum);
    }

    RGB_RE.lastIndex = 0;
    while ((m = RGB_RE.exec(line)) !== null) {
      add(m[0], m[0].toLowerCase().replace(/\s+/g, ""), lineNum);
    }

    HSL_RE.lastIndex = 0;
    while ((m = HSL_RE.exec(line)) !== null) {
      add(m[0], m[0].toLowerCase().replace(/\s+/g, ""), lineNum);
    }
  });

  return [...map.entries()]
    .map(([normalized, { raw, lines }]) => ({
      raw,
      normalized,
      lines: [...lines].sort((a, b) => a - b),
      count: lines.size,
    }))
    .sort((a, b) => b.count - a.count || a.normalized.localeCompare(b.normalized));
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export default function ColorSwatchPanel({ content, filePath, onClose }: ColorSwatchPanelProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const colors = useMemo(() => extractColors(content ?? ""), [content]);

  const filename = filePath.split("/").pop() ?? filePath;

  function copy(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(value);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function getTextColor(color: string): string {
    if (!color.startsWith("#")) return "#fff";
    return luminance(color) > 0.5 ? "#111" : "#fff";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-sm bg-gray-950 border-l border-gray-700 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Color Swatches</div>
            <div className="text-sm text-white font-medium truncate max-w-[200px]">{filename}</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none px-1">×</button>
        </div>

        {/* Summary */}
        <div className="px-4 py-2 border-b border-gray-800 shrink-0 flex items-center gap-3 text-xs text-gray-500">
          <span>{colors.length} unique color{colors.length !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{colors.reduce((s, c) => s + c.count, 0)} total occurrences</span>
        </div>

        {colors.length === 0 ? (
          <div className="flex-1 flex items-center justify-center px-6 text-center">
            <p className="text-xs text-gray-600">
              No hex, rgb(), or hsl() color values found in this file.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {/* Swatch grid */}
            <div className="p-4 grid grid-cols-4 gap-2">
              {colors.map((c) => (
                <button
                  key={c.normalized}
                  onClick={() => copy(c.raw)}
                  title={`${c.raw}\nLine${c.lines.length > 1 ? "s" : ""}: ${c.lines.slice(0, 5).join(", ")}${c.lines.length > 5 ? "…" : ""}\nClick to copy`}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className="w-full aspect-square rounded-md shadow-sm ring-1 ring-white/10 transition-transform group-hover:scale-105 group-active:scale-95 flex items-center justify-center text-[8px] font-bold"
                    style={{ background: c.normalized, color: getTextColor(c.normalized) }}
                  >
                    {copied === c.raw ? "✓" : ""}
                  </div>
                  <div className="text-[9px] text-gray-500 truncate w-full text-center leading-none">
                    {c.raw.length > 10 ? c.raw.slice(0, 9) + "…" : c.raw}
                  </div>
                  {c.count > 1 && (
                    <div className="text-[8px] text-gray-700 leading-none">×{c.count}</div>
                  )}
                </button>
              ))}
            </div>

            {/* Detail list */}
            <div className="border-t border-gray-800 px-4 py-2">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Details</div>
              <div className="space-y-1">
                {colors.map((c) => (
                  <div key={c.normalized} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0 ring-1 ring-white/10"
                      style={{ background: c.normalized }}
                    />
                    <button
                      onClick={() => copy(c.raw)}
                      className="text-[10px] text-gray-300 hover:text-white font-mono flex-1 text-left truncate"
                    >
                      {c.raw}
                    </button>
                    <span className="text-[10px] text-gray-600 shrink-0">
                      {c.lines.slice(0, 3).map((l) => `:${l}`).join(" ")}
                      {c.lines.length > 3 ? " …" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
