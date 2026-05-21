"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

interface Project {
  id: string;
  name: string;
  createdAt: number;
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
              <button
                key={p.id}
                onClick={() => router.push(`/project/${p.id}`)}
                className="text-left p-4 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl transition-colors group"
              >
                <div className="font-medium text-white group-hover:text-blue-400 transition-colors mb-1">
                  {p.name}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
