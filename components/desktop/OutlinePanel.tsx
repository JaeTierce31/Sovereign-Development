"use client";
import { useMemo, useRef, useEffect } from "react";

export interface OutlineSymbol {
  name: string;
  kind: "class" | "function" | "method" | "variable" | "interface" | "type" | "enum" | "module" | "constant" | "property";
  line: number;
  indent: number;
}

const KIND_ICON: Record<OutlineSymbol["kind"], { icon: string; color: string }> = {
  class:     { icon: "C", color: "text-orange-400" },
  function:  { icon: "ƒ", color: "text-blue-400" },
  method:    { icon: "m", color: "text-blue-300" },
  variable:  { icon: "v", color: "text-gray-400" },
  interface: { icon: "I", color: "text-purple-400" },
  type:      { icon: "T", color: "text-purple-300" },
  enum:      { icon: "E", color: "text-yellow-400" },
  module:    { icon: "M", color: "text-green-400" },
  constant:  { icon: "K", color: "text-teal-400" },
  property:  { icon: "p", color: "text-gray-300" },
};

export function parseSymbols(content: string, language: string | null): OutlineSymbol[] {
  const lang = language ?? "";
  const lines = content.split("\n");
  const symbols: OutlineSymbol[] = [];

  if (lang === "typescript" || lang === "javascript" || lang === "typescriptreact" || lang === "javascriptreact") {
    const patterns: Array<{ re: RegExp; kind: OutlineSymbol["kind"]; nameIdx: number; indentable?: boolean }> = [
      // export default class Foo / class Foo
      { re: /^(\s*)(?:export\s+(?:default\s+)?)?(?:abstract\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/, kind: "class", nameIdx: 2 },
      // export interface Foo
      { re: /^(\s*)(?:export\s+)?interface\s+([A-Za-z_$][A-Za-z0-9_$]*)/, kind: "interface", nameIdx: 2 },
      // export type Foo =
      { re: /^(\s*)(?:export\s+)?type\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*[=<]/, kind: "type", nameIdx: 2 },
      // export enum Foo
      { re: /^(\s*)(?:export\s+)?(?:const\s+)?enum\s+([A-Za-z_$][A-Za-z0-9_$]*)/, kind: "enum", nameIdx: 2 },
      // export default function foo / export async function foo / function foo
      { re: /^(\s*)(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+\*?([A-Za-z_$][A-Za-z0-9_$]*)/, kind: "function", nameIdx: 2 },
      // export const foo = (...) => / export const foo = function
      { re: /^(\s*)(?:export\s+)?const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s+)?(?:\(|function)/, kind: "function", nameIdx: 2 },
      // const FOO = / let FOO = — all-caps → constant
      { re: /^(\s*)(?:export\s+)?const\s+([A-Z_][A-Z0-9_]{2,})\s*=/, kind: "constant", nameIdx: 2 },
      // const/let/var foo = (non-function non-constant)
      { re: /^(\s*)(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=(?!\s*(?:async\s+)?\()/, kind: "variable", nameIdx: 2 },
      // method: foo(...) { or foo = (...) => inside class body
      { re: /^(\s+)(?:(?:public|private|protected|static|async|override|readonly|get|set)\s+)*([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/, kind: "method", nameIdx: 2, indentable: true },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { re, kind, nameIdx } of patterns) {
        const m = line.match(re);
        if (m) {
          const indent = (m[1] ?? "").length;
          symbols.push({ name: m[nameIdx], kind, line: i + 1, indent });
          break;
        }
      }
    }
  } else if (lang === "python") {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let m = line.match(/^(\s*)class\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (m) { symbols.push({ name: m[2], kind: "class", line: i + 1, indent: m[1].length }); continue; }
      m = line.match(/^(\s*)(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (m) { symbols.push({ name: m[2], kind: m[1].length > 0 ? "method" : "function", line: i + 1, indent: m[1].length }); continue; }
    }
  } else if (lang === "css" || lang === "scss" || lang === "less") {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^([.#%@&][A-Za-z0-9_\-:.[\]"' >+~*=^$|]+)\s*\{/);
      if (m) symbols.push({ name: m[1].trim(), kind: "property", line: i + 1, indent: 0 });
    }
  } else if (lang === "markdown") {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^(#{1,6})\s+(.+)/);
      if (m) symbols.push({ name: m[2].trim(), kind: "module", line: i + 1, indent: (m[1].length - 1) * 12 });
    }
  } else if (lang === "go") {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let m = line.match(/^type\s+([A-Za-z_][A-Za-z0-9_]*)\s+(?:struct|interface)/);
      if (m) { symbols.push({ name: m[1], kind: line.includes("interface") ? "interface" : "class", line: i + 1, indent: 0 }); continue; }
      m = line.match(/^func\s+(?:\([^)]+\)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
      if (m) { symbols.push({ name: m[1], kind: "function", line: i + 1, indent: 0 }); continue; }
    }
  } else if (lang === "rust") {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let m = line.match(/^(?:pub\s+)?(?:struct|enum|trait)\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (m) { symbols.push({ name: m[1], kind: line.includes("trait") ? "interface" : "class", line: i + 1, indent: 0 }); continue; }
      m = line.match(/^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (m) { symbols.push({ name: m[1], kind: "function", line: i + 1, indent: (line.match(/^\s*/)?.[0].length ?? 0) }); continue; }
    }
  }

  return symbols;
}

export default function OutlinePanel({
  content,
  language,
  onGoToLine,
  activeLine,
}: {
  content: string | null;
  language: string | null;
  onGoToLine: (line: number) => void;
  activeLine?: number;
}) {
  const symbols = useMemo(
    () => (content ? parseSymbols(content, language) : []),
    [content, language]
  );

  // Index of the symbol that contains the cursor (last symbol whose line ≤ activeLine)
  const activeIdx = useMemo(() => {
    if (activeLine === undefined || symbols.length === 0) return -1;
    let best = -1;
    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i].line <= activeLine) best = i;
    }
    return best;
  }, [symbols, activeLine]);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLButtonElement>(null);

  // Scroll active symbol into view when it changes, but only if the panel is not
  // being hovered (so manual scrolling isn't yanked away).
  const hoveringRef = useRef(false);
  useEffect(() => {
    if (activeIdx === -1 || hoveringRef.current) return;
    activeRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (!content) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-gray-600">No file open</p>
      </div>
    );
  }

  if (symbols.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-3 text-center">
        <p className="text-xs text-gray-600">
          {language ? `No symbols found in ${language} file` : "Open a file to see its outline"}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto"
      onMouseEnter={() => { hoveringRef.current = true; }}
      onMouseLeave={() => { hoveringRef.current = false; }}
    >
      {symbols.map((sym, i) => {
        const { icon, color } = KIND_ICON[sym.kind];
        const isActive = i === activeIdx;
        return (
          <button
            key={i}
            ref={isActive ? activeRowRef : undefined}
            onClick={() => onGoToLine(sym.line)}
            title={`${sym.kind} · line ${sym.line}`}
            className={`w-full text-left px-2 py-1 transition-colors flex items-center gap-1.5 group ${
              isActive
                ? "bg-blue-600/20 text-white"
                : "hover:bg-gray-800"
            }`}
            style={{ paddingLeft: `${8 + sym.indent}px` }}
          >
            <span className={`text-[10px] font-bold w-4 shrink-0 text-right leading-none ${color}`} aria-hidden>
              {icon}
            </span>
            <span className={`text-xs truncate group-hover:text-white ${isActive ? "text-white font-medium" : "text-gray-300"}`}>
              {sym.name}
            </span>
            <span className={`text-[10px] ml-auto shrink-0 tabular-nums ${isActive ? "text-blue-300" : "text-gray-600"}`}>
              {sym.line}
            </span>
          </button>
        );
      })}
    </div>
  );
}
