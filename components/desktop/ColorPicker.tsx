"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ColorPickerProps {
  onClose: () => void;
}

interface HSL { h: number; s: number; l: number }
interface RGB { r: number; g: number; b: number }

// ── Conversion helpers ────────────────────────────────────────────────────────

function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHex({ r, g, b }: RGB): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex: string): RGB | null {
  const h = hex.replace("#", "").trim();
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }
  return null;
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// Relative luminance (WCAG)
function relativeLuminance({ r, g, b }: RGB): number {
  const f = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrastRatio(a: RGB, b: RGB): number {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
}

const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BLACK: RGB = { r: 0, g: 0, b: 0 };

const PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff", "#6b7280",
  "#111827", "#000000",
];

export default function ColorPicker({ onClose }: ColorPickerProps) {
  const [hsl, setHsl] = useState<HSL>({ h: 210, s: 80, l: 50 });
  const [hexInput, setHexInput] = useState("");
  const [rgbInput, setRgbInput] = useState({ r: "", g: "", b: "" });
  const [hslInput, setHslInput] = useState({ h: "", s: "", l: "" });
  const [copied, setCopied] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<"hex" | "rgb" | "hsl" | null>(null);

  const rgb = useMemo(() => hslToRgb(hsl), [hsl]);
  const hex = useMemo(() => rgbToHex(rgb), [rgb]);

  // Sync display fields when HSL changes (but not the active field)
  useEffect(() => {
    if (activeField !== "hex") setHexInput(hex);
    if (activeField !== "rgb") setRgbInput({ r: String(rgb.r), g: String(rgb.g), b: String(rgb.b) });
    if (activeField !== "hsl") setHslInput({ h: String(hsl.h), s: String(hsl.s), l: String(hsl.l) });
  }, [hex, rgb, hsl, activeField]);

  function applyHex(val: string) {
    const parsed = hexToRgb(val);
    if (parsed) setHsl(rgbToHsl(parsed));
  }

  function applyRgb(r: string, g: string, b: string) {
    const rv = parseInt(r), gv = parseInt(g), bv = parseInt(b);
    if ([rv, gv, bv].every((v) => !isNaN(v) && v >= 0 && v <= 255))
      setHsl(rgbToHsl({ r: rv, g: gv, b: bv }));
  }

  function applyHslInput(h: string, s: string, l: string) {
    const hv = parseInt(h), sv = parseInt(s), lv = parseInt(l);
    if (!isNaN(hv) && !isNaN(sv) && !isNaN(lv) && hv >= 0 && hv <= 360 && sv >= 0 && sv <= 100 && lv >= 0 && lv <= 100)
      setHsl({ h: hv, s: sv, l: lv });
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  // SV picker (treat as SL picker in HSL space — simpler, accurate enough)
  const svRef = useRef<HTMLDivElement>(null);
  const draggingSv = useRef(false);

  const applySvPos = useCallback((e: MouseEvent | React.MouseEvent) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    // x → saturation, y → lightness (inverted: top = light)
    const s = Math.round(x * 100);
    const l = Math.round((1 - y) * 50 + (1 - x) * 25); // simplified HSL mapping
    setHsl((prev) => ({ ...prev, s, l: clamp(l, 0, 100) }));
  }, []);

  const onSvMouseDown = useCallback((e: React.MouseEvent) => {
    draggingSv.current = true;
    applySvPos(e);
  }, [applySvPos]);

  useEffect(() => {
    function onMove(e: MouseEvent) { if (draggingSv.current) applySvPos(e); }
    function onUp() { draggingSv.current = false; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [applySvPos]);

  // Hue bar drag
  const hueRef = useRef<HTMLDivElement>(null);
  const draggingHue = useRef(false);

  const applyHuePos = useCallback((e: MouseEvent | React.MouseEvent) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    setHsl((prev) => ({ ...prev, h: Math.round(x * 360) }));
  }, []);

  const onHueMouseDown = useCallback((e: React.MouseEvent) => {
    draggingHue.current = true;
    applyHuePos(e);
  }, [applyHuePos]);

  useEffect(() => {
    function onMove(e: MouseEvent) { if (draggingHue.current) applyHuePos(e); }
    function onUp() { draggingHue.current = false; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [applyHuePos]);

  const contrastWhite = contrastRatio(rgb, WHITE);
  const contrastBlack = contrastRatio(rgb, BLACK);
  const textColor = contrastBlack > contrastWhite ? "#000" : "#fff";

  function wcagBadge(ratio: number): { label: string; color: string } {
    if (ratio >= 7)   return { label: "AAA", color: "text-green-400" };
    if (ratio >= 4.5) return { label: "AA",  color: "text-green-400" };
    if (ratio >= 3)   return { label: "AA Large", color: "text-yellow-400" };
    return { label: "Fail", color: "text-red-400" };
  }

  const badgeWhite = wcagBadge(contrastWhite);
  const badgeBlack = wcagBadge(contrastBlack);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Color Picker</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* SV gradient picker */}
          <div
            ref={svRef}
            onMouseDown={onSvMouseDown}
            className="w-full h-36 rounded-lg cursor-crosshair select-none relative"
            style={{
              background: `linear-gradient(to bottom, transparent, black),
                           linear-gradient(to right, white, hsl(${hsl.h}, 100%, 50%))`,
            }}
          >
            {/* thumb */}
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${hsl.s}%`,
                top: `${100 - Math.max(0, (hsl.l - (100 - hsl.s) * 0.25) / 0.5)}%`,
                background: hex,
              }}
            />
          </div>

          {/* Hue bar */}
          <div
            ref={hueRef}
            onMouseDown={onHueMouseDown}
            className="w-full h-4 rounded-full cursor-pointer select-none relative"
            style={{ background: "linear-gradient(to right, #f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
          >
            <div
              className="absolute top-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${(hsl.h / 360) * 100}%`, background: `hsl(${hsl.h},100%,50%)` }}
            />
          </div>

          {/* Preview swatch */}
          <div
            className="w-full h-12 rounded-lg shadow-inner flex items-center justify-center text-sm font-mono font-semibold select-all cursor-text"
            style={{ background: hex, color: textColor }}
            onClick={() => copy(hex, "swatch")}
            title="Click to copy hex"
          >
            {hex}
          </div>

          {/* Inputs */}
          <div className="space-y-2">
            {/* Hex */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-gray-500 uppercase w-8 shrink-0">Hex</label>
              <input
                value={hexInput}
                onFocus={() => setActiveField("hex")}
                onBlur={() => { setActiveField(null); applyHex(hexInput); }}
                onChange={(e) => { setHexInput(e.target.value); applyHex(e.target.value); }}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                spellCheck={false}
                placeholder="#3b82f6"
              />
              <button
                onClick={() => copy(hex, "hex")}
                className={`text-[9px] px-1.5 py-1 rounded transition-colors shrink-0 ${copied === "hex" ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
              >
                {copied === "hex" ? "✓" : "copy"}
              </button>
            </div>

            {/* RGB */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-gray-500 uppercase w-8 shrink-0">RGB</label>
              {(["r", "g", "b"] as const).map((ch) => (
                <input
                  key={ch}
                  value={rgbInput[ch]}
                  onFocus={() => setActiveField("rgb")}
                  onBlur={() => { setActiveField(null); applyRgb(rgbInput.r, rgbInput.g, rgbInput.b); }}
                  onChange={(e) => {
                    const next = { ...rgbInput, [ch]: e.target.value };
                    setRgbInput(next);
                    applyRgb(next.r, next.g, next.b);
                  }}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={ch.toUpperCase()}
                  spellCheck={false}
                />
              ))}
              <button
                onClick={() => copy(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, "rgb")}
                className={`text-[9px] px-1.5 py-1 rounded transition-colors shrink-0 ${copied === "rgb" ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
              >
                {copied === "rgb" ? "✓" : "copy"}
              </button>
            </div>

            {/* HSL */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-gray-500 uppercase w-8 shrink-0">HSL</label>
              {(["h", "s", "l"] as const).map((ch) => (
                <input
                  key={ch}
                  value={hslInput[ch]}
                  onFocus={() => setActiveField("hsl")}
                  onBlur={() => { setActiveField(null); applyHslInput(hslInput.h, hslInput.s, hslInput.l); }}
                  onChange={(e) => {
                    const next = { ...hslInput, [ch]: e.target.value };
                    setHslInput(next);
                    applyHslInput(next.h, next.s, next.l);
                  }}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={ch.toUpperCase()}
                  spellCheck={false}
                />
              ))}
              <button
                onClick={() => copy(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, "hsl")}
                className={`text-[9px] px-1.5 py-1 rounded transition-colors shrink-0 ${copied === "hsl" ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
              >
                {copied === "hsl" ? "✓" : "copy"}
              </button>
            </div>
          </div>

          {/* WCAG contrast */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">WCAG Contrast</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { bg: "#ffffff", fg: hex, label: "on White", ratio: contrastWhite, badge: badgeWhite },
                { bg: "#000000", fg: hex, label: "on Black", ratio: contrastBlack, badge: badgeBlack },
              ].map(({ bg, fg: _fg, label, ratio, badge }) => (
                <div key={label} className="bg-gray-800 rounded px-2.5 py-2 flex flex-col gap-0.5">
                  <div className="text-[9px] text-gray-500">{label}</div>
                  <div className="text-xs font-mono text-gray-200">{ratio.toFixed(2)}:1</div>
                  <div className={`text-[10px] font-semibold ${badge.color}`}>{badge.label}</div>
                  <div className="mt-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-center" style={{ background: bg, color: hex }}>
                    Aa
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Presets</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    const parsed = hexToRgb(p);
                    if (parsed) setHsl(rgbToHsl(parsed));
                  }}
                  title={p}
                  className="w-6 h-6 rounded shadow ring-1 ring-white/10 hover:scale-110 transition-transform active:scale-95"
                  style={{ background: p }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
