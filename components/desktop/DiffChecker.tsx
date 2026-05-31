"use client";
import { useMemo, useState } from "react";

interface DiffCheckerProps {
  onClose: () => void;
}

type DiffLineKind = "equal" | "add" | "remove";

interface DiffLine {
  kind: DiffLineKind;
  text: string;
  leftNum: number | null;
  rightNum: number | null;
}

// Myers diff algorithm on line arrays
function diffLines(aLines: string[], bLines: string[]): DiffLine[] {
  const n = aLines.length;
  const m = bLines.length;
  const max = n + m;
  const v: number[] = new Array(2 * max + 1).fill(0);
  const trace: number[][] = [];

  for (let d = 0; d <= max; d++) {
    trace.push([...v]);
    for (let k = -d; k <= d; k += 2) {
      let x: number;
      const ki = k + max;
      if (k === -d || (k !== d && v[ki - 1] < v[ki + 1])) {
        x = v[ki + 1];
      } else {
        x = v[ki - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && aLines[x] === bLines[y]) { x++; y++; }
      v[ki] = x;
      if (x >= n && y >= m) {
        // backtrack
        return backtrack(trace, aLines, bLines, n, m, max, d);
      }
    }
  }
  return backtrack(trace, aLines, bLines, n, m, max, max);
}

function backtrack(trace: number[][], a: string[], b: string[], n: number, m: number, max: number, d: number): DiffLine[] {
  const ops: Array<{ kind: DiffLineKind; ai: number; bi: number }> = [];
  let x = n; let y = m;
  for (let i = d; i > 0; i--) {
    const v = trace[i];
    const k = x - y;
    const ki = k + max;
    let prevK: number;
    if (k === -i || (k !== i && v[ki - 1] < v[ki + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }
    const prevX = v[prevK + max];
    const prevY = prevX - prevK;
    while (x > prevX + 1 && y > prevY + 1) { x--; y--; ops.unshift({ kind: "equal", ai: x - 1, bi: y - 1 }); }
    if (x === prevX + 1 && y === prevY) {
      ops.unshift({ kind: "remove", ai: x - 1, bi: -1 });
    } else if (y === prevY + 1 && x === prevX) {
      ops.unshift({ kind: "add", ai: -1, bi: y - 1 });
    } else {
      x--; y--; ops.unshift({ kind: "equal", ai: x, bi: y });
    }
    x = prevX; y = prevY;
  }
  while (x > 0 && y > 0) { x--; y--; ops.unshift({ kind: "equal", ai: x, bi: y }); }

  let leftNum = 0; let rightNum = 0;
  return ops.map((op) => {
    if (op.kind === "equal") { leftNum++; rightNum++; return { kind: "equal", text: a[op.ai], leftNum, rightNum }; }
    if (op.kind === "remove") { leftNum++; return { kind: "remove", text: a[op.ai], leftNum, rightNum: null }; }
    rightNum++; return { kind: "add", text: b[op.bi], leftNum: null, rightNum };
  });
}

function buildDiff(left: string, right: string): DiffLine[] {
  const aLines = left.split("\n");
  const bLines = right.split("\n");
  return diffLines(aLines, bLines);
}

export default function DiffChecker({ onClose }: DiffCheckerProps) {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [view, setView] = useState<"split" | "unified">("split");
  const [copied, setCopied] = useState(false);

  const diffResult = useMemo(() => {
    if (!left && !right) return [];
    return buildDiff(left, right);
  }, [left, right]);

  const stats = useMemo(() => {
    const adds = diffResult.filter((l) => l.kind === "add").length;
    const removes = diffResult.filter((l) => l.kind === "remove").length;
    return { adds, removes };
  }, [diffResult]);

  function copyUnified() {
    const text = diffResult.map((l) => {
      if (l.kind === "add") return `+ ${l.text}`;
      if (l.kind === "remove") return `- ${l.text}`;
      return `  ${l.text}`;
    }).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function swap() {
    const tmp = left;
    setLeft(right);
    setRight(tmp);
  }

  const bgFor = (kind: DiffLineKind) => {
    if (kind === "add") return "bg-green-950/60";
    if (kind === "remove") return "bg-red-950/60";
    return "";
  };
  const textFor = (kind: DiffLineKind) => {
    if (kind === "add") return "text-green-300";
    if (kind === "remove") return "text-red-300";
    return "text-gray-400";
  };
  const prefixFor = (kind: DiffLineKind) => {
    if (kind === "add") return "+";
    if (kind === "remove") return "-";
    return " ";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Diff Checker</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700 shrink-0 flex-wrap">
          {(["split", "unified"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-2.5 py-1 rounded transition-colors capitalize ${
                view === v ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {v === "split" ? "Split" : "Unified"}
            </button>
          ))}
          <button
            onClick={swap}
            className="text-xs px-2.5 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
            title="Swap left and right"
          >
            ⇄ Swap
          </button>
          {diffResult.length > 0 && (
            <div className="flex items-center gap-2 text-xs ml-2">
              <span className="text-green-400">+{stats.adds}</span>
              <span className="text-red-400">−{stats.removes}</span>
            </div>
          )}
          <div className="ml-auto">
            <button
              onClick={copyUnified}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${copied ? "bg-green-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
            >
              {copied ? "Copied!" : "Copy diff"}
            </button>
          </div>
        </div>

        {/* Input row */}
        <div className="flex shrink-0 border-b border-gray-700" style={{ height: "160px" }}>
          <div className="flex-1 flex flex-col border-r border-gray-700">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-700/50 shrink-0">
              Original (left)
            </div>
            <textarea
              autoFocus
              value={left}
              onChange={(e) => setLeft(e.target.value)}
              placeholder={"Paste original text here…"}
              className="flex-1 resize-none bg-transparent px-3 py-2 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none placeholder-gray-700"
              spellCheck={false}
            />
          </div>
          <div className="flex-1 flex flex-col">
            <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-700/50 shrink-0">
              Modified (right)
            </div>
            <textarea
              value={right}
              onChange={(e) => setRight(e.target.value)}
              placeholder={"Paste modified text here…"}
              className="flex-1 resize-none bg-transparent px-3 py-2 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none placeholder-gray-700"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Diff output */}
        <div className="flex-1 overflow-auto min-h-0">
          {diffResult.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[10px] text-gray-600">
              Paste text in both panels above to see the diff
            </div>
          ) : view === "unified" ? (
            <table className="w-full text-xs font-mono leading-5 border-collapse">
              <tbody>
                {diffResult.map((line, i) => (
                  <tr key={i} className={bgFor(line.kind)}>
                    <td className="select-none text-[10px] text-gray-600 text-right pr-2 pl-3 w-8 border-r border-gray-800">
                      {line.leftNum ?? ""}
                    </td>
                    <td className="select-none text-[10px] text-gray-600 text-right pr-2 w-8 border-r border-gray-800">
                      {line.rightNum ?? ""}
                    </td>
                    <td className={`select-none pl-1 pr-2 w-4 ${textFor(line.kind)}`}>{prefixFor(line.kind)}</td>
                    <td className={`pl-2 pr-4 py-px whitespace-pre ${textFor(line.kind)}`}>{line.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Split view */
            <div className="flex h-full min-h-0">
              {/* Left */}
              <div className="flex-1 border-r border-gray-700 overflow-auto">
                <table className="w-full text-xs font-mono leading-5 border-collapse">
                  <tbody>
                    {diffResult.filter((l) => l.kind !== "add").map((line, i) => (
                      <tr key={i} className={bgFor(line.kind)}>
                        <td className="select-none text-[10px] text-gray-600 text-right pr-2 pl-3 w-8 border-r border-gray-800">
                          {line.leftNum}
                        </td>
                        <td className={`pl-2 pr-4 py-px whitespace-pre ${textFor(line.kind)}`}>{line.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Right */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs font-mono leading-5 border-collapse">
                  <tbody>
                    {diffResult.filter((l) => l.kind !== "remove").map((line, i) => (
                      <tr key={i} className={bgFor(line.kind)}>
                        <td className="select-none text-[10px] text-gray-600 text-right pr-2 pl-3 w-8 border-r border-gray-800">
                          {line.rightNum}
                        </td>
                        <td className={`pl-2 pr-4 py-px whitespace-pre ${textFor(line.kind)}`}>{line.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
