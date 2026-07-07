"use client";
import { useState, useEffect, useRef, useMemo } from "react";

export interface Snippet {
  id: string;
  name: string;
  prefix: string;
  body: string;
  description?: string;
  language?: string;
}

const STORAGE_KEY = "peregrine:snippets";

export const BUILT_IN_SNIPPETS: Snippet[] = [
  { id: "bi-react-fc",    name: "React Function Component", prefix: "rfc",    language: "typescriptreact", description: "Typed React function component", body: 'interface ${1:Props} {}\n\nexport default function ${2:Component}({}: ${1:Props}) {\n  return (\n    <div>\n    </div>\n  );\n}' },
  { id: "bi-usestate",    name: "useState hook",            prefix: "ust",    language: "typescript",       description: "const [x, setX] = useState()", body: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue});' },
  { id: "bi-useeffect",   name: "useEffect hook",           prefix: "uef",    language: "typescript",       description: "useEffect with cleanup", body: 'useEffect(() => {\n  ${1:// effect}\n  return () => {\n    ${2:// cleanup}\n  };\n}, [${3}]);' },
  { id: "bi-async-fn",    name: "Async function",           prefix: "afn",    description: "async arrow function", body: 'const ${1:fn} = async (${2:params}): Promise<${3:void}> => {\n  ${4:// body}\n};' },
  { id: "bi-trycatch",    name: "Try / Catch",              prefix: "tryc",   description: "try/catch/finally block", body: 'try {\n  ${1:// try}\n} catch (${2:error}) {\n  ${3:// catch}\n}' },
  { id: "bi-fetch",       name: "Fetch with error check",   prefix: "fett",   description: "fetch() + error check", body: "const res = await fetch(${1:url});\nif (!res.ok) throw new Error(res.statusText);\nconst data = await res.json();" },
  { id: "bi-py-class",    name: "Python class",             prefix: "pyc",    language: "python", description: "class with __init__", body: "class ${1:Name}:\n    def __init__(self${2:, }):\n        ${3:pass}" },
  { id: "bi-py-fn",       name: "Python function",          prefix: "pyf",    language: "python", description: "def with type hints", body: "def ${1:name}(${2:}) -> ${3:None}:\n    ${4:pass}" },
  { id: "bi-console-log", name: "console.log",              prefix: "clog",   description: "console.log", body: "console.log(${1});" },
  { id: "bi-console-err", name: "console.error",            prefix: "cerr",   description: "console.error", body: "console.error(${1});" },
];

export function loadSnippets(): Snippet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Snippet[];
  } catch { return []; }
}

export function saveSnippets(snippets: Snippet[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets)); } catch {}
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-blue-300 font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

interface SnippetPickerProps {
  language: string | null;
  userSnippets: Snippet[];
  onInsert: (body: string) => void;
  onClose: () => void;
  onManage: () => void;
}

