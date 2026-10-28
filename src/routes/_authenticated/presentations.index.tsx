import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import {
  listPresentations,
  generatePresentation,
  generatePresentationOutline,
  deletePresentation,
} from "@/lib/presentations.functions";
import {
  Sparkles,
  Plus,
  Trash2,
  Presentation,
  Loader2,
  X,
  Image as ImageIcon,
  Pencil,
  Search,
  MessageSquare,
  Cpu,
  Telescope,
  Play,
  Share2,
  ArrowRight,
  Users,
  Folder,
  Layers,
  ChevronRight,
  ChevronDown,
  Film,
  Download,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  loadAllPresentations,
  saveAllPresentations,
  getCurrentUserEmail,
  type PresentationDeckItem,
} from "@/lib/presentations-store";
import { SharePresentationModal } from "@/components/share-presentation-modal";

export const Route = createFileRoute("/_authenticated/presentations/")({
  head: () => ({
    meta: [
      { title: "Presentation Maker — My AI Pro" },
      {
        name: "description",
        content:
          "AI presentation and slide deck generator with visual canvas editing, real-time collaboration, and sharing.",
      },
      { property: "og:title", content: "Presentation Maker — My AI Pro" },
      {
        property: "og:description",
        content: "Generate editable slide decks with AI in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PresentationsIndexPage,
});

type TabType = "created" | "shared";

function PresentationsIndexPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listPresentations);
  const genFn = useServerFn(generatePresentation);
  const outlineFn = useServerFn(generatePresentationOutline);
  const delFn = useServerFn(deletePresentation);

  const [activeTab, setActiveTab] = useState<TabType>("created");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState<number>(5);
  const [selectedStyle, setSelectedStyle] = useState<string>("photorealistic");
  const [autoGenerateImages, setAutoGenerateImages] = useState<boolean>(true);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genStage, setGenStage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [decks, setDecks] = useState<PresentationDeckItem[]>(() => loadAllPresentations());
  const [activeShareDeck, setActiveShareDeck] = useState<PresentationDeckItem | null>(null);

  // Executive Outline Confirmation Flow matching user screenshot
  const [outline, setOutline] = useState<{
    userPrompt: string;
    title: string;
    slides: Array<{ title: string; bullets: string[]; layout?: string }>;
  } | null>(null);
  const [expandedOutlineIdx, setExpandedOutlineIdx] = useState<number | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  const currentEmail = useMemo(() => getCurrentUserEmail(), []);

  // Sync server decks with local decks
  const { data: serverDecks = [] } = useQuery({
    queryKey: ["presentations"],
    queryFn: () => listFn(),
  });

  useEffect(() => {
    function refreshDecks() {
      setDecks(loadAllPresentations());
    }
    window.addEventListener("myaipro_presentations_updated", refreshDecks);
    return () => window.removeEventListener("myaipro_presentations_updated", refreshDecks);
  }, []);

  useEffect(() => {
    if (serverDecks && Array.isArray(serverDecks) && serverDecks.length > 0) {
      setDecks((prev) => {
        const map = new Map<string, PresentationDeckItem>();
        for (const d of prev) map.set(d.id, d);
        for (const s of serverDecks) {
          if (!map.has(s.id)) {
            map.set(s.id, {
              id: s.id,
              title: s.title,
              topic: s.topic,
              ownerEmail: currentEmail,
              sharedWith: [],
              slideCount: (s.slides ?? []).length || 5,
              cover: s.cover || s.slides?.[0]?.image_url || null,
              slides: s.slides || [],
              updated_at: s.updated_at || new Date().toISOString(),
            });
          }
        }
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime(),
        );
        saveAllPresentations(merged);
        return merged;
      });
    }
  }, [serverDecks, currentEmail]);

  // Outline Generation Handler
  async function handleRequestOutline() {
    if (!topic.trim()) {
      toast.error("Please enter a presentation topic or idea");
      return;
    }
    setIsGeneratingOutline(true);
    try {
      const res = await outlineFn({
        data: {
          topic: topic.trim(),
          slideCount: count,
        },
      });
      if (res && res.slides) {
        setOutline({
          userPrompt: topic.trim(),
          title: res.title || topic.trim(),
          slides: res.slides,
        });
        setExpandedOutlineIdx(0);
        toast.success("Presentation outline generated! Confirm to create slides.");
      }
    } catch {
      toast.error("Could not generate outline. Please try again.");
    } finally {
      setIsGeneratingOutline(false);
    }
  }

  // Generation mutation: accepts confirmed outline slides
  const genMut = useMutation({
    mutationFn: async (customOutlineSlides?: Array<{ title: string; bullets: string[]; layout?: string }>) => {
      const activeTopic = outline?.userPrompt || topic;
      if (!activeTopic.trim()) {
        toast.error("Please enter a presentation topic or idea");
        return;
      }
      setGenerating(true);
      setGenProgress(15);
      setGenStage("Researching key themes & structuring narrative...");

      const startTime = Date.now();
      const targetDuration = 10000;

      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(95, Math.floor((elapsed / targetDuration) * 95));
        setGenProgress(pct);

        if (elapsed < 3000) {
          setGenStage("Structuring slide flow & executive narrative (1/4)...");
        } else if (elapsed < 6000) {
          setGenStage("Writing concise bullet points & data points (2/4)...");
        } else if (elapsed < 9000) {
          setGenStage(
            selectedStyle === "ghibli"
              ? "Generating Studio Ghibli art style aesthetics (3/4)..."
              : "Applying high-contrast visual themes & typography (3/4)...",
          );
        } else {
          setGenStage("Finalizing slides for Canva-style editing (4/4)...");
        }
      }, 350);

      try {
        const isGhibli = selectedStyle === "ghibli" || /ghibli|anime|watercolor/i.test(activeTopic);
        const slidesToUse = customOutlineSlides || outline?.slides;
        const [res] = await Promise.all([
          genFn({
            data: {
              topic: activeTopic.trim(),
              slideCount: slidesToUse?.length || 5,
              style: isGhibli ? "ghibli" : selectedStyle,
              includeImages: autoGenerateImages,
              outlineSlides: slidesToUse,
            },
          }),
          new Promise((r) => setTimeout(r, 4500)),
        ]);
        clearInterval(timer);
        setGenProgress(100);
        setGenStage("Ready!");
        return res;
      } catch (err) {
        clearInterval(timer);
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    onSuccess: (d: any) => {
      if (!d) return;
      toast.success("Presentation generated successfully!");
      qc.invalidateQueries({ queryKey: ["presentations"] });

      const newDeck: PresentationDeckItem = {
        id: d.id,
        title: d.title ?? (outline?.title || topic),
        topic: (outline?.userPrompt || topic).trim(),
        ownerEmail: currentEmail,
        sharedWith: [],
        slides: d.slides ?? [],
        slideCount: (d.slides ?? []).length,
        cover: d.slides?.[0]?.image_url ?? null,
        updated_at: new Date().toISOString(),
      };

      const updatedList = [newDeck, ...decks.filter((p) => p.id !== d.id)];
      setDecks(updatedList);
      saveAllPresentations(updatedList);
      setTopic("");
      setOutline(null);
      navigate({ to: `/presentations/${d.id}` });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to generate presentation");
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const updated = decks.filter((d) => d.id !== id);
      setDecks(updated);
      saveAllPresentations(updated);
      await delFn({ data: { id } }).catch(() => {});
      return id;
    },
    onSuccess: () => {
      toast.success("Presentation deleted");
      qc.invalidateQueries({ queryKey: ["presentations"] });
    },
  });

  // Filtered decks: Created by us vs Shared with us
  const filteredDecks = useMemo(() => {
    let list = decks;
    if (activeTab === "created") {
      list = list.filter((d) => {
        if (d.isSharedWithMe) return false;
        if (!d.ownerEmail) return true;
        return d.ownerEmail.toLowerCase() === currentEmail.toLowerCase();
      });
    } else {
      list = list.filter((d) => {
        if (d.isSharedWithMe) return true;
        if (d.ownerEmail && d.ownerEmail.toLowerCase() !== currentEmail.toLowerCase()) return true;
        return d.sharedWith && d.sharedWith.some((c) => c.email.toLowerCase() === currentEmail.toLowerCase());
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.topic && d.topic.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [decks, activeTab, currentEmail, searchQuery]);

  const createdCount = useMemo(() => {
    return decks.filter((d) => !d.isSharedWithMe && (!d.ownerEmail || d.ownerEmail.toLowerCase() === currentEmail.toLowerCase())).length;
  }, [decks, currentEmail]);

  const sharedCount = useMemo(() => {
    return decks.filter((d) => d.isSharedWithMe || (d.ownerEmail && d.ownerEmail.toLowerCase() !== currentEmail.toLowerCase())).length;
  }, [decks, currentEmail]);

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col bg-[#070e20] text-blue-100 font-sans overflow-x-hidden">
      {/* Ambient Cosmic Blue Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-1/4 size-[480px] rounded-full bg-blue-600/10 blur-[150px]" />
        <div className="absolute bottom-10 right-10 size-[400px] rounded-full bg-indigo-600/10 blur-[150px]" />
      </div>

      {/* 1. TOP NAVIGATION APP SWITCHER (AI Chat, No-code, Research, Presentations, Projects) */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-blue-500/20 bg-[#081226]/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1">
          <Link
            to="/chat"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-blue-200/70 hover:bg-blue-600/20 hover:text-white transition cursor-pointer shrink-0"
          >
            <MessageSquare className="size-3.5 text-blue-400" />
            <span>AI Chat</span>
          </Link>

          <Link
            to="/build"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-blue-200/70 hover:bg-blue-600/20 hover:text-white transition cursor-pointer shrink-0"
          >
            <Cpu className="size-3.5 text-indigo-400" />
            <span>No-Code</span>
          </Link>

          <Link
            to="/projects"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-blue-200/70 hover:bg-blue-600/20 hover:text-white transition cursor-pointer shrink-0"
          >
            <Folder className="size-3.5 text-sky-400" />
            <span>Projects & DB</span>
          </Link>

          <Link
            to="/research"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-blue-200/70 hover:bg-blue-600/20 hover:text-white transition cursor-pointer shrink-0"
          >
            <Telescope className="size-3.5 text-cyan-400" />
            <span>Research</span>
          </Link>

          {/* Active Tab */}
          <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 shrink-0">
            <Presentation className="size-3.5" />
            <span>Presentation Maker</span>
          </div>
        </div>

        <Link
          to="/chat"
          className="rounded-full border border-blue-500/30 bg-[#0c1938] px-3.5 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-600/20 hover:text-white transition cursor-pointer shrink-0"
        >
          Back to Chat
        </Link>
      </header>

      {/* 2. MAIN HERO SECTION & PROMPT INPUT PLACE */}
      <main className="relative z-10 flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/30 mb-2">
            <Presentation className="size-7" />
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Presentation Maker
          </h1>
          <p className="mx-auto max-w-lg text-xs sm:text-sm text-blue-200/80 leading-relaxed">
            Type any presentation topic, startup pitch, or report. My AI creates structured slides with themes, speaker notes, and an editable Canva-style editor.
          </p>
        </div>

        {/* Dedicated Prompt Input Place Card matching Cosmic Midnight Blue Theme */}
        <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-b from-[#0c1938] to-[#081226] p-4 sm:p-6 shadow-2xl shadow-blue-950/50 space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-blue-300">
              What would you like to present?
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (topic.trim() && !generating) genMut.mutate();
                }
              }}
              rows={3}
              placeholder="E.g. AI Strategy & Enterprise Roadmap 2026, Series A Pitch Deck for FinTech, Climate Tech Innovations..."
              className="w-full resize-none rounded-2xl border border-blue-500/30 bg-[#070e20] p-4 text-sm text-white placeholder:text-blue-300/40 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
            />
          </div>

          {/* Configuration Toolbar: Slide Count & Style Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-blue-500/20">
            {/* Number of Slides */}
            <div className="flex items-center gap-1.5 text-xs text-blue-200">
              <span className="font-medium text-blue-300/70 mr-1">Slides:</span>
              {[4, 5, 6, 8, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={cn(
                    "rounded-xl px-2.5 py-1 text-xs font-semibold transition cursor-pointer",
                    count === n
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-[#070e20] text-blue-300/70 hover:text-white border border-blue-500/20",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Visual Style */}
            <div className="flex items-center gap-1.5 text-xs text-blue-200 overflow-x-auto">
              <span className="font-medium text-blue-300/70 mr-1">Style:</span>
              {[
                { id: "standard", label: "Executive Modern" },
                { id: "tech", label: "Midnight Tech" },
                { id: "minimal", label: "Clean Minimal" },
                { id: "ghibli", label: "Studio Ghibli Art" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStyle(st.id as any)}
                  className={cn(
                    "rounded-xl px-3 py-1 text-xs font-semibold transition cursor-pointer whitespace-nowrap",
                    selectedStyle === st.id
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs"
                      : "bg-[#070e20] text-blue-300/70 hover:text-white border border-blue-500/20",
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Generate Outline Action Button matching Canva/Gemini flow */}
            <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
              <button
                type="button"
                disabled={!topic.trim() || isGeneratingOutline || generating}
                onClick={handleRequestOutline}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/30 hover:brightness-110 active:scale-95 disabled:opacity-40 transition cursor-pointer w-full sm:w-auto"
              >
                {isGeneratingOutline ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-white" />
                    <span>Planning Outline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    <span>Generate Outline</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={!topic.trim() || generating}
                onClick={() => genMut.mutate()}
                title="Directly generate slides without reviewing outline"
                className="hidden sm:inline-flex items-center justify-center rounded-2xl border border-blue-500/30 bg-[#070e20] px-3.5 py-2.5 text-xs font-semibold text-blue-200 hover:text-white hover:bg-blue-600/20 transition cursor-pointer"
              >
                Instant
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          {generating && (
            <div className="pt-3 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-blue-300">
                <span className="font-medium flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-cyan-400 animate-spin" />
                  {genStage}
                </span>
                <span className="font-mono text-cyan-300">{genProgress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-950">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${genProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================================== */}
        {/* CANVA & GOOGLE GEMINI PRESENTATION OUTLINE CONFIRMATION CARD (Matches User Screenshot) */}
        {/* ==================================================================================== */}
        {outline && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* User prompt chat bubble on top right matching Canva UI */}
            <div className="flex justify-end">
              <div className="max-w-md rounded-3xl bg-gradient-to-br from-cyan-900/60 via-blue-900/60 to-purple-900/60 border border-cyan-400/30 p-4 text-xs sm:text-sm text-white shadow-xl leading-relaxed">
                <p className="font-medium">{outline.userPrompt}</p>
              </div>
            </div>

            {/* Presentation Outline Card Container matching user's Canva screenshot */}
            <div className="rounded-[32px] border border-blue-400/30 bg-white/95 dark:bg-[#0c1938] text-zinc-900 dark:text-white p-5 sm:p-7 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-white">
                    Presentation outline
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-blue-300/70 mt-0.5">
                    Topic: <span className="font-semibold">{outline.title}</span> ({outline.slides.length} slides)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOutline(null)}
                  className="size-7 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-blue-950/70 text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Accordion Slide List matching Canva layout in screenshot */}
              <div className="space-y-2.5">
                {outline.slides.map((s, idx) => {
                  const isExpanded = expandedOutlineIdx === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-zinc-200 dark:border-blue-500/25 bg-zinc-50 dark:bg-[#081226] overflow-hidden transition"
                    >
                      {/* Accordion Header Capsule */}
                      <button
                        type="button"
                        onClick={() => setExpandedOutlineIdx(isExpanded ? null : idx)}
                        className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-zinc-100 dark:hover:bg-blue-900/20 transition cursor-pointer"
                      >
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate pr-2">
                          {s.title}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-blue-950 text-zinc-600 dark:text-blue-300">
                            Slide {idx + 1}
                          </span>
                          <ChevronDown
                            className={cn(
                              "size-4 text-zinc-400 transition-transform duration-200",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </div>
                      </button>

                      {/* Expanded Accordion Body */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-zinc-200/80 dark:border-blue-500/20 bg-white dark:bg-[#070e20]/60">
                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-blue-300/70 block mb-1">
                              Slide Title:
                            </label>
                            <input
                              type="text"
                              value={s.title}
                              onChange={(e) => {
                                const next = [...outline.slides];
                                next[idx] = { ...next[idx], title: e.target.value };
                                setOutline({ ...outline, slides: next });
                              }}
                              className="w-full rounded-xl border border-zinc-300 dark:border-blue-500/30 bg-zinc-50 dark:bg-[#0c1938] px-3 py-1.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-blue-300/70 block mb-1">
                              Bullet Points / Core Insights:
                            </label>
                            <div className="space-y-1.5">
                              {s.bullets.map((b, bIdx) => (
                                <div key={bIdx} className="flex items-center gap-1.5">
                                  <span className="text-zinc-400 dark:text-blue-400 text-xs">•</span>
                                  <input
                                    type="text"
                                    value={b}
                                    onChange={(e) => {
                                      const next = [...outline.slides];
                                      const newBullets = [...next[idx].bullets];
                                      newBullets[bIdx] = e.target.value;
                                      next[idx] = { ...next[idx], bullets: newBullets };
                                      setOutline({ ...outline, slides: next });
                                    }}
                                    className="flex-1 rounded-lg border border-zinc-200 dark:border-blue-500/20 bg-transparent px-2.5 py-1 text-xs text-zinc-800 dark:text-blue-100 outline-none focus:border-blue-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...outline.slides];
                                      next[idx] = {
                                        ...next[idx],
                                        bullets: next[idx].bullets.filter((_, i) => i !== bIdx),
                                      };
                                      setOutline({ ...outline, slides: next });
                                    }}
                                    className="text-zinc-400 hover:text-red-500 p-1"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...outline.slides];
                                  next[idx] = {
                                    ...next[idx],
                                    bullets: [...next[idx].bullets, "Key milestone or strategic point"],
                                  };
                                  setOutline({ ...outline, slides: next });
                                }}
                                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-cyan-400 pt-1 hover:underline cursor-pointer"
                              >
                                <Plus className="size-3" /> Add bullet point
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (outline.slides.length <= 1) {
                                  toast.error("Outline must have at least one slide");
                                  return;
                                }
                                const next = outline.slides.filter((_, i) => i !== idx);
                                setOutline({ ...outline, slides: next });
                              }}
                              className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                            >
                              <Trash2 className="size-3" /> Delete slide
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Slide to Outline */}
              <button
                type="button"
                onClick={() => {
                  const next = [
                    ...outline.slides,
                    {
                      title: `New Slide ${outline.slides.length + 1}`,
                      bullets: ["Key strategy point or execution finding"],
                    },
                  ];
                  setOutline({ ...outline, slides: next });
                  setExpandedOutlineIdx(next.length - 1);
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-300 dark:border-blue-500/30 py-2.5 text-xs font-semibold text-zinc-600 dark:text-blue-300 hover:bg-zinc-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Add another slide to outline</span>
              </button>

              {/* Open-Generative-AI Image Generation Options */}
              <div className="rounded-2xl border border-zinc-200 dark:border-blue-500/25 bg-zinc-50/80 dark:bg-[#070e20]/80 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-cyan-400" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      Open-Generative-AI Image Synthesis
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-cyan-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoGenerateImages}
                      onChange={(e) => setAutoGenerateImages(e.target.checked)}
                      className="size-3.5 accent-blue-600 rounded cursor-pointer"
                    />
                    <span>Generate AI slide visuals</span>
                  </label>
                </div>

                {autoGenerateImages && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-blue-300/70 block mb-1.5">
                      Visual Style Preset:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "photorealistic", label: "📸 Photorealistic" },
                        { id: "cinematic", label: "🎬 Cinematic 35mm" },
                        { id: "ghibli", label: "🎨 Studio Ghibli" },
                        { id: "3d_render", label: "🧊 3D Render" },
                        { id: "vector", label: "📐 Vector Flat Art" },
                        { id: "minimalist", label: "💼 Minimalist Keynote" },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setSelectedStyle(st.id)}
                          className={cn(
                            "rounded-xl px-2.5 py-1 text-xs font-semibold transition cursor-pointer",
                            selectedStyle === st.id
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-white dark:bg-[#0c1938] text-zinc-700 dark:text-blue-200 border border-zinc-200 dark:border-blue-500/20 hover:bg-zinc-100 dark:hover:bg-blue-900/30",
                          )}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ✨ Generate Presentation Confirmation Button matching user screenshot */}
              <button
                type="button"
                disabled={generating}
                onClick={() => genMut.mutate(outline.slides)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/40 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 active:scale-[0.99] p-3.5 text-sm sm:text-base font-bold text-white shadow-xl shadow-blue-500/30 transition cursor-pointer"
              >
                {generating ? (
                  <>
                    <Loader2 className="size-5 animate-spin text-white" />
                    <span>Synthesizing Presentation Visuals...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-5 text-cyan-300" />
                    <span>✨ Generate presentation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 3. TABS BELOW PROMPT INPUT: "Created by us" vs "Shared with us" */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-500/20 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full bg-[#0c1938] border border-blue-500/30 p-1 shadow-inner">
                {/* Created by us tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab("created")}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer",
                    activeTab === "created"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                      : "text-blue-300/70 hover:text-white",
                  )}
                >
                  <Layers className="size-3.5" />
                  <span>Created by us</span>
                  <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                    {createdCount}
                  </span>
                </button>

                {/* Shared with us tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab("shared")}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer",
                    activeTab === "shared"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                      : "text-blue-300/70 hover:text-white",
                  )}
                >
                  <Users className="size-3.5" />
                  <span>Shared with us</span>
                  <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                    {sharedCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Search filter input */}
            <div className="relative flex items-center min-w-[200px]">
              <Search className="absolute left-3 size-3.5 text-blue-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search presentations..."
                className="w-full rounded-full border border-blue-500/30 bg-[#0c1938] pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-blue-300/40 outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* 4. PRESENTATIONS GRID */}
          {filteredDecks.length === 0 ? (
            <div className="rounded-3xl border border-blue-500/20 bg-[#0c1938]/40 p-12 text-center space-y-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30 mx-auto text-blue-400">
                {activeTab === "created" ? <Presentation className="size-7" /> : <Users className="size-7" />}
              </div>
              <h3 className="text-base font-bold text-white">
                {activeTab === "created" ? "No presentations created yet" : "No presentations shared with you yet"}
              </h3>
              <p className="text-xs text-blue-300/70 max-w-md mx-auto">
                {activeTab === "created"
                  ? "Type any topic in the prompt box above to generate your first editable slide deck."
                  : "When friends or collaborators share a presentation with your email, it will appear here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDecks.map((deck) => {
                const isOwner = !deck.isSharedWithMe && (!deck.ownerEmail || deck.ownerEmail.toLowerCase() === currentEmail.toLowerCase());
                const userRole = deck.userRole || (isOwner ? "owner" : "view");

                return (
                  <div
                    key={deck.id}
                    className="group relative flex flex-col justify-between rounded-3xl border border-blue-500/25 bg-[#0c1938] overflow-hidden shadow-lg hover:border-blue-400/60 transition hover:shadow-blue-950/50"
                  >
                    {/* Slide Cover Preview Thumbnail */}
                    <div
                      onClick={() => navigate({ to: `/presentations/${deck.id}` })}
                      className="relative aspect-video w-full overflow-hidden bg-gradient-to-tr from-slate-950 to-[#070e20] cursor-pointer"
                    >
                      {deck.cover || deck.slides?.[0]?.image_url ? (
                        <img
                          src={deck.cover || deck.slides?.[0]?.image_url}
                          alt={deck.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col justify-between p-4 bg-gradient-to-br from-blue-950/80 via-slate-900 to-indigo-950/90 text-left">
                          <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest">
                            Slide Preview
                          </span>
                          <h4 className="font-serif text-base font-bold text-white line-clamp-2">
                            {deck.title}
                          </h4>
                          <span className="text-[11px] text-blue-300/70">
                            {deck.slideCount || deck.slides?.length || 5} structured slides
                          </span>
                        </div>
                      )}

                      {/* Badges Overlay */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                          {deck.slideCount || deck.slides?.length || 5} slides
                        </span>
                        {!isOwner && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-md border",
                              userRole === "edit"
                                ? "bg-emerald-500/30 border-emerald-400/40 text-emerald-200"
                                : "bg-blue-500/30 border-blue-400/40 text-blue-200",
                            )}
                          >
                            {userRole === "edit" ? "Can edit" : "View only"}
                          </span>
                        )}
                      </div>

                      {/* Play Preview Overlay Icon */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition backdrop-blur-xs">
                        <div className="flex size-11 items-center justify-center rounded-full bg-white text-zinc-900 shadow-xl">
                          <Play className="size-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3
                          onClick={() => navigate({ to: `/presentations/${deck.id}` })}
                          className="font-bold text-sm text-white line-clamp-1 hover:text-blue-300 transition cursor-pointer"
                        >
                          {deck.title}
                        </h3>
                        <p className="text-[11px] text-blue-300/70 line-clamp-1 mt-0.5">
                          {deck.topic || "AI Generated Presentation"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-blue-500/20 text-xs">
                        <span className="text-[10px] text-blue-300/50 font-mono">
                          {new Date(deck.updated_at).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Share button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveShareDeck(deck);
                            }}
                            className="flex size-7 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/40 hover:text-white transition"
                            title="Share presentation with friends"
                          >
                            <Share2 className="size-3.5" />
                          </button>

                          {/* Delete button (only for owners) */}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${deck.title}"?`)) {
                                  delMut.mutate(deck.id);
                                }
                              }}
                              className="flex size-7 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition"
                              title="Delete presentation"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}

                          {/* Open Button */}
                          <button
                            type="button"
                            onClick={() => navigate({ to: `/presentations/${deck.id}` })}
                            className="flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1 text-xs font-semibold text-white transition"
                          >
                            <span>Open</span>
                            <ChevronRight className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Share Presentation Modal */}
      <SharePresentationModal
        isOpen={Boolean(activeShareDeck)}
        onClose={() => setActiveShareDeck(null)}
        deck={activeShareDeck}
        onDeckUpdated={(updated) => {
          setDecks((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
          setActiveShareDeck(updated);
        }}
      />
    </div>
  );
}
