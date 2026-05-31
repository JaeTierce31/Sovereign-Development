"use client";
import { useMemo, useState } from "react";

interface NumberBaseConverterProps {
  onClose: () => void;
}

type Base = 2 | 8 | 10 | 16;

const BASES: { base: Base; label: string; prefix: string }[] = [
  { base: 2,  label: "Binary",      prefix: "0b" },
  { base: 8,  label: "Octal",       prefix: "0o" },
  { base: 10, label: "Decimal",     prefix: ""   },
  { base: 16, label: "Hexadecimal", prefix: "0x" },
];

const BIT_WIDTHS = [8, 16, 32, 64] as const;
type BitWidth = typeof BIT_WIDTHS[number];

function parseSafe(raw: string, base: Base): bigint | null {
  const s = raw.trim().replace(/^0b/i, "").replace(/^0o/i, "").replace(/^0x/i, "").replace(/\s/g, "");
  if (!s || s === "-") return null;
  try {
    const neg = s.startsWith("-");
    const abs = neg ? s.slice(1) : s;
    if (!abs) return null;
    const val = BigInt(`0${{ 2: "b", 8: "o", 10: "", 16: "x" }[base]}${base === 10 ? "" : ""}${abs}`);
    return neg ? -val : val;
  } catch {
    // fallback for decimal
    try {
      if (base === 10) return BigInt(s);
    } catch { /* ignore */ }
    return null;
  }
}

function toBase(n: bigint, base: Base, uppercase: boolean): string {
  const neg = n < 0n;
  const abs = neg ? -n : n;
  let s = abs.toString(base);
  if (uppercase && base === 16) s = s.toUpperCase();
  return neg ? "-" + s : s;
}

function twosComplement(n: bigint, bits: BitWidth): string {
  if (n >= 0n) return n.toString(2).padStart(bits, "0");
  const mask = (1n << BigInt(bits)) - 1n;
  return (n & mask).toString(2).padStart(bits, "0");
}

function formatBinary(bin: string): string {
  // group into nibbles from right
  const rev = bin.split("").reverse();
  const groups: string[] = [];
  for (let i = 0; i < rev.length; i += 4) {
    groups.push(rev.slice(i, i + 4).reverse().join(""));
  }
  return groups.reverse().join(" ");
}

function signedRange(bits: BitWidth): { min: bigint; max: bigint } {
  const b = BigInt(bits);
  return { min: -(1n << (b - 1n)), max: (1n << (b - 1n)) - 1n };
}

function unsignedMax(bits: BitWidth): bigint {
  return (1n << BigInt(bits)) - 1n;
}

