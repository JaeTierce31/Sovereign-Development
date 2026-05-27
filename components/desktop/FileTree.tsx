"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { timeAgo } from "@/lib/timeAgo";

const FILE_ICONS: Record<string, { label: string; className: string }> = {
  ts:   { label: "TS",  className: "text-blue-400" },
  tsx:  { label: "TS",  className: "text-blue-400" },
  js:   { label: "JS",  className: "text-yellow-400" },
  jsx:  { label: "JS",  className: "text-yellow-400" },
  mjs:  { label: "JS",  className: "text-yellow-400" },
  cjs:  { label: "JS",  className: "text-yellow-400" },
  py:   { label: "PY",  className: "text-green-400" },
  json: { label: "{}",  className: "text-orange-400" },
  css:  { label: "CS",  className: "text-purple-400" },
  scss: { label: "SC",  className: "text-pink-400" },
  html: { label: "<>",  className: "text-orange-300" },
  md:   { label: "MD",  className: "text-gray-400" },
  sh:   { label: "SH",  className: "text-gray-400" },
  env:  { label: "EN",  className: "text-yellow-600" },
  svg:  { label: "SV",  className: "text-green-300" },
  toml: { label: "TM",  className: "text-amber-500" },
  yaml: { label: "YA",  className: "text-amber-500" },
  yml:  { label: "YA",  className: "text-amber-500" },
  rs:   { label: "RS",  className: "text-orange-500" },
  go:   { label: "GO",  className: "text-cyan-400" },
  rb:   { label: "RB",  className: "text-red-400" },
  php:  { label: "PH",  className: "text-purple-300" },
  java: { label: "JV",  className: "text-orange-400" },
  c:    { label: "C",   className: "text-blue-300" },
  cpp:  { label: "C+",  className: "text-blue-300" },
  h:    { label: "H",   className: "text-blue-300" },
};

function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const icon = FILE_ICONS[ext];
  if (!icon) return <span className="w-[18px] shrink-0" />;
  return (
    <span
      className={`text-[9px] font-bold leading-none w-[18px] shrink-0 text-right ${icon.className}`}
      aria-hidden
    >
      {icon.label}
    </span>
  );
}

export interface ProjectFile {
  id: string;
  path: string;
  content: string | null;
  language: string | null;
  updatedAt?: number | null;
}

interface TreeNode {
  type: "file" | "folder";
  name: string;
  fullPath: string;
  file?: ProjectFile;
  children: TreeNode[];
}

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  function insert(nodes: TreeNode[], parts: string[], depth: number, file: ProjectFile) {
    if (depth === parts.length - 1) {
      nodes.push({ type: "file", name: parts[depth], fullPath: file.path, file, children: [] });
      return;
    }
    const folderName = parts[depth];
    const folderPath = parts.slice(0, depth + 1).join("/");
    let folder = nodes.find((n) => n.type === "folder" && n.name === folderName);
    if (!folder) {
      folder = { type: "folder", name: folderName, fullPath: folderPath, children: [] };
      nodes.push(folder);
    }
    insert(folder.children, parts, depth + 1, file);
  }

  for (const file of files) {
    insert(root, file.path.split("/"), 0, file);
  }

  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) sortNodes(n.children);
  }
  sortNodes(root);
  return root;
}

function flattenVisible(nodes: TreeNode[], expandedFolders: Set<string>): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.type === "folder" && expandedFolders.has(node.fullPath)) {
      result.push(...flattenVisible(node.children, expandedFolders));
    }
  }
  return result;
}

interface ContextMenuState {
  fileId: string;
  filePath: string;
  x: number;
  y: number;
}

interface FolderContextMenuState {
  folderPath: string;
  x: number;
  y: number;
}

interface FileTreeProps {
  files: ProjectFile[];
  activeFileId: string | null;
  dirtyTabs: Set<string>;
  renamingId: string | null;
  renameVal: string;
  renameInputRef: React.RefObject<HTMLInputElement>;
  onOpenFile: (id: string) => void;
  onStartRename: (id: string, path: string) => void;
  onRenameChange: (val: string) => void;
  onCommitRename: (id: string) => void;
  onDeleteFile: (id: string, e: React.MouseEvent) => void;
  onDuplicateFile?: (id: string) => void;
  defaultFolderPath?: string;
  onFolderPathChange?: (path: string) => void;
  onNewFileInFolder?: (folderPath: string) => void;
  onRenameFolder?: (folderPath: string) => void;
  onDeleteFolder?: (folderPath: string) => void;
}

