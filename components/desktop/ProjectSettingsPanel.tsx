"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  projectId: string;
  initialName: string;
  initialIsPublic: boolean;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onVisibilityChange: (isPublic: boolean) => void;
}

export default function ProjectSettingsPanel({
  projectId,
  initialName,
  initialIsPublic,
  onClose,
  onNameChange,
  onVisibilityChange,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/share/${projectId}`
    : "";

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) return;
    setNameSaving(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setNameSaving(false);
    if (res.ok) {
      onNameChange(trimmed);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    }
  }

  async function toggleVisibility() {
    const next = !isPublic;
    setVisibilitySaving(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: next }),
    });
    setVisibilitySaving(false);
    if (res.ok) {
      setIsPublic(next);
      onVisibilityChange(next);
    }
  }

  async function deleteProject() {
    setDeleting(true);
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      router.push("/dashboard");
    } else {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-80 h-full bg-gray-900 border-l border-gray-700 flex flex-col shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-sm font-semibold text-white">Project Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 p-4 space-y-6">
          {/* Name */}
          <section>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Project Name
            </label>
            <form onSubmit={saveName} className="flex gap-2">
              <input
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 focus:border-blue-500 rounded-lg text-white text-sm focus:outline-none"
                onKeyDown={(e) => e.key === "Escape" && onClose()}
              />
              <button
                type="submit"
                disabled={nameSaving || !name.trim() || name.trim() === initialName}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
              >
                {nameSaving ? "…" : nameSaved ? "✓" : "Save"}
              </button>
            </form>
          </section>

          {/* Visibility */}
          <section>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Visibility
            </label>
            <div className="p-3 bg-gray-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{isPublic ? "Public" : "Private"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isPublic
                      ? "Anyone with the link can view this project"
                      : "Only you can access this project"}
                  </p>
                </div>
                <button
                  onClick={toggleVisibility}
                  disabled={visibilitySaving}
                  className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
                    isPublic ? "bg-green-600" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      isPublic ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>

              {isPublic && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-1.5">Share link</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-blue-400 truncate">{shareUrl}</code>
                    <button
                      onClick={copyLink}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors shrink-0"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Danger zone */}
          <section>
            <label className="block text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">
              Danger Zone
            </label>
            <div className="p-3 bg-gray-800 border border-red-900/50 rounded-lg">
              {confirmDelete ? (
                <div>
                  <p className="text-sm text-white mb-3">
                    Delete this project and all its files? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={deleteProject}
                      disabled={deleting}
                      className="flex-1 px-3 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                    >
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">Delete project</p>
                    <p className="text-xs text-gray-500 mt-0.5">Permanently remove all files</p>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-1.5 text-xs text-red-400 border border-red-800 hover:bg-red-900/40 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
