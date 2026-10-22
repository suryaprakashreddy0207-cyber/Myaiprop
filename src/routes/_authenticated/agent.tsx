import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Menu,
  Plus,
  Mic,
  MicOff,
  ArrowUp,
  X,
  Code,
  Copy,
  Check,
  ExternalLink,
  Play,
  Download,
  Share2,
  Smartphone,
  Laptop,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  MessageSquare,
  Mail,
  Send,
  Trash2,
  RefreshCw,
  Folder,
  Monitor,
  Image as ImageIcon,
  Paperclip,
  Database,
  Bot,
  Telescope,
  Film,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { executeCoworkTask, type CoworkResponse, type CoworkAction } from "@/lib/cowork.functions";
import { transcribeAudio } from "@/lib/voice.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({
    meta: [
      { title: "My AI Coworker — Autonomous Device & Code Assistant" },
      { name: "description", content: "Your autonomous coworker running on your mobile or laptop. Writes code, opens apps on your device, and messages your friends or company owner." },
      { property: "og:title", content: "My AI Coworker" },
      { property: "og:description", content: "Autonomous device coworker for messaging, apps, code writing, and device control." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentCoworkPage,
});

type TaskItem = {
  id: string;
  role: "user" | "coworker";
  content: string;
  timestamp: string;
  status: "pending" | "in_progress" | "completed";
  coworkData?: CoworkResponse;
  screenCapture?: string;
  folderSummary?: string;
  attachments?: string[];
};

