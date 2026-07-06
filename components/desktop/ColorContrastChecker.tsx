"use client";
import { useMemo, useState } from "react";

interface ColorContrastCheckerProps {
  onClose: () => void;
}

// ── Color math ────────────────────────────────────────────────────────────────

interface RGB { r: number; g: number; b: number }

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace(/^#/, "");
  if (clean.length === 3) {
    const [r, g, b] = clean.split("").map((c) => parseInt(c + c, 16));
    return { r, g, b };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

function parseColor(s: string): RGB | null {
  const t = s.trim();
  const hex = hexToRgb(t.startsWith("#") ? t : "#" + t);
  if (hex) return hex;
  const rgb = t.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
  return null;
}

function linearize(c: number): number {
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(l1: number, l2: number): number {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHex({ r, g, b }: RGB): string {
  return "#" + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0)
        : max === gn ? (bn - rn) / d + 2
        : (rn - gn) / d + 4;
  return { h: (h / 6) * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = h / 360;
  return {
    r: Math.round(hue2rgb(p, q, hn + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1/3) * 255),
  };
}

function suggestLightness(fg: RGB, bg: RGB, target: number): { lighter: RGB | null; darker: RGB | null } {
  const bgL = relativeLuminance(bg);
  const { h, s, l } = rgbToHsl(fg);

  function findL(direction: "up" | "down"): RGB | null {
    let lo = direction === "up" ? l : 0;
    let hi = direction === "up" ? 1 : l;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const candidate = hslToRgb(h, s, mid);
      const ratio = contrastRatio(relativeLuminance(candidate), bgL);
      if (ratio >= target) {
        if (direction === "up") hi = mid; else lo = mid;
      } else {
        if (direction === "up") lo = mid; else hi = mid;
      }
    }
    const result = hslToRgb(h, s, (lo + hi) / 2);
    return contrastRatio(relativeLuminance(result), bgL) >= target ? result : null;
  }

  return { lighter: findL("up"), darker: findL("down") };
}

// ── WCAG levels ───────────────────────────────────────────────────────────────

interface Level {
  label: string;
  threshold: number;
  desc: string;
}

const LEVELS: Level[] = [
  { label: "AA Normal",  threshold: 4.5, desc: "Text ≤ 18pt / ≤ 14pt bold" },
  { label: "AA Large",   threshold: 3,   desc: "Text > 18pt / > 14pt bold" },
  { label: "AA UI",      threshold: 3,   desc: "UI components & graphics" },
  { label: "AAA Normal", threshold: 7,   desc: "Enhanced text contrast" },
  { label: "AAA Large",  threshold: 4.5, desc: "Enhanced large text" },
];

// ── Component ─────────────────────────────────────────────────────────────────

const PRESETS: { name: string; fg: string; bg: string }[] = [
  { name: "Black on White",  fg: "#000000", bg: "#ffffff" },
  { name: "White on Black",  fg: "#ffffff", bg: "#000000" },
  { name: "GitHub text",     fg: "#1f2328", bg: "#ffffff" },
  { name: "VS Code dark",    fg: "#d4d4d4", bg: "#1e1e1e" },
  { name: "Amber on dark",   fg: "#f59e0b", bg: "#1f2937" },
  { name: "Red warning",     fg: "#ef4444", bg: "#ffffff" },
];

export default function ColorContrastChecker({ onClose }: ColorContrastCheckerProps) {
  const [fg, setFg] = useState("#ffffff");
  const [bg, setBg] = useState("#1e1e2e");
  const [copied, setCopied] = useState<string | null>(null);

  const fgRgb = useMemo(() => parseColor(fg), [fg]);
  const bgRgb = useMemo(() => parseColor(bg), [bg]);

  const ratio = useMemo(() => {
    if (!fgRgb || !bgRgb) return null;
    return contrastRatio(relativeLuminance(fgRgb), relativeLuminance(bgRgb));
  }, [fgRgb, bgRgb]);

  const suggestions = useMemo(() => {
    if (!fgRgb || !bgRgb || ratio === null) return null;
    if (ratio >= 4.5) return null;
    return suggestLightness(fgRgb, bgRgb, 4.5);
  }, [fgRgb, bgRgb, ratio]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function loadPreset(p: typeof PRESETS[number]) {
    setFg(p.fg); setBg(p.bg);
  }

  const fgHex = fgRgb ? rgbToHex(fgRgb) : null;
  const bgHex = bgRgb ? rgbToHex(bgRgb) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Color Contrast Checker</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Color inputs */}
          <div className="grid grid-cols-2 gap-3">
            {([["Foreground", fg, setFg, fgHex], ["Background", bg, setBg, bgHex]] as const).map(([label, val, setter, hex]) => (
              <div key={label}>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={hex ?? "#000000"}
                    onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-gray-600 bg-transparent"
                  />
                  <input
                    value={val}
                    onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                    className={`flex-1 bg-gray-800 border rounded px-2 py-1.5 text-xs font-mono text-gray-300 focus:outline-none focus:ring-1 ${
                      (label === "Foreground" ? fgRgb : bgRgb) ? "border-gray-600 focus:ring-blue-500" : "border-red-700 focus:ring-red-500"
                    }`}
                    placeholder="#rrggbb"
                    spellCheck={false}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          {fgRgb && bgRgb && (
            <div
              className="rounded-lg px-4 py-5 flex flex-col items-center gap-2 border border-gray-700/30"
              style={{ backgroundColor: bgHex ?? "#000", color: fgHex ?? "#fff" }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>Large Bold Text (18px+)</div>
              <div style={{ fontSize: 14 }}>Normal body text at 14px — readable?</div>
              <div className="flex items-center gap-2 mt-1">
                <div style={{ width: 24, height: 24, borderRadius: 4, border: `2px solid ${fgHex}`, backgroundColor: "transparent" }} />
                <div style={{ fontSize: 12 }}>UI component border</div>
              </div>
            </div>
          )}

          {/* Ratio */}
          {ratio !== null && (
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold font-mono text-white tabular-nums">
                {ratio.toFixed(2)}<span className="text-base text-gray-500 font-normal">:1</span>
              </div>
              <div className={`text-xs px-2 py-1 rounded font-semibold ${ratio >= 7 ? "bg-green-700 text-white" : ratio >= 4.5 ? "bg-blue-700 text-white" : ratio >= 3 ? "bg-yellow-700 text-white" : "bg-red-800 text-white"}`}>
                {ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA Large" : "Fail"}
              </div>
            </div>
          )}

          {/* WCAG grid */}
          {ratio !== null && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">WCAG 2.1 Compliance</div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
                {LEVELS.map(({ label, threshold, desc }) => {
                  const pass = ratio >= threshold;
                  return (
                    <div key={label} className="flex items-center gap-3 px-3 py-2 border-b border-gray-700/30 last:border-0">
                      <span className={`text-[10px] font-mono font-bold shrink-0 w-20 ${pass ? "text-green-400" : "text-red-400"}`}>{label}</span>
                      <span className="text-[10px] text-gray-500 flex-1">{desc}</span>
                      <span className={`text-[10px] font-semibold shrink-0 ${pass ? "text-green-400" : "text-gray-600"}`}>
                        {pass ? "✓ Pass" : `✗ ${threshold}:1`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions && (fgRgb && bgRgb) && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Suggestions to reach AA (4.5:1)
              </div>
              <div className="space-y-1.5">
                {([["lighter", suggestions.lighter], ["darker", suggestions.darker]] as const).map(([dir, rgb]) => {
                  if (!rgb) return null;
                  const hex = rgbToHex(rgb);
                  const r = contrastRatio(relativeLuminance(rgb), relativeLuminance(bgRgb));
                  const key = `suggest-${dir}`;
                  return (
                    <div key={dir} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/40 border border-gray-700/30 group">
                      <div className="w-5 h-5 rounded shrink-0" style={{ backgroundColor: hex }} />
                      <span className="text-xs font-mono text-gray-300">{hex}</span>
                      <span className="text-[10px] text-gray-500 flex-1">{dir} · {r.toFixed(2)}:1</span>
                      <button
                        onClick={() => { setFg(hex); copy(hex, key); }}
                        className={`text-[9px] px-1.5 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${copied === key ? "bg-green-700 text-white opacity-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                      >
                        {copied === key ? "✓" : "use"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Presets */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Presets</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => loadPreset(p)}
                  className="text-[10px] px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                  style={{ backgroundColor: p.bg, color: p.fg }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
