import { useState } from "react";
import {
  X,
  Share2,
  Mail,
  Check,
  Copy,
  Trash2,
  Lock,
  Edit3,
  Eye,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  sharePresentationWithEmail,
  removeCollaboratorFromPresentation,
  type PresentationDeckItem,
  type PresentationCollaborator,
} from "@/lib/presentations-store";
import { cn } from "@/lib/utils";

interface SharePresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  deck: PresentationDeckItem | null;
  onDeckUpdated?: (updated: PresentationDeckItem) => void;
}

export function SharePresentationModal({
  isOpen,
  onClose,
  deck,
  onDeckUpdated,
}: SharePresentationModalProps) {
  const [emailInput, setEmailInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<"edit" | "view">("edit");
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !deck) return null;

  const collaborators: PresentationCollaborator[] = deck.sharedWith || [];

  function handleAddCollaborator(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    const updated = sharePresentationWithEmail(deck.id, cleanEmail, selectedRole);
    if (updated) {
      onDeckUpdated?.(updated);
      setEmailInput("");
      toast.success(
        `Shared with ${cleanEmail} (${selectedRole === "edit" ? "Can edit" : "Can view only"})!`,
      );
    }
  }

  function handleRemove(colEmail: string) {
    const updated = removeCollaboratorFromPresentation(deck.id, colEmail);
    if (updated) {
      onDeckUpdated?.(updated);
      toast.info(`Removed ${colEmail} from collaborators.`);
    }
  }

  async function handleCopyLink() {
    const shareUrl = `${window.location.origin}/presentations/${deck.id}?share=${selectedRole}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success("Presentation share link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative flex w-full max-w-md flex-col rounded-[28px] border border-blue-500/30 bg-[#0c1938] text-white shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-500/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300">
              <Share2 className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Share Presentation</h3>
              <p className="text-[11px] text-blue-300/70 truncate max-w-[240px]">{deck.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-blue-300 hover:bg-blue-600/20 hover:text-white transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Email Invite Form */}
          <form onSubmit={handleAddCollaborator} className="space-y-3">
            <label className="text-xs font-semibold text-blue-200 block">
              Share with friends or team via email:
            </label>
            <div className="flex flex-col gap-2">
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 size-4 text-blue-400 pointer-events-none" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="friend@company.com"
                  className="w-full rounded-2xl border border-blue-500/30 bg-[#070e20] pl-10 pr-3 py-2.5 text-xs text-white placeholder:text-blue-300/40 outline-none focus:border-blue-400"
                />
              </div>

              {/* Role Permission Selector: Can Edit vs Can View */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex rounded-xl border border-blue-500/30 bg-[#070e20] p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("edit")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer",
                      selectedRole === "edit"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-blue-300/70 hover:text-white",
                    )}
                  >
                    <Edit3 className="size-3" />
                    <span>Can edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("view")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer",
                      selectedRole === "view"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-blue-300/70 hover:text-white",
                    )}
                  >
                    <Eye className="size-3" />
                    <span>View only</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!emailInput.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:brightness-110 disabled:opacity-40 transition cursor-pointer shrink-0"
                >
                  <UserPlus className="size-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </form>

          {/* Quick Share Link */}
          <div className="rounded-2xl border border-blue-500/25 bg-[#070e20] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-200">Shareable Link</span>
              <span className="text-[10px] text-blue-300/60 font-mono">
                Anyone with link: {selectedRole === "edit" ? "Can edit" : "View only"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-blue-500/30 bg-[#0c1938] px-3.5 py-2 text-xs text-blue-200 hover:bg-blue-600/20 hover:text-white transition cursor-pointer"
            >
              <span className="truncate text-blue-300/80 font-mono text-[11px]">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/presentations/${deck.id}?share=${selectedRole}`
                  : `/presentations/${deck.id}`}
              </span>
              <div className="flex items-center gap-1 shrink-0 font-semibold text-blue-400">
                {copiedLink ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                <span>{copiedLink ? "Copied" : "Copy"}</span>
              </div>
            </button>
          </div>

          {/* Collaborator List */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-blue-300/70 block">
              People with access ({collaborators.length + 1})
            </label>

            {/* Owner item */}
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[#070e20] p-2.5 text-xs">
              <div className="flex items-center gap-2 truncate">
                <div className="flex size-7 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                  {deck.ownerEmail ? deck.ownerEmail[0].toUpperCase() : "Y"}
                </div>
                <div className="truncate">
                  <div className="font-semibold text-white truncate">
                    {deck.ownerEmail || "You (Owner)"}
                  </div>
                  <div className="text-[10px] text-blue-300/60">Deck Creator</div>
                </div>
              </div>
              <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                Owner
              </span>
            </div>

            {/* Collaborators list */}
            {collaborators.map((c) => (
              <div
                key={c.email}
                className="flex items-center justify-between gap-2 rounded-xl bg-[#070e20] p-2.5 text-xs border border-blue-500/15"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="flex size-7 items-center justify-center rounded-full bg-indigo-700 text-[11px] font-bold text-white">
                    {c.email[0].toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="font-semibold text-white truncate">{c.email}</div>
                    <div className="text-[10px] text-blue-300/60">
                      Added {new Date(c.sharedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      c.role === "edit"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-blue-500/20 text-blue-300 border border-blue-500/30",
                    )}
                  >
                    {c.role === "edit" ? "Can edit" : "View only"}
                  </span>
                  <button
                    onClick={() => handleRemove(c.email)}
                    className="p-1 text-blue-300/50 hover:text-red-400 transition"
                    title="Remove access"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