export function AgentCoworkPage() {
  const coworkFn = useServerFn(executeCoworkTask);
  const transcribeFn = useServerFn(transcribeAudio);

  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [deviceTarget, setDeviceTarget] = useState<"mobile" | "laptop">("mobile");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Screen Sharing State with AI Co-worker
  const [screenSharing, setScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // Live code runner state
  const [previewCode, setPreviewCode] = useState<{ code: string; language: string; title: string } | null>(null);
  const [editingCodeIndex, setEditingCodeIndex] = useState<string | null>(null);
  const [customCodeEdits, setCustomCodeEdits] = useState<Record<string, string>>({});

  // Context attachments
  const [screenCaptureUrl, setScreenCaptureUrl] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [folderContext, setFolderContext] = useState<string | null>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedAudioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (tasks.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [tasks]);

  // Capture frame from active screen sharing video stream
  const captureScreenSnapshot = useCallback((): string | null => {
    if (!screenVideoRef.current) return null;
    try {
      const v = screenVideoRef.current;
      if (v.videoWidth === 0 || v.videoHeight === 0) return null;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(v.videoWidth, 1280);
      canvas.height = Math.min(v.videoHeight, 720);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      setScreenCaptureUrl(dataUrl);
      return dataUrl;
    } catch {
      return null;
    }
  }, []);

  // Stop screen sharing cleanly
  const stopScreenSharing = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    setScreenSharing(false);
    toast.info("Screen sharing ended");
  }, []);

  // Periodic screen capture so AI coworker continuously sees user's screen
  useEffect(() => {
    if (!screenSharing) return;
    const interval = setInterval(() => {
      captureScreenSnapshot();
    }, 4000);
    return () => clearInterval(interval);
  }, [screenSharing, captureScreenSnapshot]);

  const handleSendRef = useRef<(text?: string) => void>(() => {});

  // Guaranteed Dual Microphone Audio Recording Pipeline (MediaRecorder + Web Speech API)
  const stopVoiceListening = useCallback(async () => {
    setListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }

    // If live transcript was empty or speech recognition failed, transcribe via server audio model
    if (!prompt.trim() && recordedAudioChunksRef.current.length > 0) {
      try {
        const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
        const blob = new Blob(recordedAudioChunksRef.current, { type: mime });
        if (blob.size > 500) {
          toast.info("Transcribing voice with My AI Neural Engine...");
          const reader = new FileReader();
          reader.onload = async () => {
            const b64 = reader.result as string;
            try {
              const res = await transcribeFn({
                data: { audioDataUrl: b64 },
              });
              if (res?.transcript && res.transcript.trim()) {
                setPrompt(res.transcript.trim());
                handleSendRef.current(res.transcript.trim());
              }
            } catch {
              // ignore
            }
          };
          reader.readAsDataURL(blob);
        }
      } catch {
        // ignore
      }
    }
  }, [prompt, transcribeFn]);

  const startVoiceListening = useCallback(async () => {
    try {
      recordedAudioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          autoGainControl: { ideal: true },
        },
      });
      audioStreamRef.current = stream;

      // Start MediaRecorder buffer for neural audio transcription
      try {
        let mime = "";
        const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
        for (const c of candidates) {
          if (MediaRecorder.isTypeSupported(c)) {
            mime = c;
            break;
          }
        }
        const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedAudioChunksRef.current.push(e.data);
          }
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      } catch {
        // optional
      }

      setListening(true);
      toast.info("Listening... Speak your instruction to My AI Co-worker");

      // Start Web Speech API for real-time live typing
      if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        try {
          const r = new SR();
          r.continuous = true;
          r.interimResults = true;
          r.lang = "en-US";
          r.onresult = (evt: any) => {
            let fullTranscript = "";
            for (let i = 0; i < evt.results.length; i++) {
              fullTranscript += evt.results[i][0]?.transcript || "";
            }
            if (fullTranscript.trim()) {
              setPrompt(fullTranscript.trim());
            }
          };
          r.onerror = () => {
            // keep listening with MediaRecorder even if Web Speech fails
          };
          recognitionRef.current = r;
          r.start();
        } catch {
          // ignore
        }
      }
    } catch {
      toast.error("Microphone permission required. Please allow microphone access.");
      setListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (listening) {
      stopVoiceListening();
    } else {
      startVoiceListening();
    }
  };

  // Start Screen Sharing with AI Co-worker ("share your screen with my AI co-worker")
  const startScreenSharingWithCoworker = useCallback(async () => {
    setShowPlusMenu(false);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Screen sharing is not supported in this browser.");
      return;
    }
    try {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false,
      });

      screenStreamRef.current = stream;
      setScreenSharing(true);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stopScreenSharing();
      });

      // Take first snapshot immediately
      setTimeout(() => {
        captureScreenSnapshot();
      }, 500);

      // Automatically keep microphone active so AI coworker listens while screen is shared
      if (!listening) {
        startVoiceListening();
      }

      toast.success("Screen Shared! My AI Co-worker is watching your screen and listening.");
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        toast.error("Could not activate screen sharing.");
      }
    }
  }, [stopScreenSharing, captureScreenSnapshot, listening, startVoiceListening]);

  // Text to Speech playback for coworker voice responses
  const speakResponse = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text
        .replace(/```[\s\S]*?```/g, "Code generated.")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[*#_~]/g, "")
        .slice(0, 160);
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // speech synthesis unavailable
    }
  }, []);

  // Launch device apps, WhatsApp, Email, or Web
  const openAppOnDevice = (act: { app?: string; title?: string; appUrl?: string; appScheme?: string }, showToast = true) => {
    const appName = act.app || act.title || "App";
    const targetUrl = deviceTarget === "mobile" && act.appScheme ? act.appScheme : act.appUrl || act.appScheme || "";

    if (!targetUrl) {
      toast.error(`Could not launch ${appName}`);
      return;
    }

    if (showToast) {
      toast.success(`Launching ${appName} on your ${deviceTarget}...`);
    }

    try {
      const a = document.createElement("a");
      a.href = targetUrl;
      if (!targetUrl.startsWith("whatsapp://") && !targetUrl.startsWith("mailto:") && !targetUrl.startsWith("tel:") && !targetUrl.startsWith("sms:")) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  const coworkMutation = useMutation({
    mutationFn: async (text: string) => {
      return coworkFn({
        data: {
          prompt: text,
          context: `Device target: ${deviceTarget}. User requested autonomous action.`,
          hasScreenCapture: Boolean(screenCaptureUrl),
          folderContext: folderContext || undefined,
          fileCount: attachedFiles.length,
        },
      });
    },
    onSuccess: (res) => {
      const coworkerMsg: TaskItem = {
        id: `cowork-${Date.now()}`,
        role: "coworker",
        content: res.summary,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "completed",
        coworkData: res,
      };

      setTasks((prev) => [...prev, coworkerMsg]);
      speakResponse(res.summary);

      // Auto-trigger if there's a direct messaging or app launch intent requested
      const msgAct = res.actions.find((a) => a.type === "messaging");
      if (msgAct?.messagingDetails?.directSendUrl) {
        toast.success(`Prepared ${msgAct.title}. Tap below to send!`, { duration: 4000 });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to execute coworker action");
    },
  });

  const handleSend = (overrideText?: string) => {
    const text = (overrideText ?? prompt).trim();
    if (!text && !screenCaptureUrl && attachedFiles.length === 0 && attachedImages.length === 0) {
      return;
    }

    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setListening(false);
    }

    const userMsg: TaskItem = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "completed",
      screenCapture: screenCaptureUrl || undefined,
      folderSummary: folderName ? `Folder: ${folderName}` : undefined,
      attachments: [
        ...attachedFiles.map((f) => f.name),
        ...attachedImages.map((_, i) => `Image attachment ${i + 1}`),
      ],
    };

    setTasks((prev) => [...prev, userMsg]);
    setPrompt("");
    setScreenCaptureUrl(null);
    setFolderName(null);
    setFolderContext(null);
    setAttachedFiles([]);
    setAttachedImages([]);

    coworkMutation.mutate(text);
  };
  handleSendRef.current = handleSend;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const downloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "code.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}!`);
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-[#000000] text-white font-sans antialiased selection:bg-amber-500 selection:text-black overflow-hidden relative">
      {/* 1. TOP BAR (Matching screenshot exactly) */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 sm:p-5 bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Hamburger Menu Circle Button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex size-11 items-center justify-center rounded-full bg-zinc-900/90 border border-white/10 text-white shadow-lg hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
            title="Menu &amp; Tasks"
            aria-label="Open menu"
          >
            <Menu className="size-5 text-white" />
          </button>

          {/* Glowing My AI Pro Pill Badge */}
          <div className="flex items-center gap-2 rounded-full bg-zinc-900/90 border border-white/10 px-4 py-2 shadow-lg backdrop-blur-md">
            {/* Amber 4-pointed glowing star */}
            <svg
              className="size-4 text-amber-500 fill-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] shrink-0"
              viewBox="0 0 24 24"
            >
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
            <span className="text-sm font-semibold tracking-wide text-white">
              My AI <span className="text-[#f59e0b] font-bold">Pro</span>
            </span>
          </div>
        </div>

        {/* Right side status / Screen Sharing / New Session */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {screenSharing ? (
            <div className="flex items-center gap-2 rounded-full bg-emerald-950/90 border border-emerald-500/50 px-3 py-1.5 shadow-lg">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-300">Screen Active</span>
              <button
                type="button"
                onClick={stopScreenSharing}
                className="text-[10px] bg-red-600/90 hover:bg-red-600 text-white px-2 py-0.5 rounded-full font-bold ml-1 transition cursor-pointer"
                title="Stop sharing screen"
              >
                Stop
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startScreenSharingWithCoworker}
              className="flex items-center gap-1.5 rounded-full bg-zinc-900/90 border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:border-amber-500/50 hover:bg-zinc-800 transition shadow-lg cursor-pointer"
              title="Share your screen with my AI co-worker"
            >
              <Monitor className="size-3.5 text-amber-500" />
              <span className="hidden sm:inline">Share Screen with Coworker</span>
              <span className="sm:hidden">Share Screen</span>
            </button>
          )}

          {tasks.length > 0 && (
            <button
              type="button"
              onClick={() => setTasks([])}
              className="flex items-center gap-1.5 rounded-full bg-zinc-900/80 border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition shadow-md"
              title="Start New Coworker Session"
            >
              <RefreshCw className="size-3.5" />
              <span className="hidden sm:inline">New Session</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const next = deviceTarget === "mobile" ? "laptop" : "mobile";
              setDeviceTarget(next);
              toast.info(`Switched device target to ${next.toUpperCase()}`);
            }}
            className="flex items-center gap-1.5 rounded-full bg-zinc-900/80 border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition"
            title="Switch target device"
          >
            {deviceTarget === "mobile" ? (
              <Smartphone className="size-3.5 text-amber-500" />
            ) : (
              <Laptop className="size-3.5 text-amber-500" />
            )}
            <span className="capitalize">{deviceTarget}</span>
          </button>
        </div>
      </header>

      {/* Floating Live Screen Vision Preview Card */}
      {screenSharing && (
        <div className="fixed top-20 right-4 sm:right-6 z-40 w-72 sm:w-80 rounded-2xl bg-zinc-950/95 border border-emerald-500/50 p-3 shadow-2xl backdrop-blur-md space-y-2 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              <h4 className="text-xs font-bold text-white">Live Screen Shared</h4>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  captureScreenSnapshot();
                  toast.success("Snapshot captured for My AI Co-worker");
                }}
                className="text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 py-0.5 rounded-lg border border-white/10 transition cursor-pointer"
                title="Capture screen frame"
              >
                Snapshot
              </button>
              <button
                type="button"
                onClick={stopScreenSharing}
                className="text-[10px] font-bold bg-red-500/20 hover:bg-red-500/40 text-red-300 px-2 py-0.5 rounded-lg border border-red-500/30 transition cursor-pointer"
              >
                Stop
              </button>
            </div>
          </div>
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-white/10">
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted
              className="size-full object-contain"
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <Mic className="size-3 animate-pulse" /> Listening to your instructions
            </span>
            <span className="text-zinc-500">Live AI Vision</span>
          </div>
        </div>
      )}

      {/* 2. MAIN WORKSPACE / EMPTY STATE (Matching screenshot pixel-for-pixel) */}
      <main className="flex-1 overflow-y-auto px-4 pt-24 pb-32 flex flex-col justify-between">
        {tasks.length === 0 ? (
          /* Empty / Default Greeting View exactly like uploaded screenshot */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-300 my-auto">
            {/* Glowing Amber Star */}
            <div className="relative mb-5 flex items-center justify-center">
              <div className="absolute size-24 rounded-full bg-amber-500/20 blur-2xl animate-pulse" />
              <svg
                className="size-16 text-amber-500 fill-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.85)]"
                viewBox="0 0 24 24"
              >
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>

            {/* Hello! Heading */}
            <h1 className="font-sans text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Hello<span className="text-amber-500">!</span>
            </h1>

            {/* Subtitle matching screenshot */}
            <p className="mt-2 text-sm sm:text-base font-normal text-zinc-400 max-w-sm leading-relaxed">
              I’m your My AI Pro coworker.
              <br />
              How can I help you today?
            </p>

            {/* Quick Action Chips */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-xl">
              {[
                { label: "💬 Message company owner on WhatsApp", prompt: "Open WhatsApp and start messaging company owner: 'Hello, the project task has been successfully completed.'" },
                { label: "💻 Start writing code for React App", prompt: "Open this and start writing the code for a modern real-time task manager app in React and Tailwind CSS." },
                { label: "🎵 Open Spotify on device", prompt: "Open Spotify and play coding focus music." },
                { label: "✉️ Draft email to friends/team", prompt: "Open email and message my friends: 'Hey everyone, let's meet at 6 PM for the sync.'" },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(chip.prompt)}
                  className="rounded-full bg-zinc-900/90 border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:border-amber-500/50 hover:bg-zinc-800 transition active:scale-95 text-left"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Conversational Task Thread */
          <div className="mx-auto w-full max-w-3xl space-y-6 pt-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "space-y-3 animate-in fade-in duration-200",
                  task.role === "user" ? "ml-auto max-w-[85%]" : "mr-auto w-full",
                )}
              >
                {task.role === "user" ? (
                  /* User Prompt Card */
                  <div className="rounded-3xl bg-zinc-900 border border-white/10 px-5 py-3.5 text-white shadow-lg text-sm sm:text-base leading-relaxed">
                    <p className="whitespace-pre-wrap">{task.content}</p>
                    {task.attachments && task.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {task.attachments.map((a, i) => (
                          <span key={i} className="text-[11px] bg-black/40 px-2 py-0.5 rounded text-zinc-400">
                            📎 {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Coworker Response Card */
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-500">
                        <Sparkles className="size-3.5" />
                      </div>
                      <span className="text-xs font-bold tracking-wide text-zinc-300">
                        My AI Pro Coworker
                      </span>
                      <span className="text-[11px] text-zinc-500">• {task.timestamp}</span>
                    </div>

                    {/* Summary Text */}
                    <div className="rounded-3xl bg-zinc-950 border border-white/10 p-5 text-white text-sm sm:text-base leading-relaxed shadow-xl font-normal">
                      <ReactMarkdown
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "");
                            return match ? (
                              <pre className="my-3 overflow-x-auto rounded-2xl bg-black p-4 text-xs font-mono text-amber-400 border border-white/10">
                                <code>{children}</code>
                              </pre>
                            ) : (
                              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs text-amber-300" {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {task.content}
                      </ReactMarkdown>

                      {/* Interactive Actions Grid */}
                      {task.coworkData?.actions && task.coworkData.actions.length > 0 && (
                        <div className="mt-5 space-y-3 pt-4 border-t border-white/10">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                            Autonomous Device Actions Ready:
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {task.coworkData.actions.map((act, aIdx) => {
                              // Direct Messaging Card (WhatsApp / Email to Friends or Owner)
                              if (act.type === "messaging" && act.messagingDetails) {
                                const details = act.messagingDetails;
                                return (
                                  <div
                                    key={aIdx}
                                    className="col-span-1 sm:col-span-2 rounded-2xl bg-zinc-900 border border-emerald-500/40 p-4 space-y-3 shadow-md"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="size-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                                          <MessageSquare className="size-4" />
                                        </div>
                                        <div>
                                          <h4 className="text-xs font-bold text-white">
                                            {act.title}
                                          </h4>
                                          <p className="text-[11px] text-zinc-400">
                                            Recipient: <span className="font-semibold text-emerald-400">{details.recipient || "Friends/Owner"}</span>
                                          </p>
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        {details.platform.toUpperCase()}
                                      </span>
                                    </div>

                                    {/* Prefilled message body */}
                                    <div className="rounded-xl bg-black/60 border border-white/10 p-3 text-xs text-zinc-300 font-sans">
                                      "{details.messageText}"
                                    </div>

                                    {/* Direct 1-Tap Send Trigger */}
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openAppOnDevice({ app: act.app, appUrl: details.directSendUrl, appScheme: details.schemeUrl })}
                                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-md cursor-pointer"
                                      >
                                        <Send className="size-3.5" />
                                        <span>Open in WhatsApp &amp; Send</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(details.messageText);
                                          toast.success("Message text copied!");
                                        }}
                                        className="rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
                                        title="Copy message text"
                                      >
                                        <Copy className="size-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              // Live Code Execution Card
                              if (act.type === "code_execution" && act.codeSnippet) {
                                const snippet = act.codeSnippet;
                                const activeCode = customCodeEdits[task.id] ?? snippet.code;
                                return (
                                  <div
                                    key={aIdx}
                                    className="col-span-1 sm:col-span-2 rounded-2xl bg-zinc-900 border border-amber-500/30 p-4 space-y-3 shadow-md"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="size-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                                          <Code className="size-4" />
                                        </div>
                                        <div>
                                          <h4 className="text-xs font-bold text-white">{act.title}</h4>
                                          <p className="text-[11px] font-mono text-zinc-400">{snippet.filename}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => copyCode(activeCode, task.id)}
                                          className="flex items-center gap-1 rounded-lg bg-zinc-800 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white transition"
                                        >
                                          {copiedCodeId === task.id ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                                          <span>{copiedCodeId === task.id ? "Copied" : "Copy"}</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => downloadCode(activeCode, snippet.filename)}
                                          className="flex items-center gap-1 rounded-lg bg-zinc-800 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white transition"
                                        >
                                          <Download className="size-3" />
                                          <span>Download</span>
                                        </button>

                                        <Link
                                          to="/build"
                                          className="flex items-center gap-1 rounded-lg bg-zinc-800 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-zinc-700 transition"
                                          title="Open in No-Code Visual Builder"
                                        >
                                          <Code className="size-3" />
                                          <span>Visual Builder</span>
                                        </Link>

                                        <button
                                          type="button"
                                          onClick={() => setPreviewCode({ code: activeCode, language: snippet.language, title: snippet.filename })}
                                          className="flex items-center gap-1 rounded-lg bg-amber-500 text-black px-3 py-1 text-[11px] font-bold hover:bg-amber-400 transition shadow-xs cursor-pointer"
                                        >
                                          <Play className="size-3 fill-black" />
                                          <span>Run Live</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Code Editor Area */}
                                    <div className="relative rounded-xl bg-black border border-white/10 overflow-hidden">
                                      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-950 border-b border-white/10 text-[11px] text-zinc-400">
                                        <span className="font-mono">{snippet.language}</span>
                                        <button
                                          type="button"
                                          onClick={() => setEditingCodeIndex(editingCodeIndex === task.id ? null : task.id)}
                                          className="text-amber-400 hover:underline cursor-pointer"
                                        >
                                          {editingCodeIndex === task.id ? "Done Editing" : "Edit Code"}
                                        </button>
                                      </div>

                                      {editingCodeIndex === task.id ? (
                                        <textarea
                                          value={activeCode}
                                          onChange={(e) => setCustomCodeEdits({ ...customCodeEdits, [task.id]: e.target.value })}
                                          rows={10}
                                          className="w-full bg-black p-3 font-mono text-xs text-amber-300 outline-none resize-y"
                                        />
                                      ) : (
                                        <pre className="p-3 text-xs font-mono text-zinc-300 overflow-x-auto max-h-56 leading-relaxed">
                                          <code>{activeCode}</code>
                                        </pre>
                                      )}
                                    </div>
                                  </div>
                                );
                              }

                              // Follow-up Questions / Interactive Suggestions Card
                              if (act.type === "suggestion" || (act.suggestions && act.suggestions.length > 0)) {
                                return (
                                  <div
                                    key={aIdx}
                                    className="col-span-1 sm:col-span-2 rounded-2xl bg-zinc-900 border border-amber-500/30 p-4 space-y-3 shadow-md"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="size-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                                        <Sparkles className="size-4" />
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-bold text-white">{act.title || "Next Steps & Suggestions"}</h4>
                                        <p className="text-[11px] text-zinc-400">{act.description}</p>
                                      </div>
                                    </div>
                                    {act.suggestions && (
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        {act.suggestions.map((sug, sIdx) => (
                                          <button
                                            key={sIdx}
                                            type="button"
                                            onClick={() => handleSend(sug)}
                                            className="rounded-full bg-zinc-800 hover:bg-amber-500 hover:text-black border border-white/10 px-3.5 py-1.5 text-xs text-zinc-200 font-medium transition cursor-pointer text-left active:scale-95 shadow-xs"
                                          >
                                            💬 {sug}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              // App Launcher / Device Action Card
                              return (
                                <div
                                  key={aIdx}
                                  className="rounded-2xl bg-zinc-900 border border-white/10 p-3.5 flex flex-col justify-between gap-3 shadow-md hover:border-amber-500/40 transition"
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-xs font-bold text-white">{act.title}</h4>
                                      {act.app && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                                          {act.app}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-zinc-400 mt-1">{act.description}</p>
                                  </div>

                                  {(act.appUrl || act.appScheme || act.mapUrl) && (
                                    <button
                                      type="button"
                                      onClick={() => openAppOnDevice({ app: act.app, appUrl: act.appUrl || act.mapUrl, appScheme: act.appScheme })}
                                      className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-black border border-white/10 py-2 text-xs font-semibold text-zinc-200 transition cursor-pointer"
                                    >
                                      <ExternalLink className="size-3.5" />
                                      <span>Launch on {deviceTarget}</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {coworkMutation.isPending && (
              <div className="flex items-center gap-3 rounded-2xl bg-zinc-900/90 border border-white/10 p-4 animate-pulse">
                <div className="size-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles className="size-4 animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">My AI Pro Coworker is executing…</p>
                  <p className="text-[11px] text-zinc-400">Opening apps, writing code, and orchestrating device actions.</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* 3. FLOATING BOTTOM COMPOSER (Matching screenshot pixel-for-pixel) */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 p-4 sm:p-5 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          {/* Plus (+) Circle Button */}
          <button
            type="button"
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className="flex size-12 items-center justify-center rounded-full bg-zinc-900/90 border border-white/10 text-white shadow-xl hover:bg-zinc-800 transition active:scale-95 shrink-0 cursor-pointer"
            title="Attach file, screenshot or tools"
            aria-label="Add context"
          >
            <Plus className="size-5 text-white" />
          </button>

          {/* Main Dark Rounded Pill Container */}
          <div className="flex-1 flex items-center gap-3 rounded-full bg-zinc-900/90 border border-white/10 px-5 py-3 shadow-2xl backdrop-blur-xl">
            {/* Input Field */}
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask My AI Pro..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none font-sans"
            />

            {/* Voice Microphone Icon */}
            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition active:scale-95 cursor-pointer shrink-0",
                listening
                  ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                  : "text-zinc-400 hover:text-white",
              )}
              title={listening ? "Stop listening" : "Speak to My AI Pro Coworker"}
              aria-label="Microphone"
            >
              {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>

            {/* Vibrant Orange Circular Send Button */}
            <button
              type="button"
              disabled={!prompt.trim() && !screenCaptureUrl && attachedFiles.length === 0}
              onClick={() => handleSend()}
              className="flex size-10 items-center justify-center rounded-full bg-[#f97316] text-white shadow-lg hover:bg-[#ea580c] transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
              title="Send to My AI Pro"
              aria-label="Send"
            >
              <ArrowUp className="size-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </footer>

      {/* Popover Menu for + Button */}
      {showPlusMenu && (
        <div className="fixed bottom-24 left-6 sm:left-1/4 z-40 w-72 rounded-2xl bg-zinc-900 border border-white/15 p-2 shadow-2xl backdrop-blur-xl space-y-1 animate-in fade-in slide-in-from-bottom-2 text-left">
          {/* 1. Share your screen with my AI co-worker */}
          <button
            type="button"
            onClick={startScreenSharingWithCoworker}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl transition cursor-pointer"
          >
            <Monitor className="size-4 text-amber-400 shrink-0" />
            <span className="truncate">Share your screen with my AI co-worker</span>
          </button>

          {/* 2. Open App & Start Writing Code */}
          <button
            type="button"
            onClick={() => {
              setShowPlusMenu(false);
              handleSend("Open app and start writing the code");
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <Code className="size-4 text-amber-400 shrink-0" />
            <span>Open App &amp; Start Writing Code</span>
          </button>

          {/* 3. Make Some Browser */}
          <button
            type="button"
            onClick={() => {
              setShowPlusMenu(false);
              handleSend("Make some browser with modern tabs, bookmarks, and search bar");
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <ExternalLink className="size-4 text-sky-400 shrink-0" />
            <span>Make Web Browser</span>
          </button>

          {/* 4. Open Spotify & Play Music */}
          <button
            type="button"
            onClick={() => {
              setShowPlusMenu(false);
              handleSend("Open Spotify and play coding music");
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <Play className="size-4 text-emerald-400 shrink-0" />
            <span>Open Spotify &amp; Play Music</span>
          </button>

          {/* 5. Message Company Owner */}
          <button
            type="button"
            onClick={() => {
              setShowPlusMenu(false);
              handleSend("Open WhatsApp and start messaging my company owner");
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <MessageSquare className="size-4 text-emerald-400 shrink-0" />
            <span>Message Company Owner</span>
          </button>

          {/* 6. Upload Screenshot / Image */}
          <button
            type="button"
            onClick={() => {
              setShowPlusMenu(false);
              imageInputRef.current?.click();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <ImageIcon className="size-4 text-blue-400 shrink-0" />
            <span>Upload Screenshot / Image</span>
          </button>

          {/* 7. Attach File */}
          <button
            type="button"
            onClick={() => {
              setShowPlusMenu(false);
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <Paperclip className="size-4 text-purple-400 shrink-0" />
            <span>Attach File</span>
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          files.forEach((f) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) {
                setAttachedImages((p) => [...p, String(ev.target?.result)]);
                toast.success(`Attached ${f.name}`);
              }
            };
            reader.readAsDataURL(f);
          });
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          files.forEach((f) => {
            setAttachedFiles((p) => [...p, { name: f.name, type: f.type }]);
            toast.success(`Attached ${f.name}`);
          });
        }}
      />

      {/* Live Code Runner Modal */}
      {previewCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="flex h-[82vh] w-full max-w-4xl flex-col rounded-3xl border border-white/15 bg-zinc-950 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Code className="size-4 text-amber-500" />
                <h3 className="text-sm font-bold text-white">Live Runner: {previewCode.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCode(null)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 bg-white p-3 overflow-auto">
              <iframe
                title="Code Sandbox Runner"
                srcDoc={
                  previewCode.code.includes("<html")
                    ? previewCode.code
                    : `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body style="font-family:sans-serif;padding:24px;background:#f8fafc;"><h2 style="font-size:18px;font-weight:bold;margin-bottom:12px;">App Output: ${previewCode.title}</h2><div id="root"></div><pre id="log" style="background:#0f172a;color:#38bdf8;padding:16px;border-radius:12px;font-size:12px;overflow:auto;"></pre><script>try { ${previewCode.code} } catch(e) { document.getElementById('log').innerText = e.message; }</script></body></html>`
                }
                className="size-full border-0 rounded-xl"
                sandbox="allow-scripts allow-modals"
              />
            </div>
          </div>
        </div>
      )}

      {/* Side Drawer Menu (Opened by top-left Hamburger button) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-72 sm:w-80 h-full bg-zinc-950 border-r border-white/10 p-5 flex flex-col justify-between z-10 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <svg
                    className="size-5 text-amber-500 fill-amber-500"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
                  </svg>
                  <span className="font-bold text-base text-white">
                    My AI <span className="text-amber-500">Pro</span> Coworker
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Quick Actions
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setTasks([]);
                    toast.success("Started fresh session");
                  }}
                  className="w-full flex items-center gap-2.5 rounded-xl bg-zinc-900 border border-white/10 px-3 py-2.5 text-xs font-semibold text-white hover:bg-zinc-800 transition cursor-pointer"
                >
                  <RefreshCw className="size-3.5 text-amber-500" />
                  <span>New Coworker Session</span>
                </button>
              </div>

              {/* Workspace Sections */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Workspace Sections
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { to: "/projects", label: "Sheets and Data", icon: Database },
                    { to: "/agent", label: "Automation Agent", icon: Sparkles },
                    { to: "/cowork", label: "My AI Co-worker", icon: Bot },
                    { to: "/chat", label: "AI Chat", icon: MessageSquare },
                    { to: "/voice", label: "Voice Assistant", icon: Mic },
                    { to: "/build", label: "No-Code Platform", icon: Code },
                    { to: "/research", label: "Deep Research", icon: Telescope },
                    { to: "/presentations", label: "Slide Presentations", icon: Monitor },
                    { to: "/video", label: "Video Studio", icon: Film },
                  ].map((sec) => (
                    <Link
                      key={sec.to}
                      to={sec.to}
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
                    >
                      <sec.icon className="size-4 text-amber-500" />
                      <span>{sec.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Target Device */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Target Device
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeviceTarget("mobile")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition",
                      deviceTarget === "mobile"
                        ? "bg-amber-500/20 border-amber-500 text-amber-400"
                        : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white",
                    )}
                  >
                    <Smartphone className="size-3.5" />
                    <span>Mobile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeviceTarget("laptop")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition",
                      deviceTarget === "laptop"
                        ? "bg-amber-500/20 border-amber-500 text-amber-400"
                        : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white",
                    )}
                  >
                    <Laptop className="size-3.5" />
                    <span>Laptop</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-center">
              <p className="text-[11px] text-zinc-500">My AI Pro • Autonomous Coworker</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
