"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useRouter } from "next/navigation";

interface ProjectFile {
  id: string;
  path: string;
  content: string | null;
  language: string | null;
}

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  md: "markdown",
  json: "json",
  css: "css",
  html: "html",
  py: "python",
  sh: "shell",
};

function inferLanguage(path: string): string {
  const ext = path.split(".").pop() ?? "";
  return LANGUAGE_MAP[ext] ?? "plaintext";
}

export default function DesktopIDE({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const activeFile = files.find((f) => f.id === activeFileId) ?? null;

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!activeFileId || value === undefined) return;
      setFiles((prev) =>
        prev.map((f) => (f.id === activeFileId ? { ...f, content: value } : f))
      );

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch(`/api/projects/${projectId}/files/${activeFileId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: value }),
        });
      }, 800);
    },
    [activeFileId, projectId]
  );

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
        </div>
        <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Explorer
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="px-4 py-2 text-xs text-gray-600">Loading…</div>
          ) : (
            files.map((file) => (
              <button
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`w-full text-left px-4 py-1.5 text-sm truncate ${
                  activeFileId === file.id
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {file.path}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor pane */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center px-4 py-2 bg-gray-900 border-b border-gray-700 text-sm text-gray-300 shrink-0">
          {activeFile?.path ?? "No file selected"}
        </div>
        <div className="flex-1">
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
                Select a file
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