function TreeNodeRow({
  node,
  depth,
  activeFileId,
  dirtyTabs,
  renamingId,
  renameVal,
  renameInputRef,
  onOpenFile,
  onStartRename,
  onRenameChange,
  onCommitRename,
  onDeleteFile,
  onNewFileInFolder,
  onRenameFolder,
  onDeleteFolder,
  expandedFolders,
  toggleFolder,
  onContextMenu,
  onFolderContextMenu,
  focusedPath,
  onFocus,
}: FileTreeProps & {
  node: TreeNode;
  depth: number;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, fileId: string, filePath: string) => void;
  onFolderContextMenu: (e: React.MouseEvent, folderPath: string) => void;
  focusedPath: string | null;
  onFocus: (path: string) => void;
}) {
  const indent = depth * 12;

  if (node.type === "folder") {
    const open = expandedFolders.has(node.fullPath);
    const isFocused = focusedPath === node.fullPath;
    return (
      <>
        <button
          data-path={node.fullPath}
          onClick={() => { toggleFolder(node.fullPath); onFocus(node.fullPath); }}
          onContextMenu={(e) => { e.preventDefault(); onFolderContextMenu(e, node.fullPath); }}
          className={`w-full flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors ${isFocused ? "ring-1 ring-inset ring-blue-500/60 bg-gray-800/60" : ""}`}
          style={{ paddingLeft: `${8 + indent}px` }}
          tabIndex={-1}
        >
          <span className="text-gray-600 text-xs shrink-0">{open ? "▾" : "▸"}</span>
          <span className="text-gray-500 shrink-0">📁</span>
          <span className="truncate font-medium">{node.name}</span>
        </button>
        {open && node.children.map((child) => (
          <TreeNodeRow
            key={child.fullPath}
            node={child}
            depth={depth + 1}
            files={[]}
            activeFileId={activeFileId}
            dirtyTabs={dirtyTabs}
            renamingId={renamingId}
            renameVal={renameVal}
            renameInputRef={renameInputRef}
            onOpenFile={onOpenFile}
            onStartRename={onStartRename}
            onRenameChange={onRenameChange}
            onCommitRename={onCommitRename}
            onDeleteFile={onDeleteFile}
            onNewFileInFolder={onNewFileInFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            onContextMenu={onContextMenu}
            onFolderContextMenu={onFolderContextMenu}
            focusedPath={focusedPath}
            onFocus={onFocus}
          />
        ))}
      </>
    );
  }

  const file = node.file!;
  const isActive = activeFileId === file.id;
  const isDirty = dirtyTabs.has(file.id);
  const isFocused = focusedPath === node.fullPath;

  if (renamingId === file.id) {
    return (
      <form
        className="px-2 py-0.5"
        style={{ paddingLeft: `${8 + indent}px` }}
        onSubmit={(e) => { e.preventDefault(); onCommitRename(file.id); }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={renameInputRef}
          value={renameVal}
          onChange={(e) => onRenameChange(e.target.value)}
          onBlur={() => onCommitRename(file.id)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { onCommitRename(file.id); e.stopPropagation(); }
          }}
          className="w-full px-1.5 py-0.5 text-xs bg-gray-800 border border-blue-500 rounded text-white focus:outline-none"
        />
      </form>
    );
  }

  return (
    <div
      data-path={node.fullPath}
      className={`group flex items-center ${isActive ? "bg-gray-700" : "hover:bg-gray-800"} ${isFocused && !isActive ? "ring-1 ring-inset ring-blue-500/60 bg-gray-800/60" : ""}`}
      style={{ paddingLeft: `${8 + indent}px` }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, file.id, file.path); }}
    >
      {isDirty && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mr-1" title="Unsaved" />
      )}
      <button
        onClick={() => { onOpenFile(file.id); onFocus(node.fullPath); }}
        onDoubleClick={() => onStartRename(file.id, file.path)}
        className={`flex-1 text-left py-1.5 pr-2 text-xs truncate flex items-center gap-1 ${
          isActive ? "text-white" : "text-gray-400 hover:text-white"
        }`}
        title={file.updatedAt ? `${file.path}\nModified ${timeAgo(file.updatedAt)}` : file.path}
        tabIndex={-1}
      >
        <FileIcon filename={node.name} />
        <span className="truncate">{node.name}</span>
      </button>
      <button
        onClick={(e) => onDeleteFile(file.id, e)}
        className="px-2 py-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0"
        title="Delete file"
        tabIndex={-1}
      >
        ×
      </button>
    </div>
  );
}

