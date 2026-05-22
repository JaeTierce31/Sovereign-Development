"use client";
import { useEffect, useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { TEMPLATES } from "@/lib/templates";

type ImportState = "idle" | "uploading" | "done" | "error";

interface Project {
  id: string;
  name: string;
  createdAt: number;
  fileCount?: number;
  isPublic?: boolean;
}

function ProjectCard({
  project,
  onOpen,
  onRename,
  onDelete,
  onDuplicate,
}: {
  project: Project;
  onOpen: () => void;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onDuplicate: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.select(), 0);
  }, [editing]);

  async function commitRename(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || draft.trim() === project.name) { setEditing(false); return; }
    await onRename(draft.trim());
    setEditing(false);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${project.name}" and all its files?`)) return;
    await onDelete();
  }

  return (
    <div className="relative group">
      {editing ? (
        <form
          onSubmit={commitRename}
          className="p-4 bg-gray-900 border border-blue-500 rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { setDraft(project.name); setEditing(false); } }}
            onBlur={commitRename}
            className="w-full bg-transparent text-white font-medium focus:outline-none"
          />
          <div className="text-xs text-gray-500 mt-1">Enter to save · Esc to cancel</div>
        </form>
      ) : (
        <button
          onClick={onOpen}
          className="w-full text-left p-4 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl transition-colors"
        >
          <div className="font-medium text-white group-hover:text-blue-400 transition-colors mb-1 pr-14 truncate">
            {project.name}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-xs text-gray-500">
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
            {project.fileCount !== undefined && (
              <span className="text-xs text-gray-600">
                {project.fileCount} {project.fileCount === 1 ? "file" : "files"}
              </span>
            )}
            {project.isPublic && (
              <span className="text-xs px-1.5 py-0.5 bg-green-900/40 text-green-500 rounded">
                public
              </span>
            )}
          </div>
        </button>
      )}

      {!editing && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(project.name); }}
            className="p-1 text-gray-500 hover:text-gray-200 rounded transition-colors"
            title="Rename project"
          >
            ✎
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1 text-gray-500 hover:text-gray-200 rounded transition-colors text-xs"
            title="Duplicate project"
          >
            ⧉
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
            title="Delete project"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

type SortKey = "recent" | "newest" | "oldest" | "az" | "za";

function getLastOpened(id: string): number {
  try {
    const val = localStorage.getItem(`peregrine:last-opened:${id}`);
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
}

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, startCreate] = useTransition();
  const [newName, setNewName] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [importState, setImportState] = useState<ImportState>("idle");
  const importInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const sortedFiltered = projects
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
        router.push(`/project/${project.id}`);
      }
    });
  }

  const handleRename = useCallback(async (id: string, name: string) => {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, name } : p));
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  }, []);

  const handleDuplicate = useCallback(async (id: string) => {
    const res = await fetch(`/api/projects/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const copy = await res.json();
      setProjects((prev) => [...prev, copy]);
    }
  }, []);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportState("uploading");
    try {
      const form = new FormData();
      form.append("zip", file);
      form.append("name", file.name.replace(/\.zip$/i, ""));
      const res = await fetch("/api/projects/import", { method: "POST", body: form });
      if (!res.ok) { setImportState("error"); return; }
      const project = await res.json();
      setImportState("done");
      router.push(`/project/${project.id}`);
    } catch {
      setImportState("error");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  return (
    <div className="min-h-screen bg-peregrine-dark flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-white">
            Projects
            {!loading && projects.length > 0 && (
              <span className="ml-2 text-base font-normal text-gray-500">({projects.length})</span>
            )}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInput(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              + New Project
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={importState === "uploading"}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              title="Import a project from a ZIP file"
            >
              {importState === "uploading" ? "Importing…" : importState === "error" ? "Import failed" : "Import ZIP"}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={() => router.push("/settings")}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Settings
            </button>
            <UserButton />
          </div>
        </div>

        {!loading && projects.length > 0 && (
          <div className="flex items-center gap-2 mb-6">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter projects… (⌘F)"
                className="w-full pl-8 pr-3 py-1.5 bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Escape") setSearch(""); }}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm">×</button>
              )}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="px-2 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-400 focus:outline-none focus:border-blue-500"
            >
              <option value="recent">Recently opened</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
            </select>
          </div>
        )}

        {showInput && (
          <div className="mb-6 p-4 bg-gray-900 border border-gray-700 rounded-xl">
            <form onSubmit={handleCreate}>
              <div className="flex gap-2 mb-3">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Project name"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => e.key === "Escape" && setShowInput(false)}
                />
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg"
                >
                  {creating ? "Creating…" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInput(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
                >
                  Cancel
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      selectedTemplate === t.id
                        ? "border-blue-500 bg-blue-600/20 text-blue-300"
                        : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                    }`}
                    title={t.description}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-gray-500 text-sm">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">No projects yet.</p>
            {!showInput && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowInput(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  Create your first project
                </button>
                <button
                  onClick={() => importInputRef.current?.click()}
                  disabled={importState === "uploading"}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Import ZIP
                </button>
              </div>
            )}
          </div>
        ) : sortedFiltered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No projects match &ldquo;{search}&rdquo;
            <button onClick={() => setSearch("")} className="ml-2 text-blue-500 hover:text-blue-400">
              Clear
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedFiltered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => router.push(`/project/${p.id}`)}
                onRename={(name) => handleRename(p.id, name)}
                onDelete={() => handleDelete(p.id)}
                onDuplicate={() => handleDuplicate(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
