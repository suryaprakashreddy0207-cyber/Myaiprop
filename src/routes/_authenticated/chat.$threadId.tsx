import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getMessages, deleteMessage, saveChatMessage, clearThread } from "@/lib/chat.functions";
import {
  getLocalMessages,
  saveLocalMessages,
  generateThreadTitle,
  type LocalMessage,
} from "@/lib/chat-store";
import { getActiveUserSession, type AppUserSession } from "@/lib/user-session";
import { getMemoryContextPrompt, recordUserMemory } from "@/lib/memory-store";
import { extractTextFromPdfBuffer } from "@/lib/pdf-generator";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/lib/firebase";
import {
  Mic,
  Send,
  Image as ImageIcon,
  Paperclip,
  Volume2,
  StopCircle,
  X,
  Bot,
  Trash2,
  Search,
  Globe,
  Plus,
  Play,
  Film,
  Sparkles,
  Smartphone,
  Camera,
  Wand2,
  Code,
  LogIn,
  User,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RichMessage } from "@/components/rich-message";
import { ChatImageCard } from "@/components/chat-image-card";
import { CameraModal } from "@/components/camera-modal";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ChatThread,
});

type AttachedImage = {
  id: string;
  dataUrl: string;
  mime: string;
  name: string;
};

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  image_url: string | null;
  images?: string[];
  created_at: string;
};

