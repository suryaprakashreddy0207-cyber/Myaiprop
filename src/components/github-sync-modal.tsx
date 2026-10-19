import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ArrowLeft,
  Github,
  Loader2,
  Check,
  ExternalLink,
  Lock,
  Globe,
  KeyRound,
  LogOut,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { exportToGitHubRepo } from "@/lib/builder.functions";
import { signInWithGithubFirebase } from "@/lib/firebase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
  projectDescription?: string;
  files?: { path: string; content: string }[];
  currentRepoUrl?: string;
  onExportSuccess?: (repoUrl: string) => void;
}

export function GitHubSyncModal({
  isOpen,
  onClose,
  projectName = "My Application",
  projectDescription = "",
  files = [],
  currentRepoUrl,
  onExportSuccess,
}: GitHubSyncModalProps) {
  const exportServerFn = useServerFn(exportToGitHubRepo);

  const [activeTab, setActiveTab] = useState<"versions" | "github" | "integrations">("github");
  const [token, setToken] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("myaibro.githubToken") || "";
    }
    return "";
  });
  const [githubUser, setGithubUser] = useState<{ login: string; avatarUrl?: string } | null>(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [isSigningInFirebase, setIsSigningInFirebase] = useState(false);

  // Form states matching user's screenshot
  const [repoName, setRepoName] = useState(() =>
    projectName
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "-")
      .replace(/^-|-$/g, "") || "my-web-app",
  );
  const [repoDescription, setRepoDescription] = useState(
    projectDescription || `Full-stack application built with My AI Pro`,
  );
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  // Export action state
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessUrl, setExportSuccessUrl] = useState<string | null>(currentRepoUrl || null);
  const [tokenInputMode, setTokenInputMode] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState("");

  // Sync initial repoName and repoDescription when projectName changes
  useEffect(() => {
    if (projectName) {
      setRepoName(
        projectName
          .toLowerCase()
          .replace(/[^a-z0-9_.-]/g, "-")
          .replace(/^-|-$/g, "") || "my-web-app",
      );
    }
    if (projectDescription) {
      setRepoDescription(projectDescription);
    }
  }, [projectName, projectDescription]);

  // Check saved token on mount or update
  useEffect(() => {
    if (!token.trim()) {
      setGithubUser(null);
      return;
    }
    let alive = true;
    setIsVerifyingToken(true);
    fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: "application/vnd.github+json",
      },
    })
      .then(async (res) => {
        if (!alive) return;
        if (res.ok) {
          const u = await res.json();
          setGithubUser({ login: u.login, avatarUrl: u.avatar_url });
        } else {
          setGithubUser(null);
        }
      })
      .catch(() => {
        if (alive) setGithubUser(null);
      })
      .finally(() => {
        if (alive) setIsVerifyingToken(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  if (!isOpen) return null;

  async function handleFirebaseGithubSignIn() {
    setIsSigningInFirebase(true);
    try {
      const res = await signInWithGithubFirebase();
      if (res.token) {
        setToken(res.token);
        localStorage.setItem("myaibro.githubToken", res.token);
        setGithubUser({
          login: (res.user as any).reloadUserInfo?.screenName || res.user.displayName || "GitHub User",
          avatarUrl: res.user.photoURL || undefined,
        });
        toast.success(`Connected to GitHub as @${res.user.displayName || "user"}!`);
      } else {
        toast.info("Please enter your GitHub Personal Access Token to create repositories.");
        setTokenInputMode(true);
      }
    } catch (err: any) {
      console.warn("GitHub OAuth notice:", err);
      toast.info("Please enter your GitHub Personal Access Token to sync code.");
      setTokenInputMode(true);
    } finally {
      setIsSigningInFirebase(false);
    }
  }

  function handleSaveManualToken(e: React.FormEvent) {
    e.preventDefault();
    const clean = manualTokenInput.trim();
    if (!clean) {
      toast.error("Please enter a GitHub Personal Access Token");
      return;
    }
    setToken(clean);
    localStorage.setItem("myaibro.githubToken", clean);
    setTokenInputMode(false);
    setManualTokenInput("");
    toast.success("GitHub token saved!");
  }

  function handleDisconnect() {
    setToken("");
    setGithubUser(null);
    localStorage.removeItem("myaibro.githubToken");
    toast.info("Disconnected from GitHub");
  }

  async function handleCreateRepository() {
    if (!token.trim()) {
      toast.error("Please log in to GitHub first");
      return;
    }
    const cleanName = repoName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "-")
      .replace(/^-|-$/g, "");
    if (!cleanName) {
      toast.error("Please enter a repository name");
      return;
    }

    setIsExporting(true);
    try {
      const res = await exportServerFn({
        data: {
          githubToken: token.trim(),
          repoName: cleanName,
          repoDescription: repoDescription.trim() || undefined,
          isPrivate: visibility === "private",
          files: files.map((f) => ({
            path: f.path,
            content: f.content,
          })),
        },
      });

      if (!res.success || !res.repoUrl) {
        toast.error(res.error || "Could not create GitHub repository.");
        setIsExporting(false);
        return;
      }

      setExportSuccessUrl(res.repoUrl);
      onExportSuccess?.(res.repoUrl);
      toast.success(
        `Successfully created and pushed ${res.pushedFilesCount || files.length} files to @${res.fullName || cleanName}!`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to create GitHub repository.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
      {/* Outer Modal Container matching dark screenshot */}
      <div className="relative flex flex-col w-full max-w-md max-h-[92vh] rounded-[28px] bg-[#141416] border border-zinc-800 text-zinc-100 shadow-2xl overflow-hidden font-sans">
        {/* Top Header Tabs matching screenshot: < Versions • GitHub Integrations > ✕ */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 bg-[#111113]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-1 text-zinc-500 hover:text-zinc-300 transition"
              aria-label="Previous tab"
            >
              <ChevronLeft className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("versions")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                activeTab === "versions"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              Versions
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("github")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition",
                activeTab === "github"
                  ? "bg-zinc-800/90 text-white shadow-xs border border-zinc-700/60"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
              <span>GitHub</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("integrations")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                activeTab === "integrations"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              Integrations
            </button>

            <button
              type="button"
              className="p-1 text-zinc-500 hover:text-zinc-300 transition"
              aria-label="Next tab"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Subheader: ← GitHub sync */}
        <div className="flex items-center gap-2.5 px-6 pt-5 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h2 className="text-lg font-semibold text-white tracking-tight">GitHub sync</h2>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5">
          {/* GitHub Connection State Banner */}
          {!token.trim() || !githubUser ? (
            <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-zinc-800 flex items-center justify-center text-white">
                  <Github className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Log in to GitHub</h4>
                  <p className="text-xs text-zinc-400">
                    Connect your GitHub account to create repos and push code.
                  </p>
                </div>
              </div>

              {!tokenInputMode ? (
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleFirebaseGithubSignIn}
                    disabled={isSigningInFirebase}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 px-4 text-xs font-semibold text-black hover:bg-zinc-200 transition active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSigningInFirebase ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-black" />
                        <span>Connecting to GitHub…</span>
                      </>
                    ) : (
                      <>
                        <Github className="size-4" />
                        <span>Continue with GitHub</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTokenInputMode(true)}
                    className="text-center text-[11px] text-zinc-400 hover:text-zinc-200 py-1 transition"
                  >
                    Or use GitHub Personal Access Token
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveManualToken} className="space-y-2 pt-1">
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 size-3.5 text-zinc-500" />
                    <input
                      type="password"
                      value={manualTokenInput}
                      onChange={(e) => setManualTokenInput(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-800 py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTokenInputMode(false)}
                      className="flex-1 rounded-xl border border-zinc-800 py-2 text-xs text-zinc-400 hover:text-white transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-white py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition"
                    >
                      Save Token
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-2xl bg-zinc-900/60 border border-zinc-800/80 px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                {githubUser.avatarUrl ? (
                  <img
                    src={githubUser.avatarUrl}
                    alt={githubUser.login}
                    className="size-7 rounded-full border border-zinc-700"
                  />
                ) : (
                  <div className="size-7 rounded-full bg-zinc-800 flex items-center justify-center text-white">
                    <Github className="size-4" />
                  </div>
                )}
                <div>
                  <span className="text-xs font-semibold text-white">
                    Connected to @{githubUser.login}
                  </span>
                  <p className="text-[10px] text-emerald-400">Ready to sync repositories</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-[11px] text-zinc-500 hover:text-red-400 transition flex items-center gap-1"
                title="Disconnect GitHub account"
              >
                <LogOut className="size-3" />
                <span>Disconnect</span>
              </button>
            </div>
          )}

          {/* Success Card if already exported */}
          {exportSuccessUrl && (
            <div className="rounded-2xl bg-emerald-950/40 border border-emerald-800/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <Check className="size-4" />
                <span>Repository Synced on GitHub</span>
              </div>
              <p className="text-[11px] text-zinc-300">
                All {files.length} project files have been committed to your GitHub repository.
              </p>
              <a
                href={exportSuccessUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 px-3 py-1.5 text-xs font-medium text-emerald-300 transition"
              >
                <Github className="size-3.5" />
                <span>Open in GitHub</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          )}

          {/* Form Fields matching screenshot */}
          {/* Field 1: New repository name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">
              New repository name
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="repository-name"
              className="w-full rounded-xl bg-[#1a1a1e] border border-zinc-800/80 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none transition"
            />
          </div>

          {/* Field 2: New repository description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">
              New repository description
            </label>
            <input
              type="text"
              value={repoDescription}
              onChange={(e) => setRepoDescription(e.target.value)}
              placeholder="Describe your repository..."
              className="w-full rounded-xl bg-[#1a1a1e] border border-zinc-800/80 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none transition"
            />
          </div>

          {/* Section: Visibility matching screenshot */}
          <div className="space-y-3 pt-1">
            <span className="block text-xs font-medium text-zinc-300">Visibility</span>

            {/* Option 1: Private */}
            <label
              onClick={() => setVisibility("private")}
              className="flex items-start gap-3 cursor-pointer select-none group"
            >
              <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-zinc-500 bg-transparent transition">
                {visibility === "private" && (
                  <div className="size-2 rounded-full bg-white" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white">Private</span>
                  <Lock className="size-3 text-zinc-500" />
                </div>
                <p className="text-xs text-zinc-400">
                  Only you can access this repo on GitHub.com
                </p>
              </div>
            </label>

            {/* Option 2: Public */}
            <label
              onClick={() => setVisibility("public")}
              className="flex items-start gap-3 cursor-pointer select-none group pt-1"
            >
              <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-zinc-500 bg-transparent transition">
                {visibility === "public" && (
                  <div className="size-2 rounded-full bg-white" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white">Public</span>
                  <Globe className="size-3 text-zinc-500" />
                </div>
                <p className="text-xs text-zinc-400">
                  This repo will be discoverable by everyone on GitHub.com
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Bottom Button matching screenshot: Create GitHub repository */}
        <div className="border-t border-zinc-800/80 p-5 bg-[#141416]">
          <button
            type="button"
            onClick={handleCreateRepository}
            disabled={isExporting || !repoName.trim() || !token.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-800/90 hover:bg-zinc-700 py-3.5 px-5 text-sm font-semibold text-white border border-zinc-700/60 shadow-lg transition active:scale-[0.99] disabled:opacity-40 disabled:hover:bg-zinc-800 cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="size-4 animate-spin text-white" />
                <span>Creating GitHub repository & transferring code…</span>
              </>
            ) : (
              <span>Create GitHub repository</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
