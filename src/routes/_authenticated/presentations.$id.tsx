import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  getPresentation,
  updatePresentation,
  generateSlideImage,
  illustrateDeck,
  type Slide,
} from "@/lib/presentations.functions";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  Play,
  Volume2,
  VolumeX,
  LayoutGrid,
  Type as TypeIcon,
  Image as ImageIcon,
  Shapes,
  Palette,
  Plus,
  Trash2,
  X,
  Loader2,
  Save,
  MessageSquare,
  Cpu,
  Telescope,
  Presentation as PresentationIcon,
  Copy,
  Sparkles,
  Upload,
  Check,
  Eye,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Globe,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Star,
  Heart,
  ArrowRight,
  Shield,
  Zap,
  Bookmark,
  Smile,
  Sun,
  Moon,
  Cloud,
  CheckCircle,
  Clock,
  Radio,
  Lock,
  Layers,
  Folder,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImageToDataUrl } from "@/lib/image-compressor";
import {
  loadAllPresentations,
  saveAllPresentations,
  getCurrentUserEmail,
  type PresentationDeckItem,
} from "@/lib/presentations-store";
import { SharePresentationModal } from "@/components/share-presentation-modal";

export const Route = createFileRoute("/_authenticated/presentations/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    share: typeof search.share === "string" ? search.share : undefined,
  }),
  component: DeckPage,
});

const THEMES = [
  {
    id: "midnight",
    name: "Midnight Sapphire",
    bg: "linear-gradient(135deg, #070e20 0%, #0c1938 50%, #15224e 100%)",
    fg: "#ffffff",
    accent: "#60a5fa",
    cardBg: "rgba(12, 25, 56, 0.9)",
  },
  {
    id: "teal",
    name: "Deep Teal",
    bg: "linear-gradient(135deg, #053b3b 0%, #0a4f4d 50%, #0d5c5a 100%)",
    fg: "#ffffff",
    accent: "#5eead4",
    cardBg: "rgba(10, 79, 77, 0.9)",
  },
  {
    id: "royal",
    name: "Royal Purple",
    bg: "linear-gradient(135deg, #2e1065 0%, #3b0764 50%, #581c87 100%)",
    fg: "#ffffff",
    accent: "#d8b4fe",
    cardBg: "rgba(59, 7, 100, 0.9)",
  },
  {
    id: "sunset",
    name: "Sunset Ember",
    bg: "linear-gradient(135deg, #451a03 0%, #78350f 50%, #b45309 100%)",
    fg: "#ffffff",
    accent: "#fde68a",
    cardBg: "rgba(120, 53, 15, 0.9)",
  },
  {
    id: "forest",
    name: "Emerald Forest",
    bg: "linear-gradient(135deg, #062c1d 0%, #0e442d 50%, #166534 100%)",
    fg: "#ffffff",
    accent: "#86efac",
    cardBg: "rgba(14, 68, 45, 0.9)",
  },
  {
    id: "crimson",
    name: "Crimson Velvet",
    bg: "linear-gradient(135deg, #4c0519 0%, #881337 50%, #9f1239 100%)",
    fg: "#ffffff",
    accent: "#fda4af",
    cardBg: "rgba(136, 19, 55, 0.9)",
  },
  {
    id: "cyber",
    name: "Cyber Neon",
    bg: "linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%)",
    fg: "#22c55e",
    accent: "#4ade80",
    cardBg: "rgba(24, 24, 27, 0.9)",
  },
  {
    id: "slate",
    name: "Slate Minimal",
    bg: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)",
    fg: "#ffffff",
    accent: "#cbd5e1",
    cardBg: "rgba(51, 65, 85, 0.9)",
  },
  {
    id: "paper",
    name: "Clean Paper",
    bg: "linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)",
    fg: "#0f172a",
    accent: "#0284c7",
    cardBg: "rgba(248, 250, 252, 0.95)",
  },
] as const;

const COLOR_PRESETS = [
  "#ffffff",
  "#93c5fd",
  "#60a5fa",
  "#5eead4",
  "#a7f3d0",
  "#fde68a",
  "#fda4af",
  "#d8b4fe",
  "#0f172a",
];

