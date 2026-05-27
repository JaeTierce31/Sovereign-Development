"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Editor, { DiffEditor } from "@monaco-editor/react";
import JSZip from "jszip";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CollabProvider } from "@/components/collaboration/CollabProvider";
import CursorPresence from "@/components/collaboration/CursorPresence";
import AiPanel from "./AiPanel";
import ExecutionPanel from "./ExecutionPanel";
import CommandPalette from "./CommandPalette";
import FileFinder from "./FileFinder";
import GlobalSearch from "./GlobalSearch";
import FileTree from "./FileTree";
import MarkdownPreview from "./MarkdownPreview";
import InlineAiCommand from "./InlineAiCommand";
import ProjectSettingsPanel from "./ProjectSettingsPanel";
import ProjectStatsPanel from "./ProjectStatsPanel";
import LocalHistoryPanel, { type Snapshot } from "./LocalHistoryPanel";
import { timeAgo } from "@/lib/timeAgo";

interface EditorPrefs {
  fontSize: number;
  tabSize: number;
  wordWrap: "on" | "off";
  minimap: boolean;
  theme: "vs-dark" | "light" | "dracula" | "one-dark" | "github-dark";
  stickyScroll: boolean;
  ruler: 80 | 120 | null;
  keymap: "default" | "vim";
  formatOnSave: boolean;
  insertSpaces: boolean;
  detectIndentation: boolean;
  fontFamily: string;
  renderWhitespace: "none" | "boundary" | "all";
  cursorStyle: "line" | "block" | "underline";
  lineNumbers: "on" | "off";
  bracketPairColorization: boolean;
  quickSuggestions: boolean;
  autoClosingBrackets: "always" | "languageDefined" | "never";
  fontLigatures: boolean;
}

const PREFS_KEY = "peregrine:editor-prefs";
const DEFAULT_PREFS: EditorPrefs = { fontSize: 14, tabSize: 2, wordWrap: "on", minimap: true, theme: "vs-dark", stickyScroll: true, ruler: null, keymap: "default", formatOnSave: false, insertSpaces: true, detectIndentation: true, fontFamily: "default", renderWhitespace: "none", cursorStyle: "line", lineNumbers: "on", bracketPairColorization: true, quickSuggestions: true, autoClosingBrackets: "languageDefined", fontLigatures: true };

const FONT_URLS: Record<string, string> = {
  "JetBrains Mono": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap",
  "Fira Code": "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap",
  "Source Code Pro": "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500&display=swap",
};

const FONT_OPTIONS: { label: string; value: string; stack: string }[] = [
  { label: "Default", value: "default", stack: "" },
  { label: "JetBrains Mono", value: "JetBrains Mono", stack: "'JetBrains Mono', monospace" },
  { label: "Fira Code", value: "Fira Code", stack: "'Fira Code', monospace" },
  { label: "Source Code Pro", value: "Source Code Pro", stack: "'Source Code Pro', monospace" },
  { label: "System Mono", value: "system", stack: "monospace" },
];

interface ThemeDef {
  base: "vs-dark" | "vs";
  rules: { token: string; foreground?: string; fontStyle?: string }[];
  colors: Record<string, string>;
}

const CUSTOM_THEMES: Record<string, ThemeDef> = {
  dracula: {
    base: "vs-dark",
    rules: [
      { token: "comment", foreground: "6272a4", fontStyle: "italic" },
      { token: "string", foreground: "f1fa8c" },
      { token: "constant.numeric", foreground: "bd93f9" },
      { token: "constant.language", foreground: "bd93f9" },
      { token: "keyword", foreground: "ff79c6" },
      { token: "storage.type", foreground: "ff79c6" },
      { token: "storage.modifier", foreground: "ff79c6" },
      { token: "entity.name.function", foreground: "50fa7b" },
      { token: "entity.name.type", foreground: "8be9fd" },
      { token: "entity.name.class", foreground: "8be9fd" },
      { token: "variable.parameter", foreground: "ffb86c" },
      { token: "support.function", foreground: "50fa7b" },
      { token: "type.identifier", foreground: "8be9fd" },
      { token: "operator", foreground: "ff79c6" },
      { token: "tag", foreground: "ff79c6" },
      { token: "attribute.name", foreground: "50fa7b" },
      { token: "attribute.value", foreground: "f1fa8c" },
    ],
    colors: {
      "editor.background": "#282a36",
      "editor.foreground": "#f8f8f2",
      "editor.lineHighlightBackground": "#44475a",
      "editor.selectionBackground": "#44475a",
      "editor.inactiveSelectionBackground": "#44475a80",
      "editorCursor.foreground": "#f8f8f0",
      "editorLineNumber.foreground": "#6272a4",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editorIndentGuide.background1": "#3d3f4e",
      "editorIndentGuide.activeBackground1": "#9d9d9d",
      "scrollbarSlider.background": "#44475a99",
      "editor.findMatchBackground": "#ffb86c4d",
      "editor.findMatchHighlightBackground": "#ffffff26",
    },
  },
  "one-dark": {
    base: "vs-dark",
    rules: [
      { token: "comment", foreground: "5c6370", fontStyle: "italic" },
      { token: "string", foreground: "98c379" },
      { token: "constant.numeric", foreground: "d19a66" },
      { token: "constant.language", foreground: "56b6c2" },
      { token: "keyword", foreground: "c678dd" },
      { token: "storage.type", foreground: "c678dd" },
      { token: "storage.modifier", foreground: "c678dd" },
      { token: "entity.name.function", foreground: "61afef" },
      { token: "entity.name.type", foreground: "e5c07b" },
      { token: "entity.name.class", foreground: "e5c07b" },
      { token: "variable", foreground: "e06c75" },
      { token: "support.function", foreground: "61afef" },
      { token: "type.identifier", foreground: "e5c07b" },
      { token: "operator", foreground: "56b6c2" },
      { token: "tag", foreground: "e06c75" },
      { token: "attribute.name", foreground: "d19a66" },
      { token: "attribute.value", foreground: "98c379" },
    ],
    colors: {
      "editor.background": "#282c34",
      "editor.foreground": "#abb2bf",
      "editor.lineHighlightBackground": "#2c313c",
      "editor.selectionBackground": "#3e4452",
      "editor.inactiveSelectionBackground": "#3e445280",
      "editorCursor.foreground": "#528bff",
      "editorLineNumber.foreground": "#495162",
      "editorLineNumber.activeForeground": "#abb2bf",
      "editorIndentGuide.background1": "#3b4048",
      "editorIndentGuide.activeBackground1": "#9d9d9d",
      "scrollbarSlider.background": "#3e445299",
    },
  },
  "github-dark": {
    base: "vs-dark",
    rules: [
      { token: "comment", foreground: "8b949e", fontStyle: "italic" },
      { token: "string", foreground: "a5d6ff" },
      { token: "constant.numeric", foreground: "79c0ff" },
      { token: "constant.language", foreground: "79c0ff" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "storage.type", foreground: "ff7b72" },
      { token: "storage.modifier", foreground: "ff7b72" },
      { token: "entity.name.function", foreground: "d2a8ff" },
      { token: "entity.name.type", foreground: "f0883e" },
      { token: "entity.name.class", foreground: "f0883e" },
      { token: "support.function", foreground: "d2a8ff" },
      { token: "type.identifier", foreground: "f0883e" },
      { token: "operator", foreground: "ff7b72" },
      { token: "tag", foreground: "7ee787" },
      { token: "attribute.name", foreground: "79c0ff" },
      { token: "attribute.value", foreground: "a5d6ff" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#c9d1d9",
      "editor.lineHighlightBackground": "#161b22",
      "editor.selectionBackground": "#3b5070",
      "editor.inactiveSelectionBackground": "#3b507080",
      "editorCursor.foreground": "#c9d1d9",
      "editorLineNumber.foreground": "#6e7681",
      "editorLineNumber.activeForeground": "#c9d1d9",
      "editorIndentGuide.background1": "#21262d",
      "editorIndentGuide.activeBackground1": "#9d9d9d",
      "scrollbarSlider.background": "#6e768166",
      "editor.findMatchBackground": "#f2cc604d",
      "editor.findMatchHighlightBackground": "#f2cc6026",
    },
  },
};

const THEME_OPTIONS: { label: string; value: string }[] = [
  { label: "VS Dark", value: "vs-dark" },
  { label: "VS Light", value: "light" },
  { label: "Dracula", value: "dracula" },
  { label: "One Dark Pro", value: "one-dark" },
  { label: "GitHub Dark", value: "github-dark" },
];

const TAB_SIZES = [2, 4, 8] as const;

function getTabsKey(projectId: string) { return `peregrine:tabs:${projectId}`; }
function getPinnedKey(projectId: string) { return `peregrine:pinned:${projectId}`; }

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

function getFilename(path: string) { return path.split("/").pop() ?? path; }
function getFileExt(path: string) { return (path.split(".").pop() ?? "").toLowerCase(); }

const TEMPLATE_EXTS = new Set(["ts","tsx","jsx","js","py","sh","css","html","md","json","toml","yaml","yml","sql","rs","go","java","rb","php","swift","kt"]);
const TEMPLATE_FILENAMES = new Set(["package.json",".gitignore",".env","Dockerfile","docker-compose.yml","README.md","tsconfig.json"]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "svg"]);
const IMAGE_MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", ico: "image/x-icon",
  bmp: "image/bmp", svg: "image/svg+xml",
};

