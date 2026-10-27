import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
  Link,
  useParams,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
  listThreads,
  createThread,
  deleteThread,
  clearThread,
} from "@/lib/chat.functions";
import {
  getLocalThreads,
  saveLocalThreads,
  deleteLocalThread,
  saveLocalMessages,
  formatHistoryDate,
  lockLocalThread,
  unlockLocalThread,
  verifyThreadPin,
  isThreadUnlockedInSession,
  setThreadUnlockedInSession,
  type LocalThread,
} from "@/lib/chat-store";
import {
  getActiveUserSession,
  clearActiveUserSession,
  type AppUserSession,
} from "@/lib/user-session";
import { disconnectGoogleWorkspace } from "@/lib/google-auth";
import {
  getAllAutonomousTasks,
  stopAutonomousTask,
  type AutonomousProjectTask,
} from "@/lib/autonomous-task-store";
import {
  Plus,
  Menu,
  LogOut,
  Trash2,
  X,
  Mic,
  Presentation,
  Blocks,
  Telescope,
  Bot,
  MoreVertical,
  History,
  RotateCcw,
  Search,
  MessageSquare,
  Sparkles,
  Share2,
  Folder,
  FolderPlus,
  Home,
  LogIn,
  User,
  Lock,
  Unlock,
  Key,
  Mail,
  Copy,
  Check,
  Database,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const location = useRouterState({ select: (s) => s.location.pathname });

  // Extract active threadId from path (e.g. /chat/abc-123 -> abc-123)
  const activeThreadId = useMemo(() => {
    const parts = location.split("/");
    const idx = parts.indexOf("chat");
    return idx !== -1 && parts[idx + 1] ? parts[idx + 1] : "default";
  }, [location]);

  const listFn = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);
  const clearFn = useServerFn(clearThread);

  const { data: serverThreads = [] } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      try {
        return (await listFn()) || [];
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const [localThreadsState, setLocalThreadsState] = useState<LocalThread[]>([]);
  const [activeUser, setActiveUser] = useState<AppUserSession | null>(null);
  const [mounted, setMounted] = useState(false);

  // History 3-dots actions state (Lock, Unlock, Share, PIN prompts)
  const [activeMenuThreadId, setActiveMenuThreadId] = useState<string | null>(null);
  const [lockModalThread, setLockModalThread] = useState<LocalThread | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [unlockModalThread, setUnlockModalThread] = useState<LocalThread | null>(null);
  const [unlockPinInput, setUnlockPinInput] = useState("");
  const [verifyPinThread, setVerifyPinThread] = useState<LocalThread | null>(null);
  const [verifyPinInput, setVerifyPinInput] = useState("");
  const [shareModalThread, setShareModalThread] = useState<LocalThread | null>(null);
  const [shareAccountInput, setShareAccountInput] = useState("");
  const [sessionUnlocked, setSessionUnlocked] = useState<Record<string, boolean>>({});
  const [autonomousTasks, setAutonomousTasks] = useState<Record<string, AutonomousProjectTask>>(() => getAllAutonomousTasks());

  useEffect(() => {
    function handleTaskUpdate() {
      setAutonomousTasks(getAllAutonomousTasks());
    }
    window.addEventListener("myaipro_autonomous_task_updated", handleTaskUpdate);
    const interval = setInterval(() => {
      setAutonomousTasks(getAllAutonomousTasks());
    }, 4000);
    return () => {
      window.removeEventListener("myaipro_autonomous_task_updated", handleTaskUpdate);
      clearInterval(interval);
    };
  }, []);

  // Load and sync local threads after mount and when user logs in/out
  useEffect(() => {
    setMounted(true);
    // Clear all session unlocks on app open / mount
    if (typeof window !== "undefined") {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith("myaipro_unlocked_")) {
          sessionStorage.removeItem(k);
        }
      }
    }
    function syncForUser() {
      const sess = getActiveUserSession();
      setActiveUser(sess);
      const stored = getLocalThreads();
      setLocalThreadsState(stored);
      setAutonomousTasks(getAllAutonomousTasks());
    }
    syncForUser();
    window.addEventListener("myaipro_auth_changed", syncForUser);
    return () => {
      window.removeEventListener("myaipro_auth_changed", syncForUser);
      // Clear unlock session when leaving chat section
      if (typeof window !== "undefined") {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith("myaipro_unlocked_")) {
            sessionStorage.removeItem(k);
          }
        }
      }
    };
  }, []);

  // When activeThreadId changes (switching between chat threads), clear session unlocks for all other threads
  useEffect(() => {
    if (typeof window !== "undefined" && activeThreadId) {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith("myaipro_unlocked_")) {
          const unlockedId = k.replace("myaipro_unlocked_", "");
          if (unlockedId !== activeThreadId) {
            sessionStorage.removeItem(k);
          }
        }
      }
      setSessionUnlocked({});
    }
  }, [activeThreadId]);

  // Merge server and local threads into a deduplicated list (only merge server threads for returning users)
  const allThreads = useMemo(() => {
    const map = new Map<string, LocalThread>();

    // Add user-scoped local threads first
    for (const lt of localThreadsState) {
      if (lt.id && lt.id !== "default") {
        map.set(lt.id, lt);
      }
    }

    // Only merge server threads if the user is NOT a brand-new user with empty history
    if (!activeUser?.isNewUser) {
      const safeServerThreads = Array.isArray(serverThreads) ? serverThreads : [];
      for (const st of safeServerThreads) {
        if (st.id && st.id !== "default") {
          const existing = map.get(st.id);
          if (existing || !activeUser) {
            map.set(st.id, {
              id: st.id,
              title:
                existing?.title && existing.title !== "New conversation"
                  ? existing.title
                  : st.title || "New conversation",
              first_prompt: existing?.first_prompt || "",
              last_message: st.last_message || existing?.last_message || "",
              updated_at:
                st.updated_at || existing?.updated_at || new Date().toISOString(),
              created_at:
                st.created_at || existing?.created_at || new Date().toISOString(),
              message_count: existing?.message_count || 0,
              isLocked: existing?.isLocked,
              pin: existing?.pin,
            });
          }
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  }, [serverThreads, localThreadsState, activeUser]);

  // Save merged threads
  useEffect(() => {
    if (allThreads.length > 0) {
      saveLocalThreads(allThreads);
    }
  }, [allThreads]);

  // Close 3-dots menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const createMut = {
    isPending: false,
    mutate: (customTitle?: string) => {
      const newId = `local-${Date.now()}`;
      const newTh: LocalThread = {
        id: newId,
        title: customTitle || "New conversation",
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      setLocalThreadsState((prev) => [newTh, ...prev]);
      saveLocalThreads([newTh, ...localThreadsState]);
      setDrawerOpen(false);
      setMenuOpen(false);
      toast.success("New chat started");
      navigate({ to: "/chat/$threadId", params: { threadId: newId } });
      createFn({ data: { id: newId, title: customTitle || "New conversation" } }).catch(() => {});
    },
  };

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: (_r, id) => {
      deleteLocalThread(id);
      setLocalThreadsState((prev) => prev.filter((t) => t.id !== id));
      qc.invalidateQueries({ queryKey: ["threads"] });
      toast.success("Conversation deleted");
      if (activeThreadId === id) {
        navigate({ to: "/chat/$threadId", params: { threadId: "default" } });
      }
    },
    onError: (_e, id) => {
      deleteLocalThread(id);
      setLocalThreadsState((prev) => prev.filter((t) => t.id !== id));
      if (activeThreadId === id) {
        navigate({ to: "/chat/$threadId", params: { threadId: "default" } });
      }
    },
  });

  const clearMut = useMutation({
    mutationFn: async (id: string) => {
      saveLocalMessages(id, []);
      try {
        await clearFn({ data: { id } });
      } catch {
        // local clear still succeeds
      }
      return id;
    },
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: ["messages", id] });
      window.dispatchEvent(new CustomEvent("myaipro_chat_cleared", { detail: id }));
      toast.success("Chat messages cleared");
      setMenuOpen(false);
    },
    onError: (_e, id) => {
      saveLocalMessages(id, []);
      window.dispatchEvent(new CustomEvent("myaipro_chat_cleared", { detail: id }));
      toast.success("Chat messages cleared");
      setMenuOpen(false);
    },
  });

  // Group threads for History: Today, Yesterday, Previous 7 Days, Older
  const groupedThreads = useMemo(() => {
    const filtered = allThreads.filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.last_message && t.last_message.toLowerCase().includes(q))
      );
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const sevenDaysAgo = today - 7 * 86400000;

    const groups: {
      today: LocalThread[];
      yesterday: LocalThread[];
      pastWeek: LocalThread[];
      older: LocalThread[];
    } = {
      today: [],
      yesterday: [],
      pastWeek: [],
      older: [],
    };

    for (const t of filtered) {
      const time = new Date(t.updated_at).getTime();
      if (time >= today) {
        groups.today.push(t);
      } else if (time >= yesterday) {
        groups.yesterday.push(t);
      } else if (time >= sevenDaysAgo) {
        groups.pastWeek.push(t);
      } else {
        groups.older.push(t);
      }
    }

    return groups;
  }, [allThreads, searchQuery]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    clearActiveUserSession();
    disconnectGoogleWorkspace();
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    toast.success("Signed out of your account");
    navigate({ to: "/auth", replace: true });
  }

  function handleLockSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!lockModalThread) return;
    if (!/^\d{4}$/.test(pinInput)) {
      toast.error("Please enter a valid 4-digit numeric PIN");
      return;
    }
    lockLocalThread(lockModalThread.id, pinInput);
    setLocalThreadsState((prev) =>
      prev.map((t) =>
        t.id === lockModalThread.id ? { ...t, isLocked: true, pin: pinInput } : t,
      ),
    );
    toast.success("Chat locked with 4-digit PIN");
    setLockModalThread(null);
    setPinInput("");
  }

  function handleUnlockSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!unlockModalThread) return;
    if (unlockModalThread.pin && unlockPinInput !== unlockModalThread.pin) {
      toast.error("Incorrect PIN. Please enter the correct 4-digit PIN to unlock.");
      return;
    }
    unlockLocalThread(unlockModalThread.id);
    setLocalThreadsState((prev) =>
      prev.map((t) =>
        t.id === unlockModalThread.id ? { ...t, isLocked: false, pin: undefined } : t,
      ),
    );
    toast.success("Chat lock removed");
    setUnlockModalThread(null);
    setUnlockPinInput("");
  }

  function handleVerifyPinSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!verifyPinThread) return;
    if (verifyPinThread.pin && verifyPinInput !== verifyPinThread.pin) {
      toast.error("Incorrect PIN. Please try again.");
      return;
    }
    setThreadUnlockedInSession(verifyPinThread.id);
    setSessionUnlocked((prev) => ({ ...prev, [verifyPinThread.id]: true }));
    toast.success("Chat unlocked");
    const targetId = verifyPinThread.id;
    setVerifyPinThread(null);
    setVerifyPinInput("");
    setDrawerOpen(false);
    navigate({ to: "/chat/$threadId", params: { threadId: targetId } });
  }

  function handleShareViaEmail() {
    if (!shareModalThread) return;
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/chat/${shareModalThread.id}`;
    const subject = encodeURIComponent(`Shared Chat: ${shareModalThread.title || "My AI Pro Conversation"}`);
    const body = encodeURIComponent(
      `Check out this conversation from My AI Pro:\n\nTitle: ${shareModalThread.title}\n\nLink: ${shareUrl}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.success("Opening email client to share");
    setShareModalThread(null);
  }

  function handleShareViaAccount() {
    if (!shareModalThread) return;
    if (!shareAccountInput.trim()) {
      toast.error("Please enter a friend's email or My AI Pro account username");
      return;
    }
    toast.success(`Conversation shared with ${shareAccountInput.trim()}!`);
    setShareAccountInput("");
    setShareModalThread(null);
  }

  function handleCopyShareLink() {
    if (!shareModalThread) return;
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/chat/${shareModalThread.id}`;
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(shareUrl);
      toast.success("Conversation link copied to clipboard");
    }
  }

  const currentThread = allThreads.find((t) => t.id === activeThreadId);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#070e20] font-sans text-blue-100">
      {/* Drawer backdrop */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* History & Navigation Drawer - Styled in Classic Blue Theme */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[88%] max-w-[340px] flex-col bg-[#081226]/98 border-r border-blue-500/20 text-white shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-500/20 bg-[#070e20]/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-serif font-bold text-base shadow-md shadow-blue-500/30">
              M
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-lg font-semibold text-white leading-tight">My AI Pro</h2>
              <p className="text-[11px] text-blue-300/70 flex items-center gap-1 truncate">
                <History className="size-3 shrink-0" />
                <span className="truncate">
                  {activeUser ? activeUser.email : "Chat History"}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg text-blue-300/70 hover:text-white hover:bg-blue-600/20 transition"
            aria-label="Close drawer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* New Chat Primary Button */}
        <div className="p-3">
          <button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-2.5 px-4 text-sm font-medium text-white shadow-lg shadow-blue-500/25 active:scale-[0.98] transition disabled:opacity-60 cursor-pointer"
          >
            <Plus className="size-4 stroke-[2.5]" /> Start New Chat
          </button>
        </div>

        {/* Search History */}
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3 size-3.5 text-blue-300/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat history..."
              className="w-full rounded-xl bg-[#0c1938] py-2 pl-8 pr-3 text-xs text-white placeholder:text-blue-300/40 border border-blue-500/25 focus:border-blue-400 focus:outline-none transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-blue-300/70 hover:text-white p-0.5"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* History Feed organized by Time */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
          {allThreads.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <MessageSquare className="size-8 mx-auto text-blue-300/30 mb-2" />
              <p className="text-xs font-medium text-white">No conversations saved yet</p>
              <p className="text-[11px] text-blue-300/60 mt-0.5">
                Every chat you start and finish is preserved here automatically.
              </p>
            </div>
          ) : null}

          {/* Today */}
          {groupedThreads.today.length > 0 && (
            <div>
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/60">
                Today
              </div>
              <ul className="space-y-1">
                {groupedThreads.today.map((t) => (
                  <ThreadItem
                    key={t.id}
                    thread={t}
                    mounted={mounted}
                    active={location.includes(t.id)}
                    isUnlocked={!!sessionUnlocked[t.id] || isThreadUnlockedInSession(t.id)}
                    task={autonomousTasks[t.id]}
                    onStopTask={() => {
                      stopAutonomousTask(t.id);
                      setAutonomousTasks(getAllAutonomousTasks());
                      toast.info("Stopped background agent for this project");
                    }}
                    activeMenuThreadId={activeMenuThreadId}
                    setActiveMenuThreadId={setActiveMenuThreadId}
                    onSelect={() => setDrawerOpen(false)}
                    onDelete={() => deleteMut.mutate(t.id)}
                    onOpenLock={() => {
                      setLockModalThread(t);
                      setPinInput("");
                    }}
                    onOpenUnlock={() => {
                      setUnlockModalThread(t);
                      setUnlockPinInput("");
                    }}
                    onOpenShare={() => {
                      setShareModalThread(t);
                      setShareAccountInput("");
                    }}
                    onAttemptOpenLocked={() => {
                      setVerifyPinThread(t);
                      setVerifyPinInput("");
                    }}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Yesterday */}
          {groupedThreads.yesterday.length > 0 && (
            <div>
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/60">
                Yesterday
              </div>
              <ul className="space-y-1">
                {groupedThreads.yesterday.map((t) => (
                  <ThreadItem
                    key={t.id}
                    thread={t}
                    mounted={mounted}
                    active={location.includes(t.id)}
                    isUnlocked={!!sessionUnlocked[t.id] || isThreadUnlockedInSession(t.id)}
                    task={autonomousTasks[t.id]}
                    onStopTask={() => {
                      stopAutonomousTask(t.id);
                      setAutonomousTasks(getAllAutonomousTasks());
                      toast.info("Stopped background agent for this project");
                    }}
                    activeMenuThreadId={activeMenuThreadId}
                    setActiveMenuThreadId={setActiveMenuThreadId}
                    onSelect={() => setDrawerOpen(false)}
                    onDelete={() => deleteMut.mutate(t.id)}
                    onOpenLock={() => {
                      setLockModalThread(t);
                      setPinInput("");
                    }}
                    onOpenUnlock={() => {
                      setUnlockModalThread(t);
                      setUnlockPinInput("");
                    }}
                    onOpenShare={() => {
                      setShareModalThread(t);
                      setShareAccountInput("");
                    }}
                    onAttemptOpenLocked={() => {
                      setVerifyPinThread(t);
                      setVerifyPinInput("");
                    }}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Past 7 Days */}
          {groupedThreads.pastWeek.length > 0 && (
            <div>
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/60">
                Previous 7 Days
              </div>
              <ul className="space-y-1">
                {groupedThreads.pastWeek.map((t) => (
                  <ThreadItem
                    key={t.id}
                    thread={t}
                    mounted={mounted}
                    active={location.includes(t.id)}
                    isUnlocked={!!sessionUnlocked[t.id] || isThreadUnlockedInSession(t.id)}
                    task={autonomousTasks[t.id]}
                    onStopTask={() => {
                      stopAutonomousTask(t.id);
                      setAutonomousTasks(getAllAutonomousTasks());
                      toast.info("Stopped background agent for this project");
                    }}
                    activeMenuThreadId={activeMenuThreadId}
                    setActiveMenuThreadId={setActiveMenuThreadId}
                    onSelect={() => setDrawerOpen(false)}
                    onDelete={() => deleteMut.mutate(t.id)}
                    onOpenLock={() => {
                      setLockModalThread(t);
                      setPinInput("");
                    }}
                    onOpenUnlock={() => {
                      setUnlockModalThread(t);
                      setUnlockPinInput("");
                    }}
                    onOpenShare={() => {
                      setShareModalThread(t);
                      setShareAccountInput("");
                    }}
                    onAttemptOpenLocked={() => {
                      setVerifyPinThread(t);
                      setVerifyPinInput("");
                    }}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Older */}
          {groupedThreads.older.length > 0 && (
            <div>
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-300/60">
                Older History
              </div>
              <ul className="space-y-1">
                {groupedThreads.older.map((t) => (
                  <ThreadItem
                    key={t.id}
                    thread={t}
                    mounted={mounted}
                    active={location.includes(t.id)}
                    isUnlocked={!!sessionUnlocked[t.id] || isThreadUnlockedInSession(t.id)}
                    task={autonomousTasks[t.id]}
                    onStopTask={() => {
                      stopAutonomousTask(t.id);
                      setAutonomousTasks(getAllAutonomousTasks());
                      toast.info("Stopped background agent for this project");
                    }}
                    activeMenuThreadId={activeMenuThreadId}
                    setActiveMenuThreadId={setActiveMenuThreadId}
                    onSelect={() => setDrawerOpen(false)}
                    onDelete={() => deleteMut.mutate(t.id)}
                    onOpenLock={() => {
                      setLockModalThread(t);
                      setPinInput("");
                    }}
                    onOpenUnlock={() => {
                      setUnlockModalThread(t);
                      setUnlockPinInput("");
                    }}
                    onOpenShare={() => {
                      setShareModalThread(t);
                      setShareAccountInput("");
                    }}
                    onAttemptOpenLocked={() => {
                      setVerifyPinThread(t);
                      setVerifyPinInput("");
                    }}
                  />
                ))}
              </ul>
            </div>
          )}
        </nav>

        {/* App Switcher & Sign Out */}
        <div className="border-t border-blue-500/20 p-2.5 space-y-0.5 bg-[#070e20]/60">
          <button
            onClick={() => {
              setDrawerOpen(false);
              navigate({ to: "/chat/$threadId", params: { threadId: "default" } });
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-200 hover:text-white hover:bg-blue-600/20 transition text-left"
          >
            <Home className="size-3.5 text-blue-400" /> Home
          </button>

          <Link
            to="/projects"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-blue-200/80 hover:text-white hover:bg-blue-600/20 transition"
          >
            <Folder className="size-3.5 text-blue-400" /> Projects
          </Link>

          <Link
            to="/cowork"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-blue-200/80 hover:text-white hover:bg-blue-600/20 transition"
          >
            <Bot className="size-3.5 text-blue-400" /> My AI Co-worker
          </Link>

          <Link
            to="/build"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-blue-200/80 hover:text-white hover:bg-blue-600/20 transition"
          >
            <Blocks className="size-3.5 text-blue-400" /> No-code platform
          </Link>

          <Link
            to="/research"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-blue-200/80 hover:text-white hover:bg-blue-600/20 transition"
          >
            <Telescope className="size-3.5 text-blue-400" /> Deep Research
          </Link>

          <Link
            to="/presentations"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-blue-200/80 hover:text-white hover:bg-blue-600/20 transition"
          >
            <Presentation className="size-3.5 text-blue-400" /> Slide Presentations
          </Link>

          <Link
            to="/voice"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-blue-200/80 hover:text-white hover:bg-blue-600/20 transition"
          >
            <Mic className="size-3.5 text-blue-400" /> Voice Assistant
          </Link>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Top Header - Classic Blue Style */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-blue-500/20 bg-[#081226]/90 backdrop-blur-md px-3 sm:px-4 z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl p-2 text-blue-200 hover:bg-blue-600/20 hover:text-white transition active:scale-95 cursor-pointer"
            aria-label="Open History Menu"
            title="Chat History"
          >
            <Menu className="size-5" />
            <span className="hidden sm:inline text-xs font-medium text-blue-300">History</span>
          </button>

          <button
            onClick={() => {
              navigate({ to: "/chat/$threadId", params: { threadId: "default" } });
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition active:scale-95 cursor-pointer",
              activeThreadId === "default"
                ? "bg-blue-600/20 text-blue-300 font-semibold ring-1 ring-blue-500/40"
                : "text-blue-300/80 hover:bg-blue-600/15 hover:text-white",
            )}
            aria-label="Home Screen"
            title="Home Screen"
          >
            <Home className="size-4" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <Link
            to="/chat/$threadId"
            params={{ threadId: "default" }}
            className="flex items-center gap-2 pl-1 hover:opacity-85 transition"
            title="Go to Home Screen"
          >
            <h1 className="font-serif text-lg font-bold tracking-tight text-white flex items-center gap-1.5 cursor-pointer">
              <span>My AI Pro</span>
            </h1>
          </Link>
          {currentThread && currentThread.title && currentThread.title !== "New conversation" ? (
            <span className="hidden md:inline-flex items-center gap-1.5 max-w-[240px] truncate text-xs text-blue-200/80 border-l border-blue-500/25 pl-2">
              {currentThread.isLocked && <Lock className="size-3 text-amber-400 shrink-0" />}
              <span className="truncate">{currentThread.title}</span>
            </span>
          ) : null}
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick New Chat button */}
          <button
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium bg-blue-600/20 border border-blue-500/30 text-blue-200 hover:bg-blue-600/30 hover:text-white active:scale-95 transition disabled:opacity-60 cursor-pointer"
            title="Start New Chat (saves current)"
          >
            <Plus className="size-4" />
            <span className="hidden xs:inline">New chat</span>
          </button>

          {/* User Sign In / Account Badge */}
          {activeUser ? (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-[#0c1938] px-2.5 py-1 text-xs text-white hover:bg-[#12234e] transition"
              title={`Signed in as ${activeUser.displayName || activeUser.email}`}
            >
              <div className="flex size-5 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white text-[10px] font-bold">
                {activeUser.displayName ? activeUser.displayName.charAt(0).toUpperCase() : activeUser.email.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline max-w-[80px] truncate font-medium">
                {activeUser.displayName || activeUser.email.split("@")[0]}
              </span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-600/20 px-2.5 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 active:scale-95 transition"
              title="Sign in or register to sync your chats"
            >
              <LogIn className="size-3.5" />
              <span>Sign in</span>
            </Link>
          )}

          {/* Three Dots Menu Button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                "rounded-xl p-2 text-blue-200 hover:bg-blue-600/20 hover:text-white active:scale-95 transition cursor-pointer",
                menuOpen && "bg-blue-600/25 text-white",
              )}
              aria-label="More options"
              title="More options"
            >
              <MoreVertical className="size-5" />
            </button>

            {/* Three Dots Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 rounded-2xl border border-blue-500/30 bg-[#0c1938] p-1.5 shadow-2xl shadow-blue-950/80 z-50 animate-in fade-in zoom-in-95 duration-150">
                {activeUser ? (
                  <div className="px-3 py-2 text-xs border-b border-blue-500/20 mb-1">
                    <div className="font-semibold text-white truncate">{activeUser.displayName || "My AI User"}</div>
                    <div className="text-[10px] text-blue-300/70 truncate">{activeUser.email}</div>
                  </div>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-600/20 transition text-left"
                    >
                      <LogIn className="size-4 text-blue-400" />
                      <div>
                        <div>Sign In / Register</div>
                        <div className="text-[10px] text-blue-300/60 font-normal">
                          Sync chats & history across devices
                        </div>
                      </div>
                    </Link>
                    <div className="my-1 border-t border-blue-500/20" />
                  </>
                )}

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate({ to: "/projects/new" });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left"
                >
                  <FolderPlus className="size-4 text-blue-400" />
                  <div>
                    <div className="font-semibold">Create a project</div>
                    <div className="text-[10px] text-blue-300/60 font-normal">
                      Organize chats, files & sources
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate({ to: "/voice" });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left"
                >
                  <Mic className="size-4 text-blue-400" />
                  <div>
                    <div className="font-semibold">Voice assistant</div>
                    <div className="text-[10px] text-blue-300/60 font-normal">
                      Voice recording & live assistant
                    </div>
                  </div>
                </button>

                <div className="my-1 border-t border-blue-500/20" />

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate({ to: "/projects" });
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left"
                >
                  <Folder className="size-4 text-blue-300/70" />
                  <div>
                    <div className="font-medium">Projects</div>
                    <div className="text-[10px] text-blue-300/60 font-normal">
                      All, created & shared projects
                    </div>
                  </div>
                </button>

                <div className="my-1 border-t border-blue-500/20" />

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    createMut.mutate();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left"
                >
                  <Plus className="size-4 text-blue-400" />
                  <div>
                    <div className="font-semibold">New chat</div>
                    <div className="text-[10px] text-blue-300/60 font-normal">
                      Saves old chat in history
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setDrawerOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left"
                >
                  <History className="size-4 text-blue-300/70" />
                  <div>
                    <div>Chat history</div>
                    <div className="text-[10px] text-blue-300/60 font-normal">
                      View all saved conversations
                    </div>
                  </div>
                </button>

                <button
                  onClick={handleShareCurrent}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left"
                >
                  <Share2 className="size-4 text-blue-300/70" />
                  <span>Share conversation</span>
                </button>

                <div className="my-1 border-t border-blue-500/20" />

                <button
                  onClick={() => {
                    if (confirm("Clear all messages in this conversation?")) {
                      clearMut.mutate(activeThreadId);
                    }
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-blue-200 hover:bg-blue-600/20 transition text-left cursor-pointer"
                >
                  <RotateCcw className="size-4 text-blue-400" />
                  <span>Clear messages</span>
                </button>

                {activeThreadId && activeThreadId !== "default" && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (confirm("Delete this conversation from history?")) {
                        deleteMut.mutate(activeThreadId);
                      }
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition text-left cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                    <span>Delete conversation</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Chat Screen Outlet */}
      <Outlet />

      {/* ========================================================================= */}
      {/* LOCK CHAT MODAL (Create 4-Digit PIN)                                      */}
      {/* ========================================================================= */}
      {lockModalThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-blue-500/30 bg-[#0c1938] p-6 shadow-2xl shadow-blue-950 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
              <div className="flex items-center gap-2.5 font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Lock className="size-4" />
                </div>
                <span>Lock Conversation</span>
              </div>
              <button
                type="button"
                onClick={() => setLockModalThread(null)}
                className="rounded-lg p-1 text-blue-300/70 hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-blue-200/80 leading-relaxed">
              Create a 4-digit PIN for &ldquo;<span className="text-white font-medium">{lockModalThread.title}</span>&rdquo;. Next time you open this chat, you will be prompted to enter this PIN.
            </p>

            <form onSubmit={handleLockSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-blue-300/80 mb-1.5">
                  Enter 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-blue-500/30 bg-[#070e20] py-3 text-white placeholder:text-blue-300/30 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLockModalThread(null)}
                  className="flex-1 rounded-xl border border-blue-500/30 py-2.5 text-xs font-medium text-blue-200 hover:bg-blue-600/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinInput.length !== 4}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
                >
                  Set Lock PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNLOCK CHAT MODAL (Remove PIN)                                           */}
      {/* ========================================================================= */}
      {unlockModalThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-blue-500/30 bg-[#0c1938] p-6 shadow-2xl shadow-blue-950 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
              <div className="flex items-center gap-2.5 font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Unlock className="size-4" />
                </div>
                <span>Unlock Conversation</span>
              </div>
              <button
                type="button"
                onClick={() => setUnlockModalThread(null)}
                className="rounded-lg p-1 text-blue-300/70 hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-blue-200/80 leading-relaxed">
              Enter the current 4-digit PIN for &ldquo;<span className="text-white font-medium">{unlockModalThread.title}</span>&rdquo; to remove the lock completely.
            </p>

            <form onSubmit={handleUnlockSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-blue-300/80 mb-1.5">
                  Enter 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  value={unlockPinInput}
                  onChange={(e) => setUnlockPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-blue-500/30 bg-[#070e20] py-3 text-white placeholder:text-blue-300/30 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUnlockModalThread(null)}
                  className="flex-1 rounded-xl border border-blue-500/30 py-2.5 text-xs font-medium text-blue-200 hover:bg-blue-600/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={unlockPinInput.length !== 4}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-semibold text-white shadow-lg transition disabled:opacity-50"
                >
                  Remove Lock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VERIFY PIN MODAL (Prompted on click of a locked chat)                     */}
      {/* ========================================================================= */}
      {verifyPinThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-blue-500/30 bg-[#0c1938] p-6 shadow-2xl shadow-blue-950 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
              <div className="flex items-center gap-2.5 font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Key className="size-4" />
                </div>
                <span>Enter 4-Digit Lock PIN</span>
              </div>
              <button
                type="button"
                onClick={() => setVerifyPinThread(null)}
                className="rounded-lg p-1 text-blue-300/70 hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="text-center py-2">
              <div className="inline-flex p-3 rounded-full bg-amber-500/15 text-amber-400 mb-2">
                <Lock className="size-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                {verifyPinThread.title || "This conversation is locked"}
              </h3>
              <p className="text-xs text-blue-200/70 mt-1">
                Enter your 4-digit security PIN to access and read this chat.
              </p>
            </div>

            <form onSubmit={handleVerifyPinSubmit} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                value={verifyPinInput}
                onChange={(e) => setVerifyPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                className="w-full text-center text-3xl tracking-[0.5em] font-mono rounded-xl border border-blue-500/30 bg-[#070e20] py-3 text-white placeholder:text-blue-300/30 focus:border-blue-400 focus:outline-none"
              />

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyPinThread(null)}
                  className="flex-1 rounded-xl border border-blue-500/30 py-2.5 text-xs font-medium text-blue-200 hover:bg-blue-600/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyPinInput.length !== 4}
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
                >
                  Unlock & View
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SHARE CHAT MODAL (Email, Account, Copy Link)                              */}
      {/* ========================================================================= */}
      {shareModalThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-blue-500/30 bg-[#0c1938] p-6 shadow-2xl shadow-blue-950 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
              <div className="flex items-center gap-2.5 font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                  <Share2 className="size-4" />
                </div>
                <span>Share Conversation</span>
              </div>
              <button
                type="button"
                onClick={() => setShareModalThread(null)}
                className="rounded-lg p-1 text-blue-300/70 hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-blue-200/80">
              Share &ldquo;<span className="text-white font-medium">{shareModalThread.title}</span>&rdquo; with friends or colleagues using email or their My AI Pro account.
            </p>

            {/* Option 1: Share via Email */}
            <div className="p-3.5 rounded-xl border border-blue-500/20 bg-[#070e20]/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white flex items-center gap-1.5">
                  <Mail className="size-3.5 text-blue-400" /> Share via Email
                </span>
                <button
                  type="button"
                  onClick={handleShareViaEmail}
                  className="rounded-lg bg-blue-600/30 border border-blue-400/30 px-3 py-1 text-xs font-medium text-blue-200 hover:bg-blue-600/50 hover:text-white transition"
                >
                  Send Email Invite
                </button>
              </div>
              <p className="text-[11px] text-blue-300/60">
                Launches your email app with a formatted invitation and direct conversation link.
              </p>
            </div>

            {/* Option 2: Share with My AI Pro Account */}
            <div className="p-3.5 rounded-xl border border-blue-500/20 bg-[#070e20]/60 space-y-2.5">
              <span className="text-xs font-medium text-white flex items-center gap-1.5">
                <User className="size-3.5 text-indigo-400" /> Share with My AI Pro Account
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareAccountInput}
                  onChange={(e) => setShareAccountInput(e.target.value)}
                  placeholder="Enter username or email..."
                  className="flex-1 rounded-xl bg-[#0c1938] px-3 py-2 text-xs text-white border border-blue-500/30 focus:border-blue-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleShareViaAccount}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition shrink-0"
                >
                  Share
                </button>
              </div>
            </div>

            {/* Option 3: Copy Web Link */}
            <div className="pt-2 flex items-center justify-between border-t border-blue-500/20">
              <span className="text-xs text-blue-300/70">Or copy direct link:</span>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-[#0c1938] px-3 py-1.5 text-xs font-medium text-blue-200 hover:text-white hover:bg-blue-600/20 transition cursor-pointer"
              >
                <Copy className="size-3.5" />
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Individual thread item in the History drawer with animated 3-dots indicator for active tasks, lock badge, and options */
function ThreadItem({
  thread,
  active,
  mounted,
  isUnlocked,
  task,
  onStopTask,
  activeMenuThreadId,
  setActiveMenuThreadId,
  onSelect,
  onDelete,
  onOpenLock,
  onOpenUnlock,
  onOpenShare,
  onAttemptOpenLocked,
}: {
  thread: LocalThread;
  active: boolean;
  mounted: boolean;
  isUnlocked: boolean;
  task?: AutonomousProjectTask | null;
  onStopTask?: () => void;
  activeMenuThreadId: string | null;
  setActiveMenuThreadId: (id: string | null) => void;
  onSelect: () => void;
  onDelete: () => void;
  onOpenLock: () => void;
  onOpenUnlock: () => void;
  onOpenShare: () => void;
  onAttemptOpenLocked: () => void;
}) {
  const isMenuOpen = activeMenuThreadId === thread.id;
  const isCurrentlyLocked = !!thread.isLocked && !isUnlocked && !isThreadUnlockedInSession(thread.id);
  const isTaskWorking = task?.status === "working";

  function handleClick(e: React.MouseEvent) {
    if (isCurrentlyLocked) {
      e.preventDefault();
      e.stopPropagation();
      onAttemptOpenLocked();
      return;
    }
    onSelect();
  }

  return (
    <li className="group relative flex items-center rounded-xl transition">
      <Link
        to="/chat/$threadId"
        params={{ threadId: thread.id }}
        onClick={handleClick}
        className={cn(
          "flex-1 min-w-0 rounded-xl px-3 py-2 text-left transition pr-10",
          active
            ? "bg-blue-600/25 text-white ring-1 ring-blue-500/40"
            : "text-blue-200/80 hover:bg-blue-600/15 hover:text-white",
        )}
      >
        <div className="flex items-center justify-between gap-1 mb-0.5">
          {/* Thread Title + Lock Indicator + Autonomous Task Badge */}
          <div className="flex items-center gap-1.5 min-w-0">
            {thread.isLocked && (
              <span title="Locked conversation">
                <Lock className="size-3 text-amber-400 shrink-0" />
              </span>
            )}
            <span className="truncate text-xs font-semibold text-white">
              {thread.title || "Conversation"}
            </span>
            {isTaskWorking && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 px-1.5 py-0.2 text-[9px] font-semibold text-cyan-300 shrink-0 animate-pulse"
                title={`AI working on ${task?.projectName || "project"} (${task?.currentPhase})`}
              >
                <span className="size-1 rounded-full bg-cyan-400" />
                <span>Working</span>
              </span>
            )}
          </div>
          <span className="shrink-0 text-[10px] text-blue-300/60">
            {mounted ? formatHistoryDate(thread.updated_at) : ""}
          </span>
        </div>

        {/* Ending preview */}
        {thread.last_message ? (
          <p className="truncate text-[11px] text-blue-300/70 font-normal">
            {thread.last_message.replace(/^[#\s*]+/, "")}
          </p>
        ) : (
          <p className="text-[11px] text-blue-300/40 italic">Empty chat</p>
        )}
      </Link>

      {/* 3-dots Menu Button with Animation when AI is Working */}
      <div className="absolute right-1.5 flex items-center">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveMenuThreadId(isMenuOpen ? null : thread.id);
          }}
          className={cn(
            "p-1.5 rounded-lg transition cursor-pointer relative",
            isTaskWorking
              ? "text-cyan-300 bg-cyan-500/15 ring-1 ring-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.4)] hover:bg-cyan-500/25"
              : isMenuOpen
                ? "text-white bg-blue-600/20"
                : "text-blue-300/70 hover:text-white hover:bg-blue-600/20",
          )}
          title={isTaskWorking ? "AI Agent is actively working on this project (Click for options)" : "Chat options"}
          aria-label="Chat options"
        >
          {isTaskWorking ? (
            <span className="flex items-center gap-0.5 px-0.5" title="Agent working">
              <span className="size-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="size-1 rounded-full bg-cyan-300 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="size-1 rounded-full bg-cyan-200 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          ) : (
            <MoreVertical className="size-3.5" />
          )}
        </button>

        {/* 3-dots Dropdown with Lock/Unlock, Share, Stop Working, and Delete */}
        {isMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-blue-500/30 bg-[#0c1938] p-1.5 shadow-2xl shadow-blue-950 z-50 animate-in fade-in zoom-in-95"
          >
            {isTaskWorking && (
              <>
                <div className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-[11px] text-cyan-200 mb-1">
                  <div className="font-semibold text-cyan-300 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span>Autonomous Agent Active</span>
                  </div>
                  <div className="text-[10px] text-cyan-300/80 capitalize mt-0.5">
                    Phase: {task?.currentPhase}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuThreadId(null);
                    onStopTask?.();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-500/15 transition text-left cursor-pointer"
                >
                  <RotateCcw className="size-3.5 text-amber-400" />
                  <span>Stop Working</span>
                </button>
                <div className="my-1 border-t border-blue-500/20" />
              </>
            )}

            {thread.isLocked ? (
              <button
                type="button"
                onClick={() => {
                  setActiveMenuThreadId(null);
                  onOpenUnlock();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10 transition text-left cursor-pointer"
              >
                <Unlock className="size-3.5" />
                <span>Unlock the chat</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveMenuThreadId(null);
                  onOpenLock();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-blue-200 hover:bg-blue-600/20 hover:text-white transition text-left cursor-pointer"
              >
                <Lock className="size-3.5" />
                <span>Lock the chat</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveMenuThreadId(null);
                onOpenShare();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-blue-200 hover:bg-blue-600/20 hover:text-white transition text-left cursor-pointer"
            >
              <Share2 className="size-3.5" />
              <span>Share the chat</span>
            </button>

            <div className="my-1 border-t border-blue-500/20" />

            <button
              type="button"
              onClick={() => {
                setActiveMenuThreadId(null);
                if (confirm("Delete this conversation from history?")) {
                  onDelete();
                }
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition text-left cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              <span>Delete the chat</span>
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
