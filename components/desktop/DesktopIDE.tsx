"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CollabProvider } from "@/components/collaboration/CollabProvider";
import CursorPresence from "@/components/collaboration/CursorPresence";
import AiPanel from "./AiPanel";
import ExecutionPanel from "./ExecutionPanel";
import FileFinder from "./FileFinder";

interface ProjectFile {
  id: string;
  path: string;
  content: string | null;
  language: string | null;
}

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript",
  md: "markdown", json: "json",
  css: "css", html: "html",
  py: "python", sh: "shell",
};

function inferLanguage(path: string): string {
  return LANGUAGE_MAP[path.split(".").pop() ?? ""] ?? "plaintext";
}

const RUNNABLE_EXTS = new Set(["js", "mjs", "cjs", "ts", "tsx", "py", "sh"]);

function IDECore({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [finderOpen, setFinderOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<{ id: string; value: string } | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/files`)
      .then((r) => {
        if (r.status === 404) { router.push("/dashboard"); return null; }
        return r.json();
      })
      .then((data: ProjectFile[] | null) => {
        if (!data) return;
        setFiles(data);
        if (data.length > 0) setActiveFileId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, [projectId, router]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/share`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setIsPublic(d.isPublic); });
  }, [projectId]);

  useEffect(() => {
    if (showNewFile) setTimeout(() => newFileInputRef.current?.focus(), 0);
  }, [showNewFile]);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "p") {
        e.preventDefault();
        setFinderOpen((v) => !v);
      } else if (mod && e.key === "`") {
        e.preventDefault();
        setTermOpen((v) => !v);
      } else if (mod && e.key === "s") {
        e.preventDefault();
        // Flush debounced save immediately
        if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
        if (pendingSave.current) {
          const { id, value } = pendingSave.current;
          pendingSave.current = null;
          fetch(`/api/projects/${projectId}/files/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: value }),
          });
        }
      } else if (e.key === "Escape") {
        if (finderOpen) setFinderOpen(false);
        else if (aiOpen) setAiOpen(false);
        else if (termOpen) setTermOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [projectId, finderOpen, aiOpen, termOpen]);

  const activeFile = files.find((f) => f.id === activeFileId) ?? null;

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!activeFileId || value === undefined) return;
      setFiles((prev) =>
        prev.map((f) => (f.id === activeFileId ? { ...f, content: value } : f))
      );
      pendingSave.current = { id: activeFileId, value };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        pendingSave.current = null;
        fetch(`/api/projects/${projectId}/files/${activeFileId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: value }),
        });
      }, 800);
    },
    [activeFileId, projectId]
  );

  async function createFile(e: React.FormEvent) {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: newFileName.trim() }),
    });
    if (res.ok) {
      const file: ProjectFile = await res.json();
      setFiles((prev) => [...prev, file]);
      setActiveFileId(file.id);
      setNewFileName("");
      setShowNewFile(false);
    }
  }

  async function deleteFile(fileId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this file?")) return;
    await fetch(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" });
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== fileId);
      if (activeFileId === fileId) setActiveFileId(next[0]?.id ?? null);
      return next;
    });
  }

  const activeExt = activeFile?.path.split(".").pop() ?? "";
  const isRunnable = RUNNABLE_EXTS.has(activeExt);

  async function toggleShare() {
    const next = !isPublic;
    const res = await fetch(`/api/projects/${projectId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: next }),
    });
    if (res.ok) {
      setIsPublic(next);
      if (next) setShareToast(true);
    }
  }

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/share/${projectId}` : "";

  function openTerminal() {
    setTermOpen(true);
  }

  return (
    <div className="h-full w-full flex bg-peregrine-dark">
      {/* Sidebar */}
      <div className="w-56 bg-gray-900 border-r border-gray-700 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Projects
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleShare}
              className={`text-xs px-2 py-0.5 rounded transition-colors ${
                isPublic
                  ? "bg-green-700 text-green-100 hover:bg-green-600"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              title={isPublic ? "Shared — click to make private" : "Share project"}
            >
              {isPublic ? "⬤ Shared" : "Share"}
            </button>
            <CursorPresence />
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Explorer</span>
          <button
            onClick={() => setShowNewFile(true)}
            className="text-gray-500 hover:text-gray-300 text-base leading-none transition-colors"
            title="New file"
          >
            +
          </button>
        </div>

        {showNewFile && (
          <form onSubmit={createFile} className="px-3 pb-2">
            <input
              ref={newFileInputRef}
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.ts"
              className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 focus:border-blue-500 rounded text-white placeholder-gray-500 focus:outline-none"
              onKeyDown={(e) => e.key === "Escape" && (setShowNewFile(false), setNewFileName(""))}
              onBlur={() => { if (!newFileName.trim()) { setShowNewFile(false); } }}
            />
          </form>
        )}

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="px-4 py-2 text-xs text-gray-600">Loading…</div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className={`group flex items-center ${
                  activeFileId === file.id ? "bg-gray-700" : "hover:bg-gray-800"
                }`}
              >
                <button
                  onClick={() => setActiveFileId(file.id)}
                  className={`flex-1 text-left px-4 py-1.5 text-sm truncate ${
                    activeFileId === file.id ? "text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {file.path}
                </button>
                <button
                  onClick={(e) => deleteFile(file.id, e)}
                  className="px-2 py-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0"
                  title="Delete file"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 text-sm text-gray-300 shrink-0">
          <span className="truncate">{activeFile?.path ?? "No file selected"}</span>
          <div className="flex items-center gap-2 shrink-0">
            {isRunnable && (
              <button
                onClick={openTerminal}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  termOpen
                    ? "bg-green-700 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
                title="Open terminal / run file"
              >
                ▶ Run
              </button>
            )}
            {!isRunnable && (
              <button
                onClick={() => setTermOpen((v) => !v)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  termOpen
                    ? "bg-gray-700 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
                title="Toggle terminal"
              >
                ⌨ Terminal
              </button>
            )}
            <button
              onClick={() => setAiOpen((v) => !v)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                aiOpen
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
              title="Toggle AI assistant"
            >
              ✦ AI
            </button>
          </div>
        </div>

        {/* Editor + AI panel */}
        <div className="flex min-h-0" style={{ flex: termOpen ? "0 0 60%" : "1 1 0" }}>
          <div className="flex-1 min-w-0">
            {activeFile ? (
              <Editor
                key={activeFile.id}
                height="100%"
                language={activeFile.language ?? inferLanguage(activeFile.path)}
                value={activeFile.content ?? ""}
                theme="vs-dark"
                onChange={handleChange}
                options={{
                  fontSize: 14,
                  minimap: { enabled: true },
                  automaticLayout: true,
                  wordWrap: "on",
                }}
              />
            ) : (
              !loading && (
                <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                  {files.length === 0 ? (
                    <div className="text-center">
                      <p className="mb-2">No files yet.</p>
                      <button
                        onClick={() => setShowNewFile(true)}
                        className="text-blue-500 hover:text-blue-400 text-sm"
                      >
                        + Create a file
                      </button>
                    </div>
                  ) : "Select a file"}
                </div>
              )
            )}
          </div>

          {aiOpen && (
            <AiPanel
              fileContent={activeFile?.content ?? ""}
              language={activeFile?.language ?? inferLanguage(activeFile?.path ?? "")}
              onClose={() => setAiOpen(false)}
            />
          )}
        </div>

        {/* Terminal panel */}
        {termOpen && (
          <div className="shrink-0" style={{ height: "40%" }}>
            <ExecutionPanel
              files={files}
              activeFile={activeFile}
              onClose={() => setTermOpen(false)}
            />
          </div>
        )}
      </div>
      {finderOpen && (
        <FileFinder
          files={files}
          onSelect={(id) => setActiveFileId(id)}
          onClose={() => setFinderOpen(false)}
        />
      )}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl shadow-xl text-sm text-white z-50">
          <span>Project is now public:</span>
          <code className="text-blue-400 text-xs">{shareUrl}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); }}
            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-xs transition-colors"
          >
            Copy
          </button>
          <button
            onClick={() => setShareToast(false)}
            className="text-gray-400 hover:text-white ml-1"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default function DesktopIDE({ projectId }: { projectId: string }) {
  const { user } = useUser();
  const workerUrl = process.env.NEXT_PUBLIC_CF_WORKER_URL;

  if (workerUrl && user?.id) {
    return (
      <CollabProvider projectId={projectId} userId={user.id}>
        <IDECore projectId={projectId} />
      </CollabProvider>
    );
  }

  return <IDECore projectId={projectId} />;
}