/** Deduplicate messages by ID and content fingerprint so messages never appear double */
function deduplicateMessages(list: Msg[]): Msg[] {
  const result: Msg[] = [];
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();

  for (const m of list) {
    if (!m) continue;
    if (m.id && seenIds.has(m.id)) continue;

    const clean = (m.content || "").trim();
    // Bucket by 90s window to collapse duplicate sends/server echoes
    const timeBucket = Math.floor(new Date(m.created_at || Date.now()).getTime() / 90000);
    const fp = `${m.role}::${clean}::${timeBucket}`;

    if (clean.length > 0 && seenFingerprints.has(fp)) {
      continue;
    }

    if (m.id) seenIds.add(m.id);
    if (clean.length > 0) seenFingerprints.add(fp);
    result.push(m);
  }

  return result.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function ChatThread() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getMsgs = useServerFn(getMessages);
  const delMsgFn = useServerFn(deleteMessage);
  const saveMsgFn = useServerFn(saveChatMessage);

  const { data: initial } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      try {
        return (await getMsgs({ data: { threadId } })) || [];
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const [messages, setMessages] = useState<Msg[]>([]);
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [imageMode, setImageMode] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3">("1:1");
  const [imageStyle, setImageStyle] = useState<string>("Photorealistic");
  const [researchMode, setResearchMode] = useState(false);
  const [attachments, setAttachments] = useState<AttachedImage[]>([]);
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [scratchpadText, setScratchpadText] = useState("");
  const [activeUserSession, setActiveUserSession] = useState<AppUserSession | null>(null);

  useEffect(() => {
    setActiveUserSession(getActiveUserSession());
    try {
      const stored = localStorage.getItem("myaipro_scratchpad") || "";
      setScratchpadText(stored);
    } catch {
      // ignore
    }
    function onAuth() {
      setActiveUserSession(getActiveUserSession());
    }
    window.addEventListener("myaipro_auth_changed", onAuth);
    return () => window.removeEventListener("myaipro_auth_changed", onAuth);
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasWebSpeechCapturedRef = useRef(false);
  const lastCapturedSpeechRef = useRef("");
  const preMicInputRef = useRef("");

  const delMsgMut = useMutation({
    mutationFn: (id: string) => delMsgFn({ data: { id } }),
    onSuccess: (_r, id) => {
      setMessages((m) => {
        const next = m.filter((x) => x.id !== id);
        saveLocalMessages(threadId, next as LocalMessage[]);
        return next;
      });
    },
    onError: (e: any) => toast.error(e.message ?? "Delete failed"),
  });

  const clearFn = useServerFn(clearThread);
  const clearMsgMut = useMutation({
    mutationFn: (tId: string) => clearFn({ data: { id: tId } }),
    onSuccess: () => {
      setMessages([]);
      saveLocalMessages(threadId, []);
      toast.success("Chat cleared");
    },
    onError: () => {
      setMessages([]);
      saveLocalMessages(threadId, []);
      toast.success("Chat cleared");
    },
  });

  // Hydration-safe cache loading after mount
  useEffect(() => {
    setMounted(true);
    const cached = getLocalMessages(threadId);
    if (cached.length > 0) {
      setMessages((current) => {
        const combined = [...(cached as Msg[]), ...current];
        return deduplicateMessages(combined);
      });
    } else {
      setMessages((current) => (current.length > 0 ? deduplicateMessages(current) : []));
    }
  }, [threadId]);

  // When server messages arrive, sync and merge (never drop local messages)
  useEffect(() => {
    if (initial && Array.isArray(initial) && initial.length > 0) {
      setMessages((current) => {
        const combined = [...current, ...(initial as Msg[])];
        const merged = deduplicateMessages(combined);
        saveLocalMessages(threadId, merged as LocalMessage[]);
        return merged;
      });
    }
  }, [initial, threadId]);

  // Listen to external chat clear events
  useEffect(() => {
    function handleCleared(e: any) {
      if (!e.detail || e.detail === threadId) {
        setMessages([]);
        saveLocalMessages(threadId, []);
      }
    }
    window.addEventListener("myaipro_chat_cleared", handleCleared);
    return () => window.removeEventListener("myaipro_chat_cleared", handleCleared);
  }, [threadId]);

  const sendRef = useRef<(prompt: string) => void>(() => {});

  // Listen to external note/action prompt dispatches
  useEffect(() => {
    function handleExternalPrompt(e: any) {
      const p = e.detail;
      if (typeof p === "string" && p.trim()) {
        sendRef.current(p.trim());
      }
    }
    window.addEventListener("myaipro_send_chat_prompt", handleExternalPrompt);
    return () => window.removeEventListener("myaipro_send_chat_prompt", handleExternalPrompt);
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  async function send(
    overrideText?: string,
    options?: {
      isImageEdit?: boolean;
      originalImageUrl?: string;
      aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3";
      imageStyle?: string;
    },
  ) {
    const text = (overrideText ?? input).trim();
    if (!text && attachments.length === 0 && !options?.isImageEdit) return;
    if (sending) return;

    // Allocate real threadId if on "default"
    const effectiveThreadId =
      threadId === "default"
        ? `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        : threadId;

    const currentAttachments = [...attachments];
    const userMsg: Msg = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "user",
      content: options?.isImageEdit
        ? `[Image Edit Request]: ${text}`
        : text,
      image_url: options?.originalImageUrl || currentAttachments[0]?.dataUrl || null,
      images: currentAttachments.length > 0
        ? currentAttachments.map((a) => a.dataUrl)
        : options?.originalImageUrl
          ? [options.originalImageUrl]
          : undefined,
      created_at: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setAttachments([]);
    setSending(true);

    // Generate intelligent thread title from what user started with at first
    const generatedTitle = generateThreadTitle(text);

    // Save to local cache immediately so history never loses it
    saveLocalMessages(effectiveThreadId, nextMessages as LocalMessage[]);

    // Record into long-term cross-session memory store
    recordUserMemory({
      source: "chat",
      userStatement: text,
      threadId: effectiveThreadId,
    });

    // Asynchronously save to server
    saveMsgFn({
      data: {
        id: userMsg.id,
        threadId: effectiveThreadId,
        role: "user",
        content: userMsg.content,
        imageUrl: currentAttachments[0]?.dataUrl || options?.originalImageUrl || null,
        images: userMsg.images,
        threadTitle: generatedTitle,
      },
    }).catch(() => {});

    try {
      let token: string | undefined;
      if (auth.currentUser) {
        try {
          token = await auth.currentUser.getIdToken();
        } catch {
          // ignore
        }
      }
      if (!token) {
        try {
          const { data: sess } = await supabase.auth.getSession();
          token = sess.session?.access_token;
        } catch {
          // ignore
        }
      }
      const guestId =
        localStorage.getItem("myaipro_guest_id") || "guest-user";

      const memoryContext = getMemoryContextPrompt();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-guest-id": guestId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          threadId: effectiveThreadId,
          memoryContext,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
            image_url: m.image_url,
            images: m.images,
          })),
          imageMode,
          isImageEdit: options?.isImageEdit,
          originalImageUrl: options?.originalImageUrl,
          aspectRatio: options?.aspectRatio || (imageMode ? imageAspectRatio : "1:1"),
          imageStyle: options?.imageStyle || (imageMode ? imageStyle : undefined),
          researchMode,
          attachment: currentAttachments[0]
            ? {
                dataUrl: currentAttachments[0].dataUrl,
                mime: currentAttachments[0].mime,
              }
            : null,
          attachments: currentAttachments.map((a) => ({
            dataUrl: a.dataUrl,
            mime: a.mime,
            name: a.name,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Request failed");
      }
      const data = await res.json();
      const content = data.content ?? data.message?.content ?? data.text ?? "";

      // Update memory with assistant's key summary
      if (content) {
        recordUserMemory({
          source: "chat",
          userStatement: text,
          assistantSummary: content.slice(0, 180),
          threadId: effectiveThreadId,
        });
      }
      const imageUrl = data.image_url ?? data.imageUrl ?? data.message?.image_url ?? data.message?.imageUrl ?? null;
      const images: string[] = Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : Array.isArray(data.message?.images) && data.message.images.length > 0
          ? data.message.images
          : imageUrl ? [imageUrl] : [];
      const msgId = data.id ?? data.message?.id ?? `asst-${Date.now()}`;
      const createdAt = data.created_at ?? data.message?.created_at ?? new Date().toISOString();

      const assistantMsg: Msg = {
        id: msgId,
        role: "assistant",
        content,
        image_url: imageUrl || (images[0] || null),
        images: images.length > 0 ? images : undefined,
        created_at: createdAt,
      };

      const finalMessages = [...nextMessages, assistantMsg];
      setMessages(finalMessages);

      // Save to local cache with ending message
      saveLocalMessages(effectiveThreadId, finalMessages as LocalMessage[]);

      // Asynchronously save assistant message to server
      saveMsgFn({
        data: {
          id: assistantMsg.id,
          threadId: effectiveThreadId,
          role: "assistant",
          content,
          imageUrl,
          images: assistantMsg.images,
        },
      }).catch(() => {});

      qc.invalidateQueries({ queryKey: ["threads"] });

      // If user started from /chat/default, update route to real thread ID seamlessly
      if (threadId === "default") {
        navigate({
          to: "/chat/$threadId",
          params: { threadId: effectiveThreadId },
          replace: true,
        });
      }

      return assistantMsg;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send message",
      );
      setMessages((m) => m.filter((x) => x.id !== userMsg.id));
      saveLocalMessages(
        effectiveThreadId,
        messages.filter((x) => x.id !== userMsg.id) as LocalMessage[],
      );
    } finally {
      setSending(false);
      setImageMode(false);
      textareaRef.current?.focus();
    }
  }

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        try {
          const buf = await file.arrayBuffer();
          const extracted = extractTextFromPdfBuffer(buf, file.name);
          setInput((prev) =>
            `${prev ? prev + "\n\n" : ""}[Attached PDF: ${file.name}]\n\`\`\`text\n${extracted.slice(0, 6000)}\n\`\`\`\nPlease edit, analyze, or update this PDF document:`,
          );
          toast.success(`Loaded PDF "${file.name}" for editing/analysis`);
        } catch {
          toast.error(`Could not read ${file.name}`);
        }
        continue;
      }

      if (
        file.type === "text/csv" ||
        file.name.toLowerCase().endsWith(".csv") ||
        file.name.toLowerCase().endsWith(".tsv") ||
        file.name.toLowerCase().endsWith(".txt")
      ) {
        try {
          const text = await file.text();
          setInput((prev) =>
            `${prev ? prev + "\n\n" : ""}[Attached Spreadsheet / File: ${file.name}]\n\`\`\`csv\n${text.slice(0, 8000)}\n\`\`\`\nPlease edit, analyze, or format this spreadsheet:`,
          );
          toast.success(`Loaded Spreadsheet "${file.name}" for editing`);
        } catch {
          toast.error(`Could not read ${file.name}`);
        }
        continue;
      }

      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not a supported image, PDF, or CSV spreadsheet.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            dataUrl: reader.result as string,
            mime: file.type,
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData?.items || []);
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setAttachments((prev) => [
              ...prev,
              {
                id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                dataUrl: reader.result as string,
                mime: file.type,
                name: "pasted-image.png",
              },
            ]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  function handleCameraCapture(dataUrl: string, name: string) {
    setAttachments((prev) => [
      ...prev,
      {
        id: `att-cam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        dataUrl,
        mime: "image/jpeg",
        name: name || "camera-capture.jpg",
      },
    ]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function toggleMic() {
    if (listening) {
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
      setListening(false);
      return;
    }

    preMicInputRef.current = input.trim();
    hasWebSpeechCapturedRef.current = false;
    lastCapturedSpeechRef.current = "";

    // MediaRecorder API capturing audio input and converting via speech-to-text service
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: false },
          autoGainControl: { ideal: true },
        },
      });

      // Start Web Speech API if supported for live instant preview
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

          rec.onerror = () => {
            // Web speech error, MediaRecorder fallback will handle if needed
          };

          rec.start();
        } catch {
          // ignore
        }
      }

      // Browser MediaRecorder API as reliable backup
      let mimeType = "";
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
      for (const c of candidates) {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
          mimeType = c;
          break;
        }
      }

      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        // Only run neural transcribe if Web Speech API didn't capture the speech!
        if (
          !hasWebSpeechCapturedRef.current &&
          !lastCapturedSpeechRef.current &&
          audioChunksRef.current.length > 0
        ) {
          const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
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
                    toast.success("Voice transcribed into chat input");
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
      mediaRecorderRef.current = mr;
      setListening(true);
      toast.info("Recording voice — Speak now, click mic to finish");
    } catch {
      toast.error("Microphone permission required for voice recording.");
      setListening(false);
    }
  }

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Voice output not supported.");
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

  sendRef.current = send;

  return (
    <>
      {/* Live search indicator banner */}
      <div className="flex items-center justify-between border-b border-blue-500/20 bg-[#081226]/90 px-4 py-2 text-xs text-blue-300 backdrop-blur-md">
        <div className="flex items-center gap-1.5 font-medium text-blue-200">
          <Globe className="size-3.5 text-blue-400" />
          <span>Live Google & Wikipedia Grounding Active</span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Clear all messages in this conversation?")) {
                  clearMsgMut.mutate(threadId);
                }
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium text-blue-300/70 hover:bg-red-500/10 hover:text-red-400 transition cursor-pointer"
              title="Clear all messages in this chat"
            >
              <Trash2 className="size-3" />
              <span>Clear chat</span>
            </button>
          )}
          {attachments.length > 0 && (
            <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
              {attachments.length} image{attachments.length > 1 ? "s" : ""} attached
            </span>
          )}
          <span className="text-[11px] text-blue-300/60 font-mono">My AI Pro 1.1</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onPaste={handlePaste}
        className="flex-1 overflow-y-auto px-4 py-6 bg-[#070e20] text-blue-100"
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          {messages.length === 0 && (
            <div className="my-auto py-8 text-center max-w-xl mx-auto">
              <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 mb-4">
                <Sparkles className="size-7" />
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-white">
                My AI Pro
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-blue-200/80 leading-relaxed">
                How can I help you today? Chat freely, ask to write or debug code, attach images for deep visual analysis, or search real-time facts.
              </p>

              {!activeUserSession && (
                <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/10 px-3.5 py-1.5 text-xs text-blue-200 shadow-xs">
                  <span className="inline-flex size-2 rounded-full bg-blue-400 animate-pulse" />
                  <span>Guest session active</span>
                  <span className="text-blue-500/40">•</span>
                  <Link
                    to="/auth"
                    className="font-semibold text-blue-300 underline underline-offset-2 hover:text-white transition"
                  >
                    Sign in to save history
                  </Link>
                </div>
              )}

              {/* Quick starter prompt chips */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                <button
                  type="button"
                  onClick={() => send("Write a TypeScript function to debounce an event handler with proper types and generic arguments")}
                  className="group flex flex-col gap-1 rounded-xl border border-blue-500/25 bg-[#0c1938]/80 p-3 hover:border-blue-400/60 hover:bg-[#12234e] transition shadow-md shadow-blue-950/30 text-xs cursor-pointer"
                >
                  <span className="font-semibold text-blue-300 group-hover:text-white flex items-center gap-1.5">
                    <span>💻</span> Write Code
                  </span>
                  <span className="text-blue-200/70 text-[11px] line-clamp-1">
                    TypeScript debounce helper with generic types
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => send("Write a Python script for a simple REST API using FastAPI with request validation")}
                  className="group flex flex-col gap-1 rounded-xl border border-blue-500/25 bg-[#0c1938]/80 p-3 hover:border-blue-400/60 hover:bg-[#12234e] transition shadow-md shadow-blue-950/30 text-xs cursor-pointer"
                >
                  <span className="font-semibold text-blue-300 group-hover:text-white flex items-center gap-1.5">
                    <span>⚡</span> Python API
                  </span>
                  <span className="text-blue-200/70 text-[11px] line-clamp-1">
                    FastAPI REST backend with validation
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  className="group flex flex-col gap-1 rounded-xl border border-blue-500/25 bg-[#0c1938]/80 p-3 hover:border-blue-400/60 hover:bg-[#12234e] transition shadow-md shadow-blue-950/30 text-xs cursor-pointer"
                >
                  <span className="font-semibold text-blue-300 group-hover:text-white flex items-center gap-1.5">
                    <span>🖼️</span> Analyze Image
                  </span>
                  <span className="text-blue-200/70 text-[11px] line-clamp-1">
                    Upload a photo, screenshot, or diagram to inspect
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => send("Explain how modern transformers work in machine learning with a clear mental model")}
                  className="group flex flex-col gap-1 rounded-xl border border-blue-500/25 bg-[#0c1938]/80 p-3 hover:border-blue-400/60 hover:bg-[#12234e] transition shadow-md shadow-blue-950/30 text-xs cursor-pointer"
                >
                  <span className="font-semibold text-blue-300 group-hover:text-white flex items-center gap-1.5">
                    <span>🧠</span> Explain Concepts
                  </span>
                  <span className="text-blue-200/70 text-[11px] line-clamp-1">
                    How AI transformers and attention work
                  </span>
                </button>
              </div>
            </div>
          )}

          {messages.map((m, mIdx) =>
            m.role === "user" ? (
              <div key={m.id ? `msg-user-${m.id}-${mIdx}` : `msg-user-${mIdx}`} className="group flex flex-col items-end gap-2">
                {/* Single or Multiple Image attachments rendering */}
                {Array.isArray(m.images) && m.images.length > 0 ? (
                  <div className={cn(
                    "grid gap-1.5 max-w-[85%]",
                    m.images.length === 1 ? "grid-cols-1" : m.images.length === 2 ? "grid-cols-2" : "grid-cols-3",
                  )}>
                    {m.images.map((imgUrl, idx) => (
                      <img
                        key={`user-img-${m.id || mIdx}-${idx}`}
                        src={imgUrl}
                        alt={`attachment-${idx}`}
                        className="max-h-48 w-full rounded-xl object-cover shadow-md ring-1 ring-blue-500/30"
                      />
                    ))}
                  </div>
                ) : m.image_url ? (
                  <img
                    src={m.image_url}
                    alt="attachment"
                    className="max-w-[75%] rounded-2xl object-cover shadow-md ring-1 ring-blue-500/30"
                  />
                ) : null}

                {m.content && (
                  <div className="flex max-w-[85%] items-start gap-1">
                    <button
                      onClick={() => delMsgMut.mutate(m.id)}
                      className="mt-1 rounded-md p-1 text-blue-300/40 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
                      aria-label="Delete message"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <div className="rounded-[20px] rounded-tr-md bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-md shadow-blue-500/20">
                      {m.content}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                key={m.id ? `msg-assistant-${m.id}-${mIdx}` : `msg-assistant-${mIdx}`}
                className="group flex w-full flex-col items-start gap-2"
              >
                {/* Single or Multiple Image rendering for assistant */}
                {Array.isArray(m.images) && m.images.length > 0 ? (
                  m.images.length === 1 ? (
                    <ChatImageCard
                      imageUrl={m.images[0]}
                      alt={m.content || "AI Generated Image"}
                      isEditing={sending}
                      onEdit={(editPrompt, origUrl, ratio) =>
                        send(editPrompt, {
                          isImageEdit: true,
                          originalImageUrl: origUrl,
                          aspectRatio: ratio,
                        })
                      }
                    />
                  ) : (
                    <div className={cn(
                      "grid gap-3 w-full max-w-2xl",
                      m.images.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                    )}>
                      {m.images.map((imgUrl, imgIdx) => (
                        <ChatImageCard
                          key={`asst-img-${m.id || mIdx}-${imgIdx}`}
                          imageUrl={imgUrl}
                          alt={`${m.content || "AI Generated Image"} (${imgIdx + 1})`}
                          isEditing={sending}
                          onEdit={(editPrompt, origUrl, ratio) =>
                            send(editPrompt, {
                              isImageEdit: true,
                              originalImageUrl: origUrl,
                              aspectRatio: ratio,
                            })
                          }
                        />
                      ))}
                    </div>
                  )
                ) : m.image_url ? (
                  <ChatImageCard
                    imageUrl={m.image_url}
                    alt={m.content || "AI Generated Image"}
                    isEditing={sending}
                    onEdit={(editPrompt, origUrl, ratio) =>
                      send(editPrompt, {
                        isImageEdit: true,
                        originalImageUrl: origUrl,
                        aspectRatio: ratio,
                      })
                    }
                  />
                ) : null}
                {m.content ? (
                  <div className="max-w-[90%] text-blue-100">
                    <RichMessage content={m.content} />
                  </div>
                ) : null}

                <div className="flex items-center gap-1">
                  {m.content && !m.image_url && (
                    <button
                      onClick={() => speak(m.content)}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-blue-300/70 transition hover:text-white hover:bg-blue-600/20 cursor-pointer"
                    >
                      <Volume2 className="size-3" /> Listen
                    </button>
                  )}
                  <button
                    onClick={() => delMsgMut.mutate(m.id)}
                    className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-blue-300/40 opacity-0 transition group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    aria-label="Delete message"
                  >
                    <Trash2 className="size-3" /> Delete
                  </button>
                </div>
              </div>
            ),
          )}

          {sending && (
            <div className="flex items-center gap-2 text-sm text-blue-300">
              <span className="inline-flex size-2 animate-pulse rounded-full bg-blue-400 shadow-[0_0_8px_#3b82f6]" />
              Thinking with live search & vision…
            </div>
          )}
        </div>
      </div>

      {/* Composer - Classic Midnight Blue Theme */}
      <footer className="border-t border-blue-500/20 bg-[#081226]/95 px-4 pb-6 pt-3 backdrop-blur-xl">
        {/* Attached images carousel/strip */}
        {attachments.length > 0 && (
          <div className="mx-auto mb-3 flex max-w-2xl items-center gap-2 overflow-x-auto rounded-2xl bg-[#0c1938] border border-blue-500/30 p-2 text-xs shadow-md">
            {attachments.map((att) => (
              <div key={att.id} className="relative group shrink-0">
                <img
                  src={att.dataUrl}
                  alt={att.name}
                  className="size-16 rounded-xl object-cover ring-1 ring-blue-500/40"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-red-600 text-white shadow transition hover:scale-110"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <label className="flex size-16 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-500/40 text-blue-300/70 hover:border-blue-400 hover:text-white">
              <Plus className="size-4" />
              <span className="text-[9px] font-medium">Add more</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleAttach}
              />
            </label>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.csv,.tsv,.txt"
          className="hidden"
          onChange={handleAttach}
        />

        {/* Plus Action Popup Menu */}
        {plusMenuOpen && (
          <div className="mx-auto mb-2 flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl bg-[#0c1938] p-2.5 shadow-2xl border border-blue-500/30 animate-in slide-in-from-bottom-2">
            <button
              type="button"
              onClick={() => {
                setPlusMenuOpen(false);
                setCameraOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 hover:text-white transition cursor-pointer"
            >
              <Camera className="size-4" />
              <span>Camera</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPlusMenuOpen(false);
                fileInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-[#070e20] px-3 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-600/20 hover:text-white transition cursor-pointer"
            >
              <Paperclip className="size-4 text-blue-400" />
              <span>Files / Photos</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPlusMenuOpen(false);
                setImageMode((v) => !v);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer",
                imageMode
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                  : "bg-[#070e20] text-blue-200 hover:text-white border border-blue-500/30",
              )}
            >
              <ImageIcon className="size-4" />
              <span>{imageMode ? "Image Mode: ON" : "Image Mode"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPlusMenuOpen(false);
                setInput((prev) =>
                  prev
                    ? `${prev}\n\nWrite a complete production-ready code in TypeScript/Python: `
                    : "Write a complete production-ready code in TypeScript/Python: ",
                );
                textareaRef.current?.focus();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-600/15 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 hover:text-white transition cursor-pointer"
              title="Code Assistant prompt helper"
            >
              <Code className="size-4" />
              <span>Code Assistant</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPlusMenuOpen(false);
                setNotesModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
              title="Open Notes & Scratchpad"
            >
              <StickyNote className="size-4" />
              <span>Notes</span>
            </button>

            <Link
              to="/auth"
              onClick={() => setPlusMenuOpen(false)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
              title="Sign in or register account"
            >
              <LogIn className="size-4" />
              <span>{activeUserSession ? "Account" : "Sign In"}</span>
            </Link>

            <button
              type="button"
              onClick={() => setPlusMenuOpen(false)}
              className="ml-auto rounded-lg p-1.5 text-blue-300/70 hover:bg-blue-600/20 hover:text-white transition cursor-pointer"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Image Mode & Speed Engine Configuration Toolbar */}
        {imageMode && (
          <div className="mx-auto mb-2 flex max-w-2xl flex-col gap-2 rounded-2xl bg-[#0c1938] p-2.5 shadow-md border border-blue-500/30 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-blue-400" />
                Image Creation & Editing Active
              </span>
              <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                ⚡ High Speed Creative Engine
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-blue-500/20">
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-blue-300/70 mr-1">Aspect:</span>
                {(["1:1", "16:9", "9:16", "4:3"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setImageAspectRatio(r)}
                    className={cn(
                      "rounded-lg px-2 py-0.5 font-medium transition text-[10px]",
                      imageAspectRatio === r
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "bg-[#070e20] text-blue-300/70 hover:text-white",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 text-[11px] overflow-x-auto">
                <span className="text-blue-300/70 mr-1">Style:</span>
                {["Photorealistic", "Anime", "Cyberpunk", "3D Render", "Watercolor", "Cinematic"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setImageStyle(st)}
                    className={cn(
                      "rounded-lg px-2 py-0.5 font-medium transition text-[10px] shrink-0",
                      imageStyle === st
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "bg-[#070e20] text-blue-300/70 hover:text-white",
                    )}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-[24px] bg-[#0c1938] border border-blue-500/30 p-2 shadow-inner">
          <button
            type="button"
            onClick={() => setPlusMenuOpen((v) => !v)}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full transition cursor-pointer",
              plusMenuOpen
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                : "text-blue-300/70 hover:text-white hover:bg-blue-600/20",
            )}
            title="Add attachments, take photo with camera, or toggle image mode"
          >
            <Plus className={cn("size-5 transition-transform", plusMenuOpen && "rotate-45")} />
          </button>
          
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-blue-300/70 hover:text-white hover:bg-blue-600/20 transition cursor-pointer"
            title="Take photo with device camera"
          >
            <Camera className="size-4 text-blue-400" />
          </button>

          <button
            type="button"
            onClick={() => setImageMode((v) => !v)}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full transition cursor-pointer",
              imageMode
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                : "text-blue-300/70 hover:text-white hover:bg-blue-600/20",
            )}
            title={
              imageMode ? "Image mode on" : "Generate image with next message"
            }
          >
            <ImageIcon className="size-4" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={
              imageMode
                ? "Describe the image to generate…"
                : attachments.length > 0
                  ? "Ask anything about the attached images / photo…"
                  : "Ask My AI anything (with Google images, live web & vision)…"
            }
            className="flex-1 resize-none border-none bg-transparent px-1 py-2 text-sm outline-none text-white placeholder:text-blue-300/40"
            style={{ maxHeight: 140 }}
          />
          <button
            type="button"
            onClick={toggleMic}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full transition cursor-pointer",
              listening
                ? "bg-red-600 text-white animate-pulse"
                : "text-blue-300/70 hover:text-white hover:bg-blue-600/20",
            )}
            aria-label="Voice input"
          >
            {listening ? (
              <StopCircle className="size-4" />
            ) : (
              <Mic className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => send()}
            disabled={sending || (!input.trim() && attachments.length === 0)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
            aria-label="Send"
          >
            <Send className="size-4" />
          </button>
        </div>
        <div className="mx-auto mt-2 flex max-w-2xl items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setResearchMode((v) => !v)}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest transition cursor-pointer",
                researchMode
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-blue-300/70 hover:text-white hover:bg-blue-600/20",
              )}
              title="Deep web research with sources"
            >
              <Search className="size-3" /> Research
            </button>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-blue-300/60 font-mono">
            {imageMode
              ? "Image Mode"
              : researchMode
                ? "Live Research"
                : "Chat + Live Web & Camera"}
          </p>
        </div>
      </footer>

      {/* Live Camera Viewfinder Modal */}
      <CameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Quick Notes & Scratchpad Modal */}
      {notesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-blue-500/30 bg-[#0c1938] p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
              <div className="flex items-center gap-2 font-semibold text-white">
                <StickyNote className="size-4 text-amber-400" />
                <span>Notes &amp; Scratchpad</span>
              </div>
              <button
                type="button"
                onClick={() => setNotesModalOpen(false)}
                className="rounded-lg p-1.5 text-blue-300 hover:bg-blue-600/20 hover:text-white transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-blue-200/80">
              Jot down thoughts, code snippets, or prompt ideas. Notes are automatically saved locally.
            </p>

            <textarea
              value={scratchpadText}
              onChange={(e) => {
                setScratchpadText(e.target.value);
                try {
                  localStorage.setItem("myaipro_scratchpad", e.target.value);
                } catch {
                  // ignore
                }
              }}
              rows={8}
              placeholder="Type your notes or prompt ideas here..."
              className="w-full rounded-xl border border-blue-500/30 bg-[#070e20] p-3 text-xs text-white placeholder-blue-300/40 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-mono leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="text-[11px] text-blue-300/70">
                {scratchpadText.length} characters
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(scratchpadText);
                    toast.success("Notes copied to clipboard!");
                  }}
                  disabled={!scratchpadText.trim()}
                  className="rounded-lg border border-blue-500/30 bg-blue-600/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600/30 transition disabled:opacity-40 cursor-pointer"
                >
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInput((prev) => (prev ? `${prev}\n\n${scratchpadText}` : scratchpadText));
                    setNotesModalOpen(false);
                    textareaRef.current?.focus();
                    toast.success("Notes inserted into prompt!");
                  }}
                  disabled={!scratchpadText.trim()}
                  className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 transition disabled:opacity-40 cursor-pointer"
                >
                  Insert into Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
