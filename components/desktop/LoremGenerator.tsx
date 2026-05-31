"use client";
import { useMemo, useState } from "react";

interface LoremGeneratorProps {
  onClose: () => void;
}

type OutputType = "paragraphs" | "sentences" | "words";
type Format = "plain" | "html" | "markdown";

const WORDS = [
  "lorem","ipsum","dolor","sit","amet","consectetur","adipiscing","elit","sed","do",
  "eiusmod","tempor","incididunt","ut","labore","et","dolore","magna","aliqua","enim",
  "ad","minim","veniam","quis","nostrud","exercitation","ullamco","laboris","nisi",
  "aliquip","ex","ea","commodo","consequat","duis","aute","irure","in","reprehenderit",
  "voluptate","velit","esse","cillum","fugiat","nulla","pariatur","excepteur","sint",
  "occaecat","cupidatat","non","proident","sunt","culpa","qui","officia","deserunt",
  "mollit","anim","id","est","laborum","perspiciatis","unde","omnis","iste","natus",
  "error","accusantium","doloremque","laudantium","totam","rem","aperiam","eaque",
  "ipsa","quae","ab","illo","inventore","veritatis","quasi","architecto","beatae",
  "vitae","dicta","explicabo","nemo","ipsam","quia","voluptas","aspernatur","aut",
  "odit","fugit","consequuntur","magni","dolores","eos","ratione","sequi","nesciunt",
  "neque","porro","quisquam","dolorem","adipisci","numquam","eius","modi","tempora",
  "incidunt","magnam","quaerat","voluptatem","suscipit","laboriosam","nisi","aliquid",
  "ex","ea","voluptatis","vero","eum","iure","reprehenderit","qui","quasi",
];

// Seeded pseudo-random for reproducible results within a render
class LCG {
  private s: number;
  constructor(seed: number) { this.s = seed >>> 0; }
  next(): number {
    this.s = Math.imul(1664525, this.s) + 1013904223 >>> 0;
    return this.s / 0x100000000;
  }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  int(lo: number, hi: number): number { return lo + Math.floor(this.next() * (hi - lo + 1)); }
}

function sentence(rng: LCG): string {
  const len = rng.int(8, 18);
  const ws: string[] = [];
  for (let i = 0; i < len; i++) ws.push(rng.pick(WORDS));
  ws[0] = ws[0].charAt(0).toUpperCase() + ws[0].slice(1);
  // occasional comma
  for (let i = 2; i < ws.length - 1; i++) {
    if (rng.next() < 0.18) ws[i] += ",";
  }
  return ws.join(" ") + ".";
}

function paragraph(rng: LCG): string {
  const count = rng.int(3, 6);
  const sents: string[] = [];
  for (let i = 0; i < count; i++) sents.push(sentence(rng));
  return sents.join(" ");
}

function generateText(type: OutputType, count: number, format: Format, seed: number): string {
  const rng = new LCG(seed);
  let chunks: string[] = [];

  if (type === "paragraphs") {
    for (let i = 0; i < count; i++) chunks.push(paragraph(rng));
  } else if (type === "sentences") {
    for (let i = 0; i < count; i++) chunks.push(sentence(rng));
  } else {
    const ws: string[] = [];
    for (let i = 0; i < count; i++) ws.push(rng.pick(WORDS));
    chunks = [ws.join(" ")];
  }

  if (format === "html") {
    if (type === "words") return `<p>${chunks[0]}</p>`;
    return chunks.map((c) => `<p>${c}</p>`).join("\n");
  }
  if (format === "markdown") {
    if (type === "words") return chunks[0];
    return chunks.join("\n\n");
  }
  // plain
  if (type === "words") return chunks[0];
  return chunks.join("\n\n");
}

const CLASSIC_OPENER = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

export default function LoremGenerator({ onClose }: LoremGeneratorProps) {
  const [type, setType] = useState<OutputType>("paragraphs");
  const [count, setCount] = useState(3);
  const [format, setFormat] = useState<Format>("plain");
  const [classicStart, setClassicStart] = useState(true);
  const [seed, setSeed] = useState(42);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    let text = generateText(type, count, format, seed);
    if (classicStart && type !== "words") {
      if (format === "html") {
        text = text.replace(/^<p>.*?<\/p>/, `<p>${CLASSIC_OPENER}</p>`);
      } else {
        text = text.replace(/^[^\n]+/, CLASSIC_OPENER);
      }
    }
    return text;
  }, [type, count, format, classicStart, seed]);

  function regenerate() { setSeed((s) => s + 1); }

  function copy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const maxCount = type === "words" ? 200 : type === "sentences" ? 30 : 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Lorem Ipsum Generator</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        {/* Controls */}
        <div className="px-4 py-3 border-b border-gray-700 shrink-0 flex flex-wrap items-center gap-3">
          {/* Type */}
          <div className="flex items-center gap-1">
            {(["paragraphs", "sentences", "words"] as OutputType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setType(t); setCount(t === "words" ? 50 : t === "sentences" ? 5 : 3); }}
                className={`text-xs px-2.5 py-1 rounded transition-colors capitalize ${
                  type === t ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Count */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500">Count:</span>
            <input
              type="number"
              min={1}
              max={maxCount}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(maxCount, Number(e.target.value) || 1)))}
              className="w-14 bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-xs font-mono text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Format */}
          <div className="flex items-center gap-1">
            {(["plain", "html", "markdown"] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors capitalize ${
                  format === f ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {f === "markdown" ? "Markdown" : f === "html" ? "HTML" : "Plain"}
              </button>
            ))}
          </div>

          {/* Classic start toggle */}
          {type !== "words" && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={classicStart}
                onChange={(e) => setClassicStart(e.target.checked)}
                className="w-3 h-3 accent-blue-500"
              />
              <span className="text-[10px] text-gray-400">Classic start</span>
            </label>
          )}

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={regenerate}
              className="text-xs px-2.5 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
              title="Generate new random text"
            >
              ↺ New
            </button>
            <button
              onClick={copy}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${copied ? "bg-green-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="flex-1 overflow-auto px-4 py-3">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Output</span>
            <span className="text-gray-600 font-normal normal-case">
              {output.split(/\s+/).filter(Boolean).length} words · {output.length} chars
            </span>
          </div>
          <pre className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 select-all">
            {output}
          </pre>
        </div>
      </div>
    </div>
  );
}
