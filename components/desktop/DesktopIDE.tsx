"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import JSZip from "jszip";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CollabProvider } from "@/components/collaboration/CollabProvider";
import CursorPresence from "@/components/collaboration/CursorPresence";
import AiPanel from "./AiPanel";
import ExecutionPanel from "./ExecutionPanel";
import FileFinder from "./FileFinder";
import GlobalSearch from "./GlobalSearch";
import FileTree from "./FileTree";
import MarkdownPreview from "./MarkdownPreview";
import InlineAiCommand from "./InlineAiCommand";
import ProjectSettingsPanel from "./ProjectSettingsPanel";
import ProjectStatsPanel from "./ProjectStatsPanel";
import { timeAgo } from "@/lib/timeAgo";

interface EditorPrefs {
  fontSize: number;
  tabSize: number;
  wordWrap: "on" | "off";
  minimap: boolean;
  theme: "vs-dark" | "light";
}

const PREFS_KEY = "peregrine:editor-prefs";
const DEFAULT_PREFS: EditorPrefs = { fontSize: 14, tabSize: 2, wordWrap: "on", minimap: true, theme: "vs-dark" };

function getTabsKey(projectId: string) { return `peregrine:tabs:${projectId}`; }

function loadPrefs(): EditorPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch { return DEFAULT_PREFS; }
}