function ImageViewer({ file, ext }: { file: { path: string; content: string | null }; ext: string }) {
  const [copied, setCopied] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  const src = (() => {
    const c = file.content ?? "";
    if (!c) return null;
    if (c.startsWith("data:")) return c;
    if (ext === "svg") return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(c)}`;
    const mime = IMAGE_MIME[ext] ?? "image/png";
    return `data:${mime};base64,${c}`;
  })();

  if (!src) return (
    <div className="flex items-center justify-center h-full text-gray-600 text-sm">No image data</div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-950 gap-3 p-8 select-none overflow-auto">
      <div
        className="relative rounded border border-gray-800 overflow-hidden"
        style={{
          backgroundImage: "linear-gradient(45deg,#1a1a1a 25%,transparent 25%),linear-gradient(-45deg,#1a1a1a 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1a1a1a 75%),linear-gradient(-45deg,transparent 75%,#1a1a1a 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
          backgroundColor: "#141414",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={file.path}
          className="max-w-[calc(100vw-320px)] max-h-[calc(100vh-240px)] object-contain block"
          onLoad={(e) => {
            const img = e.currentTarget;
            setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
        />
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="font-mono">{file.path.split("/").pop()}</span>
        {imgSize && <span>{imgSize.w} × {imgSize.h}px</span>}
        <button
          onClick={() => {
            navigator.clipboard.writeText(src).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }).catch(() => {});
          }}
          className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors"
        >
          {copied ? "Copied!" : "Copy data URL"}
        </button>
      </div>
    </div>
  );
}

// File templates keyed by extension (lowercase)
const FILE_TEMPLATES: Record<string, string> = {
  tsx: `import React from 'react';\n\ninterface Props {}\n\nexport default function Component({}: Props) {\n  return (\n    <div>\n\n    </div>\n  );\n}\n`,
  ts: `export {};\n`,
  jsx: `import React from 'react';\n\nexport default function Component() {\n  return (\n    <div>\n\n    </div>\n  );\n}\n`,
  js: `'use strict';\n`,
  py: `def main():\n    pass\n\n\nif __name__ == '__main__':\n    main()\n`,
  html: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Document</title>\n  </head>\n  <body>\n\n  </body>\n</html>\n`,
  css: `/* styles */\n`,
  md: `# Title\n\n`,
  json: `{\n}\n`,
  yaml: ``,
  yml: ``,
  sh: `#!/usr/bin/env bash\nset -euo pipefail\n\n`,
  rs: `fn main() {\n\n}\n`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n\n    }\n}\n`,
  rb: `# frozen_string_literal: true\n\n`,
  php: `<?php\n\n`,
  swift: `import Foundation\n\n`,
  kt: `fun main() {\n\n}\n`,
};

function getFileTemplate(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return FILE_TEMPLATES[ext] ?? "";
}

const SIDEBAR_WIDTH_KEY = "peregrine:sidebar-width";
const SIDEBAR_MIN = 140;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 224;

function getSavedSidebarWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT;
  const v = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY) ?? "", 10);
  return isNaN(v) ? SIDEBAR_DEFAULT : Math.min(Math.max(v, SIDEBAR_MIN), SIDEBAR_MAX);
}

