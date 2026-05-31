"use client";
import { useMemo, useState, useCallback } from "react";

interface MarkdownTableGeneratorProps {
  onClose: () => void;
}

type Align = "left" | "center" | "right" | "none";

const ALIGN_LABELS: { align: Align; symbol: string; title: string }[] = [
  { align: "none",   symbol: "—",  title: "No alignment" },
  { align: "left",   symbol: "⇤",  title: "Left align" },
  { align: "center", symbol: "⇔",  title: "Center align" },
  { align: "right",  symbol: "⇥",  title: "Right align" },
];

function alignMarker(a: Align): string {
  if (a === "left")   return ":---";
  if (a === "center") return ":---:";
  if (a === "right")  return "---:";
  return "---";
}

function buildMarkdown(headers: string[], rows: string[][], aligns: Align[], compact: boolean): string {
  const cols = headers.length;
  if (cols === 0) return "";

  const colWidths: number[] = Array.from({ length: cols }, (_, i) => {
    const headerLen = headers[i].length || 1;
    const markerLen = alignMarker(aligns[i]).length;
    const cellLen = Math.max(...rows.map((r) => (r[i] ?? "").length || 1));
    return compact ? 1 : Math.max(headerLen, markerLen, cellLen);
  });

  function pad(s: string, w: number, a: Align): string {
    if (compact) return s;
    if (a === "right") return s.padStart(w);
    if (a === "center") {
      const total = w - s.length;
      const left = Math.floor(total / 2);
      const right = total - left;
      return " ".repeat(left) + s + " ".repeat(right);
    }
    return s.padEnd(w);
  }

  const sep = compact ? "|" : " | ";
  const edgeSep = compact ? "|" : "| ";
  const edgeEnd = compact ? "|" : " |";

  const headerRow = edgeSep + headers.map((h, i) => pad(h || " ", colWidths[i], aligns[i])).join(sep) + edgeEnd;
  const divider   = edgeSep + aligns.map((a, i) => {
    const m = alignMarker(a);
    if (compact) return m;
    const w = colWidths[i];
    if (a === "left")   return ":" + "-".repeat(w - 1);
    if (a === "right")  return "-".repeat(w - 1) + ":";
    if (a === "center") return ":" + "-".repeat(Math.max(1, w - 2)) + ":";
    return "-".repeat(w);
  }).join(sep) + edgeEnd;

  const dataRows = rows.map((row) =>
    edgeSep + headers.map((_, i) => pad(row[i] ?? "", colWidths[i], aligns[i])).join(sep) + edgeEnd
  );

  return [headerRow, divider, ...dataRows].join("\n");
}

const DEFAULT_HEADERS = ["Column 1", "Column 2", "Column 3"];
const DEFAULT_ROWS    = [["Value", "Value", "Value"], ["Value", "Value", "Value"]];
const DEFAULT_ALIGNS: Align[] = ["none", "none", "none"];

