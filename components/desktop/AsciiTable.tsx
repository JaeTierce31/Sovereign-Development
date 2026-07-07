"use client";
import { useMemo, useState } from "react";

interface AsciiTableProps {
  onClose: () => void;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const CONTROL_NAMES: Record<number, string> = {
  0:"NUL",1:"SOH",2:"STX",3:"ETX",4:"EOT",5:"ENQ",6:"ACK",7:"BEL",
  8:"BS",9:"HT",10:"LF",11:"VT",12:"FF",13:"CR",14:"SO",15:"SI",
  16:"DLE",17:"DC1",18:"DC2",19:"DC3",20:"DC4",21:"NAK",22:"SYN",23:"ETB",
  24:"CAN",25:"EM",26:"SUB",27:"ESC",28:"FS",29:"GS",30:"RS",31:"US",
  127:"DEL",
};

interface UnicodeBlock { name: string; start: number; end: number }

const UNICODE_BLOCKS: UnicodeBlock[] = [
  { name: "ASCII Printable",   start: 32,    end: 126   },
  { name: "Latin-1 Supplement",start: 160,   end: 255   },
  { name: "Latin Extended-A",  start: 256,   end: 383   },
  { name: "Greek & Coptic",    start: 880,   end: 1023  },
  { name: "Cyrillic",          start: 1024,  end: 1279  },
  { name: "General Punctuation",start: 8192, end: 8303  },
  { name: "Currency Symbols",  start: 8352,  end: 8399  },
  { name: "Letterlike Symbols",start: 8448,  end: 8527  },
  { name: "Number Forms",      start: 8528,  end: 8591  },
  { name: "Arrows",            start: 8592,  end: 8703  },
  { name: "Mathematical Ops",  start: 8704,  end: 8959  },
  { name: "Box Drawing",       start: 9472,  end: 9599  },
  { name: "Block Elements",    start: 9600,  end: 9631  },
  { name: "Geometric Shapes",  start: 9632,  end: 9727  },
  { name: "Misc Symbols",      start: 9728,  end: 9983  },
  { name: "Dingbats",          start: 9984,  end: 10175 },
  { name: "Emoticons",         start: 128512,end: 128591},
  { name: "Misc Symbols & Pict",start:128064,end: 128511},
  { name: "Transport & Map",   start: 128640,end: 128767},
];

interface CharEntry { cp: number; char: string; name: string; category: string }

function getCharEntry(cp: number): CharEntry {
  const char = cp < 32 || cp === 127 ? "" : String.fromCodePoint(cp);
  const ctrl = CONTROL_NAMES[cp];
  const name = ctrl ? `${ctrl} (U+${cp.toString(16).toUpperCase().padStart(4,"0")})` : `U+${cp.toString(16).toUpperCase().padStart(4,"0")}`;
  const category = cp < 32 || cp === 127 ? "control"
    : cp < 127 ? "ascii"
    : cp < 256 ? "latin1"
    : "unicode";
  return { cp, char, name, category };
}

type CopyMode = "char" | "hex" | "decimal" | "escape";

const COPY_MODE_LABELS: { mode: CopyMode; label: string }[] = [
  { mode: "char",    label: "Char"    },
  { mode: "hex",     label: "Hex"     },
  { mode: "decimal", label: "Dec"     },
  { mode: "escape",  label: "\\uXXXX" },
];

function copyValue(entry: CharEntry, mode: CopyMode): string {
  switch (mode) {
    case "char":    return entry.char || `\\x${entry.cp.toString(16).padStart(2,"0")}`;
    case "hex":     return `0x${entry.cp.toString(16).toUpperCase().padStart(2,"0")}`;
    case "decimal": return String(entry.cp);
    case "escape":  return entry.cp > 0xFFFF
      ? `\\u{${entry.cp.toString(16).toUpperCase()}}`
      : `\\u${entry.cp.toString(16).toUpperCase().padStart(4,"0")}`;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AsciiTable({ onClose }: AsciiTableProps) {
  const [search, setSearch]           = useState("");
  const [block, setBlock]             = useState<UnicodeBlock>(UNICODE_BLOCKS[0]);
  const [copyMode, setCopyMode]       = useState<CopyMode>("char");
  const [copied, setCopied]           = useState<number | null>(null);
  const [selected, setSelected]       = useState<CharEntry | null>(null);

  const chars = useMemo<CharEntry[]>(() => {
    const entries: CharEntry[] = [];
    for (let cp = block.start; cp <= block.end; cp++) {
      try { entries.push(getCharEntry(cp)); } catch { /* skip surrogates */ }
    }
    return entries;
  }, [block]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chars;
    return chars.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.char === q ||
      e.cp.toString() === q ||
      e.cp.toString(16).toLowerCase() === q.replace(/^0x/, "") ||
      ("u+" + e.cp.toString(16)) === q
    );
  }, [chars, search]);

  function copy(entry: CharEntry) {
    const val = copyValue(entry, copyMode);
    navigator.clipboard.writeText(val).then(() => {
      setCopied(entry.cp);
      setTimeout(() => setCopied(null), 1200);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">ASCII / Unicode Table</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        {/* Controls */}
        <div className="px-4 py-2.5 border-b border-gray-700 shrink-0 flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, char, dec, hex…"
            className="flex-1 min-w-32 bg-gray-800 border border-gray-600 rounded px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-600"
            spellCheck={false}
          />
          <select
            value={block.name}
            onChange={(e) => {
              const b = UNICODE_BLOCKS.find((b) => b.name === e.target.value);
              if (b) { setBlock(b); setSearch(""); }
            }}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {UNICODE_BLOCKS.map((b) => (
              <option key={b.name} value={b.name}>{b.name} (U+{b.start.toString(16).toUpperCase().padStart(4,"0")}–{b.end.toString(16).toUpperCase().padStart(4,"0")})</option>
            ))}
          </select>
          <div className="flex items-center gap-0.5">
            {COPY_MODE_LABELS.map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => setCopyMode(mode)}
                className={`text-[10px] px-2 py-1 rounded transition-colors ${copyMode === mode ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Grid */}
          <div className="flex-1 overflow-auto p-3">
            {filtered.length === 0 ? (
              <div className="text-[11px] text-gray-600 text-center py-8">No characters match</div>
            ) : (
              <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))" }}>
                {filtered.map((entry) => {
                  const isCopied   = copied === entry.cp;
                  const isSelected = selected?.cp === entry.cp;
                  return (
                    <button
                      key={entry.cp}
                      onClick={() => { setSelected(entry); copy(entry); }}
                      title={entry.name}
                      className={`relative flex flex-col items-center justify-center rounded py-1.5 text-center transition-colors group ${
                        isSelected ? "bg-blue-700/40 border border-blue-600/50" :
                        isCopied   ? "bg-green-800/30 border border-green-700/40" :
                        "bg-gray-800/50 border border-gray-700/30 hover:bg-gray-700/60 hover:border-gray-600/50"
                      }`}
                    >
                      <span className={`text-base leading-none ${entry.category === "control" ? "text-gray-600 text-[10px]" : "text-gray-100"}`}>
                        {entry.category === "control" ? CONTROL_NAMES[entry.cp] : entry.char}
                      </span>
                      <span className="text-[8px] text-gray-600 mt-0.5 font-mono">
                        {isCopied ? "✓" : entry.cp.toString(16).toUpperCase().padStart(2,"0")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-48 shrink-0 border-l border-gray-700 p-3 space-y-3 overflow-auto">
              <div className="text-center">
                <div className="text-5xl leading-none py-2 text-gray-100">
                  {selected.category === "control" ? (
                    <span className="text-lg text-gray-500">{CONTROL_NAMES[selected.cp]}</span>
                  ) : selected.char}
                </div>
              </div>
              <div className="space-y-1.5 text-[10px]">
                {[
                  ["Codepoint", `U+${selected.cp.toString(16).toUpperCase().padStart(4,"0")}`],
                  ["Decimal",   String(selected.cp)],
                  ["Hex",       `0x${selected.cp.toString(16).toUpperCase().padStart(2,"0")}`],
                  ["Octal",     `0o${selected.cp.toString(8)}`],
                  ["Binary",    selected.cp.toString(2).padStart(8,"0")],
                  ["Escape",    copyValue(selected, "escape")],
                  ["HTML ent.", selected.cp < 128 ? `&#${selected.cp};` : `&#x${selected.cp.toString(16)};`],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="text-gray-600 w-16 shrink-0">{label}</span>
                    <span className="font-mono text-gray-300 flex-1 break-all">{val}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {COPY_MODE_LABELS.map(({ mode, label }) => {
                  const key = `detail-${mode}`;
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        const val = copyValue(selected, mode);
                        navigator.clipboard.writeText(val).then(() => {
                          setCopied(selected.cp);
                          setTimeout(() => setCopied(null), 1200);
                        });
                      }}
                      className="w-full text-[10px] px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors text-left flex items-center justify-between"
                    >
                      <span>{label}</span>
                      <span className="font-mono text-gray-500 truncate max-w-24">{copyValue(selected, mode)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-700 shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-gray-600">
            {filtered.length} character{filtered.length !== 1 ? "s" : ""} · click to copy
          </span>
          <span className="text-[10px] text-gray-600">Copy mode: <span className="text-gray-400">{copyMode}</span></span>
        </div>
      </div>
    </div>
  );
}
