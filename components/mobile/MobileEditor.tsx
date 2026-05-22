"use client";
import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MobileKeyboardRow from "./MobileKeyboardRow";

interface ProjectFile {
  id: string;
  path: string;
  content: string | null;
  language: string | null;
}

const LANG_MAP: Record<string, string> = {
  js: "javascript", jsx: "javascript",
  ts: "typescript", tsx: "typescript",
  md: "markdown", json: "json",
  css: "css", html: "html",
  py: "python", sh: "shell",
};

function inferLang(path: string) {
  return LANG_MAP[path.split(".").pop() ?? ""] ?? "plaintext";
}

export default function MobileEditor({
  projectId,
  onFileChange,
}: {
  projectId: string;
  onFileChange?: (content: string, language: string) => void;
}) {
  const router = useRouter();
  const editorRef = useRef<unknown>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/files`)
      .then((r) => {
        if (r.status === 404) { router.push("/dashboard"); return null; }
        return r.json();
      })
      .then((data: ProjectFile[] | null) => {
        if (!data) return;
        setFiles(data);
        if (data.length > 0) setActiveId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, [projectId, router]);

  useEffect(() => {
    if (showNewFile) setTimeout(() => newFileInputRef.current?.focus(), 50);
  }, [showNewFile]);

  const activeFile = files.find((f) => f.id === activeId) ?? null;

  useEffect(() => {
    if (activeFile) {
      onFileChange?.(activeFile.content ?? "", activeFile.language ?? inferLang(activeFile.path));
    }
  }, [activeFile, onFileChange]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!activeId || value === undefined) return;
      setFiles((prev) =>
        prev.map((f) => (f.id === activeId ? { ...f, content: value } : f))
      );
      onFileChange?.(value, activeFile?.language ?? inferLang(activeFile?.path ?? ""));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch(`/api/projects/${projectId}/files/${activeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: value }),
        });
      }, 800);
    },
    [activeId, projectId, activeFile, onFileChange]
  );

  async function createFile(e: React.FormEvent) {
    e.preventDefault();
    if (!newFileName.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newFileName.trim() }),
      });
      if (res.ok) {
        const file: ProjectFile = await res.json();
        setFiles((prev) => [...prev, file]);
        setActiveId(file.id);
        setShowNewFile(false);
        setNewFileName("");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-xs text-gray-500 active:text-gray-300 w-16"
        >
          ← Projects
        </button>
        <button
          onClick={() => { setShowPicker((v) => !v); setShowNewFile(false); }}
          className="text-xs text-gray-300 truncate max-w-[50%] text-center"
        >
          {activeFile?.path ?? (loading ? "Loading…" : "No file")}
        </button>
        <div className="w-16 flex justify-end">
          <button
            onClick={() => { setShowNewFile((v) => !v); setShowPicker(false); }}
            className="text-gray-500 active:text-gray-200 text-lg leading-none px-2"
            title="New file"
          >
            +
          </button>
        </div>
      </div>

      {/* New file sheet */}
      {showNewFile && (
        <div className="shrink-0 bg-gray-900 border-b border-gray-700 px-3 py-2">
          <form onSubmit={createFile} className="flex gap-2">
            <input
              ref={newFileInputRef}
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.ts"
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => { if (e.key === "Escape") { setShowNewFile(false); setNewFileName(""); } }}
            />
            <button
              type="submit"
              disabled={!newFileName.trim() || creating}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg"
            >
              {creating ? "…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewFile(false); setNewFileName(""); }}
              className="px-3 py-2 bg-gray-700 text-white text-sm rounded-lg"
            >
              ✕
            </button>
          </form>
        </div>
      )}

      {/* File picker overlay */}
      {showPicker && (
        <div className="absolute inset-x-0 top-10 z-50 bg-gray-900 border-b border-gray-700 max-h-48 overflow-auto shadow-xl">
          {files.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">No files yet</div>
          ) : files.map((f) => (
            <button
              key={f.id}
              onClick={() => { setActiveId(f.id); setShowPicker(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-800 last:border-0 ${
                f.id === activeId ? "text-blue-400 bg-gray-800" : "text-gray-300"
              }`}
            >
              {f.path}
            </button>
          ))}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0">
        {activeFile ? (
          <Editor
            key={activeFile.id}
            height="100%"
            language={activeFile.language ?? inferLang(activeFile.path)}
            value={activeFile.content ?? ""}
            theme="vs-dark"
            onChange={handleChange}
            onMount={(editor) => { editorRef.current = editor; }}
            options={{
              fontSize: 14,
              lineNumbers: "off",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
            }}
          />
        ) : (
          !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600 text-sm">
              <p>No files yet</p>
              <button
                onClick={() => setShowNewFile(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg"
              >
                + Create first file
              </button>
            </div>
          )
        )}
      </div>

      <MobileKeyboardRow editorRef={editorRef} />
    </div>
  );
}
