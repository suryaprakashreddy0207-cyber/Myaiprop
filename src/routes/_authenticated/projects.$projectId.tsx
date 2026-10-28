import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  MoreVertical,
  MessageSquare,
  Paperclip,
  Plus,
  Mic,
  Volume2,
  Trash2,
  Share2,
  Settings as SettingsIcon,
  ExternalLink,
  Loader2,
  AudioWaveform,
  Sparkles,
  Send,
  MapPin,
  Bot,
  BotOff,
  Users,
  Check,
  User,
} from "lucide-react";
import {
  GoogleDriveLogo,
  GoogleSheetsLogo,
  GmailLogo,
  SlackLogo,
} from "@/components/icons/app-logos";
import {
  getProjectById,
  getLocalProjectMessages,
  addProjectChatMessage,
  removeSourceFromProject,
  getCurrentUserEmail,
  getCurrentUserId,
  getProjectAiEnabled,
  setProjectAiEnabled,
  type ProjectItem,
  type ProjectSource,
  type ProjectChatMessage,
} from "@/lib/projects-store";
import { sendProjectChatMessage } from "@/lib/projects.functions";
import { AddSourceModal } from "@/components/projects/add-source-modal";
import { ShareProjectModal } from "@/components/projects/share-project-modal";
import { ProjectSettingsModal } from "@/components/projects/project-settings-modal";
import { RichMessage } from "@/components/rich-message";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  component: ProjectDetailPage,
});

type ProjectTab = "chats" | "sources";

