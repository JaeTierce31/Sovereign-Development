"use client";
import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATES } from "@/lib/templates";
import { timeAgo, formatDate } from "@/lib/timeAgo";

interface Project {
  id: string;
  name: string;
  createdAt: number;
  fileCount?: number;
  isPublic?: boolean;
}

type SortKey = "recent" | "newest" | "oldest" | "az" | "za";

function getLastOpened(id: string): number {
  try {
    const val = localStorage.getItem(`peregrine:last-opened:${id}`);
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
}

function recordOpen(id: string) {
  try { localStorage.setItem(`peregrine:last-opened:${id}`, Date.now().toString()); } catch { /* ignore */ }
}

export default function MobileHome() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, startCreate] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importState, setImportState] = useState<"idle" | "uploading" | "error">("idle");
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showCreate) setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [showCreate]);

  useEffect(() => {
    if (renamingId) setTimeout(() => renameInputRef.current?.focus(), 50);
  }, [renamingId]);

  const sorted = projects
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "recent") {
        const la = getLastOpened(a.id), lb = getLastOpened(b.id);
        if (la || lb) return (lb || a.createdAt) - (la || b.createdAt);
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      }
      if (sort === "newest") return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      if (sort === "oldest") return (a.createdAt ?? 0) - (b.createdAt ?? 0);
      if (sort === "az") return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    startCreate(async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), templateId: selectedTemplate }),
      });
      if (res.ok) {
        const project = await res.json();
        router.push(`/editor/${project.id}`);
      }
    });
  }

  async function handleRename(id: string) {
    const trimmed = renameVal.trim();
    const original = projects.find((p) => p.id === id)?.name ?? "";
    setRenamingId(null);
    setMenuOpenId(null);
    if (!trimmed || trimmed === original) return;
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) setProjects((prev) => prev.map((p) => p.id === id ? { ...p, name: trimmed } : p));
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all its files?`)) return;
    setMenuOpenId(null);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleDuplicate(id: string) {
    setMenuOpenId(null);
    const res = await fetch(`/api/projects/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const newProject: Project = await res.json();
      setProjects((prev) => [newProject, ...prev]);
    }
  }

  async function handleShare(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    if (!project.isPublic) {
      const res = await fetch(`/api/projects/${id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      });
      if (!res.ok) return;
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, isPublic: true } : p));
    }
    const url = `${window.location.origin}/share/${id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(id);
    setMenuOpenId(null);
    setTimeout(() => setCopiedId((prev) => prev === id ? null : prev), 2000);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportState("uploading");
    try {
      const form = new FormData();
      form.append("zip", file);
      form.append("name", file.name.replace(/\.zip$/i, ""));
      const res = await fetch("/api/projects/import", { method: "POST", body: form });
      if (!res.ok) { setImportState("error"); setTimeout(() => setImportState("idle"), 3000); return; }
      const project = await res.json();
      setImportState("idle");
      recordOpen(project.id);
      router.push(`/editor/${project.id}`);
    } catch {
      setImportState("error");
      setTimeout(() => setImportState("idle"), 3000);
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  return (
    <div
      className="h-full w-full flex flex-col bg-peregrine-dark"
      onClick={() => { setMenuOpenId(null); setRenamingId(null); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-white leading-tight">Peregrine</h1>
          {!loading && projects.length > 0 && (
            <p className="text-xs text-gray-500">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); importInputRef.current?.click(); }}
            disabled={importState === "uploading"}
            className="px-3 py-1.5 text-sm text-gray-400 active:text-gray-200 disabled:opacity-50 transition-colors"
            title="Import ZIP"
          >
            {importState === "uploading" ? "…" : importState === "error" ? "✗" : "↓ ZIP"}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
          >
            <span className="text-base leading-none">+</span>
            <span>New</span>
          </button>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Search + sort (show when there are projects) */}
      {!loading && projects.length > 1 && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter…"
              className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                ×
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-400 focus:outline-none focus:border-blue-500"
          >
            <option value="recent">Recent</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="az">A→Z</option>
            <option value="za">Z→A</option>
          </select>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="border-b border-gray-800 shrink-0" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleCreate} className="px-3 pt-3 pb-2">
            <div className="flex gap-2 mb-2">
              <input
                ref={nameInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === "Escape" && (setShowCreate(false), setNewName(""))}
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="px-3 py-2 bg-blue-600 disabled:opacity-50 text-white text-sm rounded-lg"
              >
                {creating ? "…" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(""); }}
                className="px-3 py-2 bg-gray-700 text-white text-sm rounded-lg"
              >
                ×
              </button>
            </div>
            {/* Template chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`flex-none px-3 py-1 text-xs rounded-full border transition-colors whitespace-nowrap ${
                    selectedTemplate === t.id
                      ? "border-blue-500 bg-blue-600/20 text-blue-300"
                      : "border-gray-700 text-gray-400 active:bg-gray-800"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </form>
        </div>
      )}

      {/* Project list */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="px-4 py-10 text-center text-gray-500 text-sm">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-gray-500 text-sm mb-4">No projects yet.</p>
            {!showCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-lg"
              >
                Create first project
              </button>
            )}
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-gray-500 text-sm">No match for &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch("")} className="mt-2 text-blue-400 text-sm">
              Clear filter
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {sorted.map((p) => (
              <li key={p.id} onClick={(e) => e.stopPropagation()}>
                {renamingId === p.id ? (
                  <form
                    className="px-4 py-3"
                    onSubmit={(e) => { e.preventDefault(); handleRename(p.id); }}
                  >
                    <div className="flex gap-2">
                      <input
                        ref={renameInputRef}
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onBlur={() => handleRename(p.id)}
                        onKeyDown={(e) => { if (e.key === "Escape") { setRenamingId(null); setMenuOpenId(null); } }}
                        className="flex-1 px-3 py-2 bg-gray-800 border border-blue-500 rounded-lg text-white text-sm focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => { setRenamingId(null); setMenuOpenId(null); }}
                        className="px-3 py-2 bg-gray-700 text-white text-sm rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center">
                      <button
                        onClick={() => { recordOpen(p.id); router.push(`/editor/${p.id}`); }}
                        className="flex-1 text-left px-4 py-3.5 active:bg-gray-800 transition-colors min-w-0"
                      >
                        <p className="text-white text-sm font-medium truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-600" title={new Date(p.createdAt).toLocaleString()}>
                            {getLastOpened(p.id) ? `opened ${timeAgo(getLastOpened(p.id))}` : formatDate(p.createdAt)}
                          </span>
                          {p.fileCount !== undefined && (
                            <span className="text-xs text-gray-700">
                              {p.fileCount} {p.fileCount === 1 ? "file" : "files"}
                            </span>
                          )}
                          {p.isPublic && (
                            <span className="text-xs text-green-600">public</span>
                          )}
                          {copiedId === p.id && (
                            <span className="text-xs text-blue-400">✓ Link copied!</span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === p.id ? null : p.id); }}
                        className="px-4 py-3.5 text-gray-500 active:text-gray-200 transition-colors shrink-0 text-lg leading-none"
                        aria-label="Project actions"
                      >
                        ⋮
                      </button>
                    </div>
                    {menuOpenId === p.id && (
                      <div className="flex border-t border-gray-700">
                        <button
                          onClick={() => { setRenamingId(p.id); setRenameVal(p.name); }}
                          className="flex-1 py-2.5 text-xs text-gray-300 active:bg-gray-700 transition-colors"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleShare(p.id)}
                          className="flex-1 py-2.5 text-xs text-gray-300 active:bg-gray-700 transition-colors border-l border-gray-700"
                        >
                          {p.isPublic ? "Copy link" : "Share"}
                        </button>
                        <button
                          onClick={() => handleDuplicate(p.id)}
                          className="flex-1 py-2.5 text-xs text-gray-300 active:bg-gray-700 transition-colors border-l border-gray-700"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="flex-1 py-2.5 text-xs text-red-400 active:bg-gray-700 transition-colors border-l border-gray-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
