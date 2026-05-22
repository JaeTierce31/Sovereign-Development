"use client";
import { useState, useRef, useCallback } from "react";

interface ProjectFile {
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
  for (const file of files) insert(root, file.path.split("/"), 0, file);
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

const FILE_ICONS: Record<string, { label: string; color: string }> = {
  ts: { label: "TS", color: "text-blue-400" }, tsx: { label: "TS", color: "text-blue-400" },
  js: { label: "JS", color: "text-yellow-400" }, jsx: { label: "JS", color: "text-yellow-400" },
  py: { label: "PY", color: "text-green-400" },
  json: { label: "{}", color: "text-orange-400" },
  css: { label: "CS", color: "text-purple-400" },
  html: { label: "<>", color: "text-orange-300" },
  md: { label: "MD", color: "text-gray-400" },
  sh: { label: "SH", color: "text-gray-400" },
};

function FileIconBadge({ filename }: { filename: string }) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const icon = FILE_ICONS[ext];
  if (!icon) return <span className="w-5 shrink-0" />;
  return (
    <span className={`text-[9px] font-bold w-5 text-right shrink-0 ${icon.color}`}>{icon.label}</span>
  );
}

function NodeRow({
  node,
  depth,
  activeId,
  expandedFolders,
  toggleFolder,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  activeId: string | null;
  expandedFolders: Set<string>;
  toggleFolder: (p: string) => void;
  onSelect: (id: string) => void;
}) {
  const indent = depth * 16;
  if (node.type === "folder") {
    const open = expandedFolders.has(node.fullPath);
    return (
      <>
        <button
          onClick={() => toggleFolder(node.fullPath)}
          className="w-full flex items-center gap-2 py-2.5 text-sm text-gray-400 active:bg-gray-800 transition-colors"
          style={{ paddingLeft: `${12 + indent}px` }}
        >
          <span className="text-gray-600 text-xs shrink-0">{open ? "▾" : "▸"}</span>
          <span className="text-gray-500 shrink-0 text-base leading-none">📁</span>
          <span className="font-medium truncate">{node.name}</span>
        </button>
        {open && node.children.map((child) => (
          <NodeRow
            key={child.fullPath}
            node={child}
            depth={depth + 1}
            activeId={activeId}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            onSelect={onSelect}
          />
        ))}
      </>
    );
  }

  const file = node.file!;
  const isActive = file.id === activeId;
  return (
    <button
      onClick={() => onSelect(file.id)}
      className={`w-full flex items-center gap-2 py-2.5 text-sm active:bg-gray-800 transition-colors ${
        isActive ? "bg-gray-800 text-white" : "text-gray-300"
      }`}
      style={{ paddingLeft: `${12 + indent}px` }}
    >
      <FileIconBadge filename={node.name} />
      <span className="truncate flex-1 text-left">{node.name}</span>
      {isActive && <span className="text-blue-400 text-xs shrink-0 pr-3">●</span>}
    </button>
  );
}

interface MobileFileTreeProps {
  files: ProjectFile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function MobileFileTree({ files, activeId, onSelect, onClose }: MobileFileTreeProps) {
  const tree = buildTree(files);
  const initialExpanded = () => {
    const active = files.find((f) => f.id === activeId);
    if (!active) return new Set<string>();
    const parts = active.path.split("/");
    const s = new Set<string>();
    for (let i = 1; i < parts.length; i++) s.add(parts.slice(0, i).join("/"));
    return s;
  };
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(initialExpanded);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }, []);

  // Swipe-down to close
  const touchStartY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta > 80) onClose();
    touchStartY.current = null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className="bg-gray-950 rounded-t-2xl max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
          <span className="text-sm font-medium text-white">Files</span>
          <span className="text-xs text-gray-500">{files.length} total</span>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-auto">
          {tree.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No files yet</div>
          ) : (
            tree.map((node) => (
              <NodeRow
                key={node.fullPath}
                node={node}
                depth={0}
                activeId={activeId}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                onSelect={(id) => { onSelect(id); onClose(); }}
              />
            ))
          )}
        </div>

        {/* Safe area spacer */}
        <div className="shrink-0 h-safe-area-bottom" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </div>
    </div>
  );
}
