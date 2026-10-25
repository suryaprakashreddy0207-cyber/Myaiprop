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
  Palette,
  Brush,
  Edit3,
  Sliders,
  Wand2,
  Paintbrush,
  FileText,
  Maximize2,
  Minimize2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { executeCoworkTask, type CoworkResponse, type CoworkAction } from "@/lib/cowork.functions";
import { transcribeAudio } from "@/lib/voice.functions";
import { cn } from "@/lib/utils";
import { getActiveUserStorageKey } from "@/lib/user-session";

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

function AgentPaintingCard({
  act,
  onRepaint,
  onOpenPaint,
}: {
  act: CoworkAction;
  onRepaint: (prompt: string) => void;
  onOpenPaint: () => void;
}) {
  const details = act.paintingDetails;
  const [brushColor, setBrushColor] = useState(details?.palette[1] || "#38bdf8");
  const [brushSize, setBrushSize] = useState(8);
  const [brushMode, setBrushMode] = useState<"view" | "draw">("view");
  const [activeFilter, setActiveFilter] = useState<"none" | "oil" | "neon" | "watercolor" | "noir">("none");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!details) return null;

  const clearStrokes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    toast.success("Brush strokes cleared");
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (brushMode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || brushMode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const downloadArtwork = () => {
    const svgBlob = new Blob([details.svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${details.title.toLowerCase().replace(/\s+/g, "_")}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded "${details.title}"!`);
  };

  const filterStyle =
    activeFilter === "oil"
      ? "contrast(120%) saturate(140%) brightness(105%)"
      : activeFilter === "neon"
      ? "drop-shadow(0 0 16px rgba(56,189,248,0.7)) contrast(130%)"
      : activeFilter === "watercolor"
      ? "blur(0.5px) contrast(95%) brightness(108%)"
      : activeFilter === "noir"
      ? "grayscale(100%) contrast(160%)"
      : "none";

  return (
    <div className="col-span-1 sm:col-span-2 rounded-3xl bg-zinc-950 border border-amber-500/40 p-4 sm:p-5 space-y-4 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold">
            <Palette className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{details.title}</h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {details.artStyle}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Autonomous Fine Art by My AI Pro AGI Core</p>
          </div>
        </div>

        {/* Color Palette Swatches */}
        <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-xl border border-white/10">
          <span className="text-[10px] text-zinc-400 font-medium px-1">Palette:</span>
          {details.palette.map((color, cIdx) => (
            <button
              key={cIdx}
              type="button"
              onClick={() => {
                setBrushColor(color);
                setBrushMode("draw");
                toast.info(`Selected color ${color}`);
              }}
              style={{ backgroundColor: color }}
              className={cn(
                "size-5 rounded-md border border-white/30 transition hover:scale-110 cursor-pointer",
                brushColor === color && brushMode === "draw" && "ring-2 ring-white ring-offset-1 ring-offset-black",
              )}
              title={`Use ${color}`}
            />
          ))}
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-inner flex items-center justify-center select-none">
        {/* SVG Artwork Background */}
        <div
          style={{ filter: filterStyle }}
          className="size-full flex items-center justify-center transition-all duration-300 pointer-events-none"
          dangerouslySetInnerHTML={{ __html: details.svgContent }}
        />

        {/* Live Interactive Drawing Layer */}
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={cn(
            "absolute inset-0 size-full touch-none",
            brushMode === "draw" ? "cursor-crosshair z-20 pointer-events-auto" : "pointer-events-none z-10",
          )}
        />

        {/* Draw Mode Active Indicator */}
        {brushMode === "draw" && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 rounded-full bg-black/85 border border-amber-500/50 px-3 py-1 text-[11px] font-semibold text-amber-300 backdrop-blur-md">
            <span className="size-2 rounded-full animate-ping" style={{ backgroundColor: brushColor }} />
            <span>Brush Mode: Click &amp; drag to paint strokes</span>
          </div>
        )}
      </div>

      {/* Studio Toolbar & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left: Brush & Tool Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBrushMode(brushMode === "draw" ? "view" : "draw")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition cursor-pointer",
              brushMode === "draw"
                ? "bg-amber-500 text-black border-amber-400 font-bold"
                : "bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800",
            )}
          >
            <Brush className="size-3.5" />
            <span>{brushMode === "draw" ? "Exit Brush Mode" : "Paint on Canvas"}</span>
          </button>

          {brushMode === "draw" && (
            <>
              {/* Brush Size */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-xl px-2 py-1">
                <span className="text-[10px] text-zinc-400">Size:</span>
                {[3, 8, 16, 28].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBrushSize(s)}
                    className={cn(
                      "size-5 rounded text-[10px] font-bold flex items-center justify-center transition cursor-pointer",
                      brushSize === s ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Custom Color Picker */}
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="size-7 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                title="Pick Custom Color"
              />

              <button
                type="button"
                onClick={clearStrokes}
                className="text-[11px] text-zinc-400 hover:text-red-400 transition px-2 py-1 cursor-pointer"
                title="Clear brush strokes"
              >
                Clear
              </button>
            </>
          )}

          {/* Artistic Filters */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-xl px-2 py-1">
            <span className="text-[10px] text-zinc-400">Filter:</span>
            {[
              { id: "none", label: "Pure" },
              { id: "oil", label: "Oil" },
              { id: "neon", label: "Neon" },
              { id: "watercolor", label: "Water" },
              { id: "noir", label: "Noir" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as any)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer",
                  activeFilter === f.id ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadArtwork}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition cursor-pointer"
          >
            <Download className="size-3.5" />
            <span>Download SVG</span>
          </button>

          <button
            type="button"
            onClick={onOpenPaint}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-amber-500 hover:text-black border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition cursor-pointer"
            title="Open Paint Studio"
          >
            <ExternalLink className="size-3.5" />
            <span>Open Paint App</span>
          </button>

          <button
            type="button"
            onClick={() => onRepaint(`Repaint "${details.title}" with dramatic golden hour lighting, oil canvas brushwork, and vivid reflections.`)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 text-black hover:bg-amber-400 px-3.5 py-1.5 text-xs font-bold transition shadow-md cursor-pointer"
          >
            <Sparkles className="size-3.5" />
            <span>Repaint with AGI</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AgentEditingCard({
  act,
  onApply,
  onRunLive,
  onRevise,
}: {
  act: CoworkAction;
  onApply: (content: string) => void;
  onRunLive?: (content: string) => void;
  onRevise: (prompt: string) => void;
}) {
  const details = act.editingDetails;
  const [activeTab, setActiveTab] = useState<"edited" | "original" | "diff">("edited");
  const [liveEditContent, setLiveEditContent] = useState(details?.editedContent || "");

  if (!details) return null;
  const isCode = details.targetType === "code";

  return (
    <div className="col-span-1 sm:col-span-2 rounded-3xl bg-zinc-950 border border-blue-500/40 p-4 sm:p-5 space-y-4 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold">
            <Edit3 className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{act.title}</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                {details.targetType}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">{details.changeSummary}</p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab("edited")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer",
              activeTab === "edited" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white",
            )}
          >
            AGI Edited
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("original")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer",
              activeTab === "original" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white",
            )}
          >
            Original
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("diff")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer",
              activeTab === "diff" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white",
            )}
          >
            Highlights
          </button>
        </div>
      </div>

      {/* Diff Highlights Pills */}
      {details.diffHighlights && details.diffHighlights.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {details.diffHighlights.map((h, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-blue-950/80 border border-blue-500/30 px-2.5 py-0.5 text-[11px] font-medium text-blue-300"
            >
              <Check className="size-3 text-emerald-400" />
              <span>{h}</span>
            </span>
          ))}
        </div>
      )}

      {/* Editor Content Area */}
      <div className="rounded-2xl bg-black border border-white/10 overflow-hidden">
        {activeTab === "edited" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/80 border-b border-white/10 text-[11px] text-zinc-400">
              <span className="font-mono text-blue-400">Live Editable Version</span>
              <span className="text-[10px] text-zinc-500">Edit directly below</span>
            </div>
            <textarea
              value={liveEditContent}
              onChange={(e) => setLiveEditContent(e.target.value)}
              rows={isCode ? 10 : 6}
              className="w-full bg-transparent p-3 font-mono text-xs text-blue-200 outline-none resize-y leading-relaxed"
            />
          </div>
        )}

        {activeTab === "original" && (
          <div className="space-y-1">
            <div className="px-3 py-1.5 bg-zinc-900/80 border-b border-white/10 text-[11px] text-zinc-400">
              <span>Original Before Edit</span>
            </div>
            <pre className="p-3 text-xs font-mono text-zinc-400 overflow-x-auto max-h-56 leading-relaxed">
              <code>{details.originalContent}</code>
            </pre>
          </div>
        )}

        {activeTab === "diff" && (
          <div className="p-4 space-y-3 text-xs">
            <div className="rounded-xl bg-red-950/30 border border-red-500/30 p-3">
              <p className="text-[11px] font-bold text-red-400 mb-1">- Previous Version:</p>
              <pre className="text-zinc-400 font-mono text-xs overflow-x-auto line-clamp-4">
                {details.originalContent}
              </pre>
            </div>
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-3">
              <p className="text-[11px] font-bold text-emerald-400 mb-1">+ AGI Enhanced Version:</p>
              <pre className="text-emerald-200 font-mono text-xs overflow-x-auto line-clamp-4">
                {liveEditContent}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onApply(liveEditContent);
              navigator.clipboard.writeText(liveEditContent);
              toast.success("Accepted & applied edited version!");
            }}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-md cursor-pointer"
          >
            <Check className="size-3.5" />
            <span>Accept &amp; Apply</span>
          </button>

          {isCode && onRunLive && (
            <button
              type="button"
              onClick={() => onRunLive(liveEditContent)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Play className="size-3.5 fill-black" />
              <span>Run Live</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(liveEditContent);
              toast.success("Copied to clipboard!");
            }}
            className="flex items-center gap-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition cursor-pointer"
          >
            <Copy className="size-3" />
            <span>Copy</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onRevise(`Further improve this: ${details.changeSummary}`)}
          className="flex items-center gap-1 rounded-xl bg-zinc-900 hover:bg-blue-600 hover:text-white border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition cursor-pointer"
        >
          <Sparkles className="size-3 text-blue-400" />
          <span>Revise with AGI</span>
        </button>
      </div>
    </div>
  );
}

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

  // Active launched app for in-app App Window / Runner
  const [activeLaunchedApp, setActiveLaunchedApp] = useState<{
    app?: string;
    title?: string;
    appUrl?: string;
    appScheme?: string;
    isEmbeddedOpen?: boolean;
  } | null>(null);

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

  // Ref to track latest generated code for follow-up fixes ("fix this", "debug this")
  const latestCodeRef = useRef<string | null>(null);
  const latestCodeFilenameRef = useRef<string | null>(null);

  // Automatically attach screen sharing stream to screenVideoRef whenever screen sharing state updates
  useEffect(() => {
    if (screenSharing && screenStreamRef.current && screenVideoRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current;
    }
  }, [screenSharing]);

  // Package code and seamlessly open in No-Code Visual Builder
  const handleOpenInBuilder = useCallback((code: string, filename: string, title?: string) => {
    const projId = `proj-${Date.now()}`;
    const appName = title || (filename ? filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") : "Generated Application");
    const isHtml = filename?.endsWith(".html") || code.includes("<!DOCTYPE") || code.includes("<html");
    const previewHtml = isHtml
      ? code
      : `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-zinc-950 text-white p-6 font-sans"><div id="root">${code}</div></body></html>`;

    const newProj = {
      id: projId,
      name: appName,
      description: `Created in My AI Agent: ${filename}`,
      preview_html: previewHtml,
      files: [
        { path: filename || "src/App.tsx", language: filename?.endsWith(".html") ? "html" : "typescript", content: code },
        { path: "index.html", language: "html", content: previewHtml },
        { path: "package.json", language: "json", content: JSON.stringify({ name: appName.toLowerCase().replace(/[^a-z0-9-]+/g, "-"), private: true, version: "1.0.0", dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" } }, null, 2) },
      ],
      idea: title || appName,
      at: Date.now(),
      status: "completed",
      totalFiles: 3,
      completedFiles: 3,
      turns: [
        {
          id: `turn-${Date.now()}`,
          prompt: `Create ${appName}`,
          at: Date.now(),
          thoughtSeconds: 5,
          aiSummary: `Generated production code for ${appName} with interactive preview.`,
          activityLabel: `Exploring ${appName} flow`,
          status: "completed",
        },
      ],
    };

    try {
      sessionStorage.setItem("myaibro_open_project", JSON.stringify(newProj));
      const storageKey = getActiveUserStorageKey("myaibro_builds_v2");
      const existing = localStorage.getItem(storageKey);
      const parsed = existing ? JSON.parse(existing) : [];
      localStorage.setItem(storageKey, JSON.stringify([newProj, ...(Array.isArray(parsed) ? parsed : [])]));
    } catch {
      // ignore
    }

    toast.success(`Opening "${appName}" in No-Code Platform...`);
    navigate({ to: "/build", search: { openLatest: true, id: projId } });
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

    // Always maintain active app state for direct in-app access & embedded workspace
    setActiveLaunchedApp({
      app: appName,
      title: act.title || `Launch ${appName}`,
      appUrl: act.appUrl || targetUrl,
      appScheme: act.appScheme,
      isEmbeddedOpen: Boolean(act.appUrl?.startsWith("/") || act.appUrl?.includes("jspaint.app")),
    });

    if (targetUrl.startsWith("/build") || appName.toLowerCase().includes("no-code") || appName.toLowerCase().includes("visual builder")) {
      if (latestCodeRef.current) {
        handleOpenInBuilder(
          latestCodeRef.current,
          latestCodeFilenameRef.current || "src/App.tsx",
          act.title || appName,
        );
        return;
      }
      navigate({ to: "/build", search: { openLatest: true } });
      return;
    }

    if (targetUrl.startsWith("/")) {
      try {
        const opened = window.open(targetUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          navigate({ to: targetUrl as any });
        }
      } catch {
        navigate({ to: targetUrl as any });
      }
      return;
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
    mutationFn: async (payload: {
      text: string;
      screenCaptureUrl?: string;
      history?: { role: "user" | "coworker" | "assistant"; content: string }[];
      previousCode?: string;
      previousFilename?: string;
    }) => {
      return coworkFn({
        data: {
          prompt: payload.text,
          context: `Device target: ${deviceTarget}. User requested autonomous action.`,
          hasScreenCapture: Boolean(payload.screenCaptureUrl),
          screenCaptureUrl: payload.screenCaptureUrl,
          folderContext: folderContext || undefined,
          fileCount: attachedFiles.length,
          history: payload.history,
          previousCode: payload.previousCode,
          previousFilename: payload.previousFilename,
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

      // Track latest code snippet for follow-up fixes
      const codeAction = res.actions.find((a) => a.codeSnippet && a.codeSnippet.code);
      if (codeAction?.codeSnippet) {
        latestCodeRef.current = codeAction.codeSnippet.code;
        latestCodeFilenameRef.current = codeAction.codeSnippet.filename;
      }

      // 1. Auto-trigger app launching autonomously so user request to open an app succeeds immediately
      const appAct = res.actions.find((a) => a.type === "app_launcher" || a.autoLaunch);
      if (appAct) {
        openAppOnDevice(appAct, true);
      }

      // 2. Direct messaging intent notification
      const msgAct = res.actions.find((a) => a.type === "messaging");
      if (msgAct?.messagingDetails?.directSendUrl) {
        toast.success(`Prepared ${msgAct.title}. Tap below to send!`, { duration: 4000 });
      }

      // 3. Painting notification
      const paintAct = res.actions.find((a) => a.type === "painting" || a.paintingDetails);
      if (paintAct?.paintingDetails) {
        toast.success(`🎨 AGI Masterpiece created: ${paintAct.paintingDetails.title}`, { duration: 4000 });
      }

      // 4. Editing notification
      const editAct = res.actions.find((a) => a.type === "editing" || a.editingDetails);
      if (editAct?.editingDetails) {
        toast.success(`✏️ AGI Revision ready: ${editAct.editingDetails.changeSummary}`, { duration: 4000 });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to execute coworker action");
    },
  });

  const handleSend = (overrideText?: string) => {
    const text = (overrideText ?? prompt).trim();
    const currentScreenUrl = screenCaptureUrl || (screenSharing ? captureScreenSnapshot() : null);

    if (!text && !currentScreenUrl && attachedFiles.length === 0 && attachedImages.length === 0) {
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
      screenCapture: currentScreenUrl || undefined,
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

    const historyPayload = tasks.slice(-6).map((t) => ({
      role: t.role as "user" | "coworker",
      content: t.content,
    }));

    coworkMutation.mutate({
      text,
      screenCaptureUrl: currentScreenUrl || undefined,
      history: historyPayload,
      previousCode: latestCodeRef.current || undefined,
      previousFilename: latestCodeFilenameRef.current || undefined,
    });
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
    <div className="flex h-[100dvh] flex-col bg-[#070e20] text-blue-100 font-sans antialiased selection:bg-blue-500 selection:text-white overflow-hidden relative">
      {/* 1. TOP BAR */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between p-4 sm:p-5 bg-gradient-to-b from-[#070e20] via-[#070e20]/90 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Hamburger Menu Circle Button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex size-11 items-center justify-center rounded-full bg-[#0c1938] border border-blue-500/30 text-white shadow-lg hover:bg-[#12234e] transition active:scale-95 cursor-pointer"
            title="Menu &amp; Tasks"
            aria-label="Open menu"
          >
            <Menu className="size-5 text-white" />
          </button>

          {/* Glowing My AI Pro Pill Badge */}
          <div className="flex items-center gap-2 rounded-full bg-[#0c1938] border border-blue-500/30 px-4 py-2 shadow-lg backdrop-blur-md">
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
      <div
        className={cn(
          "fixed top-20 right-4 sm:right-6 z-40 w-72 sm:w-80 rounded-2xl bg-zinc-950/95 border border-emerald-500/50 p-3 shadow-2xl backdrop-blur-md space-y-2",
          screenSharing ? "block animate-in fade-in zoom-in-95" : "hidden",
        )}
      >
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

            {/* Subtitle matching AGI capabilities */}
            <p className="mt-2 text-sm sm:text-base font-normal text-zinc-400 max-w-md leading-relaxed">
              I’m your My AI Pro Multimodal AGI Agent.
              <br />
              I can autonomously paint, code, edit, and launch any app on your device.
            </p>

            {/* Quick Action Chips */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-2xl">
              {[
                { label: "🚀 Open app & start writing code", prompt: "Open an app and start writing the code for a modern real-time task manager app in React and Tailwind CSS." },
                { label: "🎨 Paint cyberpunk neon city", prompt: "Paint a cyberpunk neon metropolis skyline with glowing reflections and oil canvas texture." },
                { label: "💻 Build modern web browser", prompt: "Make a modern web browser application with tabs, URL bar, and interactive sandbox." },
                { label: "✏️ Edit & optimize code", prompt: "Edit and polish this application code to add responsive layout, animations, and clean state." },
                { label: "💬 Message company owner on WhatsApp", prompt: "Open WhatsApp and start messaging company owner: 'Hello, the project task has been successfully completed.'" },
                { label: "🎵 Play focus music on Spotify", prompt: "Open Spotify and play coding focus music." },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(chip.prompt)}
                  className="rounded-full bg-zinc-900/90 border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:border-amber-500/50 hover:bg-zinc-800 transition active:scale-95 text-left cursor-pointer"
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
                              // 1. Digital Painting & Fine Art Studio Card
                              if ((act.type === "painting" || act.paintingDetails) && act.paintingDetails) {
                                return (
                                  <AgentPaintingCard
                                    key={aIdx}
                                    act={act}
                                    onRepaint={(p) => handleSend(p)}
                                    onOpenPaint={() => openAppOnDevice({ app: "Paint Studio", appUrl: "https://jspaint.app", appScheme: "paint://" })}
                                  />
                                );
                              }

                              // 2. Universal Editing Studio Card
                              if ((act.type === "editing" || act.editingDetails) && act.editingDetails) {
                                return (
                                  <AgentEditingCard
                                    key={aIdx}
                                    act={act}
                                    onApply={(content) => {
                                      latestCodeRef.current = content;
                                      toast.success("Applied edits to AGI memory!");
                                    }}
                                    onRunLive={(content) => setPreviewCode({ code: content, language: "html", title: "Edited App" })}
                                    onRevise={(p) => handleSend(p)}
                                  />
                                );
                              }

                              // 3. Direct Messaging Card (WhatsApp / Email to Friends or Owner)
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

                              // 4. Live Code Execution Card
                              if (act.type === "code_execution" && act.codeSnippet) {
                                const snippet = act.codeSnippet;
                                const activeCode = customCodeEdits[task.id] ?? snippet.code;
                                return (
                                  <div
                                    key={aIdx}
                                    className="col-span-1 sm:col-span-2 rounded-2xl bg-zinc-900 border border-amber-500/30 p-4 space-y-3 shadow-md"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="size-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                                          <Code className="size-4" />
                                        </div>
                                        <div>
                                          <h4 className="text-xs font-bold text-white">{act.title}</h4>
                                          <p className="text-[11px] font-mono text-zinc-400">{snippet.filename}</p>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => copyCode(activeCode, task.id)}
                                          className="flex items-center gap-1 rounded-lg bg-zinc-800 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white transition cursor-pointer"
                                        >
                                          {copiedCodeId === task.id ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                                          <span>{copiedCodeId === task.id ? "Copied" : "Copy"}</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => downloadCode(activeCode, snippet.filename)}
                                          className="flex items-center gap-1 rounded-lg bg-zinc-800 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white transition cursor-pointer"
                                        >
                                          <Download className="size-3" />
                                          <span>Download</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            latestCodeRef.current = activeCode;
                                            latestCodeFilenameRef.current = snippet.filename;
                                            handleSend(`Fix this code and resolve any errors or styling issues: ${snippet.filename}`);
                                          }}
                                          className="flex items-center gap-1 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500/40 px-2.5 py-1 text-[11px] font-bold text-white transition shadow-xs cursor-pointer"
                                          title="Fix code with AGI"
                                        >
                                          <Wand2 className="size-3" />
                                          <span>Fix with AGI</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleOpenInBuilder(activeCode, snippet.filename, act.title)}
                                          className="flex items-center gap-1 rounded-lg bg-zinc-800 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-zinc-700 transition cursor-pointer"
                                          title="Open in No-Code Visual Builder"
                                        >
                                          <Code className="size-3" />
                                          <span>Visual Builder</span>
                                        </button>

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

                              // 5. Follow-up Questions / Interactive Suggestions Card
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

                              // 6. Enhanced Autonomous App Launcher Card
                              return (
                                <div
                                  key={aIdx}
                                  className="col-span-1 rounded-2xl bg-zinc-900 border border-emerald-500/40 p-3.5 flex flex-col justify-between gap-3 shadow-md hover:border-emerald-400 transition"
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                                        <h4 className="text-xs font-bold text-white">{act.title}</h4>
                                      </div>
                                      {act.app && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                          {act.app}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-zinc-400 mt-1.5">{act.description}</p>
                                  </div>

                                  {(act.appUrl || act.appScheme || act.mapUrl) && (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openAppOnDevice({ app: act.app, appUrl: act.appUrl || act.mapUrl, appScheme: act.appScheme })}
                                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-2 text-xs font-bold transition shadow-sm cursor-pointer"
                                      >
                                        <ExternalLink className="size-3.5" />
                                        <span>Open / Launch {act.app || "App"}</span>
                                      </button>

                                      {act.appUrl?.startsWith("/") && (
                                        <Link
                                          to={act.appUrl as any}
                                          className="rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white transition"
                                          title="Switch Workspace"
                                        >
                                          Go
                                        </Link>
                                      )}
                                    </div>
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
          <div className="flex-1 flex items-center gap-3 rounded-full bg-[#0c1938] border border-blue-500/30 px-5 py-3 shadow-2xl backdrop-blur-xl">
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
              className="flex-1 bg-transparent text-sm text-white placeholder:text-blue-300/40 outline-none font-sans"
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
              handleSend("Open an app and start writing the code");
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <Code className="size-4 text-amber-400 shrink-0" />
            <span>Open App &amp; Start Writing Code</span>
          </button>

          {/* 2b. Paint Fine Art on Canvas */}
          <button
            type="button"
            onClick={() => {
              setShowPlusMenu(false);
              handleSend("Paint a fine art landscape with vibrant colors and rich textures");
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <Palette className="size-4 text-pink-400 shrink-0" />
            <span>Paint Fine Art with AGI</span>
          </button>

          {/* 2c. Edit & Polish Code */}
          <button
            type="button"
            onClick={() => {
              setShowPlusMenu(false);
              handleSend("Edit and polish this application code with responsive design and modern styling");
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 rounded-xl transition cursor-pointer"
          >
            <Edit3 className="size-4 text-blue-400 shrink-0" />
            <span>Edit &amp; Optimize Code</span>
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

      {/* In-App App Window / Runner Modal */}
      {activeLaunchedApp && activeLaunchedApp.isEmbeddedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="flex h-[88vh] w-full max-w-5xl flex-col rounded-3xl border border-emerald-500/40 bg-zinc-950 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/90 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="size-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activeLaunchedApp.app}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active on {deviceTarget}
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (activeLaunchedApp.appUrl) {
                      window.open(activeLaunchedApp.appUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Open in New Tab</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLaunchedApp(null)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                  title="Close App Window"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-zinc-900 overflow-hidden relative">
              <iframe
                title={activeLaunchedApp.app || "App Workspace"}
                src={activeLaunchedApp.appUrl}
                className="size-full border-0"
                allow="accelerometer; autoplay; camera; encrypted-media; geolocation; gyroscope; microphone"
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Launched App Notice Banner (for external apps or when minimized) */}
      {activeLaunchedApp && !activeLaunchedApp.isEmbeddedOpen && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full bg-emerald-950/95 border border-emerald-500/60 px-4 py-2 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-white">
            {activeLaunchedApp.app} launched on {deviceTarget}
          </span>
          {activeLaunchedApp.appUrl && (
            <button
              type="button"
              onClick={() => {
                if (activeLaunchedApp.appUrl) {
                  window.open(activeLaunchedApp.appUrl, "_blank", "noopener,noreferrer");
                }
              }}
              className="flex items-center gap-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-full transition cursor-pointer"
            >
              <ExternalLink className="size-3" />
              <span>Switch to App</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveLaunchedApp(null)}
            className="text-zinc-400 hover:text-white text-xs p-1 cursor-pointer"
            title="Dismiss notice"
          >
            ✕
          </button>
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
                    { to: "/cowork", label: "My AI Co-worker", icon: Bot },
                    { to: "/chat", label: "AI Chat", icon: MessageSquare },
                    { to: "/voice", label: "Voice Assistant", icon: Mic },
                    { to: "/build", label: "No-Code Platform", icon: Code },
                    { to: "/research", label: "Deep Research", icon: Telescope },
                    { to: "/presentations", label: "Slide Presentations", icon: Monitor },
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
