import React, { useState } from "react";
import { X, Settings, Trash2, Check, Loader2, MapPin } from "lucide-react";
import { updateProject, deleteProject, type ProjectItem } from "@/lib/projects-store";
import { getUserAddress, setUserAddress } from "@/lib/subscription";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

interface ProjectSettingsModalProps {
  project: ProjectItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: ProjectItem) => void;
}

export function ProjectSettingsModal({
  project,
  isOpen,
  onClose,
  onUpdated,
}: ProjectSettingsModalProps) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [instructions, setInstructions] = useState(project.instructions || "");
  const [address, setAddress] = useState(project.address || getUserAddress());
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const updates = {
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        address: address.trim(),
      };
      if (address.trim()) {
        setUserAddress(address.trim());
      }
      await updateProject(project.id, updates);
      onUpdated({ ...project, ...updates });
      toast.success("Project settings saved");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update project");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${project.title}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success("Project deleted");
      onClose();
      navigate({ to: "/projects" });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project");
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex w-full max-w-lg flex-col rounded-3xl bg-[#0c1938] border border-blue-500/30 text-white shadow-2xl shadow-blue-950 p-6">
        <div className="flex items-center justify-between pb-4 border-b border-blue-500/20">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-300">
              <Settings className="size-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">Project Settings</h3>
              <p className="text-xs text-blue-200/80">Configure instructions, address and details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-blue-300 hover:bg-blue-600/20 hover:text-white transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl bg-[#070e20] border border-blue-500/30 p-2.5 text-xs text-white placeholder:text-blue-300/40 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              className="w-full rounded-2xl bg-[#070e20] border border-blue-500/30 p-2.5 text-xs text-white placeholder:text-blue-300/40 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-blue-200">
                Project Address / Location
              </label>
              <button
                type="button"
                onClick={() => {
                  const defaultAddr = getUserAddress();
                  setAddress(defaultAddr);
                  toast.success("Default address loaded!");
                }}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <MapPin className="size-3 text-amber-400" /> Auto-fill default address
              </button>
            </div>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Indiranagar, Bengaluru, Karnataka 560038, India"
              className="w-full rounded-2xl bg-[#070e20] border border-blue-500/30 p-2.5 text-xs text-white placeholder:text-blue-300/40 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-200 mb-1.5">
              Custom Instructions for My AI
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Provide specific guidelines, rules, tone, or context for My AI when chatting inside this project..."
              className="w-full rounded-2xl bg-[#070e20] border border-blue-500/30 p-3 text-xs text-white placeholder:text-blue-300/40 focus:border-blue-400 focus:outline-none"
            />
            <p className="text-[10px] text-blue-300/60 mt-1">
              My AI will follow these instructions during every conversation in this project.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-blue-500/20">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              <span>{isDeleting ? "Deleting..." : "Delete Project"}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-1.5 text-xs font-medium text-blue-300/70 hover:text-white hover:bg-blue-600/20 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !title.trim()}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-40 shadow-md shadow-blue-500/25 cursor-pointer"
              >
                {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                <span>Save</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
