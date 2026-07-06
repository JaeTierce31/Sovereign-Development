"use client";
import { useMemo, useState } from "react";

interface ColorPaletteGenProps {
  onClose: () => void;
}

// ── Color math ─────────────────────────────────────────────────────────────────

interface HSL { h: number; s: number; l: number }
interface RGB { r: number; g: number; b: number }

function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace(/^#/, "");
  const len = clean.length;
  if (len === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (len === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

function rgbToHex({ r, g, b }: RGB): string {
  return "#" + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl({ r, g, b }: RGB): HSL {
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
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = h / 360;
  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  };
}

function hslToHex(h: number, s: number, l: number): string {
  return rgbToHex(hslToRgb(h, s, l));
}

function wrapHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function contrastColor({ r, g, b }: RGB): string {
  const lum = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
  return lum > 0.35 ? "#1a1a1a" : "#ffffff";
}

// ── Palette generators ─────────────────────────────────────────────────────────

interface Swatch { hex: string; label: string }

function complementary({ h, s, l }: HSL): Swatch[] {
  return [
    { hex: hslToHex(h, s, l), label: "Base" },
    { hex: hslToHex(wrapHue(h + 180), s, l), label: "Complement" },
  ];
}

function analogous({ h, s, l }: HSL): Swatch[] {
  return [-60, -30, 0, 30, 60].map((offset, i) => ({
    hex: hslToHex(wrapHue(h + offset), s, l),
    label: ["−60°", "−30°", "Base", "+30°", "+60°"][i],
  }));
}

function triadic({ h, s, l }: HSL): Swatch[] {
  return [0, 120, 240].map((offset, i) => ({
    hex: hslToHex(wrapHue(h + offset), s, l),
    label: ["Base", "+120°", "+240°"][i],
  }));
}

function tetradic({ h, s, l }: HSL): Swatch[] {
  return [0, 90, 180, 270].map((offset, i) => ({
    hex: hslToHex(wrapHue(h + offset), s, l),
    label: ["Base", "+90°", "+180°", "+270°"][i],
  }));
}

function splitComplementary({ h, s, l }: HSL): Swatch[] {
  return [
    { hex: hslToHex(h, s, l), label: "Base" },
    { hex: hslToHex(wrapHue(h + 150), s, l), label: "+150°" },
    { hex: hslToHex(wrapHue(h + 210), s, l), label: "+210°" },
  ];
}

function shades({ h, s }: HSL): Swatch[] {
  return [0.1, 0.2, 0.35, 0.5, 0.65, 0.75, 0.85, 0.92].map((l, i) => ({
    hex: hslToHex(h, s, l),
    label: `${Math.round(l * 100)}%`,
  }));
}

function monochromatic({ h, s, l }: HSL): Swatch[] {
  return [
    { hex: hslToHex(h, s, Math.min(0.9, l + 0.3)), label: "Light +30%" },
    { hex: hslToHex(h, s, Math.min(0.9, l + 0.15)), label: "Light +15%" },
    { hex: hslToHex(h, s, l), label: "Base" },
    { hex: hslToHex(h, s, Math.max(0.05, l - 0.15)), label: "Dark −15%" },
    { hex: hslToHex(h, s, Math.max(0.05, l - 0.3)), label: "Dark −30%" },
  ];
}

// ── Types ──────────────────────────────────────────────────────────────────────

type SchemeKey = "complementary" | "analogous" | "triadic" | "tetradic" | "split" | "shades" | "mono";

const SCHEMES: { key: SchemeKey; label: string; fn: (hsl: HSL) => Swatch[] }[] = [
  { key: "complementary", label: "Complementary",       fn: complementary },
  { key: "analogous",     label: "Analogous",           fn: analogous },
  { key: "triadic",       label: "Triadic",             fn: triadic },
  { key: "tetradic",      label: "Tetradic",            fn: tetradic },
  { key: "split",         label: "Split-Comp.",         fn: splitComplementary },
  { key: "mono",          label: "Monochromatic",       fn: monochromatic },
  { key: "shades",        label: "Shades",              fn: shades },
];

const PRESETS = [
  { name: "Ocean",    hex: "#0ea5e9" },
  { name: "Forest",   hex: "#22c55e" },
  { name: "Sunset",   hex: "#f97316" },
  { name: "Lavender", hex: "#8b5cf6" },
  { name: "Rose",     hex: "#f43f5e" },
  { name: "Sand",     hex: "#d97706" },
];

type CopyFormat = "hex" | "rgb" | "hsl";

// ── Component ─────────────────────────────────────────────────────────────────

export default function ColorPaletteGen({ onClose }: ColorPaletteGenProps) {
  const [baseHex, setBaseHex]   = useState("#0ea5e9");
  const [scheme, setScheme]     = useState<SchemeKey>("complementary");
  const [copyFmt, setCopyFmt]   = useState<CopyFormat>("hex");
  const [copied, setCopied]     = useState<string | null>(null);

  const baseRgb = useMemo(() => hexToRgb(baseHex), [baseHex]);
  const baseHsl = useMemo(() => (baseRgb ? rgbToHsl(baseRgb) : null), [baseRgb]);

  const swatches = useMemo<Swatch[]>(() => {
    if (!baseHsl) return [];
    const fn = SCHEMES.find((s) => s.key === scheme)?.fn;
    return fn ? fn(baseHsl) : [];
  }, [baseHsl, scheme]);

  function formatColor(hex: string): string {
    if (copyFmt === "rgb") {
      const rgb = hexToRgb(hex);
      return rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : hex;
    }
    if (copyFmt === "hsl") {
      const rgb = hexToRgb(hex);
      if (!rgb) return hex;
      const { h, s, l } = rgbToHsl(rgb);
      return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
    }
    return hex;
  }

  function copy(hex: string, key: string) {
    navigator.clipboard.writeText(formatColor(hex)).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function copyAll() {
    const text = swatches.map((s) => formatColor(s.hex)).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied("all");
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
          <h2 className="text-sm font-semibold text-white">Color Palette Generator</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Base color picker */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Base Color</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={baseRgb ? rgbToHex(baseRgb) : "#000000"}
                onChange={(e) => setBaseHex(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-gray-600 bg-transparent shrink-0"
              />
              <input
                value={baseHex}
                onChange={(e) => setBaseHex(e.target.value)}
                className={`flex-1 bg-gray-800 border rounded px-2.5 py-1.5 text-xs font-mono text-gray-300 focus:outline-none focus:ring-1 ${baseRgb ? "border-gray-600 focus:ring-blue-500" : "border-red-700 focus:ring-red-500"}`}
                placeholder="#rrggbb"
                spellCheck={false}
              />
              {baseHsl && (
                <span className="text-[10px] font-mono text-gray-500 shrink-0">
                  {Math.round(baseHsl.h)}° {Math.round(baseHsl.s * 100)}% {Math.round(baseHsl.l * 100)}%
                </span>
              )}
            </div>
            {/* Presets */}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setBaseHex(p.hex)}
                  title={p.name}
                  className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                  style={{ backgroundColor: p.hex, borderColor: baseHex === p.hex ? "#fff" : "transparent" }}
                />
              ))}
            </div>
          </div>

          {/* Scheme selector */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Scheme</div>
            <div className="flex flex-wrap gap-1">
              {SCHEMES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setScheme(key)}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${scheme === key ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Palette */}
          {swatches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Palette</span>
                  <div className="flex gap-0.5">
                    {(["hex", "rgb", "hsl"] as CopyFormat[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setCopyFmt(f)}
                        className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${copyFmt === f ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-500 hover:bg-gray-700"}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={copyAll}
                  className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${copied === "all" ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                >
                  {copied === "all" ? "✓ copied all" : "copy all"}
                </button>
              </div>

              {/* Large swatches */}
              <div className="flex rounded-lg overflow-hidden h-20 mb-2">
                {swatches.map((swatch, i) => {
                  const rgb = hexToRgb(swatch.hex);
                  const fg = rgb ? contrastColor(rgb) : "#fff";
                  return (
                    <button
                      key={i}
                      onClick={() => copy(swatch.hex, `swatch-${i}`)}
                      title={`${swatch.label}: ${formatColor(swatch.hex)}`}
                      className="flex-1 flex flex-col items-center justify-center transition-opacity hover:opacity-80"
                      style={{ backgroundColor: swatch.hex }}
                    >
                      {copied === `swatch-${i}` && (
                        <span style={{ color: fg, fontSize: 12, fontWeight: 700 }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Swatch list */}
              <div className="space-y-1">
                {swatches.map((swatch, i) => {
                  const rgb = hexToRgb(swatch.hex);
                  const fg = rgb ? contrastColor(rgb) : "#fff";
                  const isCopied = copied === `swatch-${i}`;
                  return (
                    <div
                      key={i}
                      className="group flex items-center gap-3 px-3 py-1.5 rounded-lg bg-gray-800/40 border border-gray-700/20 hover:border-gray-600/40 transition-colors"
                    >
                      <div
                        className="w-7 h-7 rounded shrink-0 border border-gray-600/20"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span className="text-[10px] text-gray-500 w-16 shrink-0">{swatch.label}</span>
                      <span className="text-xs font-mono text-gray-300 flex-1">{formatColor(swatch.hex)}</span>
                      <button
                        onClick={() => copy(swatch.hex, `swatch-${i}`)}
                        className={`text-[9px] px-1.5 py-0.5 rounded transition-colors shrink-0 opacity-0 group-hover:opacity-100 ${isCopied ? "bg-green-700 text-white opacity-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                      >
                        {isCopied ? "✓" : "copy"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
