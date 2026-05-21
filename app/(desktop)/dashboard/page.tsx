"use client";
import { useEffect, useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

interface Project {
  id: string;
  name: string;
  createdAt: number;
}

function ProjectCard({
  project,
  onOpen,
  onRename,
  onDelete,
}: {
  project: Project;
  onOpen: () => void;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
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
          <div className="text-xs text-gray-500">
            {new Date(project.createdAt).toLocaleDateString()}
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

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, startCreate] = useTransition();
  const [newName, setNewName] = useState("");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data))
      .finally(() => setLoading(false));
  }, []);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    startCreate(async () => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
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

  return (
    <div className="min-h-screen bg-peregrine-dark flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-white">Projects</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInput(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              + New Project
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Settings
            </button>
            <UserButton />
          </div>
        </div>

        {showInput && (
          <form onSubmit={handleCreate} className="mb-6 flex gap-2">
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
          </form>
        )}

        {loading ? (
          <div className="text-gray-500 text-sm">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">No projects yet.</p>
            {!showInput && (
              <button
                onClick={() => setShowInput(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Create your first project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => router.push(`/project/${p.id}`)}
                onRename={(name) => handleRename(p.id, name)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