const SHAPE_CATEGORIES = [
  {
    name: "Geometric",
    shapes: [
      { name: "Circle", icon: Circle },
      { name: "Square", icon: Square },
      { name: "Triangle", icon: Triangle },
      { name: "Hexagon", icon: Hexagon },
      { name: "Star", icon: Star },
      { name: "Heart", icon: Heart },
    ],
  },
  {
    name: "Badges & UI",
    shapes: [
      { name: "Arrow", icon: ArrowRight },
      { name: "Shield", icon: Shield },
      { name: "Zap", icon: Zap },
      { name: "Bookmark", icon: Bookmark },
      { name: "Check", icon: CheckCircle },
      { name: "Clock", icon: Clock },
    ],
  },
  {
    name: "Status & Nature",
    shapes: [
      { name: "Sun", icon: Sun },
      { name: "Moon", icon: Moon },
      { name: "Cloud", icon: Cloud },
      { name: "Radio", icon: Radio },
      { name: "Globe", icon: Globe },
      { name: "Smile", icon: Smile },
    ],
  },
];

type ToolType = "slides" | "text" | "image" | "voice" | "shapes" | "theme" | null;

function DeckPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const qc = useQueryClient();

  const getFn = useServerFn(getPresentation);
  const updFn = useServerFn(updatePresentation);
  const imgFn = useServerFn(generateSlideImage);
  const deckImgFn = useServerFn(illustrateDeck);

  // Load from local store
  const allLocalDecks = useMemo(() => loadAllPresentations(), []);
  const localTarget = allLocalDecks.find((d) => d.id === id);

  const { data: serverData, isLoading } = useQuery({
    queryKey: ["presentation", id],
    queryFn: () => getFn({ data: { id } }),
    initialData: localTarget ? { id: localTarget.id, title: localTarget.title, slides: localTarget.slides } : undefined,
  });

  const [currentDeck, setCurrentDeck] = useState<PresentationDeckItem | null>(() => {
    return localTarget || (serverData ? {
      id: serverData.id,
      title: serverData.title,
      slides: serverData.slides,
      sharedWith: [],
      updated_at: new Date().toISOString(),
    } : null);
  });

  const [slides, setSlides] = useState<Slide[]>(() => {
    return (localTarget?.slides || serverData?.slides || [
      {
        title: "Presentation Slide",
        bullets: ["Add key strategy point or research finding"],
      },
    ]) as Slide[];
  });

  const [title, setTitle] = useState(() => localTarget?.title || serverData?.title || "Presentation Deck");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [present, setPresent] = useState(false);
  const [theme, setTheme] = useState<(typeof THEMES)[number]>(THEMES[0]);
  const [customBgColor, setCustomBgColor] = useState("");
  const [customTextColor, setCustomTextColor] = useState("");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [titleSize, setTitleSize] = useState(28);
  const [bodySize, setBodySize] = useState(15);
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [imgPrompt, setImgPrompt] = useState("");
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceScript, setVoiceScript] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentEmail = useMemo(() => getCurrentUserEmail(), []);

  // Determine view-only mode
  const isViewOnly = useMemo(() => {
    if (search.share === "view") return true;
    if (currentDeck?.userRole === "view") return true;
    if (currentDeck?.sharedWith) {
      const match = currentDeck.sharedWith.find((c) => c.email.toLowerCase() === currentEmail.toLowerCase());
      if (match && match.role === "view") return true;
    }
    return false;
  }, [search.share, currentDeck, currentEmail]);

  useEffect(() => {
    if (serverData) {
      setTitle(serverData.title || "Presentation Deck");
      if (serverData.slides && serverData.slides.length > 0) {
        setSlides(serverData.slides as Slide[]);
      }
    }
  }, [serverData]);

  // Synchronize with local storage
  function syncToLocalStorage(newSlides: Slide[], newTitle: string) {
    const list = loadAllPresentations();
    const idx = list.findIndex((d) => d.id === id);
    const updatedItem: PresentationDeckItem = {
      ...(idx >= 0 ? list[idx] : { id, sharedWith: [], ownerEmail: currentEmail }),
      title: newTitle,
      slides: newSlides,
      slideCount: newSlides.length,
      cover: newSlides[0]?.image_url || null,
      updated_at: new Date().toISOString(),
    };

    let nextList: PresentationDeckItem[];
    if (idx >= 0) {
      nextList = [...list];
      nextList[idx] = updatedItem;
    } else {
      nextList = [updatedItem, ...list];
    }
    saveAllPresentations(nextList);
    setCurrentDeck(updatedItem);
  }

  const saveMut = useMutation({
    mutationFn: () => updFn({ data: { id, title, slides } }),
    onSuccess: () => {
      toast.success("Presentation saved successfully!");
      setDirty(false);
      syncToLocalStorage(slides, title);
      qc.invalidateQueries({ queryKey: ["presentation", id] });
      qc.invalidateQueries({ queryKey: ["presentations"] });
    },
    onError: (e: any) => {
      // Local fallback still guarantees saved data
      syncToLocalStorage(slides, title);
      setDirty(false);
      toast.success("Presentation saved locally!");
    },
  });

  const genImg = useMutation({
    mutationFn: (prompt: string) => imgFn({ data: { id, slideIndex: currentIdx, prompt } }),
    onSuccess: (r) => {
      const next = slides.map((sl, idx) => (idx === r.slideIndex ? { ...sl, image_url: r.image_url } : sl));
      setSlides(next);
      setImgPrompt("");
      setDirty(true);
      syncToLocalStorage(next, title);
      toast.success("Image generated & added to slide!");
    },
    onError: (e: any) => toast.error(e.message ?? "Image generation failed"),
  });

  const illustrate = useMutation({
    mutationFn: () => deckImgFn({ data: { id } }),
    onSuccess: (r: any) => {
      setSlides(r.slides as Slide[]);
      setDirty(true);
      syncToLocalStorage(r.slides as Slide[], title);
      toast.success(`Generated ${r.added} slide illustrations!`);
    },
    onError: (e: any) => toast.error(e.message ?? "Auto-illustration failed"),
  });

  const slide = slides[currentIdx] || {
    title: "Presentation Slide",
    bullets: ["Add key strategy point or research finding"],
  };

  function updateCurrentSlide(patch: Partial<Slide>) {
    if (isViewOnly) {
      toast.info("This presentation is in View-Only mode");
      return;
    }
    const next = slides.map((sl, idx) => (idx === currentIdx ? { ...sl, ...patch } : sl));
    setSlides(next);
    setDirty(true);
    syncToLocalStorage(next, title);
  }

  function addSlide(at?: number) {
    if (isViewOnly) return;
    const pos = at ?? slides.length;
    const next = [...slides];
    next.splice(pos, 0, {
      title: "New Presentation Slide",
      bullets: ["Add key strategy point or research finding"],
    });
    setSlides(next);
    setCurrentIdx(pos);
    setDirty(true);
    syncToLocalStorage(next, title);
  }

  function duplicateSlide() {
    if (isViewOnly) return;
    const pos = currentIdx + 1;
    const next = [...slides];
    next.splice(pos, 0, { ...slide });
    setSlides(next);
    setCurrentIdx(pos);
    setDirty(true);
    syncToLocalStorage(next, title);
    toast.success("Slide duplicated");
  }

  function removeSlide() {
    if (isViewOnly) return;
    if (slides.length <= 1) {
      toast.error("Presentations must have at least one slide");
      return;
    }
    const next = slides.filter((_, idx) => idx !== currentIdx);
    setSlides(next);
    setCurrentIdx(Math.max(0, currentIdx - 1));
    setDirty(true);
    syncToLocalStorage(next, title);
    toast.success("Slide deleted");
  }

  // Upload user image with compression
  async function handleCustomUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataUrl(file, 1280, 0.82);
      updateCurrentSlide({ image_url: compressed.dataUrl });
      setUploadedAssets((prev) => [compressed.dataUrl, ...prev]);
      toast.success("Custom image added to current slide!");
    } catch {
      toast.error("Could not process image");
    } finally {
      e.target.value = "";
    }
  }

  // Drag and drop image directly onto the slide canvas
  async function handleCanvasDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(false);
    if (isViewOnly) return;

    // Check dropped asset from gallery
    const assetUrl = e.dataTransfer.getData("text/plain");
    if (assetUrl && (assetUrl.startsWith("data:image/") || assetUrl.startsWith("http"))) {
      updateCurrentSlide({ image_url: assetUrl });
      toast.success("Image dropped onto slide!");
      return;
    }

    // Check dropped files from desktop
    const files = Array.from(e.dataTransfer.files);
    const imgFile = files.find((f) => f.type.startsWith("image/"));
    if (imgFile) {
      try {
        const compressed = await compressImageToDataUrl(imgFile, 1280, 0.82);
        updateCurrentSlide({ image_url: compressed.dataUrl });
        setUploadedAssets((prev) => [compressed.dataUrl, ...prev]);
        toast.success("Image uploaded & placed on slide!");
      } catch {
        toast.error("Could not process dropped image");
      }
    }
  }

  function speakSlide() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Speech narration not supported in this browser");
      return;
    }
    window.speechSynthesis.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const textToSpeak = voiceScript.trim() || `${slide.title}. ${(slide.bullets ?? []).join(". ")}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    toast.success("Playing AI Voice Narration...");
  }

  async function downloadPPT() {
    try {
      const { default: PptxGenJS } = await import("pptxgenjs");
      const pptx = new PptxGenJS();
      pptx.title = title;
      slides.forEach((s, idx) => {
        const el = pptx.addSlide();
        el.background = { color: idx === 0 ? "070E20" : "0C1938" };
        el.addText(s.title, {
          x: 0.8,
          y: idx === 0 ? 2.0 : 0.6,
          w: 8.5,
          h: 1.2,
          fontSize: idx === 0 ? 32 : 24,
          bold: true,
          color: "FFFFFF",
          fontFace: "Calibri",
        });
        if (s.bullets?.length) {
          el.addText(
            s.bullets.map((b) => ({ text: b, options: { bullet: true } })),
            {
              x: 0.8,
              y: idx === 0 ? 3.4 : 1.8,
              w: 8.5,
              h: 4.0,
              fontSize: 16,
              color: "E2E8F0",
              fontFace: "Calibri",
              valign: "top",
            },
          );
        }
      });
      await pptx.writeFile({ fileName: `${title.replace(/[^\w]+/g, "-") || "presentation"}.pptx` });
      toast.success("PowerPoint presentation downloaded!");
    } catch {
      toast.error("Download failed");
    }
  }

  // Unified color variables: Editor and Preview use the EXACT same background & text color
  const activeBackground = customBgColor || theme.bg;
  const activeTextColor = customTextColor || theme.fg;

  /* ---------- Fullscreen Presentation / PPT Preview Mode ---------- */
  if (present) {
    return (
      <div className="flex h-[100dvh] flex-col bg-black">
        <button
          onClick={() => setPresent(false)}
          className="absolute right-4 top-4 z-20 rounded-full bg-white/20 p-2.5 text-white hover:bg-white/30 transition cursor-pointer"
          title="Exit Preview"
        >
          <X className="size-5" />
        </button>

        <div className="flex flex-1 items-center justify-center p-4">
          <div
            className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-3xl shadow-2xl p-8 sm:p-12 flex flex-col justify-between border border-white/10"
            style={{ background: activeBackground, color: activeTextColor, textAlign }}
          >
            <div className="space-y-4">
              <h1 className="font-serif font-bold text-3xl sm:text-5xl tracking-tight">{slide.title}</h1>
              <div className="mt-8 space-y-4 max-w-2xl">
                {(slide.bullets ?? []).map((b, i) => (
                  <div key={i} className="flex items-start gap-3.5 text-lg sm:text-xl leading-relaxed">
                    <span
                      className="mt-2.5 size-3 shrink-0 rounded-full shadow-xs"
                      style={{ background: theme.accent || "#60a5fa" }}
                    />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {slide.image_url && (
              <img
                src={slide.image_url}
                alt=""
                className="max-h-56 max-w-xs rounded-2xl object-cover self-end shadow-2xl ring-1 ring-white/20"
              />
            )}
          </div>
        </div>

        {/* Slide navigation controls */}
        <div className="flex items-center justify-between px-8 pb-6 text-white/80">
          <button
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(currentIdx - 1)}
            className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 disabled:opacity-30 transition cursor-pointer"
          >
            <ChevronLeft className="size-6" />
          </button>
          <span className="text-sm font-medium font-mono text-white/90">
            Slide {currentIdx + 1} of {slides.length}
          </span>
          <button
            disabled={currentIdx >= slides.length - 1}
            onClick={() => setCurrentIdx(currentIdx + 1)}
            className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 disabled:opacity-30 transition cursor-pointer"
          >
            <ChevronRight className="size-6" />
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Standard Editor Mode ---------- */
  return (
    <div className="flex h-[100dvh] flex-col bg-[#070e20] font-sans text-blue-100 overflow-hidden">
      {/* 1. TOP HEADER APP SWITCHER & ACTIONS */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-blue-500/20 bg-[#081226]/95 px-3 sm:px-4 backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <Link
            to="/presentations"
            className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-[#0c1938] px-3 py-1.5 text-xs font-semibold text-blue-200 hover:text-white hover:bg-blue-600/20 transition cursor-pointer shrink-0"
          >
            <ChevronLeft className="size-3.5" />
            <span>All Decks</span>
          </Link>

          <div className="h-4 w-px bg-blue-500/20 hidden sm:block" />

          {/* Quick App Switcher Pills */}
          <Link
            to="/chat"
            className="hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-blue-300/70 hover:text-white hover:bg-blue-600/20 transition"
          >
            <MessageSquare className="size-3 text-blue-400" />
            <span>AI Chat</span>
          </Link>
          <Link
            to="/build"
            className="hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-blue-300/70 hover:text-white hover:bg-blue-600/20 transition"
          >
            <Cpu className="size-3 text-indigo-400" />
            <span>No-Code</span>
          </Link>
          <Link
            to="/projects"
            className="hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-blue-300/70 hover:text-white hover:bg-blue-600/20 transition"
          >
            <Folder className="size-3 text-sky-400" />
            <span>Projects</span>
          </Link>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* View Only Mode Indicator */}
          {isViewOnly && (
            <div className="flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-xs font-semibold text-blue-300">
              <Eye className="size-3.5" />
              <span>View-Only</span>
            </div>
          )}

          {/* Save button */}
          {!isViewOnly && (
            <button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !dirty}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer",
                dirty
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30 hover:bg-blue-500"
                  : "bg-blue-500/10 text-blue-300/60 border border-blue-500/20",
              )}
            >
              {saveMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>{dirty ? "Save Changes" : "Saved"}</span>
            </button>
          )}

          {/* Share Modal Trigger */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-[#0c1938] px-3.5 py-1.5 text-xs font-bold text-blue-200 hover:text-white hover:bg-blue-600/25 transition cursor-pointer"
            title="Share presentation with friends"
          >
            <Share2 className="size-3.5 text-blue-400" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Preview PPT Presentation */}
          <button
            onClick={() => setPresent(true)}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:brightness-110 transition cursor-pointer"
          >
            <Play className="size-3.5 fill-current" />
            <span>Preview PPT</span>
          </button>

          {/* Download PowerPoint */}
          <button
            onClick={downloadPPT}
            className="flex size-8 items-center justify-center rounded-full bg-[#0c1938] border border-blue-500/30 text-blue-200 hover:text-white hover:bg-blue-600/30 transition cursor-pointer"
            title="Download PowerPoint (.pptx)"
          >
            <Download className="size-3.5" />
          </button>
        </div>
      </header>

      {/* 2. SUBHEADER: TITLE & STATUS BAR */}
      <div className="flex h-11 shrink-0 items-center justify-between px-4 bg-[#081226]/60 border-b border-blue-500/15">
        <div className="flex items-center gap-2 max-w-[50%]">
          <input
            value={title}
            disabled={isViewOnly}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
            placeholder="Presentation title..."
            className="truncate border-none bg-transparent font-serif text-sm font-bold text-white outline-none focus:ring-1 focus:ring-blue-400/40 rounded px-1"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Voice Narration Button */}
          <button
            onClick={() => {
              setVoiceOn(!voiceOn);
              if (!voiceOn) {
                speakSlide();
              } else {
                window.speechSynthesis?.cancel();
                setSpeaking(false);
              }
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold transition cursor-pointer",
              voiceOn
                ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                : "border-blue-500/30 bg-[#0c1938] text-blue-300/70 hover:text-white",
            )}
          >
            <Volume2 className={cn("size-3.5", speaking && "animate-pulse text-emerald-400")} />
            <span>Voice: {voiceOn ? "ON" : "OFF"}</span>
          </button>

          <span className="font-mono text-blue-300/70">
            Slide {currentIdx + 1} of {slides.length}
          </span>
        </div>
      </div>

      {/* 3. MAIN SLIDE CANVAS (Color & Design Matched 100% to Preview) */}
      <main className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6 overflow-hidden">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleCanvasDrop}
          className={cn(
            "relative aspect-video w-full max-w-3xl overflow-hidden rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col justify-between transition-all duration-300 border",
            isDraggingOver ? "ring-4 ring-cyan-400 border-cyan-400" : "border-white/10",
          )}
          style={{
            background: activeBackground,
            color: activeTextColor,
            textAlign,
          }}
        >
          {/* Drag Overlay Notice */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-blue-950/80 backdrop-blur-xs text-white">
              <Upload className="size-10 text-cyan-400 animate-bounce mb-2" />
              <p className="text-sm font-bold">Drop image here to place onto this slide</p>
            </div>
          )}

          {/* Slide Content: Title and Bullets */}
          <div className="space-y-4">
            <input
              value={slide.title ?? ""}
              disabled={isViewOnly}
              onChange={(e) => updateCurrentSlide({ title: e.target.value })}
              className="w-full border-none bg-transparent font-serif font-bold text-xl sm:text-3xl outline-none focus:ring-1 focus:ring-blue-400/30 rounded"
              placeholder="Slide Title..."
              style={{ fontSize: titleSize, textAlign, color: activeTextColor }}
            />

            {/* Bullet Points */}
            <div className="mt-4 space-y-3">
              {(slide.bullets ?? []).map((b, k) => (
                <div key={k} className="group flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 flex-1">
                    <span
                      className="mt-1.5 size-2.5 shrink-0 rounded-full shadow-xs"
                      style={{ background: theme.accent || "#60a5fa" }}
                    />
                    <input
                      value={b}
                      disabled={isViewOnly}
                      onChange={(e) => {
                        const next = [...(slide.bullets ?? [])];
                        next[k] = e.target.value;
                        updateCurrentSlide({ bullets: next });
                      }}
                      className="w-full border-none bg-transparent text-sm sm:text-base outline-none focus:ring-1 focus:ring-blue-400/20 rounded leading-relaxed"
                      style={{ fontSize: bodySize, color: activeTextColor }}
                    />
                  </div>

                  {!isViewOnly && (
                    <button
                      onClick={() => {
                        const next = (slide.bullets ?? []).filter((_, idx) => idx !== k);
                        updateCurrentSlide({ bullets: next });
                      }}
                      className="p-1 text-white/40 opacity-0 group-hover:opacity-100 hover:text-red-400 transition cursor-pointer"
                      title="Remove bullet"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {!isViewOnly && (
                <button
                  onClick={() =>
                    updateCurrentSlide({
                      bullets: [...(slide.bullets ?? []), "New milestone or key strategy point"],
                    })
                  }
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-white pt-1 transition cursor-pointer"
                >
                  <Plus className="size-3" /> Add bullet point
                </button>
              )}
            </div>
          </div>

          {/* Slide Image Slot with Drag & Drop or Upload indicator */}
          {slide.image_url ? (
            <div className="relative mt-3 max-h-36 w-full max-w-sm self-end overflow-hidden rounded-2xl border border-white/20 shadow-xl group/img">
              <img src={slide.image_url} alt="" className="h-full w-full object-cover" />
              {!isViewOnly && (
                <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition">
                  <button
                    onClick={() => updateCurrentSlide({ image_url: undefined })}
                    className="flex size-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600 transition cursor-pointer"
                    title="Remove image"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            !isViewOnly && (
              <div
                onClick={() => setActiveTool("image")}
                className="mt-2 flex items-center justify-between rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-2 text-xs text-white/70 hover:border-cyan-400 hover:text-white transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="size-4 text-cyan-400" />
                  <span>Drop your image here or click to open Image & Upload Studio</span>
                </div>
                <span className="font-semibold text-cyan-300 text-[11px]">+ Add Image</span>
              </div>
            )
          )}
        </div>
      </main>

      {/* 4. TOOL DRAWER PANEL */}
      {activeTool && !isViewOnly && (
        <div className="shrink-0 border-t border-blue-500/25 bg-[#081226] p-4 shadow-2xl animate-in slide-in-from-bottom-2">
          <div className="mx-auto flex max-w-3xl items-center justify-between pb-2 border-b border-blue-500/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-2">
              {activeTool === "slides" && "Slide Manager & Auto-Illustrate"}
              {activeTool === "text" && "Edit Text & Typography Styles"}
              {activeTool === "image" && "Image & Upload Studio (Drag & Drop Supported)"}
              {activeTool === "voice" && "AI Voice Narration & TTS"}
              {activeTool === "shapes" && "Shapes & User Assets"}
              {activeTool === "theme" && "Theme Palettes & Slide Colors"}
            </h3>
            <button
              onClick={() => setActiveTool(null)}
              className="rounded-full p-1 text-blue-300 hover:bg-blue-600/20 hover:text-white transition cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mx-auto max-w-3xl pt-3">
            {/* Tool 1: Slides */}
            {activeTool === "slides" && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => addSlide()}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 transition cursor-pointer"
                >
                  <Plus className="size-3.5" /> Add slide
                </button>
                <button
                  onClick={duplicateSlide}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-[#0c1938] px-3.5 py-1.5 text-xs font-semibold text-blue-200 hover:text-white transition cursor-pointer"
                >
                  <Copy className="size-3.5" /> Duplicate
                </button>
                <button
                  onClick={removeSlide}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition cursor-pointer"
                >
                  <Trash2 className="size-3.5" /> Delete slide
                </button>
                <button
                  onClick={() => illustrate.mutate()}
                  disabled={illustrate.isPending}
                  className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition cursor-pointer ml-auto"
                >
                  <Sparkles className="size-3.5" />
                  <span>{illustrate.isPending ? "Generating..." : "Auto-Illustrate All Slides"}</span>
                </button>
              </div>
            )}

            {/* Tool 2: Text */}
            {activeTool === "text" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">
                      Title Font Size: {titleSize}px
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={48}
                      value={titleSize}
                      onChange={(e) => setTitleSize(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">
                      Body Font Size: {bodySize}px
                    </label>
                    <input
                      type="range"
                      min={12}
                      max={22}
                      value={bodySize}
                      onChange={(e) => setBodySize(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">
                      Alignment:
                    </label>
                    <div className="flex items-center gap-1.5">
                      {(["left", "center", "right"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => setTextAlign(a)}
                          className={cn(
                            "rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition cursor-pointer",
                            textAlign === a
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-[#0c1938] text-blue-300 border border-blue-500/30",
                          )}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-blue-200 block mb-1">
                      Text Colors:
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setCustomTextColor(c);
                            setDirty(true);
                          }}
                          className={cn(
                            "size-6 rounded-full border border-white/20 shadow-xs transition hover:scale-110",
                            customTextColor === c && "ring-2 ring-blue-400 scale-110",
                          )}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tool 3: Image & Upload Studio */}
            {activeTool === "image" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={imgPrompt}
                    onChange={(e) => setImgPrompt(e.target.value)}
                    placeholder="Describe AI image for this slide (e.g. futuristic cloud architecture diagram)..."
                    className="flex-1 rounded-2xl border border-blue-500/30 bg-[#070e20] px-3.5 py-2 text-xs text-white placeholder:text-blue-300/40 outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={() => genImg.mutate(imgPrompt.trim() || slide.title)}
                    disabled={genImg.isPending}
                    className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:brightness-110 disabled:opacity-50 transition cursor-pointer shrink-0"
                  >
                    {genImg.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    <span>AI Generate</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleCustomUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-2xl border border-blue-500/30 bg-[#0c1938] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600/25 transition cursor-pointer"
                  >
                    <Upload className="size-3.5 text-cyan-400" />
                    <span>Upload Image from Device</span>
                  </button>

                  <span className="text-[11px] text-blue-300/70">
                    💡 Tip: You can also drag and drop images directly onto the slide canvas above!
                  </span>
                </div>

                {/* Uploaded Gallery */}
                {uploadedAssets.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-blue-300/70 block">
                      Uploaded Assets (Click or drag onto slide):
                    </label>
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {uploadedAssets.map((asset, idx) => (
                        <div
                          key={idx}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", asset);
                          }}
                          onClick={() => updateCurrentSlide({ image_url: asset })}
                          className="group relative size-16 shrink-0 rounded-2xl border border-blue-500/30 overflow-hidden hover:scale-105 transition cursor-pointer shadow-md"
                          title="Click to insert or drag onto slide"
                        >
                          <img src={asset} alt="" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition">
                            <Plus className="size-4 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tool 4: Voice */}
            {activeTool === "voice" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-blue-200 block mb-1">
                    Custom Narration Script:
                  </label>
                  <textarea
                    value={voiceScript}
                    onChange={(e) => setVoiceScript(e.target.value)}
                    placeholder="Enter narration text for AI to speak for this slide..."
                    rows={2}
                    className="w-full rounded-2xl border border-blue-500/30 bg-[#070e20] p-3 text-xs text-white placeholder:text-blue-300/40 outline-none focus:border-blue-400"
                  />
                </div>
                <button
                  onClick={speakSlide}
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-500 transition cursor-pointer"
                >
                  <Volume2 className="size-4" />
                  <span>{speaking ? "Stop Narration" : "Play Slide Narration"}</span>
                </button>
              </div>
            )}

            {/* Tool 5: Shapes */}
            {activeTool === "shapes" && (
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {SHAPE_CATEGORIES.map((cat, cIdx) => (
                  <div key={cIdx}>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-blue-300/70 block mb-1">
                      {cat.name}:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {cat.shapes.map((sh, sIdx) => {
                        const Icon = sh.icon;
                        return (
                          <button
                            key={sIdx}
                            onClick={() => {
                              updateCurrentSlide({
                                bullets: [...(slide.bullets ?? []), `Key Highlight: ${sh.name}`],
                              });
                              toast.success(`Inserted ${sh.name} into slide!`);
                            }}
                            className="flex items-center gap-1.5 rounded-xl border border-blue-500/25 bg-[#0c1938] px-3 py-1.5 text-xs text-blue-200 hover:text-white hover:border-blue-400 transition cursor-pointer"
                          >
                            <Icon className="size-3.5 text-cyan-400" />
                            <span>{sh.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tool 6: Theme */}
            {activeTool === "theme" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-blue-200 block mb-2">
                    Slide Themes (Unified with Preview):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t);
                          setCustomBgColor("");
                          setDirty(true);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-2xl border px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer",
                          theme.id === t.id && !customBgColor
                            ? "border-cyan-400 ring-2 ring-cyan-400/50 bg-[#0c1938] text-white"
                            : "border-blue-500/25 bg-[#070e20] text-blue-200 hover:text-white",
                        )}
                      >
                        <span className="size-3.5 rounded-full border border-white/20" style={{ background: t.bg }} />
                        <span>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-blue-200 block mb-1.5">
                    Custom Background Colors:
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setCustomBgColor(c);
                          setDirty(true);
                        }}
                        className={cn(
                          "size-6 rounded-full border border-white/20 shadow-xs transition hover:scale-110",
                          customBgColor === c && "ring-2 ring-cyan-400 scale-110",
                        )}
                        style={{ background: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. SLIDE THUMBNAIL STRIP */}
      <div className="shrink-0 border-t border-blue-500/20 bg-[#081226]/80 px-3 py-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={cn(
                "relative flex h-14 w-28 shrink-0 flex-col justify-between overflow-hidden rounded-2xl border p-2 text-left text-[10px] transition-all shadow-xs cursor-pointer",
                idx === currentIdx
                  ? "border-blue-400 ring-2 ring-blue-400/60 bg-[#0c1938] text-white shadow-md shadow-blue-950"
                  : "border-blue-500/25 bg-[#070e20] text-blue-300/70 hover:border-blue-400/60",
              )}
            >
              <span className="line-clamp-1 font-bold">{s.title || `Slide ${idx + 1}`}</span>
              <span className="self-end text-[9px] font-mono text-blue-400">{idx + 1}</span>
            </button>
          ))}

          {!isViewOnly && (
            <button
              onClick={() => addSlide()}
              className="flex h-14 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/30 text-blue-300 hover:border-blue-400 hover:text-white transition cursor-pointer"
              title="Add new slide"
            >
              <Plus className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* 6. BOTTOM TOOLBAR (Slides, Edit Text, Image Studio, AI Voice, Shapes, Theme) */}
      {!isViewOnly && (
        <footer className="flex h-16 shrink-0 items-center justify-around border-t border-blue-500/20 bg-[#081226] px-2 text-blue-300/70">
          <button
            onClick={() => setActiveTool(activeTool === "slides" ? null : "slides")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer",
              activeTool === "slides" ? "text-cyan-300" : "hover:text-white",
            )}
          >
            <LayoutGrid className="size-5" />
            <span>Slides</span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === "text" ? null : "text")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer",
              activeTool === "text" ? "text-cyan-300" : "hover:text-white",
            )}
          >
            <TypeIcon className="size-5" />
            <span>Edit Text</span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === "image" ? null : "image")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer",
              activeTool === "image" ? "text-cyan-300" : "hover:text-white",
            )}
          >
            <ImageIcon className="size-5" />
            <span>Image Studio</span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === "voice" ? null : "voice")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer",
              activeTool === "voice" ? "text-cyan-300" : "hover:text-white",
            )}
          >
            <Volume2 className="size-5" />
            <span>AI Voice</span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === "shapes" ? null : "shapes")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer",
              activeTool === "shapes" ? "text-cyan-300" : "hover:text-white",
            )}
          >
            <Shapes className="size-5" />
            <span>Shapes</span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === "theme" ? null : "theme")}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer",
              activeTool === "theme" ? "text-cyan-300" : "hover:text-white",
            )}
          >
            <Palette className="size-5" />
            <span>Theme</span>
          </button>
        </footer>
      )}

      {/* Share Presentation Modal */}
      <SharePresentationModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        deck={currentDeck}
        onDeckUpdated={(updated) => {
          setCurrentDeck(updated);
        }}
      />
    </div>
  );
}
