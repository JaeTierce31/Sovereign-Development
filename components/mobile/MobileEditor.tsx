"use client";
import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MobileKeyboardRow from "./MobileKeyboardRow";
import MobileAiSheet from "./MobileAiSheet";
import MobileFileTree from "./MobileFileTree";

const TABS_KEY = (id: string) => `peregrine:mobile-tabs:${id}`;

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
  onActiveFileChange,
}: {
  projectId: string;
  onFileChange?: (content: string, language: string) => void;
  onActiveFileChange?: (path: string) => void;
}) {
  const router = useRouter();
  const editorRef = useRef<unknown>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [showFileTree, setShowFileTree] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const pickerSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/files`)
      .then((r) => {
        if (r.status === 404) { router.push("/dashboard"); return null; }
        return r.json();
      })
      .then((data: ProjectFile[] | null) => {
        if (!data) return;
        setFiles(data);
        const validIds = new Set(data.map((f) => f.id));
        let saved: { activeId: string | null; openTabs: string[] } | null = null;
        try {
          const raw = localStorage.getItem(TABS_KEY(projectId));
          if (raw) saved = JSON.parse(raw);
        } catch { /* ignore */ }
        const restoredTabs = saved?.openTabs?.filter((id) => validIds.has(id)) ?? [];
        const restoredActive =
          saved?.activeId && validIds.has(saved.activeId) ? saved.activeId : restoredTabs[0] ?? null;
        if (restoredTabs.length > 0) {
          setOpenTabs(restoredTabs);
          setActiveId(restoredActive);
        } else if (data.length > 0) {
          setOpenTabs([data[0].id]);
          setActiveId(data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [projectId, router]);

  useEffect(() => {
    if (loading) return;
    try { localStorage.setItem(TABS_KEY(projectId), JSON.stringify({ activeId, openTabs })); } catch { /* ignore */ }
  }, [activeId, openTabs, projectId, loading]);

  useEffect(() => {
    if (showNewFile) setTimeout(() => newFileInputRef.current?.focus(), 50);
  }, [showNewFile]);

  const activeFile = files.find((f) => f.id === activeId) ?? null;

  useEffect(() => {
    if (activeFile) {
      onFileChange?.(activeFile.content ?? "", activeFile.language ?? inferLang(activeFile.path));
      onActiveFileChange?.(activeFile.path);
    }
  }, [activeFile, onFileChange, onActiveFileChange]);

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

  const openFile = useCallback((id: string) => {
    setActiveId(id);
    setOpenTabs((prev) => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const closeTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t !== id);
      if (activeId === id) {
        const idx = prev.indexOf(id);
        const fallback = next[idx] ?? next[idx - 1] ?? null;
        setActiveId(fallback);
      }
      return next;
    });
  }, [activeId]);

  useEffect(() => {
    if (renamingId) setTimeout(() => renameInputRef.current?.focus(), 50);
  }, [renamingId]);

  useEffect(() => {
    if (showPicker) {
      setPickerSearch("");
      setTimeout(() => pickerSearchRef.current?.focus(), 50);
    }
  }, [showPicker]);

  async function deleteFile(fileId: string) {
    if (!confirm("Delete this file?")) return;
    await fetch(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" });
    setOpenTabs((prev) => prev.filter((id) => id !== fileId));
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== fileId);
      if (activeId === fileId) setActiveId(next[0]?.id ?? null);
      return next;
    });
  }

  async function commitRename(fileId: string) {
    const trimmed = renameVal.trim();
    const original = files.find((f) => f.id === fileId)?.path ?? "";
    setRenamingId(null);
    if (!trimmed || trimmed === original) return;
    const res = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: trimmed }),
    });
    if (res.ok) {
      const updated: ProjectFile = await res.json();
      setFiles((prev) => prev.map((f) => f.id === fileId ? updated : f));
    }
  }

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
        openFile(file.id);
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
        <div className="flex items-center gap-1 justify-end w-16">
          {activeFile && (
            <button
              onClick={() => { setAiOpen(true); setShowPicker(false); setShowNewFile(false); }}
              className="text-xs text-gray-500 active:text-blue-400 px-1.5 py-1 rounded transition-colors"
              title="AI assist"
            >
              ✦
            </button>
          )}
          <button
            onClick={() => { setShowFileTree(true); setShowPicker(false); setShowNewFile(false); }}
            className="text-gray-500 active:text-gray-200 text-sm leading-none px-1.5 py-1"
            title="File tree"
          >
            ☰
          </button>
          <button
            onClick={() => { setShowNewFile((v) => !v); setShowPicker(false); }}
            className="text-gray-500 active:text-gray-200 text-lg leading-none px-1.5"
            title="New file"
          >
            +
          </button>
        </div>
      </div>

      {/* Tab strip */}
      {openTabs.length > 0 && (
        <div className="flex overflow-x-auto scrollbar-none bg-gray-950 border-b border-gray-700 shrink-0">
          {openTabs.map((tabId) => {
            const file = files.find((f) => f.id === tabId);
            if (!file) return null;
            const name = file.path.split("/").pop() ?? file.path;
            const isActive = tabId === activeId;
            return (
              <div
                key={tabId}
                className={`flex items-center shrink-0 border-r border-gray-700 ${
                  isActive ? "bg-gray-800 border-t-2 border-t-blue-500" : ""
                }`}
              >
                <button
                  onClick={() => openFile(tabId)}
                  className={`px-2.5 py-1.5 text-xs whitespace-nowrap max-w-[110px] truncate ${
                    isActive ? "text-white" : "text-gray-400 active:text-gray-200"
                  }`}
                >
                  {name}
                </button>
                <button
                  onClick={(e) => closeTab(tabId, e)}
                  className="pr-2.5 text-gray-600 active:text-gray-300 text-sm leading-none"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

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
        <div className="absolute inset-x-0 top-10 z-50 bg-gray-900 border-b border-gray-700 shadow-xl flex flex-col max-h-72">
          {files.length > 4 && (
            <div className="px-3 py-2 border-b border-gray-700 shrink-0">
              <input
                ref={pickerSearchRef}
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Filter files…"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 focus:border-blue-500 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Escape") setShowPicker(false); }}
              />
            </div>
          )}
          <div className="overflow-auto">
          {files.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">No files yet</div>
          ) : files.filter((f) => !pickerSearch || f.path.toLowerCase().includes(pickerSearch.toLowerCase())).length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">No match for &ldquo;{pickerSearch}&rdquo;</div>
          ) : files.filter((f) => !pickerSearch || f.path.toLowerCase().includes(pickerSearch.toLowerCase())).map((f) => (
            <div
              key={f.id}
              className={`flex items-center border-b border-gray-800 last:border-0 ${
                f.id === activeId ? "bg-gray-800" : ""
              }`}
            >
              {renamingId === f.id ? (
                <form
                  className="flex-1 flex items-center gap-2 px-3 py-1.5"
                  onSubmit={(e) => { e.preventDefault(); commitRename(f.id); }}
                >
                  <input
                    ref={renameInputRef}
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={() => commitRename(f.id)}
                    onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                    className="flex-1 px-2 py-1 text-xs bg-gray-700 border border-blue-500 rounded text-white focus:outline-none"
                  />
                  <button type="button" onClick={() => setRenamingId(null)} className="text-gray-500 text-xs px-1">✕</button>
                </form>
              ) : (
                <>
                  <button
                    onClick={() => { openFile(f.id); setShowPicker(false); }}
                    className={`flex-1 text-left px-4 py-2.5 text-sm truncate ${
                      f.id === activeId ? "text-blue-400" : "text-gray-300"
                    }`}
                  >
                    {f.path}
                  </button>
                  <button
                    onClick={() => { setRenamingId(f.id); setRenameVal(f.path); }}
                    className="px-3 py-2.5 text-gray-500 active:text-gray-200 text-xs shrink-0"
                    title="Rename"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => deleteFile(f.id)}
                    className="px-3 py-2.5 text-gray-500 active:text-red-400 text-sm shrink-0"
                    title="Delete"
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          ))}
          </div>
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

      {showFileTree && (
        <MobileFileTree
          files={files}
          activeId={activeId}
          onSelect={(id) => { openFile(id); }}
          onClose={() => setShowFileTree(false)}
        />
      )}

      {aiOpen && activeFile && (
        <MobileAiSheet
          fileContent={activeFile.content ?? ""}
          language={activeFile.language ?? inferLang(activeFile.path)}
          onClose={() => setAiOpen(false)}
          onApplyCode={(code) => {
            const editor = editorRef.current as {
              executeEdits?: (source: string, edits: unknown[]) => void;
              getSelection?: () => unknown;
              getModel?: () => { getFullModelRange?: () => unknown } | null;
            } | null;
            if (!editor?.executeEdits || !editor?.getModel) return;
            const model = editor.getModel();
            if (!model) return;
            const selection = editor.getSelection?.() ?? model.getFullModelRange?.();
            editor.executeEdits("ai-apply", [{ range: selection, text: code }]);
          }}
        />
      )}
    </div>
  );
}