export default function SnippetPicker({ language, userSnippets, onInsert, onClose, onManage }: SnippetPickerProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const allSnippets = useMemo(() => [...BUILT_IN_SNIPPETS, ...userSnippets], [userSnippets]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return allSnippets.filter((s) => {
      if (language && s.language && s.language !== language) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.prefix.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
    });
  }, [allSnippets, query, language]);

  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    const item = listRef.current?.children[selected] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  function confirm(idx: number) {
    const s = filtered[idx];
    if (s) { onInsert(stripTabStops(s.body)); onClose(); }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected((v) => Math.min(v + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((v) => Math.max(v - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); confirm(selected); }
    else if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gray-900 border border-gray-600 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
          <span className="text-gray-500 text-sm shrink-0">✦</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search snippets…"
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
          />
          <button onClick={onManage} className="text-gray-500 hover:text-gray-300 text-xs shrink-0">
            Manage
          </button>
        </div>

        <div ref={listRef} className="max-h-72 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-600">No snippets match</div>
          ) : (
            filtered.map((s, i) => (
              <button
                key={s.id}
                onClick={() => confirm(i)}
                onMouseEnter={() => setSelected(i)}
                className={`w-full text-left px-4 py-2 transition-colors ${i === selected ? "bg-blue-600/20 text-white" : "text-gray-300 hover:bg-gray-800"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-purple-400 shrink-0">{highlight(s.prefix, query)}</span>
                  <span className="text-sm truncate">{highlight(s.name, query)}</span>
                  {s.language && (
                    <span className="text-xs text-gray-600 shrink-0">{s.language}</span>
                  )}
                </div>
                {s.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{s.description}</p>
                )}
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-700 flex gap-4 text-xs text-gray-600">
          <span>↑↓ navigate</span>
          <span>↵ insert</span>
          <span>Esc close</span>
          {filtered.length > 0 && (
            <span className="ml-auto">{filtered.length} snippet{filtered.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function stripTabStops(body: string): string {
  // Remove $1, $2, ${1:placeholder}, ${1/regex/format/} tab stop markers
  return body
    .replace(/\$\{[^}]+\}/g, (m) => {
      const colonIdx = m.indexOf(":");
      if (colonIdx !== -1) return m.slice(colonIdx + 1, -1);
      return "";
    })
    .replace(/\$\d+/g, "");
}

interface SnippetManagerProps {
  userSnippets: Snippet[];
  onChange: (snippets: Snippet[]) => void;
  onClose: () => void;
}

export function SnippetManager({ userSnippets, onChange, onClose }: SnippetManagerProps) {
  const [editing, setEditing] = useState<Snippet | null>(null);
  const [form, setForm] = useState({ name: "", prefix: "", body: "", description: "", language: "" });

  function startNew() {
    setForm({ name: "", prefix: "", body: "", description: "", language: "" });
    setEditing({ id: `usr-${Date.now()}`, name: "", prefix: "", body: "" });
  }

  function startEdit(s: Snippet) {
    setForm({ name: s.name, prefix: s.prefix, body: s.body, description: s.description ?? "", language: s.language ?? "" });
    setEditing(s);
  }

  function save() {
    if (!form.name.trim() || !form.body.trim()) return;
    const updated: Snippet = { ...editing!, name: form.name.trim(), prefix: form.prefix.trim(), body: form.body, description: form.description.trim() || undefined, language: form.language.trim() || undefined };
    const exists = userSnippets.some((s) => s.id === updated.id);
    const next = exists ? userSnippets.map((s) => s.id === updated.id ? updated : s) : [...userSnippets, updated];
    onChange(next);
    setEditing(null);
  }

  function del(id: string) {
    if (!confirm("Delete this snippet?")) return;
    onChange(userSnippets.filter((s) => s.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-gray-900 border border-gray-600 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">Snippet Library</span>
          <div className="flex gap-2">
            <button onClick={startNew} className="text-xs text-blue-400 hover:text-blue-300">+ New</button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
          </div>
        </div>

        {editing ? (
          <div className="p-4 flex flex-col gap-3 overflow-auto">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="My Snippet" />
              </div>
              <div className="w-24">
                <label className="text-xs text-gray-500 block mb-1">Prefix</label>
                <input value={form.prefix} onChange={(e) => setForm((f) => ({ ...f, prefix: e.target.value }))} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="mysnip" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Optional description" />
              </div>
              <div className="w-32">
                <label className="text-xs text-gray-500 block mb-1">Language</label>
                <input value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="typescript" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Body *</label>
              <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={6} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white font-mono focus:outline-none focus:border-blue-500 resize-none" placeholder="const ${1:name} = ${2:value};" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(null)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1">Cancel</button>
              <button onClick={save} disabled={!form.name.trim() || !form.body.trim()} className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-1 rounded">Save</button>
            </div>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            {userSnippets.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-600">
                No custom snippets yet.{" "}
                <button onClick={startNew} className="text-blue-400 hover:text-blue-300">Create one</button>
              </div>
            ) : (
              userSnippets.map((s) => (
                <div key={s.id} className="px-4 py-2 border-b border-gray-800 flex items-center gap-3 group">
                  <span className="text-xs font-mono text-purple-400 w-16 shrink-0 truncate">{s.prefix}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{s.name}</p>
                    {s.description && <p className="text-xs text-gray-500 truncate">{s.description}</p>}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(s)} className="text-xs text-gray-400 hover:text-white">Edit</button>
                    <button onClick={() => del(s.id)} className="text-xs text-red-500 hover:text-red-400">Del</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