export default function FileTree(props: FileTreeProps) {
  const { files } = props;
  const tree = buildTree(files);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<FolderContextMenuState | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);
  const [copiedFolderPath, setCopiedFolderPath] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // Auto-expand folders that contain the active file
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const active = files.find((f) => f.id === props.activeFileId);
    if (!active) return new Set();
    const parts = active.path.split("/");
    const expanded = new Set<string>();
    for (let i = 1; i < parts.length; i++) {
      expanded.add(parts.slice(0, i).join("/"));
    }
    return expanded;
  });

  // Expand folder when active file changes
  const prevActiveId = useRef(props.activeFileId);
  useEffect(() => {
    if (prevActiveId.current === props.activeFileId) return;
    prevActiveId.current = props.activeFileId;
    const active = files.find((f) => f.id === props.activeFileId);
    if (!active) return;
    const parts = active.path.split("/");
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      for (let i = 1; i < parts.length; i++) {
        next.add(parts.slice(0, i).join("/"));
      }
      return next;
    });
  }, [props.activeFileId, files]);

  // Close context menus on outside click or Escape
  useEffect(() => {
    if (!contextMenu && !folderContextMenu) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null);
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) setFolderContextMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setContextMenu(null); setFolderContextMenu(null); }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [contextMenu, folderContextMenu]);

  function toggleFolder(path: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  const flat = useMemo(() => flattenVisible(tree, expandedFolders), [tree, expandedFolders]);

  // Scroll focused node into view
  useEffect(() => {
    if (!focusedPath || !treeContainerRef.current) return;
    const el = treeContainerRef.current.querySelector<HTMLElement>(`[data-path="${CSS.escape(focusedPath)}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedPath]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const handled = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Delete", "Backspace", "Home", "End", "F2"];
    if (!handled.includes(e.key)) return;
    // Don't steal Home/End/Delete from rename inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    e.preventDefault();

    const idx = focusedPath ? flat.findIndex((n) => n.fullPath === focusedPath) : -1;
    const node = flat[idx] ?? null;

    switch (e.key) {
      case "ArrowDown": {
        const next = flat[idx + 1] ?? flat[0];
        if (next) setFocusedPath(next.fullPath);
        break;
      }
      case "ArrowUp": {
        const prev = idx > 0 ? flat[idx - 1] : flat[flat.length - 1];
        if (prev) setFocusedPath(prev.fullPath);
        break;
      }
      case "Home": {
        if (flat[0]) setFocusedPath(flat[0].fullPath);
        break;
      }
      case "End": {
        const last = flat[flat.length - 1];
        if (last) setFocusedPath(last.fullPath);
        break;
      }
      case "ArrowRight": {
        if (!node) { if (flat[0]) setFocusedPath(flat[0].fullPath); break; }
        if (node.type === "folder") {
          if (!expandedFolders.has(node.fullPath)) {
            toggleFolder(node.fullPath);
          } else {
            const child = flat[idx + 1];
            if (child) setFocusedPath(child.fullPath);
          }
        }
        break;
      }
      case "ArrowLeft": {
        if (!node) break;
        if (node.type === "folder" && expandedFolders.has(node.fullPath)) {
          toggleFolder(node.fullPath);
        } else {
          const parentPath = node.fullPath.includes("/")
            ? node.fullPath.substring(0, node.fullPath.lastIndexOf("/"))
            : null;
          if (parentPath) setFocusedPath(parentPath);
        }
        break;
      }
      case "Enter": {
        if (!node) break;
        if (node.type === "folder") toggleFolder(node.fullPath);
        else if (node.file) props.onOpenFile(node.file.id);
        break;
      }
      case "F2": {
        if (!node || node.type !== "file" || !node.file) break;
        props.onStartRename(node.file.id, node.file.path);
        break;
      }
      case "Delete":
      case "Backspace": {
        if (!node || node.type !== "file" || !node.file) break;
        props.onDeleteFile(node.file.id, { stopPropagation: () => {} } as React.MouseEvent);
        break;
      }
    }
  }

  const handleContextMenu = useCallback((e: React.MouseEvent, fileId: string, filePath: string) => {
    setContextMenu({ fileId, filePath, x: e.clientX, y: e.clientY });
    setFolderContextMenu(null);
    setCopiedPath(false);
  }, []);

  const handleFolderContextMenu = useCallback((e: React.MouseEvent, folderPath: string) => {
    setFolderContextMenu({ folderPath, x: e.clientX, y: e.clientY });
    setContextMenu(null);
    setCopiedFolderPath(false);
  }, []);

  if (files.length === 0) return null;

  const ITEM = "w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 transition-colors";

  return (
    <div
      ref={treeContainerRef}
      className="flex-1 overflow-auto relative focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={() => { if (!focusedPath && flat.length > 0) setFocusedPath(flat[0].fullPath); }}
      aria-label="File tree"
    >
      {tree.map((node) => (
        <TreeNodeRow
          key={node.fullPath}
          node={node}
          depth={0}
          {...props}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          onContextMenu={handleContextMenu}
          onFolderContextMenu={handleFolderContextMenu}
          focusedPath={focusedPath}
          onFocus={setFocusedPath}
        />
      ))}

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-gray-900 border border-gray-600 rounded-lg shadow-2xl py-1 w-44 text-gray-300"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className={ITEM}
            onClick={() => { props.onOpenFile(contextMenu.fileId); setContextMenu(null); }}
          >
            Open
          </button>
          <button
            className={ITEM}
            onClick={() => {
              props.onStartRename(contextMenu.fileId, contextMenu.filePath);
              setContextMenu(null);
            }}
          >
            Rename
          </button>
          <button
            className={`${ITEM} ${copiedPath ? "text-green-400" : ""}`}
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.filePath).catch(() => {});
              setCopiedPath(true);
              setTimeout(() => { setCopiedPath(false); setContextMenu(null); }, 1200);
            }}
          >
            {copiedPath ? "✓ Copied!" : "Copy Path"}
          </button>
          {props.onDuplicateFile && (
            <button
              className={ITEM}
              onClick={() => { props.onDuplicateFile!(contextMenu.fileId); setContextMenu(null); }}
            >
              Duplicate
            </button>
          )}
          <div className="border-t border-gray-700 my-1" />
          <button
            className={`${ITEM} text-red-400 hover:bg-red-900/30`}
            onClick={(e) => { props.onDeleteFile(contextMenu.fileId, e); setContextMenu(null); }}
          >
            Delete
          </button>
        </div>
      )}

      {folderContextMenu && (
        <div
          ref={folderMenuRef}
          className="fixed z-50 bg-gray-900 border border-gray-600 rounded-lg shadow-2xl py-1 w-48 text-gray-300"
          style={{ left: folderContextMenu.x, top: folderContextMenu.y }}
        >
          {props.onNewFileInFolder && (
            <button
              className={ITEM}
              onClick={() => {
                props.onNewFileInFolder!(folderContextMenu.folderPath);
                setFolderContextMenu(null);
              }}
            >
              New File Here
            </button>
          )}
          {props.onRenameFolder && (
            <button
              className={ITEM}
              onClick={() => {
                props.onRenameFolder!(folderContextMenu.folderPath);
                setFolderContextMenu(null);
              }}
            >
              Rename Folder
            </button>
          )}
          <button
            className={`${ITEM} ${copiedFolderPath ? "text-green-400" : ""}`}
            onClick={() => {
              navigator.clipboard.writeText(folderContextMenu.folderPath).catch(() => {});
              setCopiedFolderPath(true);
              setTimeout(() => { setCopiedFolderPath(false); setFolderContextMenu(null); }, 1200);
            }}
          >
            {copiedFolderPath ? "✓ Copied!" : "Copy Path"}
          </button>
          {props.onDeleteFolder && (
            <>
              <div className="border-t border-gray-700 my-1" />
              <button
                className={`${ITEM} text-red-400 hover:bg-red-900/30`}
                onClick={() => {
                  props.onDeleteFolder!(folderContextMenu.folderPath);
                  setFolderContextMenu(null);
                }}
              >
                Delete Folder
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