export default function MarkdownTableGenerator({ onClose }: MarkdownTableGeneratorProps) {
  const [headers, setHeaders] = useState<string[]>(DEFAULT_HEADERS);
  const [rows, setRows]       = useState<string[][]>(DEFAULT_ROWS);
  const [aligns, setAligns]   = useState<Align[]>(DEFAULT_ALIGNS);
  const [compact, setCompact] = useState(false);
  const [copied, setCopied]   = useState(false);

  const cols = headers.length;

  const markdown = useMemo(
    () => buildMarkdown(headers, rows, aligns, compact),
    [headers, rows, aligns, compact]
  );

  function addCol() {
    setHeaders((h) => [...h, `Column ${h.length + 1}`]);
    setAligns((a) => [...a, "none"]);
    setRows((rs) => rs.map((r) => [...r, ""]));
  }

  function removeCol(ci: number) {
    if (cols <= 1) return;
    setHeaders((h) => h.filter((_, i) => i !== ci));
    setAligns((a) => a.filter((_, i) => i !== ci));
    setRows((rs) => rs.map((r) => r.filter((_, i) => i !== ci)));
  }

  function addRow() {
    setRows((rs) => [...rs, Array(cols).fill("")]);
  }

  function removeRow(ri: number) {
    setRows((rs) => rs.filter((_, i) => i !== ri));
  }

  const setHeader = useCallback((ci: number, val: string) => {
    setHeaders((h) => h.map((v, i) => (i === ci ? val : v)));
  }, []);

  const setCell = useCallback((ri: number, ci: number, val: string) => {
    setRows((rs) => rs.map((row, i) => i === ri ? row.map((c, j) => (j === ci ? val : c)) : row));
  }, []);

  function cycleAlign(ci: number) {
    setAligns((a) => a.map((v, i) => {
      if (i !== ci) return v;
      const idx = ALIGN_LABELS.findIndex((l) => l.align === v);
      return ALIGN_LABELS[(idx + 1) % ALIGN_LABELS.length].align;
    }));
  }

  function copy() {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function fromCsv(text: string) {
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 1) return;
    const parse = (line: string) => line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const newHeaders = parse(lines[0]);
    const newRows = lines.slice(1).map(parse);
    const maxCols = Math.max(newHeaders.length, ...newRows.map((r) => r.length));
    setHeaders(newHeaders.concat(Array(Math.max(0, maxCols - newHeaders.length)).fill("")));
    setAligns(Array(maxCols).fill("none"));
    setRows(newRows.map((r) => r.concat(Array(Math.max(0, maxCols - r.length)).fill(""))));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Markdown Table Generator</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={compact} onChange={(e) => setCompact(e.target.checked)} className="w-3 h-3 accent-blue-500" />
              <span className="text-[10px] text-gray-400">Compact</span>
            </label>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Paste CSV hint */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Import from CSV</div>
            <textarea
              rows={2}
              placeholder={"Paste CSV here (first row = headers)…\ne.g. Name,Age,City"}
              className="w-full resize-none bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-700"
              spellCheck={false}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text.includes(",")) { e.preventDefault(); fromCsv(text); }
              }}
              onChange={(e) => { if (e.target.value.includes(",")) { fromCsv(e.target.value); e.target.value = ""; } }}
            />
          </div>

          {/* Table editor */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Edit Table</span>
              <div className="flex items-center gap-1.5">
                <button onClick={addCol} className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors">+ Col</button>
                <button onClick={addRow} className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors">+ Row</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {headers.map((h, ci) => (
                      <th key={ci} className="p-0 border border-gray-700/50 bg-gray-800/60 group relative min-w-[80px]">
                        <div className="flex items-center">
                          <input
                            value={h}
                            onChange={(e) => setHeader(ci, e.target.value)}
                            className="flex-1 bg-transparent px-2 py-1.5 font-mono text-blue-300 focus:outline-none text-xs w-full min-w-0"
                            placeholder={`Col ${ci + 1}`}
                          />
                          <div className="flex items-center gap-0.5 px-1 shrink-0">
                            <button
                              onClick={() => cycleAlign(ci)}
                              title={ALIGN_LABELS.find((l) => l.align === aligns[ci])?.title}
                              className="text-[9px] text-gray-600 hover:text-gray-300 w-4 text-center transition-colors"
                            >
                              {ALIGN_LABELS.find((l) => l.align === aligns[ci])?.symbol}
                            </button>
                            {cols > 1 && (
                              <button
                                onClick={() => removeCol(ci)}
                                className="text-[9px] text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                title="Remove column"
                              >×</button>
                            )}
                          </div>
                        </div>
                      </th>
                    ))}
                    <th className="w-6 border border-gray-700/50 bg-gray-800/40" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className="group/row">
                      {headers.map((_, ci) => (
                        <td key={ci} className="p-0 border border-gray-700/30">
                          <input
                            value={row[ci] ?? ""}
                            onChange={(e) => setCell(ri, ci, e.target.value)}
                            className="w-full bg-transparent px-2 py-1.5 font-mono text-gray-300 focus:outline-none text-xs focus:bg-gray-800/40"
                            placeholder="—"
                          />
                        </td>
                      ))}
                      <td className="border border-gray-700/30 text-center w-6">
                        <button
                          onClick={() => removeRow(ri)}
                          className="text-[10px] text-gray-700 hover:text-red-400 opacity-0 group-hover/row:opacity-100 transition-all px-1"
                          title="Remove row"
                        >×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Output */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Markdown Output</span>
              <button
                onClick={copy}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${copied ? "bg-green-700 text-white" : "bg-gray-700 text-gray-400 hover:bg-gray-600"}`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="text-[11px] font-mono text-gray-300 bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 overflow-x-auto whitespace-pre select-all leading-relaxed">
              {markdown || "—"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
