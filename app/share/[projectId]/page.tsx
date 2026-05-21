"use client";
import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { useParams } from "next/navigation";

interface ProjectFile {
  id: string;
  path: string;
  content: string | null;
  language: string | null;
}

interface Project {
  id: string;
  name: string;
  createdAt: number;
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

export default function SharePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "found" | "notfound">("loading");

  useEffect(() => {
    fetch(`/api/share/${projectId}`)
      .then((r) => {
        if (r.status === 404) { setStatus("notfound"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setProject(data.project);
        setFiles(data.files);
        if (data.files.length > 0) setActiveFileId(data.files[0].id);
        setStatus("found");
      })
      .catch(() => setStatus("notfound"));
  }, [projectId]);

  const activeFile = files.find((f) => f.id === activeFileId) ?? null;

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 text-sm">
        Loading…
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3">
        <p className="text-white text-lg font-medium">Project not found</p>
        <p className="text-gray-500 text-sm">This project may be private or no longer exists.</p>
        <a href="/" className="text-blue-400 hover:text-blue-300 text-sm">← Back to Peregrine</a>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <a href="/" className="text-blue-400 hover:text-blue-300 text-sm font-medium">Peregrine</a>
          <span className="text-gray-600">/</span>
          <span className="text-white text-sm font-medium">{project?.name}</span>
          <span className="px-1.5 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">Read-only</span>
        </div>
        <a
          href="/sign-up"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors"
        >
          Fork this project →
        </a>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-48 bg-gray-900 border-r border-gray-700 flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-gray-700">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Files</span>
          </div>
          <div className="flex-1 overflow-auto">
            {files.map((file) => (
              <button
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`w-full text-left px-4 py-1.5 text-sm truncate transition-colors ${
                  activeFileId === file.id
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                {file.path}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          {activeFile && (
            <div className="px-4 py-1.5 bg-gray-900 border-b border-gray-700 text-xs text-gray-400 shrink-0">
              {activeFile.path}
            </div>
          )}
          {activeFile ? (
            <Editor
              key={activeFile.id}
              height="100%"
              language={activeFile.language ?? inferLanguage(activeFile.path)}
              value={activeFile.content ?? ""}
              theme="vs-dark"
              options={{
                readOnly: true,
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                renderLineHighlight: "none",
                domReadOnly: true,
              }}
            />
          ) : (
            <div className="flex items-center justify-center flex-1 text-gray-600 text-sm">No files</div>
          )}
        </div>
      </div>
    </div>
  );
}
