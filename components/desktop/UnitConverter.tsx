"use client";
import { useMemo, useState } from "react";

interface UnitConverterProps {
  onClose: () => void;
}

type Category = "length" | "mass" | "temperature" | "data" | "time" | "speed" | "area";

interface UnitDef {
  label: string;
  symbol: string;
  toBase: (v: number) => number;
  fromBase: (v: number) => number;
}

const UNITS: Record<Category, UnitDef[]> = {
  length: [
    { label: "Kilometre", symbol: "km", toBase: v => v * 1000, fromBase: v => v / 1000 },
    { label: "Metre", symbol: "m", toBase: v => v, fromBase: v => v },
    { label: "Centimetre", symbol: "cm", toBase: v => v / 100, fromBase: v => v * 100 },
    { label: "Millimetre", symbol: "mm", toBase: v => v / 1000, fromBase: v => v * 1000 },
    { label: "Micrometre", symbol: "μm", toBase: v => v / 1e6, fromBase: v => v * 1e6 },
    { label: "Mile", symbol: "mi", toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
    { label: "Yard", symbol: "yd", toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
    { label: "Foot", symbol: "ft", toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
    { label: "Inch", symbol: "in", toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
    { label: "Nautical mile", symbol: "nmi", toBase: v => v * 1852, fromBase: v => v / 1852 },
  ],
  mass: [
    { label: "Tonne", symbol: "t", toBase: v => v * 1000, fromBase: v => v / 1000 },
    { label: "Kilogram", symbol: "kg", toBase: v => v, fromBase: v => v },
    { label: "Gram", symbol: "g", toBase: v => v / 1000, fromBase: v => v * 1000 },
    { label: "Milligram", symbol: "mg", toBase: v => v / 1e6, fromBase: v => v * 1e6 },
    { label: "Microgram", symbol: "μg", toBase: v => v / 1e9, fromBase: v => v * 1e9 },
    { label: "Pound", symbol: "lb", toBase: v => v * 0.45359237, fromBase: v => v / 0.45359237 },
    { label: "Ounce", symbol: "oz", toBase: v => v * 0.028349523, fromBase: v => v / 0.028349523 },
    { label: "Stone", symbol: "st", toBase: v => v * 6.35029318, fromBase: v => v / 6.35029318 },
  ],
  temperature: [
    { label: "Celsius", symbol: "°C", toBase: v => v, fromBase: v => v },
    { label: "Fahrenheit", symbol: "°F", toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
    { label: "Kelvin", symbol: "K", toBase: v => v - 273.15, fromBase: v => v + 273.15 },
    { label: "Rankine", symbol: "°R", toBase: v => (v - 491.67) * 5 / 9, fromBase: v => (v + 273.15) * 9 / 5 },
  ],
  data: [
    { label: "Bit", symbol: "b", toBase: v => v, fromBase: v => v },
    { label: "Byte", symbol: "B", toBase: v => v * 8, fromBase: v => v / 8 },
    { label: "Kilobyte", symbol: "KB", toBase: v => v * 8000, fromBase: v => v / 8000 },
    { label: "Megabyte", symbol: "MB", toBase: v => v * 8e6, fromBase: v => v / 8e6 },
    { label: "Gigabyte", symbol: "GB", toBase: v => v * 8e9, fromBase: v => v / 8e9 },
    { label: "Terabyte", symbol: "TB", toBase: v => v * 8e12, fromBase: v => v / 8e12 },
    { label: "Kibibyte", symbol: "KiB", toBase: v => v * 8192, fromBase: v => v / 8192 },
    { label: "Mebibyte", symbol: "MiB", toBase: v => v * 8 * 1024 ** 2, fromBase: v => v / (8 * 1024 ** 2) },
    { label: "Gibibyte", symbol: "GiB", toBase: v => v * 8 * 1024 ** 3, fromBase: v => v / (8 * 1024 ** 3) },
    { label: "Tebibyte", symbol: "TiB", toBase: v => v * 8 * 1024 ** 4, fromBase: v => v / (8 * 1024 ** 4) },
  ],
  time: [
    { label: "Nanosecond", symbol: "ns", toBase: v => v / 1e9, fromBase: v => v * 1e9 },
    { label: "Microsecond", symbol: "μs", toBase: v => v / 1e6, fromBase: v => v * 1e6 },
    { label: "Millisecond", symbol: "ms", toBase: v => v / 1000, fromBase: v => v * 1000 },
    { label: "Second", symbol: "s", toBase: v => v, fromBase: v => v },
    { label: "Minute", symbol: "min", toBase: v => v * 60, fromBase: v => v / 60 },
    { label: "Hour", symbol: "h", toBase: v => v * 3600, fromBase: v => v / 3600 },
    { label: "Day", symbol: "d", toBase: v => v * 86400, fromBase: v => v / 86400 },
    { label: "Week", symbol: "wk", toBase: v => v * 604800, fromBase: v => v / 604800 },
    { label: "Year (365d)", symbol: "yr", toBase: v => v * 31536000, fromBase: v => v / 31536000 },
  ],
  speed: [
    { label: "m/s", symbol: "m/s", toBase: v => v, fromBase: v => v },
    { label: "km/h", symbol: "km/h", toBase: v => v / 3.6, fromBase: v => v * 3.6 },
    { label: "mph", symbol: "mph", toBase: v => v * 0.44704, fromBase: v => v / 0.44704 },
    { label: "knot", symbol: "kn", toBase: v => v * 0.514444, fromBase: v => v / 0.514444 },
    { label: "ft/s", symbol: "ft/s", toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
    { label: "Mach (sea level)", symbol: "M", toBase: v => v * 340.29, fromBase: v => v / 340.29 },
  ],
  area: [
    { label: "km²", symbol: "km²", toBase: v => v * 1e6, fromBase: v => v / 1e6 },
    { label: "m²", symbol: "m²", toBase: v => v, fromBase: v => v },
    { label: "cm²", symbol: "cm²", toBase: v => v / 1e4, fromBase: v => v * 1e4 },
    { label: "Hectare", symbol: "ha", toBase: v => v * 1e4, fromBase: v => v / 1e4 },
    { label: "Acre", symbol: "ac", toBase: v => v * 4046.856, fromBase: v => v / 4046.856 },
    { label: "sq mile", symbol: "mi²", toBase: v => v * 2589988, fromBase: v => v / 2589988 },
    { label: "sq yard", symbol: "yd²", toBase: v => v * 0.836127, fromBase: v => v / 0.836127 },
    { label: "sq foot", symbol: "ft²", toBase: v => v * 0.092903, fromBase: v => v / 0.092903 },
    { label: "sq inch", symbol: "in²", toBase: v => v * 0.00064516, fromBase: v => v / 0.00064516 },
  ],
};

const CATEGORY_LABELS: Record<Category, string> = {
  length: "Length",
  mass: "Mass / Weight",
  temperature: "Temperature",
  data: "Data Size",
  time: "Time",
  speed: "Speed",
  area: "Area",
};

function formatValue(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e12 || (abs < 1e-6 && abs > 0)) return v.toExponential(6).replace(/\.?0+e/, "e");
  if (abs < 0.0001) return v.toPrecision(6).replace(/\.?0+$/, "");
  const fixed = parseFloat(v.toPrecision(10));
  return String(fixed);
}

export default function UnitConverter({ onClose }: UnitConverterProps) {
  const [category, setCategory] = useState<Category>("length");
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(1);
  const [inputVal, setInputVal] = useState("1");
  const [copied, setCopied] = useState<string | null>(null);

  const units = UNITS[category];

  const fromUnit = units[fromIdx] ?? units[0];
  const toUnit = units[toIdx] ?? units[1];

  const result = useMemo(() => {
    const n = parseFloat(inputVal.trim());
    if (!Number.isFinite(n)) return null;
    const base = fromUnit.toBase(n);
    return toUnit.fromBase(base);
  }, [inputVal, fromUnit, toUnit]);

  // All conversions from the input value
  const allResults = useMemo(() => {
    const n = parseFloat(inputVal.trim());
    if (!Number.isFinite(n)) return null;
    const base = fromUnit.toBase(n);
    return units.map((u) => ({ ...u, result: u.fromBase(base) }));
  }, [inputVal, fromUnit, units]);

  function swapUnits() {
    const oldFrom = fromIdx;
    setFromIdx(toIdx);
    setToIdx(oldFrom);
    if (result !== null) setInputVal(formatValue(result));
  }

  function changeCategory(cat: Category) {
    setCategory(cat);
    setFromIdx(0);
    setToIdx(1);
    setInputVal("1");
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const inputIsValid = Number.isFinite(parseFloat(inputVal.trim()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Unit Converter</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        {/* Category picker */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-gray-700 shrink-0 flex-wrap">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => changeCategory(cat)}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${
                category === cat ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {/* Primary converter */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              {/* From */}
              <div className="flex-1 flex flex-col gap-1">
                <select
                  value={fromIdx}
                  onChange={(e) => setFromIdx(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {units.map((u, i) => (
                    <option key={u.symbol} value={i}>{u.label} ({u.symbol})</option>
                  ))}
                </select>
                <input
                  autoFocus
                  type="number"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className={`bg-gray-800 border rounded px-3 py-2 text-sm font-mono text-gray-100 focus:outline-none focus:ring-1 ${
                    inputIsValid || !inputVal.trim() ? "border-gray-600 focus:ring-blue-500" : "border-red-700 focus:ring-red-500"
                  }`}
                  placeholder="Enter value"
                  spellCheck={false}
                />
              </div>

              {/* Swap */}
              <button
                onClick={swapUnits}
                className="shrink-0 mt-5 px-2 py-2 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors text-base"
                title="Swap units"
              >
                ⇄
              </button>

              {/* To */}
              <div className="flex-1 flex flex-col gap-1">
                <select
                  value={toIdx}
                  onChange={(e) => setToIdx(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {units.map((u, i) => (
                    <option key={u.symbol} value={i}>{u.label} ({u.symbol})</option>
                  ))}
                </select>
                <div
                  className={`bg-gray-800/60 border rounded px-3 py-2 text-sm font-mono min-h-[38px] ${
                    result !== null ? "text-blue-300 border-blue-900/40" : "text-gray-600 border-gray-700"
                  }`}
                >
                  {result !== null ? formatValue(result) : "—"}
                  {result !== null && (
                    <span className="text-[10px] text-gray-500 ml-1.5">{toUnit.symbol}</span>
                  )}
                </div>
              </div>

              {/* Copy result */}
              {result !== null && (
                <button
                  onClick={() => copy(formatValue(result!), "main")}
                  className={`shrink-0 mt-5 text-xs px-2 py-2 rounded transition-colors ${
                    copied === "main" ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                  title="Copy result"
                >
                  {copied === "main" ? "✓" : "copy"}
                </button>
              )}
            </div>
            {inputVal.trim() && !inputIsValid && (
              <p className="text-[10px] text-red-400 mt-1.5">Invalid number</p>
            )}
          </div>

          {/* All-units table */}
          {allResults && (
            <div className="px-4 pb-4">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                All {CATEGORY_LABELS[category]} Units
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden">
                {allResults.map((u, i) => {
                  const isFrom = i === fromIdx;
                  const isTo = i === toIdx;
                  const key = `row-${u.symbol}`;
                  return (
                    <div
                      key={u.symbol}
                      className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-700/30 last:border-0 group ${
                        isFrom ? "bg-blue-900/15" : isTo ? "bg-indigo-900/15" : ""
                      }`}
                    >
                      <span className="text-[10px] text-gray-500 w-14 shrink-0 font-mono">{u.symbol}</span>
                      <span className="text-[10px] text-gray-600 flex-[2] truncate">{u.label}</span>
                      <span className={`text-xs font-mono flex-[3] text-right ${isFrom ? "text-blue-300" : isTo ? "text-indigo-300" : "text-gray-300"}`}>
                        {formatValue(u.result)}
                      </span>
                      {(isFrom || isTo) && (
                        <span className={`text-[8px] px-1 py-0.5 rounded shrink-0 ${isFrom ? "bg-blue-800 text-blue-300" : "bg-indigo-800 text-indigo-300"}`}>
                          {isFrom ? "from" : "to"}
                        </span>
                      )}
                      <button
                        onClick={() => copy(formatValue(u.result), key)}
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
        </div>
      </div>
    </div>
  );
}
