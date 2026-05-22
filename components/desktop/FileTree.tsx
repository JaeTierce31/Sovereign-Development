"use client";
import { useState, useRef, useEffect } from "react";

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
  defaultFolderPath?: string;
  onFolderPathChange?: (path: string) => void;
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
  expandedFolders,
  toggleFolder,
}: FileTreeProps & {
  node: TreeNode;
  depth: number;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
}) {
  const indent = depth * 12;

  if (node.type === "folder") {
    const open = expandedFolders.has(node.fullPath);
    return (
      <>
        <button
          onClick={() => toggleFolder(node.fullPath)}
          className="w-full flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          style={{ paddingLeft: `${8 + indent}px` }}
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
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
          />
        ))}
      </>
    );
  }

  const file = node.file!;
  const isActive = activeFileId === file.id;
  const isDirty = dirtyTabs.has(file.id);

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
      className={`group flex items-center ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`}
      style={{ paddingLeft: `${8 + indent}px` }}
    >
      {isDirty && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mr-1" title="Unsaved" />
      )}
      <button
        onClick={() => onOpenFile(file.id)}
        onDoubleClick={() => onStartRename(file.id, file.path)}
        className={`flex-1 text-left py-1.5 pr-2 text-xs truncate flex items-center gap-1 ${
          isActive ? "text-white" : "text-gray-400 hover:text-white"
        }`}
        title={file.path}
      >
        <FileIcon filename={node.name} />
        <span className="truncate">{node.name}</span>
      </button>
      <button
        onClick={(e) => onDeleteFile(file.id, e)}
        className="px-2 py-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0"
        title="Delete file"
      >
        ×
      </button>
    </div>
  );
}

export default function FileTree(props: FileTreeProps) {
  const { files } = props;
  const tree = buildTree(files);

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

  function toggleFolder(path: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  if (files.length === 0) return null;

  return (
    <div className="flex-1 overflow-auto">
      {tree.map((node) => (
        <TreeNodeRow
          key={node.fullPath}
          node={node}
          depth={0}
          {...props}
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
        />
      ))}
    </div>
  );
}