function ProjectDetailPage() {
  const { projectId } = useParams({ from: "/_authenticated/projects/$projectId" });
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>("chats");
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean>(() => getProjectAiEnabled(projectId));

  // Current user info
  const currentUserEmail = useMemo(() => getCurrentUserEmail(), []);
  const currentUserId = useMemo(() => getCurrentUserId(), []);
  const currentUserName = useMemo(() => {
    const clean = currentUserEmail.split("@")[0] || "User";
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }, [currentUserEmail]);

  // Modals
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasWebSpeechCapturedRef = useRef(false);
  const lastCapturedSpeechRef = useRef("");
  const preMicInputRef = useRef("");
  const askServerFn = useServerFn(sendProjectChatMessage);

  // Load project & messages
  useEffect(() => {
    getProjectById(projectId).then((p) => {
      if (p) setProject(p);
    });
    setMessages(getLocalProjectMessages(projectId));
    setAiEnabled(getProjectAiEnabled(projectId));
  }, [projectId]);

  // Real-time synchronization across tabs & team events
  useEffect(() => {
    function handleMsgsUpdated(e: any) {
      if (!e.detail?.projectId || e.detail.projectId === projectId) {
        setMessages(getLocalProjectMessages(projectId));
      }
    }
    function handleAiToggled(e: any) {
      if (!e.detail?.projectId || e.detail.projectId === projectId) {
        setAiEnabled(e.detail.enabled);
      }
    }
    function handleStorage() {
      setMessages(getLocalProjectMessages(projectId));
      setAiEnabled(getProjectAiEnabled(projectId));
    }

    window.addEventListener("myaipro_project_msgs_updated", handleMsgsUpdated);
    window.addEventListener("myaipro_project_ai_toggled", handleAiToggled);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("myaipro_project_msgs_updated", handleMsgsUpdated);
      window.removeEventListener("myaipro_project_ai_toggled", handleAiToggled);
      window.removeEventListener("storage", handleStorage);
    };
  }, [projectId]);

  // Scroll on messages
  useEffect(() => {
    if (activeTab === "chats") {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, sending, activeTab]);

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

  // Build sources context string to ground the chatbot
  const sourcesContext = useMemo(() => {
    if (!project?.sources || project.sources.length === 0) return "";
    return project.sources
      .map(
        (s) =>
          `[Source: ${s.type.toUpperCase()}] ${s.title}${
            s.snippet ? `\nContent summary: ${s.snippet.slice(0, 800)}` : ""
          }`,
      )
      .join("\n\n");
  }, [project?.sources]);

  async function handleSendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    if (activeTab !== "chats") {
      setActiveTab("chats");
    }

    setInput("");

    const senderMeta = {
      senderName: currentUserName,
      senderEmail: currentUserEmail,
      senderId: currentUserId,
    };

    // Optimistically add user message immediately
    const userMsg: ProjectChatMessage = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
      ...senderMeta,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      addProjectChatMessage(projectId, "user", text, senderMeta).catch(() => {});
    } catch {
      // non-blocking
    }

    // CRITICAL: If AI is turned OFF, AI is completely NON-RESPONDING!
    // The user and friends can chat without AI interrupting or generating unwanted text.
    if (!aiEnabled) {
      return;
    }

    setSending(true);
    let replyText = "";

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const res = await askServerFn({
        data: {
          projectId,
          projectTitle: project?.title || "Project",
          projectInstructions: project?.instructions,
          sourcesContext,
          userMessage: text,
          conversationHistory: history,
        },
      });

      replyText = res?.reply || "";
    } catch (err: any) {
      // Resilient fallback to /api/chat with project context
      try {
        const guestId = localStorage.getItem("myaipro_guest_id") || "guest-user";
        const promptWithProject = `[Project Context: "${project?.title || "Project"}"]\n${text}`;

        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-guest-id": guestId,
          },
          body: JSON.stringify({
            threadId: `proj-${projectId}`,
            messages: [{ role: "user", content: promptWithProject }],
          }),
        });

        if (chatRes.ok) {
          const chatData = await chatRes.json();
          replyText = chatData.content || chatData.message?.content || "";
        }
      } catch {
        // ignore
      }
    }

    if (!replyText) {
      replyText = `Regarding your message: I've noted this for project "${project?.title || "Project"}". How can I assist further?`;
    }

    try {
      const botMsg = await addProjectChatMessage(projectId, "assistant", replyText, {
        senderName: "My AI Assistant",
      });
      setMessages((prev) => {
        // Prevent duplicate assistant messages
        if (prev.some((m) => m.id === botMsg.id || (m.role === "assistant" && m.content === replyText))) {
          return prev;
        }
        return [...prev, botMsg];
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: replyText,
          senderName: "My AI Assistant",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleVoiceInput() {
    if (listening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setListening(false);
      return;
    }

    preMicInputRef.current = input.trim();
    hasWebSpeechCapturedRef.current = false;
    lastCapturedSpeechRef.current = "";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: false },
          autoGainControl: { ideal: true },
        },
      });

      const SR: any =
        typeof window !== "undefined" &&
        ((window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition);

      if (SR) {
        try {
          const rec = new SR();
          rec.lang = navigator.language || "en-US";
          rec.interimResults = true;
          rec.continuous = true;
          rec.maxAlternatives = 1;
          recognitionRef.current = rec;

          rec.onresult = (evt: any) => {
            let full = "";
            for (let i = 0; i < evt.results.length; i++) {
              const seg = (evt.results[i][0]?.transcript || "").trim();
              if (seg) {
                full = full ? `${full} ${seg}` : seg;
              }
            }
            if (full) {
              hasWebSpeechCapturedRef.current = true;
              lastCapturedSpeechRef.current = full;
              const prefix = preMicInputRef.current;
              setInput(prefix ? `${prefix} ${full}` : full);
            }
          };
          rec.start();
        } catch {
          // ignore
        }
      }

      let mimeType = "";
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
      for (const c of candidates) {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
          mimeType = c;
          break;
        }
      }

      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (
          !hasWebSpeechCapturedRef.current &&
          !lastCapturedSpeechRef.current &&
          chunks.length > 0
        ) {
          const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
          if (blob.size > 300) {
            const reader = new FileReader();
            reader.onload = async () => {
              const dataUrl = reader.result as string;
              try {
                const res = await fetch("/api/transcribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ audioDataUrl: dataUrl }),
                });
                if (res.ok) {
                  const data = await res.json();
                  const cleanText = (data?.transcript || "").trim();
                  if (cleanText) {
                    const prefix = preMicInputRef.current;
                    setInput(prefix ? `${prefix} ${cleanText}` : cleanText);
                    toast.success("Voice transcribed into project chat");
                  }
                }
              } catch {
                // ignore
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      };

      mr.start(250);
      setListening(true);
      toast.info("Listening — Speak your question, tap mic to finish");
    } catch {
      toast.error("Microphone permission required for voice recording.");
      setListening(false);
    }
  }

  function speakText(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Speech synthesis not supported.");
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/```[\s\S]*?```/g, "Code block omitted.")
      .replace(/[*_#`~[\]()]/g, "")
      .slice(0, 500);
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  }

  async function handleRemoveSource(sourceId: string) {
    if (!confirm("Remove this source from the project?")) return;
    await removeSourceFromProject(projectId, sourceId);
    setProject((prev) =>
      prev
        ? { ...prev, sources: (prev.sources || []).filter((s) => s.id !== sourceId) }
        : null,
    );
    toast.success("Source removed");
  }

  function renderSourceIcon(type: ProjectSource["type"]) {
    switch (type) {
      case "drive":
        return <GoogleDriveLogo className="size-6 shrink-0" />;
      case "sheet":
        return <GoogleSheetsLogo className="size-6 shrink-0" />;
      case "gmail":
        return <GmailLogo className="size-6 shrink-0" />;
      default:
        return <Paperclip className="size-5 text-neutral-400 shrink-0" />;
    }
  }

  return (
    <div className="relative flex h-[100dvh] w-full flex-col bg-[#070e20] text-blue-100 font-sans overflow-hidden">
      {/* Ambient Lighting Glow matching AI Chat */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-1/3 size-[420px] rounded-full bg-blue-600/10 blur-[140px]" />
        <div className="absolute bottom-10 right-10 size-[360px] rounded-full bg-indigo-600/10 blur-[140px]" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between px-4 bg-[#081226]/90 backdrop-blur-md border-b border-blue-500/20">
        <button
          onClick={() => navigate({ to: "/projects" })}
          className="flex size-10 items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-200 hover:text-white hover:bg-blue-600/30 transition active:scale-95 cursor-pointer"
          aria-label="Back to projects"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="flex flex-col items-center min-w-0 max-w-[240px]">
          <h1 className="text-base font-semibold text-white truncate w-full text-center">
            {project?.title || "Project"}
          </h1>
          {project?.address && (
            <span className="flex items-center gap-1 text-[10px] text-blue-300/70 truncate max-w-full">
              <MapPin className="size-2.5 text-amber-400 shrink-0" />
              <span className="truncate">{project.address}</span>
            </span>
          )}
        </div>

        {/* Right Three Dots Menu Button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex size-10 items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-200 hover:text-white hover:bg-blue-600/30 transition active:scale-95 cursor-pointer"
            aria-label="Project options"
          >
            <MoreVertical className="size-5" />
          </button>

          {/* Three dots dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-blue-500/30 bg-[#0c1938] p-1.5 shadow-2xl shadow-blue-950 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Turn off / on AI option */}
              <button
                onClick={() => {
                  const nextState = !aiEnabled;
                  setAiEnabled(nextState);
                  setProjectAiEnabled(projectId, nextState);
                  setMenuOpen(false);
                  if (!nextState) {
                    toast.success("AI is now turned OFF. You can chat with your team & friends!");
                  } else {
                    toast.success("AI Assistant turned ON. AI will respond to queries.");
                  }
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {aiEnabled ? (
                    <BotOff className="size-4 text-amber-400" />
                  ) : (
                    <Bot className="size-4 text-emerald-400" />
                  )}
                  <span>{aiEnabled ? "Turn off AI (Team only)" : "Turn on AI Assistant"}</span>
                </div>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                    aiEnabled ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300",
                  )}
                >
                  {aiEnabled ? "ON" : "OFF"}
                </span>
              </button>

              <div className="my-1 border-t border-blue-500/20" />

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShareOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left cursor-pointer"
              >
                <Share2 className="size-4 text-blue-300" />
                <span>Share project</span>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setAddSourceOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left cursor-pointer"
              >
                <Plus className="size-4 text-blue-300" />
                <span>Add sources</span>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setSettingsOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left cursor-pointer"
              >
                <SettingsIcon className="size-4 text-blue-300" />
                <span>Project settings</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Subtabs: Chats vs Sources & AI Status */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2 border-b border-blue-500/20 bg-[#081226]/80 backdrop-blur-md">
        <div className="flex items-center gap-1.5 rounded-full bg-[#0c1938] border border-blue-500/25 p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("chats")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "chats"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                : "text-blue-300/70 hover:text-white"
            }`}
          >
            Chats
          </button>

          <button
            onClick={() => setActiveTab("sources")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "sources"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                : "text-blue-300/70 hover:text-white"
            }`}
          >
            <span>Sources</span>
            {project?.sources && project.sources.length > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-blue-500/30 text-[10px] text-cyan-300 font-medium">
                {project.sources.length}
              </span>
            )}
          </button>
        </div>

        {/* AI Status Pill & Quick Toggle */}
        <button
          onClick={() => {
            const next = !aiEnabled;
            setAiEnabled(next);
            setProjectAiEnabled(projectId, next);
            if (!next) {
              toast.success("AI turned OFF. You are chatting with your team & friends!");
            } else {
              toast.success("AI assistant enabled.");
            }
          }}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold border transition cursor-pointer",
            aiEnabled
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20",
          )}
          title={aiEnabled ? "Click to turn off AI" : "Click to turn on AI"}
        >
          {aiEnabled ? (
            <>
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>AI Active</span>
            </>
          ) : (
            <>
              <BotOff className="size-3 text-amber-400" />
              <span>Team Chat (AI Off)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Tab Content */}
      <main className="relative z-10 flex-1 overflow-y-auto flex flex-col">
        {activeTab === "chats" ? (
          /* CHATS TAB */
          messages.length === 0 ? (
            /* Empty State */
            <div className="my-auto flex flex-col items-center justify-center text-center px-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mb-4 shadow-lg shadow-blue-500/30">
                <MessageSquare className="size-7" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-1.5">No chats yet</h2>
              <p className="text-xs text-blue-200/80">
                {!aiEnabled
                  ? "Chat with your team and friends. AI is currently turned off."
                  : "Start chatting below with project context"}
              </p>
            </div>
          ) : (
            /* Active Chat Feed */
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
              <div className="max-w-2xl mx-auto w-full space-y-4">
                {/* Team Chat Mode Banner when AI is turned off */}
                {!aiEnabled && (
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-center justify-between gap-3 text-xs text-amber-200 shadow-sm animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <BotOff className="size-4 text-amber-400 shrink-0" />
                      <div>
                        <p className="font-semibold text-amber-300">Team Chat Mode Active</p>
                        <p className="text-[11px] text-amber-200/80">
                          AI is turned off. Whatever you chat here is shared with your team and friends without AI responding.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAiEnabled(true);
                        setProjectAiEnabled(projectId, true);
                        toast.success("AI Assistant re-enabled");
                      }}
                      className="shrink-0 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold cursor-pointer transition"
                    >
                      Turn on AI
                    </button>
                  </div>
                )}

                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Sender identity & timestamp */}
                    <div
                      className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] ${
                        m.role === "user" ? "justify-end text-blue-200/70" : "text-cyan-300/80"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <>
                          <Bot className="size-3 text-cyan-400" />
                          <span className="font-semibold text-cyan-300">My AI</span>
                        </>
                      ) : (
                        <>
                          <span className="flex size-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white uppercase shadow-xs">
                            {(m.senderName || m.senderEmail || "U")[0]}
                          </span>
                          <span className="font-medium text-blue-200">
                            {m.senderEmail && m.senderEmail.toLowerCase() === currentUserEmail.toLowerCase()
                              ? "You"
                              : m.senderName || (m.senderEmail ? m.senderEmail.split("@")[0] : "Team Member")}
                          </span>
                        </>
                      )}
                      <span className="text-[10px] text-blue-300/40">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-md shadow-md shadow-blue-500/25"
                          : "bg-[#0c1938] text-blue-100 rounded-tl-md border border-blue-500/30 shadow-md"
                      }`}
                    >
                      {m.role === "user" ? (
                        <p className="whitespace-pre-wrap text-white">{m.content}</p>
                      ) : (
                        <RichMessage content={m.content} variant="dark" />
                      )}
                    </div>

                    {m.role === "assistant" && (
                      <div className="flex items-center gap-2 mt-1.5 pl-2">
                        <button
                          onClick={() => speakText(m.content)}
                          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-blue-300/70 hover:text-white hover:bg-blue-600/20 transition cursor-pointer"
                        >
                          <Volume2 className="size-3" /> Listen
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {sending && (
                  <div className="flex items-center gap-2 text-xs text-blue-300 pl-2">
                    <span className="inline-flex size-2 animate-pulse rounded-full bg-blue-400 shadow-[0_0_8px_#3b82f6]" />
                    <span>My AI is thinking with project context…</span>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          /* SOURCES TAB */
          <div className="flex-1 overflow-y-auto px-4 py-6">
            {!project?.sources || project.sources.length === 0 ? (
              /* Empty Sources State */
              <div className="my-auto flex flex-col items-center justify-center text-center px-4 py-16">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[#0c1938] p-2.5 shadow-md border border-blue-500/30">
                    <SlackLogo className="size-8" />
                  </div>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[#0c1938] p-2.5 shadow-md border border-blue-500/30">
                    <GoogleDriveLogo className="size-8" />
                  </div>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[#0c1938] p-2.5 shadow-md border border-blue-500/30">
                    <Paperclip className="size-7 text-blue-300" />
                  </div>
                </div>

                <h2 className="text-lg font-semibold text-white mb-2">
                  Give My AI more context
                </h2>
                <p className="max-w-xs text-xs text-blue-200/80 leading-relaxed mb-6">
                  Upload Sources to give My AI deeper context about your project.
                </p>

                <button
                  onClick={() => setAddSourceOpen(true)}
                  className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-8 py-2.5 text-xs font-semibold text-white transition shadow-lg shadow-blue-500/30 active:scale-95 cursor-pointer"
                >
                  Add
                </button>
              </div>
            ) : (
              /* Connected Sources List */
              <div className="max-w-2xl mx-auto w-full space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-blue-500/20">
                  <h3 className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                    Connected Sources ({project.sources.length})
                  </h3>
                  <button
                    onClick={() => setAddSourceOpen(true)}
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Source</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {project.sources.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-start justify-between rounded-2xl bg-[#0c1938] p-4 border border-blue-500/25 hover:border-blue-400/50 shadow-md gap-3 group transition"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-1 mt-0.5">{renderSourceIcon(s.type)}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate text-xs font-semibold text-white">
                              {s.title}
                            </h4>
                            <span className="rounded-md bg-blue-500/20 border border-blue-400/30 px-1.5 py-0.5 text-[9px] uppercase font-bold text-blue-300">
                              {s.type}
                            </span>
                          </div>

                          {s.snippet && (
                            <p className="text-[11px] text-blue-200/80 line-clamp-2 mt-1 leading-relaxed">
                              {s.snippet}
                            </p>
                          )}

                          {s.link && (
                            <a
                              href={s.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:underline mt-1"
                            >
                              <span>Open in Google</span>
                              <ExternalLink className="size-2.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveSource(s.id)}
                        className="rounded-lg p-1.5 text-blue-400/60 hover:text-red-400 hover:bg-red-500/10 transition opacity-80 group-hover:opacity-100 cursor-pointer"
                        title="Remove source"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Composer */}
      <footer className="relative z-15 shrink-0 px-4 pb-6 pt-2 bg-gradient-to-t from-[#070e20] via-[#070e20] to-transparent">
        <div className="mx-auto max-w-xl flex items-center gap-2 rounded-full bg-[#0c1938] p-1.5 pl-3 border border-blue-500/30 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition shadow-2xl">
          {/* Plus action button */}
          <button
            type="button"
            onClick={() => setAddSourceOpen(true)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-blue-300 hover:text-white hover:bg-blue-600/20 transition cursor-pointer"
            title="Add Google Drive, Sheets, Gmail or File"
          >
            <Plus className="size-5" />
          </button>

          {/* Textarea/input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            placeholder={
              activeTab === "sources"
                ? "Ask about these sources…"
                : !aiEnabled
                  ? "Chat with your team & friends (AI is turned off)..."
                  : "Type a message or ask My AI with project context..."
            }
            className="flex-1 bg-transparent py-2 px-1 text-sm text-white placeholder:text-blue-300/40 outline-none"
          />

          {/* Mic icon button */}
          <button
            type="button"
            onClick={handleVoiceInput}
            className={`flex size-8 shrink-0 items-center justify-center rounded-full transition cursor-pointer ${
              listening
                ? "bg-red-500 text-white animate-pulse"
                : "text-blue-300 hover:text-white hover:bg-blue-600/20"
            }`}
            title="Voice input"
          >
            <Mic className="size-4" />
          </button>

          {/* Send or Audio assistant button */}
          {input.trim() ? (
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={sending}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-md shadow-blue-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Send message"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (messages.length > 0) {
                  const last = [...messages].reverse().find((m) => m.role === "assistant");
                  if (last) speakText(last.content);
                } else {
                  handleSendMessage("Hello! Can you summarize what we can do in this project?");
                }
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-md shadow-blue-500/25 active:scale-95 cursor-pointer"
              title="Audio assistant"
            >
              <AudioWaveform className="size-4" />
            </button>
          )}
        </div>
      </footer>

      {/* Modals */}
      {addSourceOpen && (
        <AddSourceModal
          projectId={projectId}
          isOpen={addSourceOpen}
          onClose={() => setAddSourceOpen(false)}
          onSourceAdded={(newSrc) => {
            setProject((prev) =>
              prev ? { ...prev, sources: [newSrc, ...(prev.sources || [])] } : null,
            );
          }}
        />
      )}

      {shareOpen && project && (
        <ShareProjectModal
          project={project}
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          onUpdated={() => {
            getProjectById(projectId).then((p) => p && setProject(p));
          }}
        />
      )}

      {settingsOpen && project && (
        <ProjectSettingsModal
          project={project}
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onUpdated={(up) => setProject(up)}
        />
      )}
    </div>
  );
}