const TERM_HEIGHT_KEY = "peregrine:term-height";
const TERM_HEIGHT_MIN = 80;
const TERM_HEIGHT_MAX = 700;
const TERM_HEIGHT_DEFAULT = 280;

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
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const isDraggingSidebar = useRef(false);
  const [termHeightPx, setTermHeightPx] = useState(TERM_HEIGHT_DEFAULT);
  const isDraggingTerm = useRef(false);
  const [mdPreview, setMdPreview] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState(false);
  const [inlineAiOpen, setInlineAiOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const editorInstanceRef = useRef<unknown>(null);
  const vimModeRef = useRef<{ dispose: () => void } | null>(null);
  const vimStatusRef = useRef<HTMLDivElement>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [selectionStats, setSelectionStats] = useState<{ chars: number; lines: number } | null>(null);
  const [fileIndentOverride, setFileIndentOverride] = useState<{ insertSpaces: boolean; tabSize: number } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const localHistoryRef = useRef<Map<string, Snapshot[]>>(new Map());
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
  const dragTabIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [tabContextMenu, setTabContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const closedTabHistory = useRef<string[]>([]);
  const filesRef = useRef(files);
  const [pinnedTabs, setPinnedTabs] = useState<Set<string>>(new Set());
  const [splitFileId, setSplitFileId] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const isDraggingSplit = useRef(false);
  const [diffMode, setDiffMode] = useState(false);
  const savedContentRef = useRef<Map<string, string>>(new Map());
  const [breadcrumbPopover, setBreadcrumbPopover] = useState<{ folderPath: string; x: number; y: number } | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const preZenState = useRef<{ sidebar: boolean; term: boolean } | null>(null);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [langFilter, setLangFilter] = useState("");
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const uploadToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [importUrlOpen, setImportUrlOpen] = useState(false);
  const [importUrlVal, setImportUrlVal] = useState("");
  const [importUrlError, setImportUrlError] = useState("");
  const [importUrlLoading, setImportUrlLoading] = useState(false);
  const importUrlRef = useRef<HTMLInputElement>(null);

  const openFile = useCallback((id: string) => {
    setActiveFileId(id);
    setOpenTabs((prev) => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinnedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const closeTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pinnedTabs.has(id)) return;
    closedTabHistory.current = [id, ...closedTabHistory.current].slice(0, 10);
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
  }, [activeFileId, pinnedTabs]);

  useEffect(() => { filesRef.current = files; }, [files]);

  useEffect(() => { setPrefs(loadPrefs()); }, []);
  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => { setSidebarWidth(getSavedSidebarWidth()); }, []);

  useEffect(() => {
    const raw = localStorage.getItem(getPinnedKey(projectId));
    if (raw) { try { setPinnedTabs(new Set(JSON.parse(raw))); } catch { /* ignore */ } }
  }, [projectId]);

  useEffect(() => {
    try { localStorage.setItem(getPinnedKey(projectId), JSON.stringify([...pinnedTabs])); } catch { /* ignore */ }
  }, [pinnedTabs, projectId]);

  useEffect(() => {
    if (!editorReady || !editorInstanceRef.current) return;
    let cancelled = false;
    vimModeRef.current?.dispose();
    vimModeRef.current = null;
    if (prefs.keymap === "vim") {
      const editor = editorInstanceRef.current;
      import("monaco-vim").then(({ initVimMode }) => {
        if (cancelled) return;
        vimModeRef.current = initVimMode(
          editor as Parameters<typeof initVimMode>[0],
          vimStatusRef.current!
        );
      });
    }
    return () => {
      cancelled = true;
      vimModeRef.current?.dispose();
      vimModeRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.keymap, editorReady]);

  useEffect(() => { setDiffMode(false); }, [activeFileId]);

  const startSidebarDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSidebar.current = true;
    const startX = e.clientX;
    const startW = sidebarWidth;

    function onMove(ev: MouseEvent) {
      if (!isDraggingSidebar.current) return;
      const next = Math.min(Math.max(startW + ev.clientX - startX, SIDEBAR_MIN), SIDEBAR_MAX);
      setSidebarWidth(next);
    }
    function onUp() {
      isDraggingSidebar.current = false;
      setSidebarWidth((w) => {
        try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w)); } catch { /* ignore */ }
        return w;
      });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  useEffect(() => {
    const saved = parseInt(localStorage.getItem(TERM_HEIGHT_KEY) ?? "", 10);
    if (!isNaN(saved)) setTermHeightPx(Math.min(Math.max(saved, TERM_HEIGHT_MIN), TERM_HEIGHT_MAX));
  }, []);

  const startTermDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingTerm.current = true;
    const startY = e.clientY;
    const startH = termHeightPx;

    function onMove(ev: MouseEvent) {
      if (!isDraggingTerm.current) return;
      const next = Math.min(Math.max(startH + startY - ev.clientY, TERM_HEIGHT_MIN), TERM_HEIGHT_MAX);
      setTermHeightPx(next);
    }
    function onUp() {
      isDraggingTerm.current = false;
      setTermHeightPx((h) => {
        try { localStorage.setItem(TERM_HEIGHT_KEY, String(h)); } catch { /* ignore */ }
        return h;
      });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, [termHeightPx]);

  const startSplitDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingSplit.current = true;
    const container = (e.currentTarget as HTMLDivElement).parentElement!;
    function onMove(ev: MouseEvent) {
      if (!isDraggingSplit.current) return;
      const rect = container.getBoundingClientRect();
      const ratio = Math.min(Math.max((ev.clientX - rect.left) / rect.width, 0.2), 0.8);
      setSplitRatio(ratio);
    }
    function onUp() {
      isDraggingSplit.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/files`)
      .then((r) => {
        if (r.status === 404) { router.push("/dashboard"); return null; }
        return r.json();
      })
      .then((data: ProjectFile[] | null) => {
        if (!data) return;
        setFiles(data);
        data.forEach((f) => { if (f.content !== null) savedContentRef.current.set(f.id, f.content); });
        const validIds = new Set(data.map((f) => f.id));
        let saved: { activeFileId: string | null; openTabs: string[]; splitFileId?: string | null } | null = null;
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
        if (saved?.splitFileId && validIds.has(saved.splitFileId)) {
          setSplitFileId(saved.splitFileId);
        }
      })
      .finally(() => setLoading(false));
  }, [projectId, router]);

  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(
        getTabsKey(projectId),
        JSON.stringify({ activeFileId, openTabs, splitFileId })
      );
    } catch { /* ignore */ }
  }, [openTabs, activeFileId, splitFileId, projectId, loading]);

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

  useEffect(() => {
    if (importUrlOpen) setTimeout(() => importUrlRef.current?.focus(), 0);
  }, [importUrlOpen]);

  useEffect(() => { setSelectionStats(null); }, [activeFileId]);

  // Load Google Font when a web font is selected
  useEffect(() => {
    const url = FONT_URLS[prefs.fontFamily];
    if (!url) return;
    const id = `gfont-${prefs.fontFamily.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }, [prefs.fontFamily]);

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
        (async () => {
          // Format before save if enabled (Monaco handles js/ts/json/css/html natively)
          if (prefs.formatOnSave && editorInstanceRef.current) {
            type Ed = { getAction: (id: string) => { run: () => Promise<void> } | null; getValue: () => string };
            const ed = editorInstanceRef.current as Ed;
            try {
              const action = ed.getAction('editor.action.formatDocument');
              if (action) {
                await action.run();
                // Format changed the model → capture updated value for save
                if (!pendingSave.current && activeFileId) {
                  pendingSave.current = { id: activeFileId, value: ed.getValue() };
                }
              }
            } catch { /* formatter unavailable for this language */ }
          }
          // Flush debounced save immediately
          if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
          if (pendingSave.current) {
            const { id, value } = pendingSave.current;
            pendingSave.current = null;
            setDirtyTabs((prev) => { const next = new Set(prev); next.delete(id); return next; });
            const savedAt = Date.now();
            fetch(`/api/projects/${projectId}/files/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ content: value }),
            }).then(() => {
              savedContentRef.current.set(id, value);
              setFiles((prev) => prev.map((f) => f.id === id ? { ...f, updatedAt: savedAt } : f));
              setSaveStatus("saved");
              if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
              saveStatusTimer.current = setTimeout(() => setSaveStatus("idle"), 2000);
              // Capture local history snapshot on manual save
              const prev = localHistoryRef.current.get(id) ?? [];
              const last = prev[0];
              if (!last || last.content !== value) {
                localHistoryRef.current.set(id, [{ savedAt, content: value }, ...prev].slice(0, 20));
              }
            });
          }
        })();
      } else if (mod && e.key === "w") {
        e.preventDefault();
        if (activeFileId && !pinnedTabs.has(activeFileId)) {
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
      } else if (mod && e.shiftKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        const history = closedTabHistory.current;
        while (history.length > 0) {
          const id = history.shift()!;
          if (filesRef.current.find((f) => f.id === id)) {
            openFile(id);
            break;
          }
        }
      } else if (mod && e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      } else if (mod && e.shiftKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        if (activeFileId) setHistoryOpen((v) => !v);
      } else if (mod && e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        setZenMode((on) => {
          if (!on) {
            preZenState.current = { sidebar: sidebarOpen, term: termOpen };
            setSidebarOpen(false);
            setTermOpen(false);
          } else {
            if (preZenState.current) {
              setSidebarOpen(preZenState.current.sidebar);
              setTermOpen(preZenState.current.term);
            }
            preZenState.current = null;
          }
          return !on;
        });
      } else if (mod && e.shiftKey && e.key === "f") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (mod && e.key === ",") {
        e.preventDefault();
        setPrefsOpen((v) => !v);
      } else if (mod && e.key === "\\") {
        e.preventDefault();
        setSplitFileId((cur) => cur ? null : (activeFileId ?? null));
      } else if (mod && e.key === "g") {
        e.preventDefault();
        setGotoLineOpen(true);
        setGotoLineVal(String(cursorPos.line));
      } else if (e.key === "Escape") {
        if (tabContextMenu) { setTabContextMenu(null); return; }
        if (breadcrumbPopover) { setBreadcrumbPopover(null); return; }
        if (langPickerOpen) { setLangPickerOpen(false); return; }
        if (importUrlOpen) { setImportUrlOpen(false); return; }
        if (gotoLineOpen) setGotoLineOpen(false);
        else if (inlineAiOpen) setInlineAiOpen(false);
        else if (commandPaletteOpen) setCommandPaletteOpen(false);
        else if (zenMode) setZenMode((on) => {
          if (on && preZenState.current) {
            setSidebarOpen(preZenState.current.sidebar);
            setTermOpen(preZenState.current.term);
            preZenState.current = null;
          }
          return false;
        });
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
  }, [projectId, finderOpen, aiOpen, termOpen, shortcutsOpen, searchOpen, prefsOpen, activeFileId, inlineAiOpen, gotoLineOpen, cursorPos.line, tabContextMenu, openFile, pinnedTabs, splitFileId, breadcrumbPopover, commandPaletteOpen, zenMode, sidebarOpen, langPickerOpen, importUrlOpen]);

  const activeFile = files.find((f) => f.id === activeFileId) ?? null;

  // Auto-detect indentation style from file content
  useEffect(() => {
    const content = activeFile?.content;
    if (!prefs.detectIndentation || !content) { setFileIndentOverride(null); return; }
    const lines = content.split("\n").slice(0, 250);
    let tabs = 0, spaces = 0;
    const diffs: number[] = [];
    let prevIndent = 0;
    for (const line of lines) {
      if (!line.trim()) continue;
      if (line[0] === "\t") { tabs++; prevIndent = 0; continue; }
      const m = line.match(/^( +)/);
      if (m) {
        const indent = m[1].length;
        const diff = Math.abs(indent - prevIndent);
        if (diff > 0 && diff <= 8) diffs.push(diff);
        spaces++;
        prevIndent = indent;
      } else {
        prevIndent = 0;
      }
    }
    if (tabs === 0 && spaces === 0) { setFileIndentOverride(null); return; }
    if (tabs > spaces) { setFileIndentOverride({ insertSpaces: false, tabSize: 4 }); return; }
    const freq: Record<number, number> = {};
    for (const d of diffs) freq[d] = (freq[d] ?? 0) + 1;
    const best = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    const raw = best ? parseInt(best[0]) : 2;
    const tabSize = ([2, 3, 4, 8] as const).reduce((a, b) => (Math.abs(b - raw) < Math.abs(a - raw) ? b : a));
    setFileIndentOverride({ insertSpaces: true, tabSize });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFileId, prefs.detectIndentation, activeFile?.content]);

  const effectiveInsertSpaces = (prefs.detectIndentation && fileIndentOverride !== null) ? fileIndentOverride.insertSpaces : prefs.insertSpaces;
  const effectiveTabSize = (prefs.detectIndentation && fileIndentOverride !== null) ? fileIndentOverride.tabSize : prefs.tabSize;

  const packageJsonScripts = (() => {
    const pkgFile = files.find((f) => f.path === "package.json" || f.path.endsWith("/package.json"));
    if (!pkgFile?.content) return undefined;
    try {
      const pkg = JSON.parse(pkgFile.content);
      const s = pkg?.scripts;
      return s && typeof s === "object" && Object.keys(s).length > 0
        ? (s as Record<string, string>)
        : undefined;
    } catch { return undefined; }
  })();

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
          savedContentRef.current.set(activeFileId, value);
          setFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, updatedAt: savedAt } : f));
          setSaveStatus("saved");
          if (saveStatusTimer.current) clearTimeout(saveStatusTimer.current);
          saveStatusTimer.current = setTimeout(() => setSaveStatus("idle"), 2000);
        });
      }, 800);
    },
    [activeFileId, projectId]
  );

  const handleSplitChange = useCallback(
    (value: string | undefined) => {
      if (!splitFileId || value === undefined) return;
      setFiles((prev) =>
        prev.map((f) => (f.id === splitFileId ? { ...f, content: value } : f))
      );
      setDirtyTabs((prev) => { const next = new Set(prev); next.add(splitFileId); return next; });
      fetch(`/api/projects/${projectId}/files/${splitFileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
      }).then(() => {
        savedContentRef.current.set(splitFileId, value);
        const savedAt = Date.now();
        setFiles((prev) => prev.map((f) => f.id === splitFileId ? { ...f, updatedAt: savedAt } : f));
        setDirtyTabs((prev) => { const next = new Set(prev); next.delete(splitFileId); return next; });
      });
    },
    [splitFileId, projectId]
  );

  async function createFile(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newFileName.trim();
    if (!trimmed) return;
    const template = getFileTemplate(trimmed);
    const res = await fetch(`/api/projects/${projectId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: trimmed, content: template }),
    });
    if (res.ok) {
      const file: ProjectFile = await res.json();
      const content = template || (file.content ?? "");
      savedContentRef.current.set(file.id, content);
      setFiles((prev) => [...prev, { ...file, content }]);
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

  function newFileInFolder(folderPath: string) {
    setNewFileName(folderPath + "/");
    setShowNewFile(true);
    setTimeout(() => newFileInputRef.current?.focus(), 0);
  }

  async function deleteFolder(folderPath: string) {
    const prefix = folderPath + "/";
    const toDelete = files.filter((f) => f.path === folderPath || f.path.startsWith(prefix));
    if (toDelete.length === 0) return;
    if (!confirm(`Delete folder "${folderPath}" and ${toDelete.length} file${toDelete.length !== 1 ? "s" : ""}?`)) return;
    await Promise.all(
      toDelete.map((f) => fetch(`/api/projects/${projectId}/files/${f.id}`, { method: "DELETE" }))
    );
    const deletedIds = new Set(toDelete.map((f) => f.id));
    setOpenTabs((prev) => {
      const next = prev.filter((t) => !deletedIds.has(t));
      if (activeFileId && deletedIds.has(activeFileId)) {
        setActiveFileId(next[0] ?? null);
      }
      return next;
    });
    setFiles((prev) => prev.filter((f) => !deletedIds.has(f.id)));
  }

  const [renamingFolderPath, setRenamingFolderPath] = useState<string | null>(null);
  const [renameFolderVal, setRenameFolderVal] = useState("");

  function startRenameFolder(folderPath: string) {
    setRenamingFolderPath(folderPath);
    setRenameFolderVal(folderPath.split("/").pop() ?? folderPath);
  }

  async function commitRenameFolder(e?: React.FormEvent) {
    e?.preventDefault();
    if (!renamingFolderPath) return;
    const newSegment = renameFolderVal.trim();
    if (!newSegment) { setRenamingFolderPath(null); return; }
    const parentPath = renamingFolderPath.includes("/")
      ? renamingFolderPath.slice(0, renamingFolderPath.lastIndexOf("/"))
      : "";
    const newFolderPath = parentPath ? `${parentPath}/${newSegment}` : newSegment;
    if (newFolderPath === renamingFolderPath) { setRenamingFolderPath(null); return; }
    const prefix = renamingFolderPath + "/";
    const toRename = files.filter((f) => f.path.startsWith(prefix));
    setRenamingFolderPath(null);
    const updates = await Promise.all(
      toRename.map(async (f) => {
        const newPath = newFolderPath + "/" + f.path.slice(prefix.length);
        const res = await fetch(`/api/projects/${projectId}/files/${f.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: newPath }),
        });
        return res.ok ? (await res.json() as ProjectFile) : null;
      })
    );
    setFiles((prev) => prev.map((f) => {
      const updated = updates.find((u) => u?.id === f.id);
      return updated ?? f;
    }));
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
    const all = Array.from(fileList);
    const tooLarge = all.filter((f) => f.size >= 5_000_000);
    const uploads = all.filter((f) => f.size < 5_000_000);
    let successCount = 0;
    for (const file of uploads) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!IMAGE_EXTS.has(ext) && file.size >= 1_000_000) continue;
      let content: string;
      if (IMAGE_EXTS.has(ext)) {
        content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string ?? "");
          reader.readAsDataURL(file);
        });
      } else {
        content = await file.text();
      }
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
        successCount++;
      }
    }
    if (successCount > 0 || tooLarge.length > 0) {
      const parts: string[] = [];
      if (successCount > 0) parts.push(`${successCount} file${successCount !== 1 ? "s" : ""} uploaded`);
      if (tooLarge.length > 0) parts.push(`${tooLarge.length} skipped (>5 MB)`);
      if (uploadToastTimer.current) clearTimeout(uploadToastTimer.current);
      setUploadToast(parts.join(" · "));
      uploadToastTimer.current = setTimeout(() => setUploadToast(null), 3500);
    }
  }

  const activeExt = (activeFile?.path.split(".").pop() ?? "").toLowerCase();
  const isRunnable = RUNNABLE_EXTS.has(activeExt);
  const isImageFile = IMAGE_EXTS.has(activeExt);

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

  function downloadFile(fileId: string) {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;
    const blob = new Blob([file.content ?? ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.path.split("/").pop() ?? file.path;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importFromUrl() {
    const url = importUrlVal.trim();
    if (!url) return;
    setImportUrlLoading(true);
    setImportUrlError("");
    try {
      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json() as { content?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Fetch failed");
      const filename = url.split("/").pop()?.split("?")[0] || "imported.txt";
      const createRes = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filename, content: data.content ?? "" }),
      });
      if (createRes.ok) {
        const created: ProjectFile = await createRes.json();
        setFiles((prev) =>
          prev.some((f) => f.path === created.path)
            ? prev.map((f) => (f.path === created.path ? created : f))
            : [...prev, created]
        );
        openFile(created.id);
      }
      setImportUrlOpen(false);
      setImportUrlVal("");
    } catch (err) {
      setImportUrlError(err instanceof Error ? err.message : String(err));
    } finally {
      setImportUrlLoading(false);
    }
  }

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

  const toggleZen = useCallback(() => {
    setZenMode((on) => {
      if (!on) {
        preZenState.current = { sidebar: sidebarOpen, term: termOpen };
        setSidebarOpen(false);
        setTermOpen(false);
      } else {
        if (preZenState.current) {
          setSidebarOpen(preZenState.current.sidebar);
          setTermOpen(preZenState.current.term);
        }
        preZenState.current = null;
      }
      return !on;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarOpen, termOpen]);

  return (
    <div className="h-full w-full flex bg-peregrine-dark">
      {/* Sidebar toggle tab (always visible) */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="absolute top-1/2 -translate-y-1/2 z-20 w-3 h-12 bg-gray-800 hover:bg-gray-700 border border-gray-600 border-l-0 rounded-r flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
        style={{ left: sidebarOpen ? `${sidebarWidth}px` : "0px" }}
        title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {sidebarOpen ? "‹" : "›"}
      </button>

      {/* Sidebar */}
      {sidebarOpen && (
      <div
        className={`bg-gray-900 border-r flex flex-col shrink-0 relative transition-colors ${dropTarget ? "border-blue-500 bg-blue-950/20" : "border-gray-700"}`}
        style={{ width: `${sidebarWidth}px` }}
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
            <a
              href={`/api/projects/${projectId}/export`}
              download
              className="text-gray-500 hover:text-gray-300 transition-colors text-sm leading-none"
              title="Download project as ZIP"
            >
              ↓
            </a>
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
            {(() => {
              const trimmed = newFileName.trim();
              if (!trimmed) return null;
              const hasTemplate = TEMPLATE_EXTS.has(getFileExt(trimmed)) || TEMPLATE_FILENAMES.has(getFilename(trimmed));
              return hasTemplate ? (
                <p className="text-xs text-blue-400/70 mt-1 px-0.5">✦ Template will be applied</p>
              ) : null;
            })()}
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
            onNewFileInFolder={newFileInFolder}
            onRenameFolder={startRenameFolder}
            onDeleteFolder={deleteFolder}
          />
        )}
        {/* Drag handle */}
        <div
          onMouseDown={startSidebarDrag}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/40 transition-colors z-10"
          title="Drag to resize sidebar"
        />
      </div>
      )} {/* end sidebarOpen */}

      {/* Editor pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        {openTabs.length > 0 && (
          <div className="flex items-end bg-gray-950 border-b border-gray-700 overflow-x-auto shrink-0" style={{ minHeight: "32px" }}>
            {[...openTabs.filter((id) => pinnedTabs.has(id)), ...openTabs.filter((id) => !pinnedTabs.has(id))].map((tabId, tabIdx) => {
              const tabFile = files.find((f) => f.id === tabId);
              if (!tabFile) return null;
              const isActive = tabId === activeFileId;
              const isPinned = pinnedTabs.has(tabId);
              const isDragOver = dragOverIndex === tabIdx && dragTabIndex.current !== null && dragTabIndex.current !== tabIdx;
              return (
                <div
                  key={tabId}
                  draggable
                  onDragStart={(e) => {
                    dragTabIndex.current = tabIdx;
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragTabIndex.current !== null && dragTabIndex.current !== tabIdx) {
                      setDragOverIndex(tabIdx);
                    }
                  }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragTabIndex.current;
                    if (from === null || from === tabIdx) { setDragOverIndex(null); return; }
                    setOpenTabs((prev) => {
                      const next = [...prev];
                      const [moved] = next.splice(from, 1);
                      next.splice(tabIdx, 0, moved);
                      return next;
                    });
                    dragTabIndex.current = null;
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => { dragTabIndex.current = null; setDragOverIndex(null); }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setTabContextMenu({ tabId, x: e.clientX, y: e.clientY });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-gray-700 cursor-pointer shrink-0 select-none transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white border-t-2 border-t-blue-500"
                      : "bg-gray-950 text-gray-400 hover:text-gray-200 hover:bg-gray-900 border-t-2 border-t-transparent"
                  } ${isDragOver ? "border-l-2 border-l-blue-400" : ""}`}
                  style={{ maxWidth: "180px" }}
                  onClick={() => setActiveFileId(tabId)}
                >
                  {isPinned ? (
                    <span className="text-amber-400/70 text-[10px] shrink-0 leading-none" title="Pinned">⚲</span>
                  ) : dirtyTabs.has(tabId) ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" title="Unsaved changes" />
                  ) : null}
                  <span className="truncate">{tabFile.path.split("/").pop()}</span>
                  {!isPinned && (
                    <button
                      onClick={(e) => closeTab(tabId, e)}
                      className="text-gray-600 hover:text-gray-300 leading-none ml-0.5 shrink-0"
                    >
                      ×
                    </button>
                  )}
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
                  const folderPath = arr.slice(0, i + 1).join("/");
                  return (
                    <span key={i} className="flex items-center gap-0.5 shrink-0">
                      {i > 0 && <span className="text-gray-700 select-none">/</span>}
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setBreadcrumbPopover({ folderPath, x: rect.left, y: rect.bottom + 4 });
                        }}
                        className={`px-0.5 rounded transition-colors ${isLast ? "text-gray-200 font-medium hover:bg-gray-700/60" : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/60"}`}
                      >
                        {segment}
                      </button>
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
            {activeFile && !isImageFile && savedContentRef.current.has(activeFileId!) && (
              <button
                onClick={() => setDiffMode((v) => !v)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  diffMode
                    ? "bg-orange-600/30 text-orange-300 border border-orange-700/50"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
                title={diffMode ? "Exit diff view" : "Show changes (diff vs saved)"}
              >
                ± Diff
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
              onClick={() => setSplitFileId((cur) => cur ? null : (activeFileId ?? null))}
              className={`px-2 py-1 text-xs rounded transition-colors ${splitFileId ? "text-blue-400 hover:text-blue-300 bg-blue-900/20" : "text-gray-600 hover:text-gray-400"}`}
              title={splitFileId ? "Close split (⌘/Ctrl \\)" : "Split editor (⌘/Ctrl \\)"}
            >
              ⫴
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
              onClick={() => { if (activeFileId) setHistoryOpen((v) => !v); }}
              className={`px-2 py-1 text-xs rounded transition-colors ${historyOpen ? "text-amber-400 bg-amber-900/20" : "text-gray-600 hover:text-gray-400"}`}
              title="Local history (⌘/Ctrl Shift H)"
              disabled={!activeFileId}
            >
              ⌛
            </button>
            <button
              onClick={() => setShortcutsOpen(true)}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              title="Keyboard shortcuts (?)"
            >
              ?
            </button>
            <button
              onClick={toggleZen}
              className={`px-2 py-1 text-xs rounded transition-colors ${zenMode ? "text-purple-400 hover:text-purple-300 bg-purple-900/20" : "text-gray-600 hover:text-gray-400"}`}
              title={zenMode ? "Exit zen mode (⌘/Ctrl Shift Z)" : "Zen mode (⌘/Ctrl Shift Z)"}
            >
              ⛶
            </button>
          </div>
        </div>

        {/* Editor + AI panel */}
        <div className="flex min-h-0" style={{ flex: "1 1 0", minHeight: 0 }}>
          <div className="flex min-w-0 flex-1" style={{ minHeight: 0 }}>
            {/* Primary pane */}
            <div
              className="flex min-w-0 flex-col"
              style={{ width: splitFileId ? `${splitRatio * 100}%` : undefined, flex: splitFileId ? undefined : "1 1 0" }}
            >
              <div className={`flex-1 min-h-0 ${(mdPreview && activeFile?.path.endsWith(".md")) || (htmlPreview && activeFile?.path.endsWith(".html")) ? "flex" : ""}`}>
                <div className={(mdPreview && activeFile?.path.endsWith(".md")) || (htmlPreview && activeFile?.path.endsWith(".html")) ? "w-1/2 min-w-0 h-full" : "h-full"}>
                  {activeFile ? (
                    isImageFile ? (
                      <ImageViewer file={activeFile} ext={activeExt} />
                    ) : diffMode ? (
                      <DiffEditor
                        key={`diff-${activeFile.id}`}
                        height="100%"
                        language={activeFile.language ?? inferLanguage(activeFile.path)}
                        original={savedContentRef.current.get(activeFile.id) ?? ""}
                        modified={activeFile.content ?? ""}
                        theme={prefs.theme}
                        options={{
                          fontSize: prefs.fontSize,
                          readOnly: false,
                          automaticLayout: true,
                          wordWrap: prefs.wordWrap,
                          scrollBeyondLastLine: false,
                          smoothScrolling: true,
                          padding: { top: 8, bottom: 8 },
                          renderSideBySide: true,
                          fontFamily: FONT_OPTIONS.find((f) => f.value === prefs.fontFamily)?.stack || undefined,
                          fontLigatures: prefs.fontLigatures && prefs.fontFamily !== "default" && prefs.fontFamily !== "system",
                          lineNumbers: prefs.lineNumbers,
                        }}
                        onMount={(diff, monaco) => {
                          Object.entries(CUSTOM_THEMES).forEach(([name, data]) => {
                            monaco.editor.defineTheme(name, { base: data.base, inherit: true, rules: data.rules, colors: data.colors });
                          });
                          monaco.editor.setTheme(prefs.theme);
                          const mod = diff.getModifiedEditor();
                          mod.onDidChangeModelContent(() => {
                            handleChange(mod.getValue());
                          });
                        }}
                      />
                    ) : (
                      <Editor
                        key={activeFile.id}
                        height="100%"
                        language={activeFile.language ?? inferLanguage(activeFile.path)}
                        value={activeFile.content ?? ""}
                        theme={prefs.theme}
                        onChange={handleChange}
                        onMount={(editor, monaco) => {
                          Object.entries(CUSTOM_THEMES).forEach(([name, data]) => {
                            monaco.editor.defineTheme(name, { base: data.base, inherit: true, rules: data.rules, colors: data.colors });
                          });
                          monaco.editor.setTheme(prefs.theme);
                          vimModeRef.current?.dispose();
                          vimModeRef.current = null;
                          editorInstanceRef.current = editor;
                          setCursorPos({ line: 1, col: 1 });
                          setSelectionStats(null);
                          editor.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => {
                            setCursorPos({ line: e.position.lineNumber, col: e.position.column });
                          });
                          editor.onDidChangeCursorSelection(() => {
                            const model = editor.getModel();
                            const sel = editor.getSelection();
                            if (!model || !sel || sel.isEmpty()) {
                              setSelectionStats(null);
                            } else {
                              const chars = model.getValueLengthInRange(sel);
                              const lines = sel.endLineNumber - sel.startLineNumber + 1;
                              setSelectionStats(chars > 0 ? { chars, lines: lines > 1 ? lines : 0 } : null);
                            }
                          });
                          setEditorReady((v) => !v);
                        }}
                        options={{
                          fontSize: prefs.fontSize,
                          tabSize: effectiveTabSize,
                          insertSpaces: effectiveInsertSpaces,
                          minimap: { enabled: prefs.minimap },
                          automaticLayout: true,
                          wordWrap: prefs.wordWrap,
                          stickyScroll: { enabled: prefs.stickyScroll },
                          rulers: prefs.ruler ? [prefs.ruler] : [],
                          scrollBeyondLastLine: false,
                          smoothScrolling: true,
                          cursorSmoothCaretAnimation: "on",
                          renderLineHighlight: "all",
                          padding: { top: 8, bottom: 8 },
                          fontFamily: FONT_OPTIONS.find((f) => f.value === prefs.fontFamily)?.stack || undefined,
                          fontLigatures: prefs.fontLigatures && prefs.fontFamily !== "default" && prefs.fontFamily !== "system",
                          renderWhitespace: prefs.renderWhitespace,
                          cursorStyle: prefs.cursorStyle,
                          lineNumbers: prefs.lineNumbers,
                          bracketPairColorization: { enabled: prefs.bracketPairColorization },
                          quickSuggestions: prefs.quickSuggestions,
                          autoClosingBrackets: prefs.autoClosingBrackets,
                          autoClosingQuotes: prefs.autoClosingBrackets === "never" ? "never" : "languageDefined",
                        }}
                      />
                    )
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
                  <div className="w-1/2 border-l border-gray-700 min-w-0 h-full">
                    <MarkdownPreview content={activeFile.content ?? ""} />
                  </div>
                )}
                {htmlPreview && activeFile?.path.endsWith(".html") && (
                  <div className="w-1/2 border-l border-gray-700 min-w-0 bg-white h-full">
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
            </div>

            {/* Split divider + secondary pane */}
            {splitFileId && (() => {
              const splitFile = files.find((f) => f.id === splitFileId);
              const splitExt = (splitFile?.path.split(".").pop() ?? "").toLowerCase();
              return (
                <>
                  <div
                    onMouseDown={startSplitDrag}
                    className="w-1 shrink-0 cursor-col-resize hover:bg-blue-500/60 bg-gray-700/50 transition-colors"
                    title="Drag to resize split"
                  />
                  <div className="flex flex-col min-w-0" style={{ flex: "1 1 0" }}>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/60 border-b border-gray-700 text-xs text-gray-400 shrink-0">
                      <span className="font-mono truncate flex-1">{splitFile?.path ?? "—"}</span>
                      {dirtyTabs.has(splitFileId) && <span className="text-yellow-500">●</span>}
                      <button
                        onClick={() => setSplitFileId(null)}
                        className="text-gray-600 hover:text-white transition-colors ml-1"
                        title="Close split (⌘/Ctrl \)"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 min-h-0">
                      {splitFile ? (
                        IMAGE_EXTS.has(splitExt) ? (
                          <ImageViewer file={splitFile} ext={splitExt} />
                        ) : (
                          <Editor
                            key={`split-${splitFileId}`}
                            height="100%"
                            language={splitFile.language ?? inferLanguage(splitFile.path)}
                            value={splitFile.content ?? ""}
                            theme={prefs.theme}
                            onChange={handleSplitChange}
                            options={{
                              fontSize: prefs.fontSize,
                              tabSize: prefs.tabSize,
                              minimap: { enabled: false },
                              automaticLayout: true,
                              wordWrap: prefs.wordWrap,
                              stickyScroll: { enabled: prefs.stickyScroll },
                              rulers: prefs.ruler ? [prefs.ruler] : [],
                              scrollBeyondLastLine: false,
                              smoothScrolling: true,
                              cursorSmoothCaretAnimation: "on",
                              renderLineHighlight: "all",
                              padding: { top: 8, bottom: 8 },
                              bracketPairColorization: { enabled: prefs.bracketPairColorization },
                              quickSuggestions: prefs.quickSuggestions,
                              autoClosingBrackets: prefs.autoClosingBrackets,
                              autoClosingQuotes: prefs.autoClosingBrackets === "never" ? "never" : "languageDefined",
                            }}
                          />
                        )
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-600 text-sm">File not found</div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
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
          <div className="shrink-0 flex flex-col" style={{ height: `${termHeightPx}px` }}>
            {/* Drag handle */}
            <div
              onMouseDown={startTermDrag}
              className="h-1 shrink-0 cursor-row-resize hover:bg-blue-500/40 bg-gray-800 transition-colors"
              title="Drag to resize terminal"
            />
            <ExecutionPanel
              files={files}
              activeFile={activeFile}
              scripts={packageJsonScripts}
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
            {activeFile ? (
              <div className="relative">
                <button
                  onClick={() => { setLangPickerOpen((v) => !v); setLangFilter(""); }}
                  className="hover:text-white transition-colors"
                  title="Change language mode"
                >
                  {activeFile.language ?? inferLanguage(activeFile.path)}
                </button>
                {langPickerOpen && (
                  <div className="absolute bottom-full mb-1 left-0 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-44 overflow-hidden">
                    <input
                      autoFocus
                      value={langFilter}
                      onChange={(e) => setLangFilter(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") setLangPickerOpen(false); }}
                      placeholder="Filter…"
                      className="w-full px-2 py-1.5 text-xs bg-gray-800 text-white placeholder-gray-600 border-b border-gray-700 focus:outline-none"
                    />
                    <div className="max-h-48 overflow-auto">
                      {["plaintext","typescript","javascript","python","json","css","html","markdown","shell","rust","go","java","ruby","php","cpp","c","yaml","toml","sql","dockerfile","xml","graphql","swift","kotlin"]
                        .filter((l) => l.includes(langFilter.toLowerCase()))
                        .map((lang) => (
                          <button
                            key={lang}
                            onClick={() => {
                              setFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, language: lang } : f));
                              fetch(`/api/projects/${projectId}/files/${activeFileId}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ language: lang }),
                              }).catch(() => {});
                              setLangPickerOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1 text-xs transition-colors ${
                              (activeFile.language ?? inferLanguage(activeFile.path)) === lang
                                ? "bg-blue-600/30 text-blue-300"
                                : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : <span>—</span>}
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
            {selectionStats && (
              <span className="text-blue-400" title="Selection">
                {selectionStats.lines > 1
                  ? `${selectionStats.lines} lines · ${selectionStats.chars} chars`
                  : `${selectionStats.chars} chars`}
              </span>
            )}
            <button
              onClick={() => {
                setFileIndentOverride(null); // manual override clears detection
                setPrefs((p) => {
                  if (!p.insertSpaces) return { ...p, insertSpaces: true, tabSize: 2 };
                  const idx = TAB_SIZES.indexOf(p.tabSize as 2 | 4 | 8);
                  const next = TAB_SIZES[(idx + 1) % TAB_SIZES.length];
                  if (idx === TAB_SIZES.length - 1) return { ...p, insertSpaces: false };
                  return { ...p, tabSize: next };
                });
              }}
              className="hover:text-white transition-colors tabular-nums"
              title={effectiveInsertSpaces ? `Spaces: ${effectiveTabSize} (click to cycle)` : "Tabs (click to switch to spaces)"}
            >
              {effectiveInsertSpaces ? `${effectiveTabSize} spc` : "Tabs"}
            </button>
            <button
              onClick={() => setPrefs((p) => ({ ...p, wordWrap: p.wordWrap === "on" ? "off" : "on" }))}
              className={`transition-colors ${prefs.wordWrap === "on" ? "text-blue-400 hover:text-blue-300" : "hover:text-white"}`}
              title={`Word wrap: ${prefs.wordWrap} (click to toggle)`}
            >
              wrap
            </button>
            <button
              onClick={() => setPrefs((p) => ({ ...p, minimap: !p.minimap }))}
              className={`transition-colors ${prefs.minimap ? "text-blue-400 hover:text-blue-300" : "hover:text-white"}`}
              title={`Minimap: ${prefs.minimap ? "on" : "off"} (click to toggle)`}
            >
              map
            </button>
            <button
              onClick={() => setPrefs((p) => ({ ...p, stickyScroll: !p.stickyScroll }))}
              className={`transition-colors ${prefs.stickyScroll ? "text-blue-400 hover:text-blue-300" : "hover:text-white"}`}
              title={`Sticky scroll: ${prefs.stickyScroll ? "on" : "off"} (click to toggle)`}
            >
              sticky
            </button>
            <button
              onClick={() => setPrefs((p) => ({ ...p, theme: p.theme === "vs-dark" ? "light" : "vs-dark" }))}
              className="hover:text-white transition-colors"
              title={`Theme: ${prefs.theme} (click to toggle)`}
            >
              {prefs.theme === "vs-dark" ? "dark" : "light"}
            </button>
            <button
              onClick={() => setPrefs((p) => ({ ...p, keymap: p.keymap === "vim" ? "default" : "vim" }))}
              className={`transition-colors ${prefs.keymap === "vim" ? "text-yellow-400 hover:text-yellow-300" : "hover:text-white"}`}
              title={`Keybindings: ${prefs.keymap} (click to toggle)`}
            >
              {prefs.keymap === "vim" ? "vim" : "kbd"}
            </button>
            <div ref={vimStatusRef} className="font-mono text-yellow-400 text-xs" />
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
      {tabContextMenu && (
        <div
          className="fixed inset-0 z-50"
          onMouseDown={() => setTabContextMenu(null)}
        >
          <div
            className="absolute bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1 w-52 text-sm overflow-hidden"
            style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {[
              {
                label: pinnedTabs.has(tabContextMenu.tabId) ? "Unpin Tab" : "Pin Tab",
                action: () => togglePin(tabContextMenu.tabId),
              },
              {
                label: splitFileId === tabContextMenu.tabId ? "Close Split" : "Open in Split",
                action: () => setSplitFileId(splitFileId === tabContextMenu.tabId ? null : tabContextMenu.tabId),
              },
              null,
              {
                label: "Close",
                disabled: pinnedTabs.has(tabContextMenu.tabId),
                action: () => {
                  const e = { stopPropagation: () => {} } as React.MouseEvent;
                  closeTab(tabContextMenu.tabId, e);
                },
              },
              {
                label: "Close Others",
                action: () => {
                  const keep = [tabContextMenu.tabId, ...openTabs.filter((id) => pinnedTabs.has(id) && id !== tabContextMenu.tabId)];
                  setOpenTabs(keep);
                  setActiveFileId(tabContextMenu.tabId);
                },
              },
              {
                label: "Close All Unpinned",
                action: () => {
                  const pinned = openTabs.filter((id) => pinnedTabs.has(id));
                  setOpenTabs(pinned);
                  setActiveFileId((cur) => (cur && pinnedTabs.has(cur)) ? cur : pinned[0] ?? null);
                },
              },
              null,
              {
                label: "Copy Path",
                action: () => {
                  const f = files.find((f) => f.id === tabContextMenu.tabId);
                  if (f) navigator.clipboard.writeText(f.path).catch(() => {});
                },
              },
              {
                label: "Download File",
                action: () => downloadFile(tabContextMenu.tabId),
              },
            ].map((item, i) =>
              item === null ? (
                <div key={i} className="my-1 border-t border-gray-800" />
              ) : (
                <button
                  key={item.label}
                  onClick={() => { if (!item.disabled) { item.action(); setTabContextMenu(null); } }}
                  className={`w-full text-left px-4 py-1.5 transition-colors ${item.disabled ? "text-gray-600 cursor-default" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </div>
      )}
      {renamingFolderPath !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRenamingFolderPath(null)}>
          <form
            className="bg-gray-900 border border-gray-600 rounded-xl shadow-2xl p-4 w-72"
            onClick={(e) => e.stopPropagation()}
            onSubmit={commitRenameFolder}
          >
            <p className="text-xs text-gray-400 mb-2">Rename folder <span className="text-blue-400 font-mono">{renamingFolderPath}</span></p>
            <input
              autoFocus
              value={renameFolderVal}
              onChange={(e) => setRenameFolderVal(e.target.value)}
              onBlur={() => commitRenameFolder()}
              onKeyDown={(e) => { if (e.key === "Escape") setRenamingFolderPath(null); }}
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-blue-500 rounded-lg text-white focus:outline-none"
              placeholder="New folder name"
            />
            <div className="flex gap-2 mt-3">
              <button type="submit" className="flex-1 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                Rename
              </button>
              <button type="button" onClick={() => setRenamingFolderPath(null)} className="flex-1 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
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
      {importUrlOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/50"
          onClick={() => setImportUrlOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-200">Import File from URL</span>
              <button onClick={() => setImportUrlOpen(false)} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); importFromUrl(); }}
              className="p-4 flex flex-col gap-3"
            >
              <input
                ref={importUrlRef}
                type="url"
                value={importUrlVal}
                onChange={(e) => { setImportUrlVal(e.target.value); setImportUrlError(""); }}
                onKeyDown={(e) => { if (e.key === "Escape") setImportUrlOpen(false); }}
                placeholder="https://example.com/script.js"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 focus:border-blue-500 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none"
              />
              {importUrlError && (
                <p className="text-xs text-red-400">{importUrlError}</p>
              )}
              <p className="text-xs text-gray-500">The file will be fetched server-side and saved to your project. Text and code files only (max 2 MB).</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportUrlOpen(false)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!importUrlVal.trim() || importUrlLoading}
                  className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {importUrlLoading ? "Fetching…" : "Import"}
                </button>
              </div>
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
      {commandPaletteOpen && (
        <CommandPalette
          files={files}
          onOpenFile={(id) => { openFile(id); setCommandPaletteOpen(false); }}
          onClose={() => setCommandPaletteOpen(false)}
          commands={[
            { id: "new-file", label: "New File", description: "⌘/Ctrl N", icon: "+", action: () => setShowNewFile(true) },
            { id: "global-search", label: "Search Across Files", description: "⌘/Ctrl Shift F", icon: "⌕", action: () => setSearchOpen(true) },
            { id: "toggle-terminal", label: "Toggle Terminal", description: "⌘/Ctrl `", icon: ">_", action: () => setTermOpen((v) => !v) },
            { id: "editor-settings", label: "Editor Settings", description: "⌘/Ctrl ,", icon: "⚙", action: () => setPrefsOpen(true) },
            { id: "toggle-ai", label: "Toggle AI Panel", icon: "✦", action: () => setAiOpen((v) => !v) },
            { id: "toggle-split", label: "Toggle Split Editor", description: "⌘/Ctrl \\", icon: "⫴", action: () => setSplitFileId((cur) => cur ? null : (activeFileId ?? null)) },
            { id: "toggle-diff", label: "Toggle Diff View", icon: "±", action: () => setDiffMode((v) => !v) },
            { id: "zen-mode", label: zenMode ? "Exit Zen Mode" : "Zen Mode", description: "⌘/Ctrl Shift Z", icon: "⛶", action: toggleZen },
            { id: "keyboard-shortcuts", label: "Keyboard Shortcuts", description: "?", icon: "?", action: () => setShortcutsOpen(true) },
            { id: "project-settings", label: "Project Settings", icon: "⚙", action: () => setProjectSettingsOpen(true) },
            { id: "import-url", label: "Import File from URL", description: "Fetch & save a file from a URL", icon: "↓", action: () => { setImportUrlOpen(true); setImportUrlVal(""); setImportUrlError(""); } },
            { id: "local-history", label: "Local History", description: "Browse file version snapshots", icon: "⌛", action: () => { if (activeFileId) setHistoryOpen(true); } },
          ]}
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
              {/* Font family */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Font family</label>
                <select
                  value={prefs.fontFamily}
                  onChange={(e) => setPrefs((p) => ({ ...p, fontFamily: e.target.value }))}
                  className="text-xs bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 focus:outline-none focus:border-blue-500 max-w-[150px]"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              {/* Cursor style */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Cursor style</label>
                <div className="flex gap-1">
                  {(["line", "block", "underline"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setPrefs((p) => ({ ...p, cursorStyle: v }))}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${prefs.cursorStyle === v ? "border-blue-500 bg-blue-600/20 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Render whitespace */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Whitespace</label>
                <div className="flex gap-1">
                  {(["none", "boundary", "all"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setPrefs((p) => ({ ...p, renderWhitespace: v }))}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${prefs.renderWhitespace === v ? "border-blue-500 bg-blue-600/20 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}
                    >
                      {v === "boundary" ? "Bound" : v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Line numbers */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Line numbers</label>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, lineNumbers: p.lineNumbers === "on" ? "off" : "on" }))}
                  className={`relative w-9 h-5 rounded-full transition-colors ${prefs.lineNumbers === "on" ? "bg-blue-600" : "bg-gray-700"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs.lineNumbers === "on" ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
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
              {/* Sticky scroll */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Sticky scroll</label>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, stickyScroll: !p.stickyScroll }))}
                  className={`relative w-9 h-5 rounded-full transition-colors ${prefs.stickyScroll ? "bg-blue-600" : "bg-gray-700"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs.stickyScroll ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              {/* Column ruler */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Column ruler</label>
                <div className="flex gap-1">
                  {([null, 80, 120] as const).map((v) => (
                    <button
                      key={String(v)}
                      onClick={() => setPrefs((p) => ({ ...p, ruler: v }))}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                        prefs.ruler === v
                          ? "border-blue-500 bg-blue-600/20 text-blue-300"
                          : "border-gray-700 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {v === null ? "Off" : v}
                    </button>
                  ))}
                </div>
              </div>
              {/* Theme */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Theme</label>
                <select
                  value={prefs.theme}
                  onChange={(e) => setPrefs((p) => ({ ...p, theme: e.target.value as EditorPrefs["theme"] }))}
                  className="text-xs bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 focus:outline-none focus:border-blue-500 max-w-[150px]"
                >
                  {THEME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {/* Format on save */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Format on save</label>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, formatOnSave: !p.formatOnSave }))}
                  className={`relative w-8 h-4 rounded-full transition-colors ${prefs.formatOnSave ? "bg-blue-600" : "bg-gray-700"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${prefs.formatOnSave ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              {/* Detect indentation */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Detect indentation</label>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, detectIndentation: !p.detectIndentation }))}
                  className={`relative w-8 h-4 rounded-full transition-colors ${prefs.detectIndentation ? "bg-blue-600" : "bg-gray-700"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${prefs.detectIndentation ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              {/* Indent with — only editable when auto-detect is off */}
              <div className={`flex items-center justify-between ${prefs.detectIndentation ? "opacity-40 pointer-events-none" : ""}`}>
                <label className="text-xs text-gray-400">Indent with</label>
                <div className="flex gap-1">
                  {([true, false] as const).map((useSpaces) => (
                    <button
                      key={String(useSpaces)}
                      onClick={() => { setFileIndentOverride(null); setPrefs((p) => ({ ...p, insertSpaces: useSpaces })); }}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${prefs.insertSpaces === useSpaces ? "border-blue-500 bg-blue-600/20 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}
                    >
                      {useSpaces ? "Spaces" : "Tabs"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Tab size — only editable when auto-detect is off and using spaces */}
              <div className={`flex items-center justify-between ${prefs.detectIndentation || !prefs.insertSpaces ? "opacity-40 pointer-events-none" : ""}`}>
                <label className="text-xs text-gray-400">Tab size</label>
                <div className="flex gap-1">
                  {([2, 4, 8] as const).map((n) => (
                    <button
                      key={n}
                      onClick={() => setPrefs((p) => ({ ...p, tabSize: n }))}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${prefs.tabSize === n ? "border-blue-500 bg-blue-600/20 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {/* Bracket pair colorization */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Bracket colors</label>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, bracketPairColorization: !p.bracketPairColorization }))}
                  className={`relative w-8 h-4 rounded-full transition-colors ${prefs.bracketPairColorization ? "bg-blue-600" : "bg-gray-700"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${prefs.bracketPairColorization ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              {/* Quick suggestions (IntelliSense) */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Suggestions</label>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, quickSuggestions: !p.quickSuggestions }))}
                  className={`relative w-8 h-4 rounded-full transition-colors ${prefs.quickSuggestions ? "bg-blue-600" : "bg-gray-700"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${prefs.quickSuggestions ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </div>
              {/* Auto-closing brackets */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Auto-close</label>
                <div className="flex gap-1">
                  {(["always", "languageDefined", "never"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setPrefs((p) => ({ ...p, autoClosingBrackets: v }))}
                      className={`px-2 py-0.5 text-xs rounded border transition-colors ${prefs.autoClosingBrackets === v ? "border-blue-500 bg-blue-600/20 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}
                    >
                      {v === "languageDefined" ? "Auto" : v === "always" ? "On" : "Off"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Font ligatures */}
              <div className={`flex items-center justify-between ${prefs.fontFamily === "default" || prefs.fontFamily === "system" ? "opacity-40 pointer-events-none" : ""}`}>
                <label className="text-xs text-gray-400">Ligatures</label>
                <button
                  onClick={() => setPrefs((p) => ({ ...p, fontLigatures: !p.fontLigatures }))}
                  className={`relative w-8 h-4 rounded-full transition-colors ${prefs.fontLigatures ? "bg-blue-600" : "bg-gray-700"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${prefs.fontLigatures ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
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
                ["⌘/Ctrl Shift P", "Command palette"],
                ["⌘/Ctrl Shift Z", "Toggle zen mode"],
                ["⌘/Ctrl G", "Go to line"],
                ["⌘/Ctrl Shift F", "Search across files"],
                ["⌘/Ctrl W", "Close current tab"],
                ["⌘/Ctrl Shift T", "Reopen closed tab"],
                ["⌘/Ctrl Shift H", "Local history"],
                ["⌘/Ctrl PageDown", "Next tab"],
                ["⌘/Ctrl PageUp", "Previous tab"],
                ["⌘/Ctrl `", "Toggle terminal"],
                ["⌘/Ctrl S", "Save immediately"],
                ["⌘/Ctrl ,", "Editor settings"],
                ["⌘/Ctrl \\", "Toggle split editor"],
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
      {uploadToast && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl shadow-xl text-sm text-white z-50">
          <span className="text-green-400">✓</span>
          <span>{uploadToast}</span>
          <button onClick={() => setUploadToast(null)} className="text-gray-400 hover:text-white ml-1">×</button>
        </div>
      )}
      {historyOpen && activeFile && (() => {
        const snapshots = localHistoryRef.current.get(activeFile.id) ?? [];
        return (
          <LocalHistoryPanel
            fileId={activeFile.id}
            currentContent={activeFile.content ?? ""}
            snapshots={snapshots}
            onRestore={(content) => {
              setFiles((prev) => prev.map((f) => f.id === activeFile.id ? { ...f, content } : f));
              setDirtyTabs((prev) => { const next = new Set(prev); next.add(activeFile.id); return next; });
            }}
            onClose={() => setHistoryOpen(false)}
          />
        );
      })()}
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
      {breadcrumbPopover && (() => {
        const { folderPath, x, y } = breadcrumbPopover;
        const isFile = files.some((f) => f.path === folderPath);
        const prefix = folderPath + "/";
        const siblings = isFile
          ? files.filter((f) => {
              const dir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : "";
              const activeDir = activeFile?.path.includes("/") ? activeFile.path.slice(0, activeFile.path.lastIndexOf("/")) : "";
              return dir === activeDir;
            })
          : files.filter((f) => f.path === folderPath || f.path.startsWith(prefix));
        return (
          <div className="fixed inset-0 z-50" onMouseDown={() => setBreadcrumbPopover(null)}>
            <div
              className="absolute bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1 min-w-48 max-w-72 max-h-72 overflow-auto text-xs"
              style={{ top: y, left: x }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1 text-gray-600 font-mono truncate border-b border-gray-800 mb-1">{folderPath}</div>
              {siblings.length === 0 ? (
                <div className="px-3 py-2 text-gray-600">No files</div>
              ) : siblings.map((f) => {
                const label = isFile
                  ? f.path.split("/").pop() ?? f.path
                  : f.path.slice(prefix.length);
                return (
                  <button
                    key={f.id}
                    onClick={() => { openFile(f.id); setBreadcrumbPopover(null); }}
                    className={`w-full text-left px-3 py-1.5 font-mono truncate transition-colors ${f.id === activeFileId ? "text-blue-400 bg-blue-900/20" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
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
