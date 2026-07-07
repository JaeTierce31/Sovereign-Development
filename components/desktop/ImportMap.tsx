"use client";
import { useMemo } from "react";

interface ImportEntry {
  source: string;
  kind: "builtin" | "npm" | "local";
  names: string[]; // named imports or default import name
  line: number;
}

const NODE_BUILTINS = new Set([
  "fs", "path", "os", "http", "https", "url", "crypto", "stream", "events",
  "buffer", "util", "child_process", "cluster", "net", "dns", "assert",
  "readline", "zlib", "querystring", "timers", "vm", "worker_threads",
  "node:fs", "node:path", "node:os", "node:http", "node:crypto",
]);

function parseImports(content: string): ImportEntry[] {
  const results: ImportEntry[] = [];
  const lines = content.split("\n");

  // Patterns: ES import, require(), dynamic import()
  const esImport = /^(?:import\s+(?:type\s+)?)((?:\*\s+as\s+\w+|(?:\{[^}]*\}|\w+)(?:\s*,\s*(?:\{[^}]*\}|\w+))*)?\s*(?:from\s+)?)?['"]([^'"]+)['"]/;
  const requirePat = /(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let source: string | null = null;
    let names: string[] = [];

    const esMatch = line.match(esImport);
    if (esMatch) {
      source = esMatch[2];
      const importClause = esMatch[1] ?? "";
      // Extract named imports from { ... }
      const namedMatch = importClause.match(/\{([^}]+)\}/);
      if (namedMatch) {
        names = namedMatch[1].split(",").map((n) => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
      }
      // Extract default import
      const defaultMatch = importClause.match(/^(\w+)\s*(?:,|\s+from)/);
      if (defaultMatch) names.unshift(defaultMatch[1]);
      // Namespace import: * as X
      const nsMatch = importClause.match(/\*\s+as\s+(\w+)/);
      if (nsMatch) names.unshift(`* as ${nsMatch[1]}`);
    } else {
      const reqMatch = line.match(requirePat);
      if (reqMatch) source = reqMatch[1];
    }

    if (!source) continue;

    let kind: ImportEntry["kind"];
    if (source.startsWith(".") || source.startsWith("/")) {
      kind = "local";
    } else if (NODE_BUILTINS.has(source.split("/")[0])) {
      kind = "builtin";
    } else {
      kind = "npm";
    }

    results.push({ source, kind, names, line: i + 1 });
  }

  return results;
}

interface ProjectFile { id: string; path: string; }

interface ImportMapProps {
  content: string;
  filePath: string;
  language: string | null;
  files: ProjectFile[];
  onNavigate: (fileId: string) => void;
  onClose: () => void;
}

const KIND_LABEL: Record<ImportEntry["kind"], string> = {
  builtin: "Built-in",
  npm: "NPM packages",
  local: "Local files",
};

const KIND_COLOR: Record<ImportEntry["kind"], { badge: string; text: string; dot: string }> = {
  builtin: { badge: "bg-gray-700 text-gray-400", text: "text-gray-300", dot: "bg-gray-500" },
  npm: { badge: "bg-blue-900/40 text-blue-400", text: "text-blue-300", dot: "bg-blue-500" },
  local: { badge: "bg-green-900/40 text-green-400", text: "text-green-300", dot: "bg-green-500" },
};

function resolveLocalPath(importSource: string, currentFilePath: string): string | null {
  if (!importSource.startsWith(".")) return null;
  const dirParts = currentFilePath.split("/").slice(0, -1);
  const parts = importSource.split("/");
  const resolved = [...dirParts];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== ".") resolved.push(part);
  }
  return resolved.join("/");
}

const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss", "/index.ts", "/index.tsx", "/index.js"];

export default function ImportMap({ content, filePath, language, files, onNavigate, onClose }: ImportMapProps) {
  const SUPPORTED = ["typescript", "typescriptreact", "javascript", "javascriptreact", "python", "go", "rust"];
  const supported = !language || SUPPORTED.includes(language);

  const imports = useMemo(() => parseImports(content), [content]);

  const grouped = useMemo(() => {
    const map: Record<ImportEntry["kind"], ImportEntry[]> = { builtin: [], npm: [], local: [] };
    for (const imp of imports) map[imp.kind].push(imp);
    return map;
  }, [imports]);

  function findFile(imp: ImportEntry): ProjectFile | null {
    if (imp.kind !== "local") return null;
    const base = resolveLocalPath(imp.source, filePath);
    if (!base) return null;
    for (const ext of EXTS) {
      const candidate = base + ext;
      const found = files.find((f) => f.path === candidate || f.path === candidate.replace(/^\//, ""));
      if (found) return found;
    }
    return null;
  }

  const totalImports = imports.length;
  const uniqueNpm = new Set(grouped.npm.map((i) => i.source.split("/")[0])).size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end pt-[8vh] pr-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-80 max-h-[80vh] bg-gray-900 border border-gray-600 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div>
            <p className="text-sm font-semibold text-white">Import Map</p>
            <p className="text-xs text-gray-500">{filePath.split("/").pop()}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
        </div>

        {/* Summary */}
        {totalImports > 0 && (
          <div className="flex gap-3 px-4 py-2 border-b border-gray-800 text-xs text-gray-500">
            <span><span className="text-white font-medium">{totalImports}</span> import{totalImports !== 1 ? "s" : ""}</span>
            {uniqueNpm > 0 && <span><span className="text-blue-400 font-medium">{uniqueNpm}</span> pkg{uniqueNpm !== 1 ? "s" : ""}</span>}
            {grouped.local.length > 0 && <span><span className="text-green-400 font-medium">{grouped.local.length}</span> local</span>}
          </div>
        )}

        <div className="overflow-auto flex-1">
          {!supported ? (
            <div className="px-4 py-6 text-center text-xs text-gray-600">
              Import analysis not available for this file type.
            </div>
          ) : totalImports === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-600">
              No imports detected in this file.
            </div>
          ) : (
            (["local", "npm", "builtin"] as const).map((kind) => {
              const entries = grouped[kind];
              if (entries.length === 0) return null;
              const c = KIND_COLOR[kind];
              return (
                <div key={kind} className="border-b border-gray-800 last:border-0">
                  <div className="px-4 pt-2 pb-1 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                    <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                      {KIND_LABEL[kind]} ({entries.length})
                    </span>
                  </div>
                  {entries.map((imp, idx) => {
                    const linkedFile = findFile(imp);
                    return (
                      <div key={idx} className="px-4 py-1.5 flex items-start gap-2 group">
                        <div className="flex-1 min-w-0">
                          {linkedFile ? (
                            <button
                              onClick={() => { onNavigate(linkedFile.id); onClose(); }}
                              className={`text-xs font-mono truncate block text-left w-full hover:underline ${c.text}`}
                              title={`Open ${linkedFile.path}`}
                            >
                              {imp.source}
                            </button>
                          ) : (
                            <span className={`text-xs font-mono truncate block ${c.text}`} title={imp.source}>
                              {imp.source}
                            </span>
                          )}
                          {imp.names.length > 0 && (
                            <p className="text-[10px] text-gray-600 truncate mt-0.5">
                              {imp.names.slice(0, 4).join(", ")}{imp.names.length > 4 ? ` +${imp.names.length - 4}` : ""}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-700 shrink-0 mt-0.5">:{imp.line}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-600 flex justify-between">
          <span>Click local imports to navigate</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  );
}