export default function NumberBaseConverter({ onClose }: NumberBaseConverterProps) {
  const [inputBase, setInputBase] = useState<Base>(10);
  const [raw, setRaw] = useState("255");
  const [uppercase, setUppercase] = useState(true);
  const [bitWidth, setBitWidth] = useState<BitWidth>(8);
  const [copied, setCopied] = useState<string | null>(null);
  const [customBase, setCustomBase] = useState(36);
  const [showCustom, setShowCustom] = useState(false);

  const value = useMemo(() => parseSafe(raw, inputBase), [raw, inputBase]);

  const conversions = useMemo(() => {
    if (value === null) return null;
    return BASES.map(({ base, label, prefix }) => ({
      base, label, prefix,
      value: toBase(value, base, uppercase),
    }));
  }, [value, uppercase]);

  const customConversion = useMemo(() => {
    if (value === null || !showCustom) return null;
    const b = Math.max(2, Math.min(36, customBase));
    const neg = value < 0n;
    const abs = neg ? -value : value;
    let s = abs.toString(b);
    if (uppercase) s = s.toUpperCase();
    return (neg ? "-" : "") + s;
  }, [value, customBase, showCustom, uppercase]);

  const tc = useMemo(() => {
    if (value === null) return null;
    return twosComplement(value, bitWidth);
  }, [value, bitWidth]);

  const { min, max } = signedRange(bitWidth);
  const umax = unsignedMax(bitWidth);
  const fitsInBitWidth = value !== null && value >= min && value <= umax;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function changeBase(base: Base) {
    // When switching input base, keep the numeric value if possible
    if (value !== null) {
      setRaw(toBase(value, base, false));
    }
    setInputBase(base);
  }

  const isValid = value !== null;
  const isEmpty = !raw.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Number Base Converter</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} className="w-3 h-3 accent-blue-500" />
              <span className="text-[10px] text-gray-400">Uppercase hex</span>
            </label>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Input base picker + field */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-500">Input base:</span>
              {BASES.map(({ base, label }) => (
                <button
                  key={base}
                  onClick={() => changeBase(base)}
                  className={`text-xs px-2.5 py-1 rounded transition-colors ${
                    inputBase === base ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {BASES.find((b) => b.base === inputBase)?.prefix && (
                <span className="text-sm font-mono text-gray-500 shrink-0">
                  {BASES.find((b) => b.base === inputBase)?.prefix}
                </span>
              )}
              <input
                autoFocus
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                className={`flex-1 bg-gray-800 border rounded px-3 py-2 text-sm font-mono text-gray-100 focus:outline-none focus:ring-1 ${
                  isValid || isEmpty ? "border-gray-600 focus:ring-blue-500" : "border-red-700 focus:ring-red-500"
                }`}
                placeholder={inputBase === 2 ? "11111111" : inputBase === 8 ? "377" : inputBase === 16 ? "FF" : "255"}
                spellCheck={false}
              />
            </div>
            {!isEmpty && !isValid && (
              <p className="text-[10px] text-red-400">Invalid {BASES.find((b) => b.base === inputBase)?.label.toLowerCase()} number</p>
            )}
          </div>

          {/* Conversion results */}
          {conversions && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Conversions</div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
                {conversions.map(({ base, label, prefix, value: val }) => {
                  const key = `base-${base}`;
                  const isActive = base === inputBase;
                  return (
                    <div
                      key={base}
                      className={`flex items-center gap-2 px-3 py-2 border-b border-gray-700/30 last:border-0 group cursor-pointer ${
                        isActive ? "bg-blue-900/15" : "hover:bg-gray-800/40"
                      }`}
                      onClick={() => { changeBase(base); setRaw(val); }}
                      title="Click to use as input"
                    >
                      <span className="text-[10px] text-gray-600 w-5 shrink-0">{base}</span>
                      <span className="text-[10px] text-gray-500 w-20 shrink-0">{label}</span>
                      <span className={`text-xs font-mono flex-1 ${isActive ? "text-blue-300" : "text-gray-300"}`}>
                        <span className="text-gray-600">{prefix}</span>{val}
                      </span>
                      {isActive && <span className="text-[8px] bg-blue-800 text-blue-300 px-1 py-0.5 rounded shrink-0">input</span>}
                      <button
                        onClick={(e) => { e.stopPropagation(); copy(val, key); }}
                        className={`text-[9px] shrink-0 px-1.5 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                          copied === key ? "bg-green-700 text-white opacity-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                      >
                        {copied === key ? "✓" : "copy"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom base */}
          <div>
            <button
              onClick={() => setShowCustom((v) => !v)}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showCustom ? "▾" : "▸"} Custom base (2–36)
            </button>
            {showCustom && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-gray-500">Base:</span>
                <input
                  type="number"
                  min={2}
                  max={36}
                  value={customBase}
                  onChange={(e) => setCustomBase(Number(e.target.value))}
                  className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs font-mono text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {customConversion && (
                  <div className="flex items-center gap-2 flex-1 group">
                    <span className="text-xs font-mono text-gray-300 flex-1 break-all">{customConversion}</span>
                    <button
                      onClick={() => copy(customConversion, "custom")}
                      className={`text-[9px] px-1.5 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                        copied === "custom" ? "bg-green-700 text-white opacity-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}
                    >
                      {copied === "custom" ? "✓" : "copy"}
                    </button>
                  </div>
                )}
                {value === null && <span className="text-[10px] text-gray-600">—</span>}
              </div>
            )}
          </div>

          {/* Two's complement / bit view */}
          {value !== null && (
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span>Bit Representation</span>
                <div className="flex items-center gap-1">
                  {BIT_WIDTHS.map((w) => (
                    <button
                      key={w}
                      onClick={() => setBitWidth(w)}
                      className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                        bitWidth === w ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                      }`}
                    >
                      {w}b
                    </button>
                  ))}
                </div>
              </div>
              {tc && fitsInBitWidth ? (
                <div className="bg-gray-800/60 border border-gray-700/40 rounded px-3 py-2">
                  <div className="text-[10px] font-mono text-indigo-300 break-all leading-relaxed">
                    {formatBinary(tc)}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[9px] text-gray-600">
                      signed range: {min.toString()} to {max.toString()}
                    </span>
                    {value >= min && value <= max && (
                      <span className="text-[9px] text-green-600">fits signed</span>
                    )}
                    {value >= 0n && value <= umax && (
                      <span className="text-[9px] text-green-600">fits unsigned</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-gray-600">
                  Value does not fit in {bitWidth} bits ({value < 0n ? "below signed min" : "above unsigned max"})
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
