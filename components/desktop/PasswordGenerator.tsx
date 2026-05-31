"use client";
import { useCallback, useMemo, useState } from "react";

interface PasswordGeneratorProps {
  onClose: () => void;
}

// ── Character sets ─────────────────────────────────────────────────────────────

const SETS = {
  upper:   "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower:   "abcdefghijklmnopqrstuvwxyz",
  digits:  "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}|;:,.<>?",
  ambig:   "Il1O0",
} as const;

function buildAlphabet(opts: CharOptions): string {
  let pool = "";
  if (opts.upper)   pool += SETS.upper;
  if (opts.lower)   pool += SETS.lower;
  if (opts.digits)  pool += SETS.digits;
  if (opts.symbols) pool += SETS.symbols;
  if (opts.excludeAmbig) {
    pool = [...pool].filter((c) => !SETS.ambig.includes(c)).join("");
  }
  return pool || SETS.lower;
}

function generatePassword(length: number, alphabet: string): string {
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => alphabet[n % alphabet.length]).join("");
}

// ── Entropy ────────────────────────────────────────────────────────────────────

function entropy(length: number, poolSize: number): number {
  return length * Math.log2(poolSize);
}

function entropyLabel(bits: number): { label: string; color: string } {
  if (bits < 40)  return { label: "Very Weak",  color: "text-red-400" };
  if (bits < 60)  return { label: "Weak",        color: "text-orange-400" };
  if (bits < 80)  return { label: "Fair",         color: "text-yellow-400" };
  if (bits < 100) return { label: "Strong",       color: "text-blue-400" };
  return             { label: "Very Strong", color: "text-green-400" };
}

// ── Strength bar ───────────────────────────────────────────────────────────────

function StrengthBar({ bits }: { bits: number }) {
  const pct = Math.min(100, (bits / 128) * 100);
  const { label, color } = entropyLabel(bits);
  const barColor =
    bits < 40  ? "bg-red-500"
    : bits < 60  ? "bg-orange-500"
    : bits < 80  ? "bg-yellow-500"
    : bits < 100 ? "bg-blue-500"
    : "bg-green-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-semibold ${color}`}>{label}</span>
        <span className="text-[10px] text-gray-500 font-mono">{bits.toFixed(1)} bits</span>
      </div>
      <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface CharOptions {
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbig: boolean;
}

const LENGTHS = [8, 12, 16, 20, 24, 32, 48, 64] as const;
const COUNTS  = [1, 5, 10, 20] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function PasswordGenerator({ onClose }: PasswordGeneratorProps) {
  const [length, setLength]   = useState(16);
  const [count, setCount]     = useState(1);
  const [opts, setOpts]       = useState<CharOptions>({
    upper: true, lower: true, digits: true, symbols: true, excludeAmbig: false,
  });
  const [passwords, setPasswords] = useState<string[]>(() => {
    const alpha = buildAlphabet({ upper: true, lower: true, digits: true, symbols: true, excludeAmbig: false });
    return [generatePassword(16, alpha)];
  });
  const [copied, setCopied]   = useState<string | null>(null);

  const alphabet = useMemo(() => buildAlphabet(opts), [opts]);

  const bits = useMemo(() => entropy(length, alphabet.length), [length, alphabet.length]);

  const generate = useCallback(() => {
    setPasswords(Array.from({ length: count }, () => generatePassword(length, alphabet)));
  }, [length, count, alphabet]);

  function toggleOpt(key: keyof CharOptions) {
    setOpts((prev) => ({ ...prev, [key]: !prev[key] }));
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
        className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Password Generator</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Length */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Length</span>
              <span className="text-xs font-mono text-gray-400">{length}</span>
            </div>
            <input
              type="range"
              min={4}
              max={128}
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {LENGTHS.map((n) => (
                <button
                  key={n}
                  onClick={() => setLength(n)}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${length === n ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Character sets */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Characters</div>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                ["upper",        "A–Z uppercase"],
                ["lower",        "a–z lowercase"],
                ["digits",       "0–9 numbers"],
                ["symbols",      "!@#$… symbols"],
                ["excludeAmbig", "Exclude Il1O0"],
              ] as [keyof CharOptions, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleOpt(key)}
                  className={`flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg border text-[11px] transition-colors ${
                    opts[key]
                      ? key === "excludeAmbig"
                        ? "bg-orange-900/30 border-orange-700/50 text-orange-300"
                        : "bg-blue-900/30 border-blue-700/50 text-blue-300"
                      : "bg-gray-800/40 border-gray-700/30 text-gray-500"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center text-[8px] ${opts[key] ? "bg-blue-500 border-blue-400 text-white" : "border-gray-600"}`}>
                    {opts[key] ? "✓" : ""}
                  </span>
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-1.5 text-[10px] text-gray-600">Pool size: {alphabet.length} characters</div>
          </div>

          {/* Entropy */}
          <StrengthBar bits={bits} />

          {/* Count + Generate */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`text-[10px] px-2 py-1 rounded font-mono transition-colors ${count === n ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
                >
                  ×{n}
                </button>
              ))}
            </div>
            <button
              onClick={generate}
              className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              Generate {count === 1 ? "Password" : `${count} Passwords`}
            </button>
          </div>

          {/* Results */}
          {passwords.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  {passwords.length === 1 ? "Result" : `Results (${passwords.length})`}
                </span>
                {passwords.length > 1 && (
                  <button
                    onClick={() => copy(passwords.join("\n"), "all")}
                    className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${copied === "all" ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                  >
                    {copied === "all" ? "✓ copied all" : "copy all"}
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-52 overflow-auto">
                {passwords.map((pw, i) => (
                  <div
                    key={i}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/30 hover:border-gray-600/50 transition-colors"
                  >
                    <span className="text-xs font-mono text-gray-300 flex-1 select-all break-all">{pw}</span>
                    <button
                      onClick={() => copy(pw, `pw-${i}`)}
                      className={`text-[9px] px-1.5 py-0.5 rounded transition-colors shrink-0 opacity-0 group-hover:opacity-100 ${copied === `pw-${i}` ? "bg-green-700 text-white opacity-100" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
                    >
                      {copied === `pw-${i}` ? "✓" : "copy"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
