"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  createdAt: number;
}

export default function MobileHome() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, startCreate] = useTransition();
  const [showInput, setShowInput] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
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
        router.push(`/editor/${project.id}`);
      }
    });
  }

  return (
    <div className="h-full w-full flex flex-col bg-peregrine-dark overflow-auto">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-white">Peregrine</h1>
        <button
          onClick={() => setShowInput(true)}
          className="w-8 h-8 flex items-center justify-center bg-blue-600 rounded-full text-white text-xl leading-none"
        >
          +
        </button>
      </div>

      {showInput && (
        <form onSubmit={handleCreate} className="px-4 py-3 border-b border-gray-800 flex gap-2">
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
            className="px-3 py-2 bg-blue-600 disabled:opacity-50 text-white text-sm rounded-lg"
          >
            {creating ? "…" : "Go"}
          </button>
        </form>
      )}

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-gray-500 text-sm mb-4">No projects yet.</p>
            {!showInput && (
              <button
                onClick={() => setShowInput(true)}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-lg"
              >
                Create first project
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => router.push(`/editor/${p.id}`)}
                  className="w-full text-left px-4 py-4 flex items-center justify-between active:bg-gray-800"
                >
                  <span className="text-white text-sm font-medium">{p.name}</span>
                  <span className="text-gray-600 text-xs">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