interface ProjectFile {
  id: string;
  path: string;
  content: string | null;
  language: string | null;
  updatedAt?: number | null;
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
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [finderOpen, setFinderOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [prefs, setPrefs] = useState<EditorPrefs>(DEFAULT_PREFS);
  const [dirtyTabs, setDirtyTabs] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveStatusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mdPreview, setMdPreview] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState(false);
  const [inlineAiOpen, setInlineAiOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const editorInstanceRef = useRef<unknown>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<{ id: string; value: string } | null>(null);
  const [dropTarget, setDropTarget] = useState(false);
  const [formatError, setFormatError] = useState(false);
  const [gotoLineOpen, setGotoLineOpen] = useState(false);
  const [gotoLineVal, setGotoLineVal] = useState("");
  const gotoLineRef = useRef<HTMLInputElement>(null);

  const openFile = useCallback((id: string) => {
    setActiveFileId(id);
    setOpenTabs((prev) => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const closeTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDirtyTabs((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t !== id);
      if (activeFileId === id) {
        const idx = prev.indexOf(id);
        const fallback = next[idx] ?? next[idx - 1] ?? null;
        setActiveFileId(fallback);
      }
      return next;
    });
  }, [activeFileId]);

  useEffect(() => { setPrefs(loadPrefs()); }, []);
  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

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
        let saved: { activeFileId: string | null; openTabs: string[] } | null = null;
        try {
          const raw = localStorage.getItem(getTabsKey(projectId));
          if (raw) saved = JSON.parse(raw);
        } catch { /* ignore */ }
        const restoredTabs = saved?.openTabs?.filter((id) => validIds.has(id)) ?? [];
        const restoredActive =
          saved?.activeFileId && validIds.has(saved.activeFileId)
            ? saved.activeFileId
            : restoredTabs[0] ?? null;
        if (restoredTabs.length > 0) {
          setOpenTabs(restoredTabs);
          setActiveFileId(restoredActive);
        } else if (data.length > 0) {
          setActiveFileId(data[0].id);
          setOpenTabs([data[0].id]);
        }
      })
      .finally(() => setLoading(false));
  }, [projectId, router]);

  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(
        getTabsKey(projectId),
        JSON.stringify({ activeFileId, openTabs })
      );
    } catch { /* ignore */ }
  }, [openTabs, activeFileId, projectId, loading]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setProjectName(d.name ?? "");
          setIsPublic(d.isPublic ?? false);
        }
      });
    try { localStorage.setItem(`peregrine:last-opened:${projectId}`, Date.now().toString()); } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => {
    if (showNewFile) setTimeout(() => newFileInputRef.current?.focus(), 0);
  }, [showNewFile]);

  useEffect(() => {
    if (renamingId) setTimeout(() => { renameInputRef.current?.select(); }, 0);
  }, [renamingId]);

  useEffect(() => {
    if (gotoLineOpen) setTimeout(() => { gotoLineRef.current?.select(); }, 0);
  }, [gotoLineOpen]);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        if (activeFileId) setInlineAiOpen((v) => !v);
      } else if (mod && e.key === "n") {
        e.preventDefault();
        setShowNewFile(true);
      } else if (mod && e.key === "p") {
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
          setDirtyTabs((prev) => { const next = new Set(prev); next.delete(id); return next; });
          fetch(`/api/projects/${projectId}/files/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: value }),
          }).then(() => {
            setSaveStatus("saved");
            if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
            saveStatusTimer.current = setTimeout(() => setSaveStatus("idle"), 2000);
          });
        }
      } else if (mod && e.key === "w") {
        e.preventDefault();
        if (activeFileId) {
          setOpenTabs((prev) => {
            const next = prev.filter((t) => t !== activeFileId);
            const idx = prev.indexOf(activeFileId);
            setActiveFileId(next[idx] ?? next[idx - 1] ?? null);
            return next;
          });
        }
      } else if (mod && e.key === "PageDown") {
        e.preventDefault();
        setOpenTabs((prev) => {
          if (prev.length < 2) return prev;
          const idx = prev.indexOf(activeFileId ?? "");
          setActiveFileId(prev[(idx + 1) % prev.length]);
          return prev;
        });
      } else if (mod && e.key === "PageUp") {
        e.preventDefault();
        setOpenTabs((prev) => {
          if (prev.length < 2) return prev;
          const idx = prev.indexOf(activeFileId ?? "");
          setActiveFileId(prev[(idx - 1 + prev.length) % prev.length]);
          return prev;
        });
      } else if (mod && e.shiftKey && e.key === "f") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (mod && e.key === ",") {
        e.preventDefault();
        setPrefsOpen((v) => !v);
      } else if (mod && e.key === "g") {
        e.preventDefault();
        setGotoLineOpen(true);
        setGotoLineVal(String(cursorPos.line));
      } else if (e.key === "Escape") {
        if (gotoLineOpen) setGotoLineOpen(false);
        else if (inlineAiOpen) setInlineAiOpen(false);
        else if (prefsOpen) setPrefsOpen(false);
        else if (searchOpen) setSearchOpen(false);
        else if (finderOpen) setFinderOpen(false);
        else if (shortcutsOpen) setShortcutsOpen(false);
        else if (aiOpen) setAiOpen(false);
        else if (termOpen) setTermOpen(false);
      } else if (e.key === "?" && !mod && !e.shiftKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [projectId, finderOpen, aiOpen, termOpen, shortcutsOpen, searchOpen, prefsOpen, activeFileId, inlineAiOpen, gotoLineOpen, cursorPos.line]);

  const activeFile = files.find((f) => f.id === activeFileId) ?? null;

  useEffect(() => {
    if (activeFile && !activeFile.path.endsWith(".md")) setMdPreview(false);
    if (activeFile && !activeFile.path.endsWith(".html")) setHtmlPreview(false);
  }, [activeFile]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!activeFileId || value === undefined) return;
      setFiles((prev) =>
        prev.map((f) => (f.id === activeFileId ? { ...f, content: value } : f))
      );
      setDirtyTabs((prev) => { const next = new Set(prev); next.add(activeFileId); return next; });
      setSaveStatus("saving");
      pendingSave.current = { id: activeFileId, value };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        pendingSave.current = null;
        setDirtyTabs((prev) => { const next = new Set(prev); next.delete(activeFileId); return next; });
        const savedAt = Date.now();
        fetch(`/api/projects/${projectId}/files/${activeFileId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: value }),
        }).then(() => {
          setFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, updatedAt: savedAt } : f));
          setSaveStatus("saved");
          if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
          saveStatusTimer.current = setTimeout(() => setSaveStatus("idle"), 2000);
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
      openFile(file.id);
      setNewFileName("");
      setShowNewFile(false);
    }
  }

  async function deleteFile(fileId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this file?")) return;
    await fetch(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" });
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t !== fileId);
      if (activeFileId === fileId) {
        const idx = prev.indexOf(fileId);
        setActiveFileId(next[idx] ?? next[idx - 1] ?? null);
      }
      return next;
    });
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }

  async function duplicateFile(fileId: string) {
    const source = files.find((f) => f.id === fileId);
    if (!source) return;
    const ext = source.path.includes(".") ? "." + source.path.split(".").pop() : "";
    const base = ext ? source.path.slice(0, -ext.length) : source.path;
    const copyPath = `${base}.copy${ext}`;
    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: copyPath, content: source.content ?? "" }),
    });
    if (res.ok) {
      const created: ProjectFile = await res.json();
      setFiles((prev) => [...prev, created]);
      openFile(created.id);
    }
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

  function formatJson() {
    if (!activeFile || !activeFileId) return;
    try {
      const formatted = JSON.stringify(JSON.parse(activeFile.content ?? ""), null, 2);
      handleChange(formatted);
      setFormatError(false);
    } catch {
      setFormatError(true);
      setTimeout(() => setFormatError(false), 2000);
    }
  }

  async function uploadFiles(fileList: FileList) {
    const uploads = Array.from(fileList).filter((f) => f.size < 1_000_000);
    for (const file of uploads) {
      const content = await file.text();
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: file.name, content }),
      });
      if (res.ok) {
        const created: ProjectFile = await res.json();
        setFiles((prev) => {
          if (prev.some((f) => f.path === created.path)) {
            return prev.map((f) => f.path === created.path ? created : f);
          }
          return [...prev, created];
        });
        openFile(created.id);
      }
    }
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

  async function exportProject() {
    const zip = new JSZip();
    for (const f of files) {
      zip.file(f.path, f.content ?? "");
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-${projectId.slice(0, 8)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openTerminal() {
    setTermOpen(true);
  }

  return (
    <div className="h-full w-full flex bg-peregrine-dark">
      {/* Sidebar toggle tab (always visible) */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-3 h-12 bg-gray-800 hover:bg-gray-700 border border-gray-600 border-l-0 rounded-r flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
        style={{ left: sidebarOpen ? "224px" : "0px" }}
        title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {sidebarOpen ? "‹" : "›"}
      </button>

      {/* Sidebar */}
      {sidebarOpen && (
      <div
        className={`w-56 bg-gray-900 border-r flex flex-col shrink-0 transition-colors ${dropTarget ? "border-blue-500 bg-blue-950/20" : "border-gray-700"}`}
        onDragOver={(e) => { e.preventDefault(); setDropTarget(true); }}
        onDragLeave={() => setDropTarget(false)}
        onDrop={(e) => { e.preventDefault(); setDropTarget(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
      >
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
            <button
              onClick={() => setProjectSettingsOpen(true)}
              className="text-gray-500 hover:text-gray-300 transition-colors text-sm leading-none"
              title="Project settings"
            >
              ⚙
            </button>
            <CursorPresence />
          </div>
        </div>
        {projectName && (
          <div className="px-3 py-1.5 border-b border-gray-700/50">
            <p className="text-xs text-gray-400 truncate" title={projectName}>{projectName}</p>
          </div>
        )}

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

        {dropTarget && (
          <div className="mx-3 mb-2 border border-dashed border-blue-500 rounded-lg px-3 py-4 text-center text-xs text-blue-400 shrink-0">
            Drop files to upload
          </div>
        )}

        {loading ? (
          <div className="px-4 py-2 text-xs text-gray-600">Loading…</div>
        ) : (
          <FileTree
            files={files}
            activeFileId={activeFileId}
            dirtyTabs={dirtyTabs}
            renamingId={renamingId}
            renameVal={renameVal}
            renameInputRef={renameInputRef}
            onOpenFile={openFile}
            onStartRename={(id, path) => { setRenamingId(id); setRenameVal(path); }}
            onRenameChange={setRenameVal}
            onCommitRename={commitRename}
            onDeleteFile={deleteFile}
            onDuplicateFile={duplicateFile}
          />
        )}
      </div>
      )} {/* end sidebarOpen */}

      {/* Editor pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        {openTabs.length > 0 && (
          <div className="flex items-end bg-gray-950 border-b border-gray-700 overflow-x-auto shrink-0" style={{ minHeight: "32px" }}>
            {openTabs.map((tabId) => {
              const tabFile = files.find((f) => f.id === tabId);
              if (!tabFile) return null;
              const isActive = tabId === activeFileId;
              return (
                <div
                  key={tabId}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-gray-700 cursor-pointer shrink-0 select-none transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white border-t-2 border-t-blue-500"
                      : "bg-gray-950 text-gray-400 hover:text-gray-200 hover:bg-gray-900 border-t-2 border-t-transparent"
                  }`}
                  style={{ maxWidth: "180px" }}
                  onClick={() => setActiveFileId(tabId)}
                >
                  {dirtyTabs.has(tabId) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Unsaved changes" />
                  )}
                  <span className="truncate">{tabFile.path.split("/").pop()}</span>
                  <button
                    onClick={(e) => closeTab(tabId, e)}
                    className="text-gray-600 hover:text-gray-300 leading-none ml-0.5 shrink-0"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 text-sm text-gray-300 shrink-0">
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            {activeFile ? (
              <nav className="flex items-center gap-0.5 text-xs min-w-0 overflow-hidden" aria-label="File path">
                {activeFile.path.split("/").map((segment, i, arr) => {
                  const isLast = i === arr.length - 1;
                  return (
                    <span key={i} className="flex items-center gap-0.5 shrink-0">
                      {i > 0 && <span className="text-gray-700 select-none">/</span>}
                      <span className={isLast ? "text-gray-200 font-medium" : "text-gray-500 hover:text-gray-300 transition-colors"}>
                        {segment}
                      </span>
                    </span>
                  );
                })}
              </nav>
            ) : (
              <span className="text-xs text-gray-600">No file selected</span>
            )}
            {saveStatus === "saving" && <span className="text-xs text-gray-600 shrink-0 ml-2">Saving…</span>}
            {saveStatus === "saved" && <span className="text-xs text-green-600 shrink-0 ml-2">Saved ✓</span>}
          </div>
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
            {activeFile?.path.endsWith(".md") && (
              <button
                onClick={() => setMdPreview((v) => !v)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  mdPreview
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
                title="Toggle markdown preview"
              >
                ⊞ Preview
              </button>
            )}
            {activeFile?.path.endsWith(".html") && (
              <button
                onClick={() => setHtmlPreview((v) => !v)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  htmlPreview
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
                title="Toggle HTML preview"
              >
                ⊞ Preview
              </button>
            )}
            {activeExt === "json" && (
              <button
                onClick={formatJson}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  formatError
                    ? "bg-red-800 text-red-300"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
                title="Format JSON"
              >
                {formatError ? "✗ Invalid JSON" : "{ } Format"}
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
            <button
              onClick={() => setPrefsOpen((v) => !v)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                prefsOpen ? "text-white bg-gray-700" : "text-gray-600 hover:text-gray-400"
              }`}
              title="Editor settings (⌘/Ctrl ,)"
            >
              ⚙
            </button>
            <button
              onClick={exportProject}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              title="Export project as ZIP"
              disabled={files.length === 0}
            >
              ↓ ZIP
            </button>
            <button
              onClick={() => setShortcutsOpen(true)}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>
          </div>
        </div>

        {/* Editor + AI panel */}
        <div className="flex min-h-0" style={{ flex: termOpen ? "0 0 60%" : "1 1 0" }}>
          <div className="flex min-w-0 flex-1" style={{ minHeight: 0 }}>
            <div className={(mdPreview && activeFile?.path.endsWith(".md")) || (htmlPreview && activeFile?.path.endsWith(".html")) ? "w-1/2 min-w-0" : "flex-1 min-w-0"}>
              {activeFile ? (
                <Editor
                  key={activeFile.id}
                  height="100%"
                  language={activeFile.language ?? inferLanguage(activeFile.path)}
                  value={activeFile.content ?? ""}
                  theme={prefs.theme}
                  onChange={handleChange}
                  onMount={(editor) => {
                    editorInstanceRef.current = editor;
                    setCursorPos({ line: 1, col: 1 });
                    editor.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => {
                      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
                    });
                  }}
                  options={{
                    fontSize: prefs.fontSize,
                    tabSize: prefs.tabSize,
                    minimap: { enabled: prefs.minimap },
                    automaticLayout: true,
                    wordWrap: prefs.wordWrap,
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
            {mdPreview && activeFile?.path.endsWith(".md") && (
              <div className="w-1/2 border-l border-gray-700 min-w-0">
                <MarkdownPreview content={activeFile.content ?? ""} />
              </div>
            )}
            {htmlPreview && activeFile?.path.endsWith(".html") && (
              <div className="w-1/2 border-l border-gray-700 min-w-0 bg-white">
                <iframe
                  key={activeFile.id}
                  srcDoc={activeFile.content ?? ""}
                  sandbox="allow-scripts"
                  className="w-full h-full"
                  title="HTML Preview"
                />
              </div>
            )}
          </div>

          {aiOpen && (
            <AiPanel
              fileContent={activeFile?.content ?? ""}
              language={activeFile?.language ?? inferLanguage(activeFile?.path ?? "")}
              onClose={() => setAiOpen(false)}
              editorRef={editorInstanceRef}
              projectId={projectId}
              allFiles={files}
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

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-0.5 bg-blue-900/40 border-t border-gray-800 text-xs text-gray-500 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStatsOpen((v) => !v)}
              className="hover:text-white transition-colors"
              title="Project stats"
            >
              {files.length} {files.length === 1 ? "file" : "files"}
            </button>
            <span>{activeFile ? (activeFile.language ?? inferLanguage(activeFile.path)) : "—"}</span>
            {activeFile && (
              <button
                onClick={() => { setGotoLineOpen(true); setGotoLineVal(String(cursorPos.line)); }}
                className="hover:text-white transition-colors"
                title="Go to line (⌘/Ctrl G)"
              >
                {(activeFile.content ?? "").split("\n").length} lines
              </button>
            )}
            {activeFile && (activeFile.content ?? "").trim() && (
              <span title="Word count">
                {(activeFile.content ?? "").trim().split(/\s+/).length} words
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>UTF-8</span>
            {activeFile?.updatedAt && (
              <span title={new Date(activeFile.updatedAt).toLocaleString()}>
                {timeAgo(activeFile.updatedAt)}
              </span>
            )}
            {activeFile && (
              <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
            )}
            <span className="flex items-center gap-1">
              <button
                onClick={() => setPrefs((p) => ({ ...p, fontSize: Math.max(10, p.fontSize - 1) }))}
                className="w-4 h-4 flex items-center justify-center hover:text-white rounded transition-colors"
                title="Decrease font size"
              >−</button>
              <span className="w-6 text-center">{prefs.fontSize}</span>
              <button
                onClick={() => setPrefs((p) => ({ ...p, fontSize: Math.min(24, p.fontSize + 1) }))}
                className="w-4 h-4 flex items-center justify-center hover:text-white rounded transition-colors"
                title="Increase font size"
              >+</button>
            </span>
          </div>
        </div>
      </div>
      {gotoLineOpen && activeFile && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setGotoLineOpen(false)}
        >
          <div
            className="absolute top-16 right-4 bg-gray-900 border border-gray-600 rounded-lg shadow-2xl overflow-hidden w-72"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const lineNum = parseInt(gotoLineVal, 10);
                const ed = editorInstanceRef.current as {
                  revealLineInCenter?: (n: number) => void;
                  setPosition?: (p: { lineNumber: number; column: number }) => void;
                  focus?: () => void;
                  getModel?: () => { getLineCount: () => number } | null;
                } | null;
                if (!ed || !lineNum || isNaN(lineNum)) { setGotoLineOpen(false); return; }
                const total = ed.getModel?.()?.getLineCount() ?? 1;
                const clamped = Math.max(1, Math.min(total, lineNum));
                ed.revealLineInCenter?.(clamped);
                ed.setPosition?.({ lineNumber: clamped, column: 1 });
                ed.focus?.();
                setGotoLineOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2"
            >
              <span className="text-xs text-gray-400 shrink-0">Go to line</span>
              <input
                ref={gotoLineRef}
                value={gotoLineVal}
                onChange={(e) => setGotoLineVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setGotoLineOpen(false); }}
                type="number"
                min={1}
                className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 focus:border-blue-500 rounded text-white text-sm focus:outline-none w-0"
                placeholder="line number"
              />
              <button
                type="submit"
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors shrink-0"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      )}
      {statsOpen && (
        <ProjectStatsPanel
          files={files}
          projectName={projectName}
          onClose={() => setStatsOpen(false)}
        />
      )}
      {finderOpen && (
        <FileFinder
          files={files}
          onSelect={(id) => { openFile(id); setFinderOpen(false); }}
          onClose={() => setFinderOpen(false)}
          openTabs={openTabs}
        />
      )}
      {searchOpen && (
        <GlobalSearch
          projectId={projectId}
          files={files}
          onSelect={(id) => { openFile(id); setSearchOpen(false); }}
          onClose={() => setSearchOpen(false)}
          onFileSave={(fileId, content) => {
            setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, content } : f));
          }}
        />
      )}
      {prefsOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-end pt-12 pr-4" onClick={() => setPrefsOpen(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-sm font-semibold">Editor Settings</h2>
              <button onClick={() => setPrefsOpen(false)} className="text-gray-500 hover:text-white text-sm">×</button>
            </div>
            <div className="space-y-4">
              {/* Font size */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Font size</label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, fontSize: Math.max(10, p.fontSize - 1) }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm"
                  >−</button>
                  <span className="text-xs text-white w-6 text-center">{prefs.fontSize}</span>
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, fontSize: Math.min(24, p.fontSize + 1) }))}
                    className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm"
                  >+</button>
                </div>
              </div>
              {/* Tab size */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Tab size</label>
                <select
                  value={prefs.tabSize}
                  onChange={(e) => setPrefs((p) => ({ ...p, tabSize: Number(e.target.value) }))}
                  className="text-xs bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                >
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                  <option value={8}>8 spaces</option>
                </select>
              </div>
              {/* Word wrap */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Word wrap</label>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, wordWrap: p.wordWrap === "on" ? "off" : "on" }))}
                  className={`relative w-9 h-5 rounded-full transition-colors ${prefs.wordWrap === "on" ? "bg-blue-600" : "bg-gray-700"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs.wordWrap === "on" ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              {/* Minimap */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Minimap</label>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, minimap: !p.minimap }))}
                  className={`relative w-9 h-5 rounded-full transition-colors ${prefs.minimap ? "bg-blue-600" : "bg-gray-700"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs.minimap ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              {/* Theme */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Theme</label>
                <div className="flex gap-1">
                  {(["vs-dark", "light"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setPrefs((p) => ({ ...p, theme: t }))}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                        prefs.theme === t
                          ? "border-blue-500 bg-blue-600/20 text-blue-300"
                          : "border-gray-700 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {t === "vs-dark" ? "Dark" : "Light"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Reset */}
              <button
                onClick={() => setPrefs(DEFAULT_PREFS)}
                className="w-full text-xs text-gray-500 hover:text-gray-300 pt-1 text-center transition-colors"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        </div>
      )}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShortcutsOpen(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Keyboard Shortcuts</h2>
              <button onClick={() => setShortcutsOpen(false)} className="text-gray-500 hover:text-white">×</button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["⌘/Ctrl K", "Inline AI command"],
                ["⌘/Ctrl N", "New file"],
                ["⌘/Ctrl P", "Quick file open"],
                ["⌘/Ctrl G", "Go to line"],
                ["⌘/Ctrl Shift F", "Search across files"],
                ["⌘/Ctrl W", "Close current tab"],
                ["⌘/Ctrl PageDown", "Next tab"],
                ["⌘/Ctrl PageUp", "Previous tab"],
                ["⌘/Ctrl `", "Toggle terminal"],
                ["⌘/Ctrl S", "Save immediately"],
                ["⌘/Ctrl ,", "Editor settings"],
                ["Escape", "Close panel / modal"],
                ["?", "Show this help"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-400">{desc}</span>
                  <kbd className="px-2 py-0.5 text-xs bg-gray-800 border border-gray-600 rounded text-gray-300 font-mono">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {inlineAiOpen && activeFile && (
        <InlineAiCommand
          language={activeFile.language ?? inferLanguage(activeFile.path)}
          editorRef={editorInstanceRef}
          onClose={() => setInlineAiOpen(false)}
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
      {projectSettingsOpen && (
        <ProjectSettingsPanel
          projectId={projectId}
          initialName={projectName}
          initialIsPublic={isPublic}
          onClose={() => setProjectSettingsOpen(false)}
          onNameChange={(name) => setProjectName(name)}
          onVisibilityChange={(pub) => {
            setIsPublic(pub);
            if (pub) setShareToast(true);
          }}
        />
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
