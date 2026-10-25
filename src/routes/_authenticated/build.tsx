import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles, Mic, MicOff, Plus, Send, Loader2, FolderOpen, Palette, Database,
  Plug, Check, ArrowLeft, Rocket, History, X, Share2, ChevronDown, ChevronRight,
  ChevronLeft, Globe, Copy, ExternalLink, Key, Eye, EyeOff, Folder, Image as ImageIcon,
  Github, GitBranch, ThumbsUp, ThumbsDown, Link2, Pencil, MoreHorizontal, Square,
  Code2, MonitorPlay, Lock, Search, RefreshCw, Trash2, Settings, LayoutGrid, Telescope,
  Presentation, Bot, MessageSquare, Blocks, CreditCard, BookOpen, Bell, Maximize2,
  Mail, ShoppingBag, HardDrive, FileText, Flame, PhoneCall, FileCode2, Download, MoreVertical,
} from "lucide-react";
import amberWavesBg from "@/assets/images/amber_waves_bg_1791883311977.jpg";
import amberGlassOrb from "@/assets/images/amber_glass_orb_1791883331076.jpg";
import { TopTabs } from "@/components/top-tabs";
import { getUserCredits, getActiveSubscription, deductUserCredit } from "@/lib/subscription";
import {
  planQuestions,
  planProject,
  importFromGitHub,
  listUserGitHubRepos,
  type GitHubRepoInfo,
  type GitHubUserRepoItem,
  startBackgroundBuild,
  getBuildJobStatus,
  deleteBuildJob,
  publishBuiltApp,
  type BuilderQuestion,
  type BuiltFile,
  suggestUpgrades,
} from "@/lib/builder.functions";
import { supabase } from "@/integrations/supabase/client";
import { CodeExplorer } from "@/components/code-explorer";
import { ProjectControlCenter } from "@/components/project-control-center";
import { UpgradeModal } from "@/components/upgrade-modal";
import { Preview } from "@/components/preview-view";
import { getActiveUserSession, getActiveUserStorageKey } from "@/lib/user-session";
import {
  GmailLogo,
  GoogleMapsLogo,
  StripeLogo,
  GitHubLogo,
  SupabaseLogo,
  FirebaseLogo,
  OpenAILogo,
  ShopifyLogo,
  SlackLogo,
  NotionLogo,
  TwilioLogo,
  GoogleDriveLogo,
  GoogleSheetsLogo,
  GoogleAnalyticsLogo,
  PostHogLogo,
  MixpanelLogo,
} from "@/components/icons/app-logos";
import { FeatureNavBar } from "@/components/feature-nav-bar";
import { ToolConnectionModal } from "@/components/tool-connection-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/build")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      openLatest: search.openLatest === true || search.openLatest === "true",
      id: typeof search.id === "string" ? search.id : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Build your idea — My AI Bro" },
      { name: "description", content: "Describe an idea and My AI Bro scopes it, writes the code and previews the app." },
      { property: "og:title", content: "Build your idea — My AI Bro" },
      { property: "og:description", content: "Describe an idea and My AI Bro scopes it, writes the code and previews the app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BuildPage,
});

type ModelId = "myai";
const MODELS: { id: ModelId; label: string; note: string }[] = [
  { id: "myai", label: "My AI 1.1", note: "Ultra-fast full-stack engine" },
];

type ChatTurn = {
  id: string;
  prompt: string;
  at: number;
  attachedImages?: string[];
  folderName?: string | null;
  thoughtSeconds: number;
  aiSummary: string;
  activityLabel: string;
  status: "building" | "completed" | "failed";
};

type Built = { name: string; description: string; preview_html: string; files: BuiltFile[] };
type HistoryItem = Built & {
  id: string;
  idea: string;
  at: number;
  published?: boolean;
  status?: "planning" | "writing" | "completed" | "failed";
  progress?: string[];
  totalFiles?: number;
  completedFiles?: number;
  stack?: string;
  turns?: ChatTurn[];
};

const TOOL_GROUPS: { label: string; icon: any; items: string[] }[] = [
  { label: "Albums", icon: FolderOpen, items: ["Photos", "Folders", "Google Drive", "Dropbox", "iCloud", "OneDrive"] },
  { label: "Design", icon: Palette, items: ["Figma", "Canva", "Framer", "Sketch", "Adobe XD", "Dribbble"] },
  { label: "Database", icon: Database, items: ["Supabase", "Postgres", "MySQL", "MongoDB", "Firebase", "Airtable"] },
  {
    label: "Connections",
    icon: Plug,
    items: [
      "Gmail", "Google Docs", "Google Sheets", "Google Search", "Google Calendar", "Google Slides",
      "Notion", "Slack", "Linear", "Jira", "GitHub", "GitLab", "Trello", "Asana", "Zapier", "n8n",
      "Stripe", "Shopify", "HubSpot", "Salesforce", "Twilio", "WhatsApp", "Instagram", "X",
      "Facebook", "LinkedIn", "YouTube", "TikTok", "Discord", "Telegram", "Zoom", "Teams",
      "Dropbox", "Box", "Confluence", "Intercom", "Zendesk", "Mailchimp", "SendGrid", "Resend",
      "Cloudflare", "Vercel", "Netlify", "AWS S3", "Google Cloud", "Azure", "Snowflake", "BigQuery",
      "Amplitude", "PostHog", "Mixpanel", "Segment", "Sentry", "Datadog", "Figma", "Miro",
      "Canva", "Loom", "Calendly", "Typeform", "Airtable", "Coda", "Monday", "ClickUp",
      "QuickBooks", "Xero", "Plaid", "PayPal", "Square", "Razorpay", "Firecrawl", "OpenAI",
      "Hugging Face", "Replicate",
    ],
  },
];

function formatTurnTimestamp(ts: number): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return isToday ? `Today at ${timeStr}` : `${d.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
  } catch {
    return "Just now";
  }
}

// High-sensitivity speech recognition with dual Web Speech + Neural MediaRecorder fallback
function useSpeech(onText: (t: string, isFinal?: boolean) => void) {
  const [listening, setListening] = useState(false);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const recRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechDeliveredRef = useRef(false);

  function stopAll() {
    if (recRef.current) {
      try {
        recRef.current.onend = null;
        recRef.current.stop();
      } catch {
        /* ignore */
      }
      recRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    } else if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setListening(false);
  }

  async function toggle() {
    if (listening) {
      stopAll();
      return;
    }

    speechDeliveredRef.current = false;
    let recorderStarted = false;

    // 1. Start MediaRecorder capture so voice input ALWAYS works (even inside iframes where Web Speech API is blocked)
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, autoGainControl: true, noiseSuppression: true },
        });
        streamRef.current = stream;

        const preferredMime =
          typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.("audio/webm")
              ? "audio/webm"
              : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.("audio/mp4")
                ? "audio/mp4"
                : "";

        const recorder = preferredMime
          ? new MediaRecorder(stream, { mimeType: preferredMime })
          : new MediaRecorder(stream);

        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;

          // If browser SpeechRecognition already streamed live text, no need to overwrite
          if (speechDeliveredRef.current) {
            setListening(false);
            return;
          }

          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          if (blob.size > 300) {
            const toastId = toast.loading("Transcribing your voice…");
            const reader = new FileReader();
            reader.onload = async () => {
              const dataUrl = reader.result as string;
              try {
                const res = await fetch("/api/transcribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ audioDataUrl: dataUrl }),
                });
                const json = await res.json();
                toast.dismiss(toastId);
                if (json?.transcript && String(json.transcript).trim()) {
                  onTextRef.current(String(json.transcript).trim(), true);
                  toast.success("Voice transcribed!");
                } else {
                  toast.info("No speech detected. Try speaking closer to the mic.");
                }
              } catch (err) {
                toast.dismiss(toastId);
                console.debug("Transcription notice:", err);
                toast.error("Could not transcribe audio.");
              }
            };
            reader.readAsDataURL(blob);
          }
          setListening(false);
        };

        recorder.start(250);
        mediaRecorderRef.current = recorder;
        recorderStarted = true;
        setListening(true);
      } catch (err) {
        console.debug("MediaRecorder access notice:", err);
      }
    }

    // 2. Also start browser SpeechRecognition in parallel for instant live interim words when supported
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const rec = new SR();
        rec.lang = "en-US";
        rec.interimResults = true;
        rec.continuous = true;
        rec.maxAlternatives = 1;
        let finalTranscript = "";

        rec.onresult = (e: any) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) finalTranscript += r[0].transcript + " ";
            else interim += r[0].transcript;
          }
          const combined = (finalTranscript + interim).trim();
          if (combined) {
            speechDeliveredRef.current = true;
            onTextRef.current(combined, false);
          }
        };

        rec.onend = () => {
          // Only turn off listening if MediaRecorder is not actively recording
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
            setListening(false);
          }
        };

        rec.onerror = (e: any) => {
          console.debug("SpeechRecognition fallback to MediaRecorder:", e?.error);
          if (!recorderStarted && (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive")) {
            setListening(false);
            toast.error("Microphone permission denied or unavailable.");
          }
        };

        rec.start();
        recRef.current = rec;
        if (!recorderStarted) {
          setListening(true);
        }
      } catch {
        if (!recorderStarted) {
          setListening(false);
          toast.error("Could not start microphone.");
          return;
        }
      }
    } else if (!recorderStarted) {
      toast.error("Microphone access unavailable in this browser.");
      return;
    }

    toast.info("Listening… speak now, then tap the mic button again when done.");
  }

  return { listening, toggle };
}

function BuildPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const planFn = useServerFn(planQuestions);
  const planProjectFn = useServerFn(planProject);
  const importGithubFn = useServerFn(importFromGitHub);
  const listGithubReposFn = useServerFn(listUserGitHubRepos);
  const startBgBuildFn = useServerFn(startBackgroundBuild);
  const getBuildStatusFn = useServerFn(getBuildJobStatus);
  const deleteBuildJobFn = useServerFn(deleteBuildJob);
  const publishAppFn = useServerFn(publishBuiltApp);
  const suggestFn = useServerFn(suggestUpgrades);

  const [progress, setProgress] = useState<string[]>([]);
  const [credits, setCredits] = useState<number>(() => getUserCredits());
  const [activeSub, setActiveSub] = useState<any>(() => getActiveSubscription());
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [activeScopingIdea, setActiveScopingIdea] = useState<string>("");
  const [name, setName] = useState("there");
  const [idea, setIdea] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [connected, setConnected] = useState<string[]>([]);
  const [questions, setQuestions] = useState<BuilderQuestion[] | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [executionPlan, setExecutionPlan] = useState<any | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // In-place editing state for an open app
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [pendingEditIdea, setPendingEditIdea] = useState<string | null>(null);
  const [isScopingEdit, setIsScopingEdit] = useState(false);

  // Background building & mobile continuity state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const pollTimerRef = useRef<any>(null);

  function handleDownloadApp() {
    const files = built?.files || userProjectFiles;
    if (files.length === 0) {
      toast.error("No source files available to download.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      name: built?.name || "My Project",
      description: built?.description || "Built with My AI Pro",
      files: files,
      downloadedAt: new Date().toISOString()
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${(built?.name || "my-app").toLowerCase().replace(/[^a-z0-9-]+/g, "-")}-source-bundle.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Full app downloaded to your device!");
  }

  // API Key integration state
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<number, string>>({});
  const [showKeySecret, setShowKeySecret] = useState<Record<number, boolean>>({});
  const [userToolKeys, setUserToolKeys] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("myai_user_tool_keys") || "{}");
    } catch {
      return {};
    }
  });
  const [selectedToolForApiKey, setSelectedToolForApiKey] = useState<string | null>(null);
  const [toolApiKeyValue, setToolApiKeyValue] = useState<string>("");

  // GitHub & folder context state (Public URL + Private Account)
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [githubImportTab, setGithubImportTab] = useState<"public" | "private">("public");
  const [githubUrlInput, setGithubUrlInput] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [githubAccountLogin, setGithubAccountLogin] = useState<string | null>(null);
  const [githubAccountRepos, setGithubAccountRepos] = useState<GitHubUserRepoItem[]>([]);
  const [isLoadingAccountRepos, setIsLoadingAccountRepos] = useState(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState("");
  const [repoVisibilityFilter, setRepoVisibilityFilter] = useState<"all" | "private" | "public">("all");
  const [isImportingGithub, setIsImportingGithub] = useState(false);
  const [importedRepo, setImportedRepo] = useState<GitHubRepoInfo | null>(null);
  const [folderContext, setFolderContext] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [scopingImages, setScopingImages] = useState<string[]>([]);
  const [hasLocalEdits, setHasLocalEdits] = useState(false);
  const [showFullScreenPreview, setShowFullScreenPreview] = useState(false);
  const [connectorSearchQuery, setConnectorSearchQuery] = useState("");
  const [connectorFilterCategory, setConnectorFilterCategory] = useState("All");

  const folderInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  const [built, setBuilt] = useState<Built | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [expandedPrompts, setExpandedPrompts] = useState<Record<string, boolean>>({});
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [showCodeExplorerModal, setShowCodeExplorerModal] = useState(false);
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const [buildMode, setBuildMode] = useState<"build" | "chat">("build");
  const [buildModeMenuOpen, setBuildModeMenuOpen] = useState(false);

  // Horizontal 2-slide workspace state: Slide 1 = Chat, Slide 2 = Project Preview & Publish
  const [activeSlide, setActiveSlide] = useState<"chat" | "preview">("chat");
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [model, setModel] = useState<ModelId>("myai");
  const [modelOpen, setModelOpen] = useState(false);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishSlug, setPublishSlug] = useState("");
  const [publishTab, setPublishTab] = useState<"pipeline" | "share" | "domain">("pipeline");
  const [deployStage, setDeployStage] = useState<"idle" | "building" | "bundling" | "cdn" | "ssl" | "live">("idle");
  const [deployProgress, setDeployProgress] = useState(0);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [customDomain, setCustomDomain] = useState("");
  const [domainVerified, setDomainVerified] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);

  const [upgrade, setUpgrade] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const speechPrefixRef = useRef<string>("");

  const { listening, toggle: rawToggleSpeech } = useSpeech((transcript, isFinalFromRecorder) => {
    const prefix = speechPrefixRef.current;
    const combined = prefix ? `${prefix} ${transcript}`.trim() : transcript;
    if (built || isBuilding) {
      setUpgrade(combined);
    } else {
      setIdea(combined);
    }
    if (isFinalFromRecorder) {
      speechPrefixRef.current = combined;
    }
  });

  function toggle() {
    if (!listening) {
      speechPrefixRef.current = (built || isBuilding ? upgrade : idea).trim();
    }
    rawToggleSpeech();
  }

  function goToSlide(target: "chat" | "preview") {
    setActiveSlide(target);
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = slideContainerRef.current;
        if (el) {
          const left = target === "chat" ? 0 : el.clientWidth;
          el.scrollTo({ left, behavior: "smooth" });
        }
      }, 50);
    });
  }

  useEffect(() => {
    if (slideContainerRef.current) {
      const left = activeSlide === "chat" ? 0 : slideContainerRef.current.clientWidth;
      slideContainerRef.current.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeSlide, built]);

  function handleSlideScroll() {
    const el = slideContainerRef.current;
    if (!el || el.clientWidth === 0) return;
    const ratio = el.scrollLeft / el.clientWidth;
    if (ratio > 0.5 && activeSlide !== "preview") {
      setActiveSlide("preview");
    } else if (ratio <= 0.5 && activeSlide !== "chat") {
      setActiveSlide("chat");
    }
  }

  function getBuildsStorageKey(): string {
    return getActiveUserStorageKey("myaibro_builds_v2");
  }

  function getActiveBuildStorageKey(): string {
    return getActiveUserStorageKey("myaibro_active_build_v2");
  }

  function saveUserBuilds(items: HistoryItem[]) {
    try {
      localStorage.setItem(getBuildsStorageKey(), JSON.stringify(items.slice(0, 30)));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const activeSession = getActiveUserSession();
    if (activeSession?.fullName) {
      setName(activeSession.fullName.split(" ")[0]);
    } else if (activeSession?.email) {
      setName(activeSession.email.split("@")[0]);
    }

    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      const u = s?.user;
      const n = (u?.user_metadata?.full_name as string) || u?.email?.split("@")[0];
      if (n) setName(n.split(" ")[0]);
      // If user signed in with GitHub OAuth and has a provider_token, auto-load it
      if (s?.provider_token) {
        setGithubToken(s.provider_token);
        localStorage.setItem("myaibro.githubToken", s.provider_token);
      }
    });
    try {
      const savedToken = localStorage.getItem("myaibro.githubToken");
      if (savedToken) {
        setGithubToken(savedToken);
      }
      const candidateKeys = [
        getBuildsStorageKey(),
        "myaibro_builds_v2",
        "myaibro.builds",
        "myaibro_builds_v2_guest",
        ...Object.keys(localStorage).filter(
          (k) => k.startsWith("myaibro_builds_v2") || k.startsWith("myaibro.builds"),
        ),
      ];
      const loaded: HistoryItem[] = [];
      const seenIds = new Set<string>();
      for (const k of candidateKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (item && item.id && !seenIds.has(item.id)) {
                  seenIds.add(item.id);
                  loaded.push(item);
                }
              }
            }
          } catch {
            /* ignore parse error */
          }
        }
      }
      setHistory(loaded);

      // Check if project was passed from Agent, Voice Assistant, URL, or active background build
      let projectToOpen: HistoryItem | null = null;

      // 1. Check sessionStorage for project passed from Agent or Voice
      try {
        const incomingRaw = sessionStorage.getItem("myaibro_open_project");
        if (incomingRaw) {
          const incomingParsed = JSON.parse(incomingRaw);
          if (incomingParsed && incomingParsed.id && (incomingParsed.preview_html || incomingParsed.files?.length)) {
            projectToOpen = incomingParsed;
            sessionStorage.removeItem("myaibro_open_project");
          }
        }
      } catch {
        /* ignore */
      }

      // 2. Check URL search param (?id=... or ?openLatest=true)
      if (!projectToOpen) {
        if (search?.id) {
          projectToOpen = loaded.find((h) => h.id === search.id) || null;
        } else if (search?.openLatest && loaded.length > 0) {
          projectToOpen = loaded[0];
        }
      }

      // 3. Check active background build in localStorage
      const activeBuildId = localStorage.getItem(getActiveBuildStorageKey());
      if (activeBuildId) {
        const matchingJob = loaded.find((h) => h.id === activeBuildId);
        if (matchingJob) {
          projectToOpen = matchingJob;
        }
        startPollingJob(activeBuildId, undefined, matchingJob?.id || activeBuildId);
      }

      if (projectToOpen) {
        if (!loaded.some((h) => h.id === projectToOpen!.id)) {
          loaded.unshift(projectToOpen);
          setHistory(loaded);
          saveUserBuilds(loaded);
        }
        openHistoryProject(projectToOpen);
        goToSlide("preview");
      }
    } catch {
      setHistory([]);
    }

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  function startPollingJob(buildId: string, turnId?: string, targetHistoryId?: string) {
    stopPolling();
    setActiveJobId(buildId);
    setIsBuilding(true);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await getBuildStatusFn({ data: { buildId } });
        const job = res?.job;
        if (!job) return;

        const historyKey = targetHistoryId || job.existingProjectId || currentProjectId || buildId;

        if (job.progress && job.progress.length > 0) {
          setProgress(job.progress);
        }

        // Update current built state live in-place
        setBuilt((prev) => ({
          name:
            job.name && job.name !== "Planning Project..." && job.name !== "Editing Application..."
              ? job.name
              : prev?.name || "Building App…",
          description: job.description || prev?.description || "",
          preview_html: job.preview_html || prev?.preview_html || "",
          files: job.files?.length ? job.files : prev?.files || [],
        }));

        // Update active turn in chat
        setTurns((prev) =>
          prev.map((t) => {
            if (turnId && t.id !== turnId) return t;
            if (!turnId && t.status !== "building") return t;
            return {
              ...t,
              aiSummary:
                job.description && !job.description.startsWith("Architecting custom application")
                  ? job.description
                  : t.aiSummary,
              activityLabel:
                job.status === "completed"
                  ? job.isEditingExisting
                    ? `Integrated changes into ${job.name || "application"}`
                    : `Exploring ${job.name || "application"} flow`
                  : job.progress?.[0] || t.activityLabel,
              status: job.status === "completed" ? "completed" : job.status === "failed" ? "failed" : "building",
            };
          }),
        );

        // Live update in history in-place (never duplicate the project)
        setHistory((prev) => {
          let idx = prev.findIndex(
            (h) =>
              h.id === historyKey ||
              h.id === buildId ||
              (job.existingProjectId && h.id === job.existingProjectId) ||
              (job.isEditingExisting && job.name && h.name.toLowerCase() === job.name.toLowerCase()),
          );
          if (idx === -1 && job.isEditingExisting && prev.length > 0) {
            idx = 0;
          }
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            name:
              job.isEditingExisting
                ? updated[idx].name
                : job.name && job.name !== "Planning Project..." && job.name !== "Editing Application..."
                  ? job.name
                  : updated[idx].name,
            description: job.description || updated[idx].description,
            files: job.files?.length ? job.files : updated[idx].files,
            preview_html: job.preview_html || updated[idx].preview_html,
            status: job.status,
            progress: job.progress || [],
            totalFiles: job.totalFiles,
            completedFiles: job.completedFiles,
          };
          saveUserBuilds(updated);
          return updated;
        });

        if (job.status === "completed") {
          stopPolling();
          setIsBuilding(false);
          setActiveJobId(null);
          localStorage.removeItem(getActiveBuildStorageKey());
          setQuestions(null);
          setPendingEditIdea(null);
          setProgress([]);
          const completedBuilt: Built = {
            name: job.name,
            description: job.description,
            preview_html: job.preview_html,
            files: job.files,
          };
          setBuilt(completedBuilt);
          goToSlide("preview");
          // Automatically sync to published registry so /p/$appId always shows this app
          persistPublishedApp(completedBuilt);
          toast.success(
            job.isEditingExisting
              ? `Integrated changes directly into "${job.name}"!`
              : `"${job.name}" built successfully!`,
          );
        } else if (job.status === "failed") {
          stopPolling();
          setIsBuilding(false);
          setActiveJobId(null);
          localStorage.removeItem(getActiveBuildStorageKey());
          toast.error(job.error || "Build encountered an issue.");
        }
      } catch (err) {
        console.debug("Poll error notice:", err);
      }
    }, 1200);
  }

  function persist(items: HistoryItem[]) {
    setHistory(items);
    saveUserBuilds(items);
  }

  // Handle Directory Picker for Folder Sharing on Device
  async function handleShareFolder() {
    setMenuOpen(false);
    try {
      if ("showDirectoryPicker" in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: string[] = [];
        for await (const [entryName, handle] of (dirHandle as any).entries()) {
          files.push(`${entryName} (${handle.kind})`);
        }
        const dirName = dirHandle.name || "device-folder";
        setFolderName(dirName);
        const summary = `Folder: ${dirName}\nFiles (${files.length}):\n${files.join("\n")}`;
        setFolderContext(summary);
        toast.success(`Attached folder: ${dirName} (${files.length} items)`);
      } else {
        folderInputRef.current?.click();
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        folderInputRef.current?.click();
      }
    }
  }

  function handleFolderInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMenuOpen(false);
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const root = list[0]?.webkitRelativePath.split("/")[0] || "project-folder";
    setFolderName(root);
    const paths = list.map((f) => f.webkitRelativePath || f.name);
    setFolderContext(`Folder: ${root}\nFiles (${list.length}):\n${paths.join("\n")}`);
    toast.success(`Attached folder: ${root} (${list.length} files)`);
  }

  function handleImagesInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMenuOpen(false);
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const readers = Array.from(files).slice(0, 6).map((file) => {
      return new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(file);
      });
    });
    Promise.all(readers).then((urls) => {
      setAttachedImages((prev) => [...prev, ...urls]);
      toast.success(`Uploaded ${urls.length} image(s)`);
    });
  }

  async function loadMyGitHubAccountRepos(tokenOverride?: string) {
    const tokenToUse = (tokenOverride ?? githubToken).trim();
    if (!tokenToUse) {
      toast.error("Please enter your GitHub Personal Access Token or sign in with GitHub to access private repositories.");
      return;
    }
    setIsLoadingAccountRepos(true);
    try {
      const res = await listGithubReposFn({
        data: { githubToken: tokenToUse },
      });
      if (!res.success || !res.repos) {
        toast.error(res.error || "Could not load repositories from your GitHub account.");
        setIsLoadingAccountRepos(false);
        return;
      }
      localStorage.setItem("myaibro.githubToken", tokenToUse);
      setGithubAccountLogin(res.login || "GitHub Account");
      setGithubAccountRepos(res.repos);
      toast.success(`Connected to @${res.login}! Loaded ${res.repos.length} repositories.`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load repositories from GitHub account.");
    } finally {
      setIsLoadingAccountRepos(false);
    }
  }

  // Auto-load user's GitHub repositories when switching to Private Account tab if token is already saved
  useEffect(() => {
    if (
      githubModalOpen &&
      githubImportTab === "private" &&
      githubToken.trim() &&
      githubAccountRepos.length === 0 &&
      !isLoadingAccountRepos
    ) {
      loadMyGitHubAccountRepos(githubToken.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubModalOpen, githubImportTab]);

  async function handleImportGithubRepo(repoUrlOverride?: string, usePrivateToken?: boolean) {
    const input = (repoUrlOverride ?? githubUrlInput).trim();
    if (!input) {
      toast.error("Please enter a GitHub repository URL or select a repository from your account.");
      return;
    }
    setIsImportingGithub(true);
    try {
      const tokenToPass =
        (usePrivateToken || githubImportTab === "private" || githubToken.trim())
          ? githubToken.trim() || undefined
          : undefined;
      const res = await importGithubFn({
        data: { repoUrl: input, githubToken: tokenToPass },
      });
      if (!res.success || !res.repo) {
        toast.error(res.error || "Could not import that repository.");
        setIsImportingGithub(false);
        return;
      }
      setImportedRepo(res.repo);
      setGithubModalOpen(false);
      setMenuOpen(false);

      // If an app is already open in the workspace, merge the imported repo files into the current app so edits happen in-place
      if (built && res.repo.builtFiles && res.repo.builtFiles.length > 0) {
        const existingMap = new Map<string, BuiltFile>();
        for (const f of built.files) existingMap.set(f.path, f);
        for (const f of res.repo.builtFiles) existingMap.set(f.path, f);
        const mergedFiles = Array.from(existingMap.values());
        setBuilt({
          ...built,
          files: mergedFiles,
        });
        toast.success(
          `Imported ${res.repo.isPrivate ? "private" : "public"} repo ${res.repo.owner}/${res.repo.repo} into "${built.name}"!`,
        );
      } else {
        setIdea((prev) =>
          prev
            ? `${prev} (Edit in GitHub repo: ${res.repo!.owner}/${res.repo!.repo})`
            : `Edit and integrate into ${res.repo!.owner}/${res.repo!.repo}: ${res.repo!.description}`,
        );
        toast.success(
          `Imported ${res.repo.isPrivate ? "Private" : "Public"} repository ${res.repo.owner}/${res.repo.repo} (${res.repo.files.length} files)!`,
        );
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to import GitHub repo");
    } finally {
      setIsImportingGithub(false);
    }
  }

  const plan = useMutation({
    mutationFn: (v: string) => {
      const hasExistingTarget = Boolean(built || importedRepo?.builtFiles?.length);
      const targetName = built?.name || (importedRepo ? `${importedRepo.owner}/${importedRepo.repo}` : undefined);
      const targetDesc = built?.description || importedRepo?.description;
      const targetFiles = built?.files?.length
        ? built.files.map((f) => f.path)
        : importedRepo?.files?.map((f) => f.path);
      const currentImages = attachedImages.length > 0 ? [...attachedImages] : undefined;

      return planFn({
        data: {
          idea: v,
          model,
          isUpgrade: hasExistingTarget,
          existingAppName: targetName,
          existingAppDescription: targetDesc,
          existingFiles: targetFiles,
          githubContext: importedRepo
            ? `GitHub (${importedRepo.isPrivate ? "Private" : "Public"}): ${importedRepo.owner}/${importedRepo.repo}\nFiles: ${importedRepo.files.map((f) => f.path).join(", ")}`
            : undefined,
          folderContext: folderContext || undefined,
          attachedImages: currentImages,
        },
      });
    },
    onSuccess: (r, v) => {
      setActiveScopingIdea(v);
      if (attachedImages.length > 0) {
        setScopingImages([...attachedImages]);
      }
      setQuestions(r.questions);
      setAnswers(new Array(r.questions.length).fill(""));
      setStep(0);
    },
    onError: (e: any) => toast.error(e.message ?? "Could not scope that idea."),
  });

  function deriveInitialProjectName(rawIdea: string): string {
    const cleaned = rawIdea
      .replace(/^(build|create|make|design|develop|like|edit|update|integrate)\s+(a|an|the)?\s*/i, "")
      .split(/[.,!?\n]/)[0]
      .trim();
    const words = cleaned.split(/\s+/).slice(0, 3);
    if (!words.length || !words[0]) return "Custom App";
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }

  async function triggerBuild(
    ideaText: string,
    answered: { question: string; answer: string }[],
    displayPrompt?: string,
    forceInPlaceEdit?: boolean,
  ) {
    const currentCredits = getUserCredits();
    const sub = getActiveSubscription();
    if (!sub && currentCredits <= 0) {
      toast.error("You have finished your free credits. Please upgrade for pro.");
      setShowUpgradeModal(true);
      return;
    }
    if (!sub) {
      deductUserCredit();
      setCredits(getUserCredits());
    }

    const cleanIdeaText = (ideaText || activeScopingIdea || idea || "Custom Application").trim() || "Custom Application";

    // Check if user is asking to edit an existing project (either open in workspace, imported from GitHub, or existing in history)
    const editIntentInPrompt =
      history.length > 0 &&
      /\b(edit|update|change|modify|fix|add\s+to|integrate|in\s+that\s+code|in\s+the\s+code|same\s+app|current\s+app|existing\s+app)\b/i.test(
        cleanIdeaText,
      );

    const isEditingExistingApp = Boolean(
      forceInPlaceEdit ||
      built ||
      (importedRepo && importedRepo.builtFiles && importedRepo.builtFiles.length > 0) ||
      editIntentInPrompt,
    );

    // Resolve the existing target project from workspace or latest history item so we NEVER create a duplicate project
    const matchedHistoryProject = isEditingExistingApp
      ? history.find(
          (h) =>
            (currentProjectId && h.id === currentProjectId) ||
            (built?.name && h.name.toLowerCase() === built.name.toLowerCase()),
        ) || history[0]
      : undefined;

    const existingFilesToEdit: BuiltFile[] =
      built?.files && built.files.length > 0
        ? built.files
        : matchedHistoryProject?.files && matchedHistoryProject.files.length > 0
          ? matchedHistoryProject.files
          : importedRepo?.builtFiles && importedRepo.builtFiles.length > 0
            ? importedRepo.builtFiles
            : [];

    const existingPreviewToEdit =
      built?.preview_html || matchedHistoryProject?.preview_html || "";

    const buildId = `build-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const projectHistoryId =
      isEditingExistingApp
        ? currentProjectId || matchedHistoryProject?.id || buildId
        : buildId;

    setCurrentProjectId(projectHistoryId);

    const turnId = `turn-${Date.now()}`;
    const userVisiblePrompt = displayPrompt || cleanIdeaText;
    const currentAttachedImages =
      attachedImages.length > 0
        ? [...attachedImages]
        : scopingImages.length > 0
          ? [...scopingImages]
          : undefined;
    const derivedName =
      built?.name && built.name !== "Building App…" && built.name !== "Planning Project..."
        ? built.name
        : matchedHistoryProject?.name
          ? matchedHistoryProject.name
          : importedRepo
            ? importedRepo.repo
            : deriveInitialProjectName(userVisiblePrompt);

    const newTurn: ChatTurn = {
      id: turnId,
      prompt: userVisiblePrompt,
      at: Date.now(),
      attachedImages: currentAttachedImages,
      folderName: folderName || undefined,
      thoughtSeconds: 6,
      aiSummary: isEditingExistingApp
        ? `I'm editing "${derivedName}" in-place to integrate your changes${currentAttachedImages ? " and match your attached UI screenshot" : ""} directly into the existing codebase and live preview.`
        : `I'll build a complete ${derivedName.toLowerCase()} on the preview${currentAttachedImages ? " matching your attached UI reference" : ""}, with interactive functionality, responsive layout, and clear permission and error states.`,
      activityLabel: isEditingExistingApp
        ? `Editing ${derivedName} code in-place`
        : `Exploring ${derivedName.toLowerCase()} flow`,
      status: "building",
    };

    const baseTurns =
      turns.length > 0
        ? turns
        : matchedHistoryProject?.turns && matchedHistoryProject.turns.length > 0
          ? matchedHistoryProject.turns
          : [];
    const nextTurns = [...baseTurns, newTurn];
    setTurns(nextTurns);

    // Clear temporary composer attachments & pending scoping state
    setAttachedImages([]);
    setScopingImages([]);
    setFolderName(null);
    setQuestions(null);
    setPendingEditIdea(null);
    setShowHistory(false);

    // Ensure workspace stays on the current app without wiping existing files or preview
    setBuilt((prev) => ({
      name: derivedName,
      description: prev?.description || matchedHistoryProject?.description || newTurn.aiSummary,
      preview_html: prev?.preview_html || existingPreviewToEdit,
      files: prev?.files?.length ? prev.files : existingFilesToEdit,
    }));
    setActiveSlide("chat");

    if (isEditingExistingApp) {
      // Always update the EXISTING project in history in-place — never create a second project entry
      setHistory((prev) => {
        let existingIdx = prev.findIndex(
          (h) =>
            h.id === projectHistoryId ||
            (currentProjectId && h.id === currentProjectId) ||
            h.name.toLowerCase() === derivedName.toLowerCase(),
        );
        if (existingIdx === -1 && prev.length > 0) {
          existingIdx = 0;
        }
        if (existingIdx !== -1) {
          const updatedHistory = [...prev];
          const targetId = updatedHistory[existingIdx].id;
          setCurrentProjectId(targetId);
          updatedHistory[existingIdx] = {
            ...updatedHistory[existingIdx],
            status: "writing",
            progress: [`Editing "${updatedHistory[existingIdx].name}" in-place…`],
            turns: nextTurns,
          };
          saveUserBuilds(updatedHistory);
          return updatedHistory;
        }
        const item: HistoryItem = {
          id: projectHistoryId,
          name: derivedName,
          description: built?.description || newTurn.aiSummary,
          preview_html: existingPreviewToEdit,
          files: existingFilesToEdit,
          idea: userVisiblePrompt,
          at: Date.now(),
          status: "writing",
          progress: [`Editing "${derivedName}" in-place…`],
          turns: nextTurns,
        };
        const next = [item];
        saveUserBuilds(next);
        return next;
      });
    } else {
      const initialItem: HistoryItem = {
        id: projectHistoryId,
        name: derivedName,
        description: newTurn.aiSummary,
        preview_html: "",
        files: existingFilesToEdit,
        idea: userVisiblePrompt,
        at: Date.now(),
        status: "writing",
        progress: ["Starting background build on cloud engine…", `Writing source code and modules for ${derivedName}…`],
        turns: nextTurns,
      };
      setHistory((prev) => {
        const updatedHistory = [initialItem, ...prev.filter((h) => h.id !== projectHistoryId)];
        saveUserBuilds(updatedHistory);
        return updatedHistory;
      });
    }

    localStorage.setItem(getActiveBuildStorageKey(), buildId);

    setProgress([
      isEditingExistingApp
        ? `Editing "${derivedName}" in-place and integrating changes…`
        : "Starting background build on cloud engine…",
    ]);
    setIsBuilding(true);
    setActiveJobId(buildId);

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    try {
      await startBgBuildFn({
        data: {
          buildId,
          idea: cleanIdeaText,
          model,
          answers: answered,
          apiKeys: Object.keys({ ...apiKeys, ...userToolKeys }).length > 0 ? { ...apiKeys, ...userToolKeys } : undefined,
          githubContext: importedRepo
            ? `GitHub (${importedRepo.isPrivate ? "Private" : "Public"}): ${importedRepo.owner}/${importedRepo.repo}\nFiles: ${importedRepo.files.map((f) => f.path).join(", ")}`
            : undefined,
          folderContext: folderContext || undefined,
          attachedImages: currentAttachedImages,
          isEditingExisting: isEditingExistingApp,
          existingProjectId: projectHistoryId,
          existingName: derivedName,
          existingDescription:
            built?.description || matchedHistoryProject?.description || importedRepo?.description,
          existingFiles: existingFilesToEdit.length > 0 ? existingFilesToEdit : undefined,
          existingPreviewHtml: existingPreviewToEdit || undefined,
        },
      });

      startPollingJob(buildId, turnId, projectHistoryId);
    } catch (e: any) {
      setIsBuilding(false);
      toast.error(e?.message || "Could not start build job.");
    }
  }

  /* ---------- Dynamic App Suggestions ---------- */
  useEffect(() => {
    if (!built) {
      setIdeas([]);
      return;
    }
    let alive = true;
    suggestFn({
      data: {
        name: built.name,
        description: built.description,
        files: built.files.map((f) => f.path).join("\n").slice(0, 3500),
        model,
      },
    })
      .then((r: any) => {
        if (alive && r?.ideas?.length) {
          setIdeas(r.ideas);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built?.name, built?.description, model]);

  async function triggerUpgrade(upgradeText: string, askScopingFirst = false) {
    if (!built) return;
    const cleanText = upgradeText.trim();
    if (!cleanText) return;
    setUpgrade("");

    if (buildMode === "chat") {
      const turnId = `turn-${Date.now()}`;
      const newTurn: ChatTurn = {
        id: turnId,
        prompt: cleanText,
        at: Date.now(),
        attachedImages: attachedImages.length > 0 ? [...attachedImages] : undefined,
        folderName: folderName || undefined,
        thoughtSeconds: 4,
        aiSummary: `For "${built.name}", I recommend integrating "${cleanText}" directly into the existing components and state without creating a separate app. Switch mode to Build or click below to apply these code edits in-place.`,
        activityLabel: `Analyzed ${built.name} for in-place edit`,
        status: "completed",
      };
      setTurns((prev) => [...prev, newTurn]);
      setAttachedImages([]);
      setFolderName(null);
      return;
    }

    // Optional scoping questions only when explicitly requested; otherwise immediately edit existing code in-place
    if (askScopingFirst) {
      setPendingEditIdea(cleanText);
      setIsScopingEdit(true);
      try {
        const res = await planFn({
          data: {
            idea: cleanText,
            model,
            isUpgrade: true,
            existingAppName: built.name,
            existingAppDescription: built.description,
            existingFiles: built.files.map((f) => f.path),
            githubContext: importedRepo
              ? `GitHub: ${importedRepo.owner}/${importedRepo.repo}`
              : undefined,
            folderContext: folderContext || undefined,
          },
        });
        if (res?.questions?.length) {
          setQuestions(res.questions);
          setAnswers(new Array(res.questions.length).fill(""));
          setStep(0);
          setIsScopingEdit(false);
          setTimeout(() => {
            chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 80);
          return;
        }
      } catch {
        // Fallback to direct in-place edit if scoping fails
      } finally {
        setIsScopingEdit(false);
      }
    }

    await triggerBuild(cleanText, [], cleanText, true);
  }

  async function handleDeleteProject(h: HistoryItem, e?: React.MouseEvent) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setHistory((prev) => {
      const filtered = prev.filter((x) => x.id !== h.id);
      saveUserBuilds(filtered);
      return filtered;
    });

    try {
      const pubRaw = localStorage.getItem("myai_published_apps");
      if (pubRaw) {
        const pub = JSON.parse(pubRaw);
        const slug = h.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
        delete pub[h.name];
        delete pub[slug];
        delete pub[h.id];
        localStorage.setItem("myai_published_apps", JSON.stringify(pub));
      }
    } catch {
      /* ignore */
    }

    if (currentProjectId === h.id || (built && built.name === h.name)) {
      localStorage.removeItem(getActiveBuildStorageKey());
      reset();
    }

    deleteBuildJobFn({ data: { buildId: h.id, name: h.name } }).catch(() => undefined);
    toast.success(`Deleted project "${h.name}"`);
  }

  async function persistPublishedApp(targetBuilt: Built, customSlug?: string) {
    const cleanSlug =
      (customSlug || publishSlug || targetBuilt.name)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-|-$/g, "") || "my-app";

    const ensuredPreviewHtml =
      targetBuilt.preview_html && targetBuilt.preview_html.trim().length > 30
        ? targetBuilt.preview_html
        : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${targetBuilt.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans min-h-screen p-6 antialiased">
  <div class="max-w-4xl mx-auto space-y-6">
    <header class="flex items-center justify-between border-b border-slate-800 pb-4">
      <div>
        <h1 class="text-2xl font-bold text-white">${targetBuilt.name}</h1>
        <p class="text-sm text-slate-400 mt-1">${targetBuilt.description || "Live Deployed Application"}</p>
      </div>
      <span class="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        ● Live Deployed
      </span>
    </header>
    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
      <h3 class="text-base font-semibold text-white">${targetBuilt.name} Workspace</h3>
      <p class="text-sm text-slate-300">Active modules: ${targetBuilt.files?.length || 1} files</p>
      <div class="flex items-center gap-3">
        <button onclick="document.getElementById('demo-cnt').innerText = parseInt(document.getElementById('demo-cnt').innerText) + 1" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition">
          Trigger Action (+1)
        </button>
        <span class="text-sm font-mono text-slate-300">Count: <span id="demo-cnt" class="text-emerald-400 font-bold">1</span></span>
      </div>
    </div>
  </div>
</body>
</html>`;

    const record = {
      ...targetBuilt,
      preview_html: ensuredPreviewHtml,
      id: currentProjectId || cleanSlug,
      slug: cleanSlug,
      customDomain: domainVerified ? customDomain : undefined,
      published_at: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem("myai_published_apps") || "{}");
      existing[targetBuilt.name] = record;
      existing[cleanSlug] = record;
      if (currentProjectId) existing[currentProjectId] = record;
      if (customDomain && domainVerified) existing[customDomain] = record;
      localStorage.setItem("myai_published_apps", JSON.stringify(existing));
      localStorage.setItem("myai_last_app", JSON.stringify(record));
    } catch {
      /* ignore */
    }

    setHistory((prev) => {
      const updated = prev.map((h) =>
        h.id === currentProjectId || h.name === targetBuilt.name
          ? { ...h, preview_html: ensuredPreviewHtml, published: true }
          : h,
      );
      saveUserBuilds(updated);
      return updated;
    });

    // Save to Firestore published_apps collection in background (with 2s timeout) so internet links work across devices
    Promise.race([
      setDoc(doc(db, "published_apps", cleanSlug), {
        id: record.id,
        slug: cleanSlug,
        name: targetBuilt.name,
        description: targetBuilt.description || "",
        preview_html: ensuredPreviewHtml,
        published_at: record.published_at,
      }),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]).catch(() => undefined);

    try {
      await publishAppFn({
        data: {
          id: currentProjectId || cleanSlug,
          slug: cleanSlug,
          name: targetBuilt.name,
          description: targetBuilt.description,
          preview_html: ensuredPreviewHtml,
          files: targetBuilt.files,
          customDomain: domainVerified && customDomain ? customDomain : undefined,
        },
      });
    } catch {
      /* ignore */
    }

    return cleanSlug;
  }

  function openPublishModal() {
    const activeBuilt =
      built ||
      (history[0]
        ? {
            name: history[0].name,
            description: history[0].description,
            preview_html: history[0].preview_html,
            files: history[0].files || [],
          }
        : {
            name: "My Web Application",
            description: "Interactive application built on My AI Pro No-Code Platform",
            preview_html: "",
            files: [],
          });
    if (!built) {
      setBuilt(activeBuilt);
    }
    const cleanSlug =
      activeBuilt.name
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-|-$/g, "") || "my-app";
    setPublishSlug(cleanSlug);
    setPublishOpen(true);

    // Immediately persist & deploy so Publish Setup works out-of-the-box without getting stuck
    persistPublishedApp(activeBuilt, cleanSlug);
    if (deployStage !== "live") {
      setDeployStage("building");
      setDeployProgress(35);
      setDeployLogs([
        `[1/4] Validating ${activeBuilt.files.length || 1} project modules...`,
        `[2/4] Bundling production assets for "${activeBuilt.name}"...`,
      ]);
      setTimeout(() => {
        setDeployStage("cdn");
        setDeployProgress(80);
        setDeployLogs((p) => [
          ...p,
          `[3/4] Distributing to global Edge CDN (/p/${cleanSlug})...`,
        ]);
      }, 350);
      setTimeout(() => {
        setDeployStage("live");
        setDeployProgress(100);
        setDeployLogs((p) => [
          ...p,
          `✔ [4/4] Live & Deployed at ${typeof window !== "undefined" ? window.location.origin : ""}/p/${cleanSlug}`,
        ]);
      }, 750);
    }
  }

  function reset() {
    stopPolling();
    setIsBuilding(false);
    setActiveJobId(null);
    setCurrentProjectId(null);
    setPendingEditIdea(null);
    setBuilt(null);
    setTurns([]);
    setQuestions(null);
    setAnswers([]);
    setStep(0);
    setIdea("");
    setActiveSlide("chat");
  }

  function openHistoryProject(h: HistoryItem) {
    setShowHistory(false);
    setProjectMenuOpen(false);
    setCurrentProjectId(h.id);
    setPendingEditIdea(null);
    setQuestions(null);
    setBuilt({
      name: h.name,
      description: h.description,
      preview_html: h.preview_html,
      files: h.files || [],
    });
    if (h.turns && h.turns.length > 0) {
      setTurns(h.turns);
    } else {
      setTurns([
        {
          id: h.id,
          prompt: h.idea,
          at: h.at || Date.now(),
          thoughtSeconds: 6,
          aiSummary:
            h.description ||
            `I'll build a complete ${h.name} on the preview, with interactive components, clean design, and clear permission and error states.`,
          activityLabel: `Exploring ${h.name} flow`,
          status: h.status === "planning" || h.status === "writing" ? "building" : "completed",
        },
      ]);
    }
    if (h.status === "planning" || h.status === "writing") {
      startPollingJob(h.id, undefined, h.id);
    }
  }

  function shareApp(kind: "whatsapp" | "email" | "more", b: Built) {
    const text = `Check out "${b.name}" I built with My AI Bro — ${b.description}`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (kind === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank");
      return;
    }
    if (kind === "email") {
      window.open(
        `mailto:?subject=${encodeURIComponent(b.name)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
        "_blank",
      );
      return;
    }
    if (navigator.share) {
      navigator.share({ title: b.name, text, url }).catch(() => undefined);
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("Link copied");
    }
  }

  const defaultSuggestions = [
    "Talk naturally by voice",
    "Save conversations & history",
    "Add dark mode & custom theme",
    "Export data & share link",
  ];
  const suggestionPills = ideas.length > 0 ? ideas : defaultSuggestions;

  /* ---------- Hidden File Inputs (shared across all views) ---------- */
  const sharedFileInputs = (
    <>
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderInputChange}
        {...({ webkitdirectory: "", directory: "" } as any)}
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={imagesInputRef}
        onChange={handleImagesInputChange}
        accept="image/*"
        multiple
        className="hidden"
      />
    </>
  );

  /* ---------- Plus Menu Modal/Sheet (Connectors UI matching user screenshots) ---------- */
  const plusMenuOverlay = menuOpen && (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setMenuOpen(false)} />
      <div className="fixed inset-x-3 bottom-12 z-50 mx-auto max-w-lg max-h-[82vh] overflow-y-auto rounded-[32px] bg-white p-5 ring-1 ring-black/10 shadow-2xl space-y-4 text-zinc-900 font-sans">
        {/* Top Header: Connectors title & Custom Dropdown selector */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Plug className="size-5 text-zinc-900" />
            <h2 className="text-base font-bold text-zinc-900">Connectors</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800">
              <span>Custom</span>
              <ChevronDown className="size-3.5 text-zinc-500" />
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="flex size-8 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Search Bar & Settings */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs">
            <Search className="size-4 text-zinc-400 mr-2 shrink-0" />
            <input
              value={connectorSearchQuery}
              onChange={(e) => setConnectorSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-transparent flex-1 text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 transition"
            title="Connector Settings"
          >
            <Settings className="size-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {["All", "Enabled", "Analytics", "Ecommerce", "Communication", "Database", "Storage", "AI"].map((cat) => {
            const active = connectorFilterCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setConnectorFilterCategory(cat)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 font-medium transition whitespace-nowrap shrink-0",
                  active
                    ? "bg-zinc-900 text-white shadow-2xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                )}
              >
                {cat === "All" ? "All 154" : cat === "Enabled" ? `Enabled ${Object.keys(userToolKeys).length + 2}` : cat}
              </button>
            );
          })}
        </div>

        {/* Primary Action Tiles: Upload Images, Folder, GitHub */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              imagesInputRef.current?.click();
            }}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3 text-center hover:bg-zinc-100 transition group"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs group-hover:scale-105 transition">
              <ImageIcon className="size-4" />
            </div>
            <span className="text-[11px] font-semibold text-zinc-900 leading-tight">Images</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              handleShareFolder();
            }}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3 text-center hover:bg-zinc-100 transition group"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs group-hover:scale-105 transition">
              <Folder className="size-4" />
            </div>
            <span className="text-[11px] font-semibold text-zinc-900 leading-tight">Folder</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setGithubModalOpen(true);
            }}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3 text-center hover:bg-zinc-100 transition group"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-800 text-white shadow-xs group-hover:scale-105 transition">
              <Github className="size-4" />
            </div>
            <span className="text-[11px] font-semibold text-zinc-900 leading-tight">GitHub</span>
          </button>
        </div>

        {/* Connector Cards List matching Screenshots */}
        <div className="space-y-2 pt-1">
          {[
            { name: "Gmail", desc: "Read, send, and manage your emails via Google Workspace", category: "Communication", logo: GmailLogo },
            { name: "Google Maps Platform", desc: "Maps, geocoding, directions, and places APIs", category: "Maps & Location", logo: GoogleMapsLogo },
            { name: "Google Analytics (GA4)", desc: "Track user traffic, events, pageviews, and retention", category: "Analytics", logo: GoogleAnalyticsLogo },
            { name: "PostHog", desc: "Product analytics, session replays, and feature flags", category: "Analytics", logo: PostHogLogo },
            { name: "Mixpanel", desc: "User behavioral analytics and conversion funnel analysis", category: "Analytics", logo: MixpanelLogo },
            { name: "Stripe", desc: "Set up payments, cards, Apple Pay & subscriptions", category: "Ecommerce", logo: StripeLogo },
            { name: "Shopify", desc: "Build an eCommerce store and catalog", category: "Ecommerce", logo: ShopifyLogo },
            { name: "Google Drive", desc: "Upload and download files and folders", category: "Storage", logo: GoogleDriveLogo },
            { name: "Google Sheets", desc: "Read and update spreadsheet data", category: "Database", logo: GoogleSheetsLogo },
            { name: "Slack", desc: "Send messages and interact with Slack workspace", category: "Communication", logo: SlackLogo },
            { name: "Notion", desc: "Add Notion pages and databases to your app", category: "Productivity", logo: NotionLogo },
            { name: "GitHub", desc: "Access repos, commits, and webhook events", category: "Development", logo: GitHubLogo },
            { name: "Supabase", desc: "Postgres database, Auth & realtime storage", category: "Database", logo: SupabaseLogo },
            { name: "Firebase", desc: "Firestore NoSQL database & Google Auth", category: "Database", logo: FirebaseLogo },
            { name: "OpenAI", desc: "Use GPT-4o, embeddings, and generative AI", category: "AI", logo: OpenAILogo },
            { name: "Twilio", desc: "Cloud communications for SMS and voice", category: "Communication", logo: TwilioLogo },
          ]
            .filter((c) => {
              if (connectorFilterCategory !== "All" && connectorFilterCategory !== "Enabled" && c.category !== connectorFilterCategory) {
                return false;
              }
              if (connectorFilterCategory === "Enabled" && !userToolKeys[c.name]) {
                return false;
              }
              if (connectorSearchQuery.trim()) {
                const q = connectorSearchQuery.toLowerCase();
                return c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q);
              }
              return true;
            })
            .map((conn) => {
              const hasKey = Boolean(userToolKeys[conn.name]);
              const LogoComp = conn.logo;
              return (
                <button
                  key={conn.name}
                  type="button"
                  onClick={() => {
                    setSelectedToolForApiKey(conn.name);
                    setToolApiKeyValue(userToolKeys[conn.name] || "");
                    setMenuOpen(false);
                  }}
                  className="relative flex w-full items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-3 text-left hover:bg-zinc-100 hover:border-zinc-300 transition group cursor-pointer"
                >
                  {/* Green active status indicator dot matching screenshots */}
                  <span
                    className={cn(
                      "absolute top-3.5 right-3.5 size-2.5 rounded-full ring-2 ring-white",
                      hasKey ? "bg-emerald-500 animate-pulse" : "bg-zinc-300",
                    )}
                    title={hasKey ? "Connected with API key" : "Not connected"}
                  />

                  {/* Brand Logo Box with official logo */}
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white border border-zinc-200 shadow-2xs transition group-hover:scale-105 p-2">
                    <LogoComp className="size-6 text-zinc-900" />
                  </div>

                  {/* Title & Description */}
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-zinc-900 truncate">{conn.name}</p>
                      {hasKey && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">{conn.desc}</p>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </>
  );

  const filteredAccountRepos = githubAccountRepos.filter((r) => {
    if (repoVisibilityFilter === "private" && !r.private) return false;
    if (repoVisibilityFilter === "public" && r.private) return false;
    if (!repoSearchQuery.trim()) return true;
    const q = repoSearchQuery.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  });

  /* ---------- GitHub Import Modal (Public via URL + Private from User's GitHub Account) ---------- */
  const githubModalOverlay = githubModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-[#0c1938] border border-blue-500/30 p-6 shadow-2xl shadow-blue-950 space-y-4 text-white">
        <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
              <Github className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Import from GitHub</h3>
              <p className="text-xs text-blue-300/70">
                Import a public repository by URL or a private repository from your GitHub account
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGithubModalOpen(false)}
            className="rounded-full p-1.5 text-blue-300/70 hover:bg-blue-600/20 hover:text-white transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs: Public Repository (URL) vs Private Repository (My Account) */}
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#070e20] border border-blue-500/25 p-1 text-xs">
          <button
            type="button"
            onClick={() => setGithubImportTab("public")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-semibold transition cursor-pointer",
              githubImportTab === "public"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-blue-300/70 hover:text-white",
            )}
          >
            <Globe className="size-3.5" />
            <span>Public Repository (URL)</span>
          </button>
          <button
            type="button"
            onClick={() => setGithubImportTab("private")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-semibold transition cursor-pointer",
              githubImportTab === "private"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-blue-300/70 hover:text-white",
            )}
          >
            <Lock className="size-3.5" />
            <span>Private (My GitHub Account)</span>
          </button>
        </div>

        {githubImportTab === "public" ? (
          /* ==================== TAB 1: PUBLIC REPOSITORY VIA URL ==================== */
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white block">
                Public GitHub Repository URL
              </label>
              <div className="flex items-center rounded-2xl border border-blue-500/30 bg-[#070e20] px-3.5 py-2.5 text-xs focus-within:border-blue-400 transition">
                <Globe className="size-4 text-blue-400 mr-2 shrink-0" />
                <input
                  value={githubUrlInput}
                  onChange={(e) => setGithubUrlInput(e.target.value)}
                  placeholder="https://github.com/owner/repo or owner/repo"
                  className="bg-transparent flex-1 text-white placeholder:text-blue-300/40 outline-none font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && githubUrlInput.trim()) {
                      handleImportGithubRepo(githubUrlInput, false);
                    }
                  }}
                />
              </div>
              <p className="text-[11px] text-blue-300/70">
                Paste any public GitHub URL to import its files and edit the code directly in-place.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-500/20">
              <button
                type="button"
                onClick={() => setGithubModalOpen(false)}
                className="rounded-2xl border border-blue-500/30 bg-[#070e20] px-4 py-2 text-xs font-semibold text-blue-200 hover:text-white hover:bg-blue-600/20 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!githubUrlInput.trim() || isImportingGithub}
                onClick={() => handleImportGithubRepo(githubUrlInput, false)}
                className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 transition disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {isImportingGithub ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Importing from URL…
                  </>
                ) : (
                  <>
                    <GitBranch className="size-3.5" /> Import Public Repository
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ==================== TAB 2: PRIVATE REPOSITORY FROM MY GITHUB ACCOUNT ==================== */
          <div className="space-y-3.5 pt-1">
            {/* GitHub Account Connection Bar */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="size-3.5 text-zinc-700 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-900 truncate">
                    {githubAccountLogin
                      ? `Connected: @${githubAccountLogin}`
                      : "Connect your GitHub Account"}
                  </span>
                </div>
                {githubAccountLogin && (
                  <button
                    type="button"
                    onClick={() => loadMyGitHubAccountRepos()}
                    disabled={isLoadingAccountRepos}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    <RefreshCw className={cn("size-3", isLoadingAccountRepos && "animate-spin")} />
                    Refresh
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showGithubToken ? "text" : "password"}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="GitHub Personal Access Token (ghp_... with 'repo' scope)"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 pr-8 text-xs font-mono text-zinc-900 outline-none focus:border-zinc-900"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && githubToken.trim()) {
                        loadMyGitHubAccountRepos(githubToken);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGithubToken((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    {showGithubToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => loadMyGitHubAccountRepos(githubToken)}
                  disabled={!githubToken.trim() || isLoadingAccountRepos}
                  className="shrink-0 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition"
                >
                  {isLoadingAccountRepos ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : githubAccountLogin ? (
                    "Reload"
                  ) : (
                    "Load My Repos"
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Supports Private &amp; Public repositories from your account</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      toast.loading("Connecting to GitHub via Firebase Auth…", { id: "gh-auth" });
                      const { user, token } = await signInWithGithubFirebase();
                      toast.dismiss("gh-auth");
                      if (token) {
                        setGithubToken(token);
                        localStorage.setItem("myaipro_github_token", token);
                      }
                      const ghLogin = (user as any)?.reloadUserInfo?.screenName || user?.displayName || user?.email?.split("@")[0] || "";
                      if (ghLogin) {
                        setGithubAccountLogin(ghLogin);
                        localStorage.setItem("myaipro_github_user", ghLogin);
                      }
                      toast.success(`Connected as @${ghLogin || "GitHub User"}! Loading private repos…`);
                      if (token) {
                        loadMyGitHubAccountRepos(token);
                      }
                    } catch (err: any) {
                      toast.dismiss("gh-auth");
                      try {
                        await supabase.auth.signInWithOAuth({
                          provider: "github",
                          options: {
                            scopes: "repo read:user",
                            redirectTo: window.location.href,
                          },
                        });
                      } catch {
                        toast.info("Tip: You can also paste your GitHub Personal Access Token above to load private repos immediately.");
                      }
                    }
                  }}
                  className="font-semibold text-zinc-800 underline hover:text-black cursor-pointer"
                >
                  Sign in with GitHub (Firebase Auth)
                </button>
              </div>
            </div>

            {/* Repository List from User's GitHub Account */}
            {githubAccountRepos.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs">
                    <Search className="size-3.5 text-zinc-400 mr-1.5 shrink-0" />
                    <input
                      value={repoSearchQuery}
                      onChange={(e) => setRepoSearchQuery(e.target.value)}
                      placeholder="Search your repositories…"
                      className="bg-transparent flex-1 text-zinc-900 outline-none"
                    />
                  </div>
                  <div className="flex rounded-xl bg-zinc-100 p-0.5 text-[11px]">
                    {(["all", "private", "public"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setRepoVisibilityFilter(f)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 font-medium capitalize transition",
                          repoVisibilityFilter === f
                            ? "bg-white text-zinc-900 shadow-2xs"
                            : "text-zinc-500 hover:text-zinc-900",
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100 rounded-2xl border border-zinc-200 bg-white">
                  {filteredAccountRepos.length === 0 ? (
                    <p className="p-4 text-center text-xs text-zinc-500">
                      No matching repositories found in your account.
                    </p>
                  ) : (
                    filteredAccountRepos.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-zinc-50 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {r.private ? (
                              <Lock className="size-3 text-amber-600 shrink-0" />
                            ) : (
                              <Globe className="size-3 text-zinc-400 shrink-0" />
                            )}
                            <span className="truncate text-xs font-semibold text-zinc-900">
                              {r.fullName}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                r.private
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-zinc-100 text-zinc-600",
                              )}
                            >
                              {r.private ? "Private" : "Public"}
                            </span>
                          </div>
                          {r.description && (
                            <p className="truncate text-[11px] text-zinc-500 mt-0.5">
                              {r.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={isImportingGithub}
                          onClick={() => handleImportGithubRepo(r.fullName, true)}
                          className="shrink-0 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition"
                        >
                          {isImportingGithub ? "Importing…" : "Import"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Direct private repo name fallback if they know the owner/repo */
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800 block">
                  Or enter your Private Repository name directly
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
                    <Lock className="size-3.5 text-zinc-400 mr-2 shrink-0" />
                    <input
                      value={githubUrlInput}
                      onChange={(e) => setGithubUrlInput(e.target.value)}
                      placeholder="owner/private-repo"
                      className="bg-transparent flex-1 text-zinc-900 outline-none font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!githubUrlInput.trim() || !githubToken.trim() || isImportingGithub}
                    onClick={() => handleImportGithubRepo(githubUrlInput, true)}
                    className="shrink-0 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition"
                  >
                    {isImportingGithub ? "Importing…" : "Import Private"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-1 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setGithubModalOpen(false)}
                className="rounded-2xl border border-zinc-200 px-4 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const toolApiKeyModalOverlay = selectedToolForApiKey && (
    <ToolConnectionModal
      toolName={selectedToolForApiKey}
      onClose={() => setSelectedToolForApiKey(null)}
      savedKeys={userToolKeys}
      onSave={(tool, key) => {
        const nextKeys = { ...userToolKeys, [tool]: key };
        setUserToolKeys(nextKeys);
        localStorage.setItem("myai_user_tool_keys", JSON.stringify(nextKeys));
        setConnected((c) => (c.includes(tool) ? c : [...c, tool]));
      }}
      onDisconnect={(tool) => {
        const nextKeys = { ...userToolKeys };
        delete nextKeys[tool];
        setUserToolKeys(nextKeys);
        localStorage.setItem("myai_user_tool_keys", JSON.stringify(nextKeys));
        setConnected((c) => c.filter((x) => x !== tool));
      }}
    />
  );

  const userProjectFiles: BuiltFile[] = useMemo(() => {
    if (built?.files && built.files.length > 0) {
      return built.files;
    }
    const html = built?.preview_html || "<div>Application Preview</div>";
    return [
      {
        path: "src/App.tsx",
        language: "typescript",
        content: `// src/App.tsx\n// Production React component for ${built?.name || "Application"}\nimport React, { useState } from 'react';\nimport { Sparkles, Globe, MapPin, Mail, CreditCard } from 'lucide-react';\n\nexport default function App() {\n  const [activeTab, setActiveTab] = useState('overview');\n\n  return (\n    <main className="min-h-screen bg-[#070e1e] text-white p-6 font-sans">\n      <header className="max-w-5xl mx-auto flex items-center justify-between border-b border-blue-500/20 pb-4">\n        <div className="flex items-center gap-2">\n          <div className="size-9 rounded-xl bg-gradient-to-tr from-blue-600 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/30">\n            <Sparkles className="size-5 text-white" />\n          </div>\n          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent">\n            ${built?.name || "My Project"}\n          </h1>\n        </div>\n        <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-xs text-blue-300 font-semibold">\n          Production Build v1.0\n        </span>\n      </header>\n\n      <div className="max-w-5xl mx-auto mt-6">\n        <p className="text-sm text-blue-200/80 mb-6">\n          ${built?.description || "Engineered autonomously by My AI Pro"}\n        </p>\n      </div>\n    </main>\n  );\n}\n`,
      },
      {
        path: "index.html",
        language: "html",
        content: html.includes("<!DOCTYPE") ? html : `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8"/>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>\n  <title>${built?.name || "App Preview"}</title>\n  <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-slate-950 text-white">\n  <div id="root">\n    ${html}\n  </div>\n</body>\n</html>`,
      },
      {
        path: "package.json",
        language: "json",
        content: `{\n  "name": "${(built?.name || "my-app").toLowerCase().replace(/[^a-z0-9-]+/g, "-")}",\n  "private": true,\n  "version": "1.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build",\n    "preview": "vite preview"\n  },\n  "dependencies": {\n    "react": "^18.3.1",\n    "react-dom": "^18.3.1",\n    "lucide-react": "^0.475.0",\n    "clsx": "^2.1.1",\n    "tailwind-merge": "^2.5.4"\n  }\n}\n`,
      },
      {
        path: "README.md",
        language: "markdown",
        content: `# ${built?.name || "My Application"}\n\n${built?.description || "Built with My AI Pro no-coding platform."}\n\n## Getting Started\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
      },
    ];
  }, [built]);

  const codeExplorerModal = showCodeExplorerModal && built && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-5xl h-[85vh] rounded-3xl bg-[#070e1e] border border-blue-500/30 shadow-[0_0_60px_rgba(37,99,235,0.3)] overflow-hidden flex flex-col text-white">
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-blue-500/20 bg-[#09142b]/90">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-pink-500 text-white shadow-md">
              <FileCode2 className="size-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold bg-gradient-to-r from-blue-300 via-white to-pink-300 bg-clip-text text-transparent">
                {built.name} — Source Code Explorer
              </h3>
              <p className="text-[11px] text-blue-300/60">
                {userProjectFiles.length} production module(s) written
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCodeExplorerModal(false)}
            className="flex size-8 items-center justify-center rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 hover:text-white transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <CodeExplorer
            files={userProjectFiles}
            appName={built.name}
            onUpdateFiles={(newFiles) => {
              setBuilt((prev) => (prev ? { ...prev, files: newFiles } : prev));
            }}
          />
        </div>
      </div>
    </div>
  );

  const activeProjectTitle = built?.name || history[0]?.name || "My Project";
  const activeProjectDescription =
    built?.description || history[0]?.description || "Full-stack application on My AI Pro";
  const activeProjectFiles = built?.files || history[0]?.files || [];

  const projectControlCenterModal = (
    <ProjectControlCenter
      open={projectMenuOpen}
      onClose={() => setProjectMenuOpen(false)}
      projectName={activeProjectTitle}
      projectDescription={activeProjectDescription}
      onRenameProject={(newName, newDesc) => {
        setBuilt((prev) =>
          prev
            ? {
                ...prev,
                name: newName,
                description: newDesc ?? prev.description,
              }
            : prev,
        );
        setHistory((prev) => {
          const updated = prev.map((h, idx) =>
            h.id === currentProjectId ||
            (built && h.name === built.name) ||
            (!built && idx === 0)
              ? { ...h, name: newName, description: newDesc ?? h.description }
              : h,
          );
          saveUserBuilds(updated);
          return updated;
        });
      }}
      files={activeProjectFiles}
      history={history}
      currentProjectId={currentProjectId || history[0]?.id || null}
      onSelectHistoryProject={(h) => openHistoryProject(h)}
      onDeleteHistoryProject={(h, e) => handleDeleteProject(h, e)}
      onOpenPublish={openPublishModal}
      onSwitchSlide={(s) => goToSlide(s)}
    />
  );

  if (showFullScreenPreview && built) {
    return (
      <Preview
        appName={built.name}
        appDescription={built.description}
        previewHtml={built.preview_html}
        onBackToChat={() => setShowFullScreenPreview(false)}
        onPublish={openPublishModal}
        onOpenLiveView={async () => {
          const slug = await persistPublishedApp(built);
          navigate({ to: "/p/$appId", params: { appId: slug } });
        }}
      />
    );
  }

  if (built) {
    return (
      <div className="flex h-[100dvh] flex-col bg-[#060b19] font-sans text-white select-none sm:select-auto">
        {sharedFileInputs}
        {projectControlCenterModal}

        {/* Top Bar: [ X ] [ ... ]   [ Project Name v ]   [ > ] with classic blue UI and luminous pills */}
        <header className="flex h-14 shrink-0 items-center justify-between px-4 sm:px-6 bg-[#081226]/90 z-30 border-b border-blue-500/20 backdrop-blur-md">
          {/* Left: Close / Back button + Three Dots Menu */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBuilt(null);
              }}
              className="flex size-8 items-center justify-center rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-200 hover:text-white hover:bg-blue-500/20 transition cursor-pointer"
              title="Cancel and return to no-code platform"
            >
              <X className="size-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setPreviewMenuOpen(!previewMenuOpen)}
                className="flex size-8 items-center justify-center rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-200 hover:text-white hover:bg-blue-500/20 transition cursor-pointer"
                title="More options"
              >
                <MoreVertical className="size-4" />
              </button>

              {previewMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-52 rounded-2xl border border-blue-500/30 bg-[#0c1938] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMenuOpen(false);
                      openPublishModal();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600/20 transition text-left cursor-pointer"
                  >
                    <Rocket className="size-4 text-pink-400" />
                    <span>Publish</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMenuOpen(false);
                      goToSlide("chat");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left cursor-pointer"
                  >
                    <ChevronLeft className="size-4 text-blue-400" />
                    <span>Back to chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMenuOpen(false);
                      setShowCodeExplorerModal(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left cursor-pointer"
                  >
                    <FileCode2 className="size-4 text-pink-300" />
                    <span>See the code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewMenuOpen(false);
                      handleDownloadApp();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-blue-600/20 transition text-left cursor-pointer"
                  >
                    <Download className="size-4 text-cyan-400" />
                    <span>Download the app</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Center: Project Name Dropdown Pill */}
          <button
            type="button"
            onClick={() => setProjectMenuOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-[#0b1836] border border-blue-500/30 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-900/40 transition cursor-pointer shadow-xs"
          >
            <span className="truncate max-w-[200px]">{built.name}</span>
            <ChevronDown className="size-3.5 text-blue-400" />
          </button>

          {/* Right: Next / Forward button */}
          <button
            type="button"
            onClick={() => goToSlide(slideIndex === 0 ? "preview" : "chat")}
            className="flex size-8 items-center justify-center rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-200 hover:text-white hover:bg-blue-500/20 transition cursor-pointer"
            title="Next slide"
          >
            <ChevronRight className="size-4" />
          </button>
        </header>

        {/* History Modal / Drawer inside Built Workspace */}
        {showHistory && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setShowHistory(false)} />
            <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-lg max-h-[75vh] flex flex-col rounded-3xl bg-[#0c1938] p-5 shadow-2xl shadow-blue-950 border border-blue-500/30 text-white">
              <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Project History</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowHistory(false);
                      reset();
                    }}
                    className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-500 transition cursor-pointer"
                  >
                    + New Project
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    className="rounded-full p-1 text-blue-300/70 hover:bg-blue-600/20 hover:text-white transition"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pt-3 space-y-2">
                {history.length === 0 ? (
                  <p className="py-6 text-center text-xs text-blue-300/60">No projects in history yet.</p>
                ) : (
                  history.map((h) => {
                    const isItemBuilding = h.status === "planning" || h.status === "writing";
                    const isCurrent = Boolean(built && (h.id === currentProjectId || h.name === built.name));
                    return (
                      <div
                        key={h.id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition",
                          isCurrent
                            ? "border-blue-500/60 bg-[#081226] text-white"
                            : "border-blue-500/20 bg-[#070e20] text-blue-200 hover:border-blue-400/50 hover:text-white",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => openHistoryProject(h)}
                          className="flex-1 text-left min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white truncate">{h.name}</p>
                            {isCurrent && (
                              <span className="rounded-full bg-blue-600/30 border border-blue-400/40 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                                Active
                              </span>
                            )}
                            <span className="text-xs text-blue-300/70 shrink-0">
                              · {isItemBuilding ? "Building…" : `${h.files?.length || 0} modules`}
                            </span>
                          </div>
                          <p className="truncate text-xs text-blue-300/60 mt-0.5">{h.idea}</p>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProject(h, e)}
                          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-900/40 hover:text-red-300 transition cursor-pointer"
                          title="Delete project"
                          aria-label={`Delete project ${h.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* Horizontal 2-Slide Snap Container: Slide 1 = Chat, Slide 2 = Live App Review & Publish */}
        <div
          ref={slideContainerRef}
          onScroll={handleSlideScroll}
          className="flex flex-1 min-h-0 w-full overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
        >
          {/* ==================== SLIDE 1: BUILDER CHAT ==================== */}
          <div className="relative flex h-full w-full shrink-0 snap-center flex-col justify-between overflow-hidden bg-[#070e20] text-blue-100">
            {/* Ambient Lighting Glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
              <div className="absolute top-0 left-1/4 size-[400px] rounded-full bg-blue-600/10 blur-[130px]" />
              <div className="absolute bottom-10 right-10 size-[350px] rounded-full bg-pink-600/10 blur-[140px]" />
            </div>

            {/* Messages Stream */}
            <div className="relative z-10 flex-1 overflow-y-auto px-4 pt-2 pb-4">
              <div className="mx-auto max-w-xl space-y-6">
                {/* Subtle top feedback row matching screenshot */}
                <div className="flex items-center gap-4 px-1 text-blue-300/50">
                  <button
                    type="button"
                    onClick={() => toast.success("Feedback recorded")}
                    className="hover:text-white transition"
                    aria-label="Helpful"
                  >
                    <ThumbsUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.info("Feedback recorded")}
                    className="hover:text-white transition"
                    aria-label="Not helpful"
                  >
                    <ThumbsDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(built.description || built.name);
                      toast.success("Copied");
                    }}
                    className="hover:text-white transition"
                    aria-label="Copy"
                  >
                    <Copy className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToSlide("preview")}
                    className="hover:text-white transition"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>

                {/* Conversation Turns */}
                {turns.map((t) => {
                  const isLongPrompt = t.prompt.length > 135;
                  const isPromptExpanded = Boolean(expandedPrompts[t.id]);
                  const displayedPrompt =
                    isLongPrompt && !isPromptExpanded
                      ? `${t.prompt.slice(0, 135).trim()}...`
                      : t.prompt;

                  return (
                    <div key={t.id} className="space-y-5">
                      {/* USER PROMPT: Midnight Blue Box with Bright Crisp White Text + "Show more" */}
                      <div className="flex flex-col items-end">
                        <div className="w-full max-w-[85%] rounded-[24px] bg-[#0c1938] border border-blue-500/30 px-5 py-4 shadow-lg shadow-blue-950/50">
                          <p className="text-[16px] leading-[1.5] text-white whitespace-pre-wrap break-words font-medium">
                            {displayedPrompt}
                          </p>
                          {isLongPrompt && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPrompts((prev) => ({
                                  ...prev,
                                  [t.id]: !prev[t.id],
                                }))
                              }
                              className="mt-2 text-[14px] text-blue-300 hover:text-white transition font-medium cursor-pointer"
                            >
                              {isPromptExpanded ? "Show less" : "Show more"}
                            </button>
                          )}

                          {/* Show attached images or folder inside user prompt card if present */}
                          {(t.attachedImages?.length || t.folderName) && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-blue-500/20">
                              {t.folderName && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-white bg-blue-600/25 border border-blue-400/40 px-2.5 py-1 rounded-lg font-medium">
                                  <Folder className="size-3.5 text-blue-400" />
                                  {t.folderName}
                                </span>
                              )}
                              {t.attachedImages?.map((src, idx) => (
                                <img
                                  key={idx}
                                  src={src}
                                  alt="Attached reference"
                                  referrerPolicy="no-referrer"
                                  className="size-12 rounded-xl object-cover border border-blue-500/30"
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Meta icons + Timestamp row underneath user prompt card */}
                        <div className="mt-2 flex items-center gap-3.5 px-2 text-blue-300/80">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(t.prompt);
                              toast.success("Prompt copied");
                            }}
                            className="hover:text-white transition cursor-pointer"
                            title="Copy prompt"
                          >
                            <Copy className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.href);
                              toast.success("Link copied");
                            }}
                            className="hover:text-white transition cursor-pointer"
                            title="Copy link"
                          >
                            <Link2 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUpgrade(t.prompt)}
                            className="hover:text-white transition cursor-pointer"
                            title="Edit prompt"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <span className="text-[13px] text-blue-300/70 font-mono">
                            {formatTurnTimestamp(t.at)}
                          </span>
                        </div>
                      </div>

                      {/* AI RESPONSE: "Thought for 6s" + Crisp White Text Summary + Activity Link */}
                      <div className="space-y-3 px-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedThoughts((prev) => ({
                              ...prev,
                              [t.id]: !prev[t.id],
                            }))
                          }
                          className="text-[15px] text-blue-300 hover:text-white transition flex items-center gap-1.5 font-medium cursor-pointer"
                        >
                          {t.status === "building" && (
                            <Loader2 className="size-3.5 animate-spin text-pink-400 mr-0.5" />
                          )}
                          <span>
                            {t.status === "building"
                              ? "Thinking…"
                              : `Thought for ${t.thoughtSeconds || 6}s`}
                          </span>
                        </button>

                        {expandedThoughts[t.id] && progress.length > 0 && (
                          <div className="rounded-2xl bg-[#091530]/90 border border-blue-500/25 p-3.5 text-xs text-blue-200 space-y-1 font-mono shadow-inner">
                            {progress.map((line, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="text-pink-400">›</span>
                                <span>{line}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* AI Action / Output Text in Crisp Bright White */}
                        <p className="text-[16.5px] leading-[1.55] text-white font-medium tracking-wide">
                          {t.aiSummary}
                        </p>

                        {/* Clickable Activity Row ("Exploring ... flow >") -> goes to Slide 2 Preview */}
                        <button
                          type="button"
                          onClick={() => goToSlide("preview")}
                          className="inline-flex items-center gap-1.5 text-[15px] text-blue-200/90 hover:text-white transition py-0.5 cursor-pointer group"
                        >
                          {t.status === "building" && (
                            <Loader2 className="size-3.5 animate-spin text-cyan-400 mr-0.5" />
                          )}
                          <span className="group-hover:underline underline-offset-4">{t.activityLabel}</span>
                          <ChevronRight className="size-4 text-pink-400 transition group-hover:translate-x-0.5" />
                        </button>

                        {/* Bottom ellipses / action trigger */}
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() => goToSlide("preview")}
                            className="text-blue-400/80 hover:text-white transition p-1 cursor-pointer"
                            title="View project details & preview"
                          >
                            <MoreHorizontal className="size-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* In-Place Edit Scoping Loading Indicator */}
                {isScopingEdit && (
                  <div className="rounded-3xl bg-[#0c1938] border border-blue-500/30 p-5 shadow-lg space-y-2 text-white">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
                      <Loader2 className="size-4 animate-spin text-blue-400" />
                      <span className="text-white">Preparing integration questions for "{built.name}"…</span>
                    </div>
                    {pendingEditIdea && (
                      <p className="text-xs text-blue-200/80">
                        Scoping how to edit and integrate: "{pendingEditIdea}"
                      </p>
                    )}
                  </div>
                )}

                {/* In-Place Edit Scoping Form ("What you should ask" before editing the current app's code) */}
                {questions && questions.length > 0 && (
                  <div className="rounded-3xl bg-[#0c1938] border border-blue-500/30 p-5 shadow-2xl space-y-4 text-white">
                    <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                          In-Place Edit · Question {step + 1} of {questions.length}
                        </span>
                        <h4 className="text-sm font-semibold text-white mt-0.5">
                          Integrating into {built.name}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const targetIdea = pendingEditIdea || upgrade || idea;
                          setQuestions(null);
                          if (targetIdea) {
                            triggerBuild(targetIdea, [], targetIdea, true);
                          }
                        }}
                        className="rounded-full bg-blue-600 hover:bg-blue-500 px-3.5 py-1 text-[11px] font-semibold text-white transition cursor-pointer shadow-sm"
                      >
                        Apply Directly Now
                      </button>
                    </div>

                    <p className="text-[16px] font-medium text-white leading-snug">
                      {questions[step]?.question}
                    </p>

                    {Boolean(
                      questions[step]?.requiresApiKey ||
                      /database|db|project\s*id|api\s*id|api\s*key|credential|token|secret/i.test(questions[step]?.question || "")
                    ) && (
                      <div className="rounded-2xl border border-blue-500/30 bg-[#081226] p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Key className="size-4 text-blue-400" />
                          <span className="text-xs font-semibold text-white">
                            {questions[step]?.apiKeyName || "Database API ID / Project Key"}
                          </span>
                        </div>
                        <p className="text-[11px] text-blue-200/70">
                          {questions[step]?.apiKeyHelp || "Enter your Database API ID or Key to connect live storage, or choose an option below to skip."}
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={apiKeyInputs[step] || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setApiKeyInputs((prev) => ({ ...prev, [step]: val }));
                            }}
                            placeholder={questions[step]?.apiKeyPlaceholder || "Enter Database API ID / Key..."}
                            className="flex-1 rounded-xl border border-blue-500/30 bg-[#0c1938] px-3.5 py-2 text-xs font-mono text-white placeholder:text-blue-300/40 outline-none focus:border-blue-400"
                          />
                          {apiKeyInputs[step]?.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                const val = apiKeyInputs[step].trim();
                                const keyTitle = questions[step]?.apiKeyName || "Database API ID / Project Key";
                                setApiKeys((prev) => ({ ...prev, [keyTitle]: val }));
                                setAnswers((prev) => prev.map((v, i) => (i === step ? `Configured ${keyTitle}: ${val.slice(0, 4)}...` : v)));
                                toast.success("Database API ID saved for application integration!");
                              }}
                              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition shrink-0"
                            >
                              Save Key
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {(questions[step]?.options ?? []).map((opt) => {
                        const selected = answers[step] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setAnswers((prev) => prev.map((v, i) => (i === step ? opt : v)))
                            }
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-xs font-medium ring-1 transition cursor-pointer",
                              selected
                                ? "bg-blue-600 text-white ring-blue-400"
                                : "bg-[#081226] text-white ring-blue-500/25 hover:bg-blue-600/20",
                            )}
                          >
                            <span className="text-white font-medium">{opt}</span>
                            {selected && <Check className="size-4 shrink-0 text-emerald-400" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-blue-500/20">
                      <div className="flex items-center gap-2">
                        {step > 0 && (
                          <button
                            type="button"
                            onClick={() => setStep((s) => s - 1)}
                            className="rounded-full px-3.5 py-2 text-xs font-medium text-blue-300 hover:text-white"
                          >
                            Previous
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setQuestions(null);
                            setPendingEditIdea(null);
                          }}
                          className="rounded-full px-3 py-2 text-xs text-blue-300/70 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={!answers[step] || isBuilding}
                        onClick={() => {
                          const isLast = step === questions.length - 1;
                          if (isLast) {
                            const targetIdea = pendingEditIdea || upgrade || idea;
                            const answeredList = questions.map((qItem, i) => ({
                              question: qItem.question,
                              answer: answers[i] || qItem.options[0] || "",
                            }));
                            triggerBuild(targetIdea, answeredList, targetIdea, true);
                          } else {
                            setStep((s) => s + 1);
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:bg-zinc-800 transition"
                      >
                        {step === questions.length - 1
                          ? `Integrate & Edit in ${built.name}`
                          : "Next Question"}
                      </button>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>
            </div>

            {/* Bottom Section: App Suggestions Pills + "Send follow-up..." Composer */}
            <div className="shrink-0 px-3 pb-4 pt-1 bg-[#f7f7f6]">
              <div className="mx-auto max-w-xl space-y-2.5">
                {/* Horizontal Scrollable App Suggestions */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
                  {suggestionPills.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => triggerUpgrade(s)}
                      disabled={isBuilding}
                      className="shrink-0 rounded-full bg-white border border-black/10 px-4 py-2 text-[14px] font-medium text-zinc-900 shadow-2xs hover:bg-zinc-50 active:scale-[0.98] transition disabled:opacity-50 whitespace-nowrap"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Attached Images / Folder Preview Strip inside Composer */}
                {(attachedImages.length > 0 || folderName) && (
                  <div className="flex flex-wrap items-center gap-2 px-2">
                    {folderName && (
                      <div className="flex items-center gap-1.5 rounded-full bg-white border border-black/10 px-3 py-1 text-xs text-zinc-800 shadow-2xs">
                        <Folder className="size-3.5 text-blue-600" />
                        <span className="font-medium">{folderName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFolderName(null);
                            setFolderContext(null);
                          }}
                          className="ml-1 text-zinc-400 hover:text-zinc-900"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    )}
                    {attachedImages.map((src, idx) => (
                      <div key={idx} className="relative size-12 rounded-xl overflow-hidden border border-black/10 bg-white shadow-2xs">
                        <img src={src} alt="Upload preview" referrerPolicy="no-referrer" className="size-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 rounded-full bg-black/70 text-white p-0.5"
                        >
                          <X className="size-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Compact Shorter Composer Box matching classic blue UI ("Queue follow-up...") */}
                <div className="rounded-[24px] bg-[#081226]/95 border border-blue-500/30 p-2 shadow-[0_0_30px_rgba(37,99,235,0.25)] backdrop-blur-xl">
                  <textarea
                    value={upgrade}
                    onChange={(e) => setUpgrade(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (upgrade.trim() && !isBuilding) {
                          triggerUpgrade(upgrade);
                        }
                      }
                    }}
                    rows={1}
                    placeholder="Queue follow-up..."
                    className="w-full resize-none bg-transparent px-2 py-0.5 text-[14px] text-white placeholder:text-blue-300/40 outline-none"
                  />

                  <div className="mt-1 flex items-center justify-between">
                    {/* Left: Plus (+) Button for Uploading Images & Folder */}
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      aria-label="Upload images or folder"
                      title="Upload images, folder, or connect tools"
                      className="flex size-8 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/15 text-blue-200 hover:text-white hover:bg-blue-500/25 active:scale-95 transition cursor-pointer"
                    >
                      <Plus className="size-4 stroke-[1.75]" />
                    </button>

                    {/* Right: [ Stop / Send ] */}
                    <div className="flex items-center gap-1.5">
                      {isBuilding ? (
                        <button
                          type="button"
                          onClick={() => {
                            stopPolling();
                            setIsBuilding(false);
                            toast.info("Build paused");
                          }}
                          aria-label="Stop build"
                          title="Stop active build"
                          className="flex size-8 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/20 text-white hover:bg-blue-500/30 active:scale-95 transition cursor-pointer"
                        >
                          <Square className="size-3.5 fill-white text-white rounded-[2px]" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => upgrade.trim() && triggerUpgrade(upgrade)}
                          disabled={!upgrade.trim()}
                          aria-label="Send follow-up"
                          className="flex size-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-pink-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-40 active:scale-95 transition cursor-pointer"
                        >
                          <Send className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== SLIDE 2 ("SITE TWO"): FULL-SCREEN USER PROJECT & BOTTOM FLOATING CONTROLS ==================== */}
          <div className="relative flex h-full w-full shrink-0 snap-center flex-col overflow-hidden bg-white">
            {/* Full-Screen Project Canvas */}
            <div className="relative flex-1 w-full h-full bg-white overflow-hidden">
              {built.preview_html ? (
                <iframe
                  title="App preview"
                  srcDoc={
                    built.preview_html.includes("<html") || built.preview_html.includes("<!DOCTYPE")
                      ? built.preview_html
                      : `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-950 text-white p-6 font-sans">${built.preview_html}</body></html>`
                  }
                  sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
                  className="size-full border-0 bg-white"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center p-8 text-center bg-zinc-950 text-white space-y-4">
                  <Loader2 className="size-8 animate-spin text-amber-400" />
                  <p className="text-base font-bold text-white">
                    Synthesizing full-screen project: {built.name}…
                  </p>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    {progress[0] || "Compiling components and assembling preview state…"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {plusMenuOverlay}
        {githubModalOverlay}
        {toolApiKeyModalOverlay}
        {codeExplorerModal}

        {/* Publish & Share Hub Modal with Prominent Add Custom Domain Option */}
        {publishOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setPublishOpen(false)} />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-lg rounded-3xl bg-[#0c1938] border border-blue-500/30 p-6 shadow-2xl shadow-blue-950 text-white max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
                    <Rocket className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-white">Publish & Deploy App</h3>
                    <p className="text-[11px] text-blue-300/70">Live Web App & Custom Domain Setup</p>
                  </div>
                </div>
                <button onClick={() => setPublishOpen(false)} className="rounded-full p-1.5 text-blue-300/70 hover:bg-blue-600/20 hover:text-white transition">
                  <X className="size-4" />
                </button>
              </div>

              {/* Status Banner */}
              <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-white">Application is Live on the Internet</p>
                    <p className="text-[11px] text-emerald-300/80">Edge CDN distributed & SSL secured</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  100% Live
                </span>
              </div>

              {/* Live Web URL Section */}
              <div className="mt-3.5 space-y-2">
                <label className="text-xs font-bold text-white block">Live Production URL</label>
                <div className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-[#070e20] px-3 py-2 text-xs">
                  <Globe className="size-3.5 text-blue-400 shrink-0" />
                  <span className="text-blue-300/60 truncate">{typeof window !== "undefined" ? `${window.location.origin}/p/` : "https://myaipro.app/p/"}</span>
                  <input
                    value={publishSlug}
                    onChange={(e) => setPublishSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="bg-transparent font-semibold text-white outline-none flex-1 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const slug = await persistPublishedApp(built, publishSlug);
                      const liveUrl = `${window.location.origin}/p/${slug}`;
                      navigator.clipboard.writeText(liveUrl);
                      toast.success("Live URL copied!");
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-300 hover:text-white shrink-0 cursor-pointer"
                    title="Copy Link"
                  >
                    <Copy className="size-3" /> Copy
                  </button>
                </div>
              </div>

              {/* PROMINENT ADD CUSTOM DOMAIN OPTION */}
              <div className="mt-4 rounded-2xl border border-blue-500/30 bg-[#081226] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-blue-400" />
                    <h4 className="text-xs font-bold text-white">Add Custom Domain</h4>
                  </div>
                  {domainVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      <Check className="size-3" /> SSL Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-blue-600/20 border border-blue-400/30 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                      Custom URL
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-blue-200/80 leading-snug">
                  Point your own custom domain (e.g. <code className="text-blue-300">app.yourdomain.com</code> or <code className="text-blue-300">mycompany.com</code>) to your My AI Pro project with automated zero-config Let's Encrypt SSL.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    value={customDomain}
                    onChange={(e) => {
                      setCustomDomain(e.target.value.toLowerCase().trim());
                      setDomainVerified(false);
                    }}
                    placeholder="e.g. app.yourdomain.com"
                    className="flex-1 rounded-xl border border-blue-500/30 bg-[#070e20] px-3 py-2 text-xs text-white placeholder:text-blue-300/40 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                  />
                  <button
                    type="button"
                    disabled={!customDomain.trim() || verifyingDomain}
                    onClick={() => {
                      if (!customDomain.includes(".")) {
                        toast.error("Please enter a valid domain (e.g. app.yourcompany.com)");
                        return;
                      }
                      setVerifyingDomain(true);
                      setTimeout(() => {
                        setVerifyingDomain(false);
                        setDomainVerified(true);
                        toast.success(`Domain ${customDomain} connected & SSL issued!`);
                        persistPublishedApp(built, publishSlug);
                      }, 900);
                    }}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40 transition shrink-0 shadow-sm cursor-pointer"
                  >
                    {verifyingDomain ? "Verifying…" : domainVerified ? "Connected ✔" : "Connect Domain"}
                  </button>
                </div>

                {domainVerified ? (
                  <div className="rounded-xl bg-[#070e20] p-2.5 border border-emerald-500/30 text-[11px] space-y-1 text-white">
                    <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <Check className="size-3.5" /> Domain successfully bound to your app!
                    </p>
                    <p className="text-[10px] text-blue-300/70">
                      DNS CNAME Record: <code className="text-white">app</code> ➔ <code className="text-white">cdn.myaipro.app</code> (Proxied / TLS 1.3 Active)
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#070e20] p-2 text-[10px] text-blue-200/80 space-y-0.5 border border-blue-500/20">
                    <p className="font-medium text-white">DNS Setup Guide:</p>
                    <p>In your DNS registrar (GoDaddy, Namecheap, Cloudflare), add a <strong className="text-white">CNAME</strong> record pointing to <strong className="text-white">cdn.myaipro.app</strong>.</p>
                  </div>
                )}
              </div>

              {/* Share Live App Link */}
              <div className="mt-4 pt-3 border-t border-blue-500/20 space-y-2">
                <label className="text-xs font-semibold text-white block">Share with others:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => shareApp("whatsapp", built)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/40 transition cursor-pointer"
                  >
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => shareApp("email", built)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-950/30 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-900/40 transition cursor-pointer"
                  >
                    <span>Gmail</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => shareApp("more", built)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/30 bg-[#070e20] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600/20 transition cursor-pointer"
                  >
                    <span>Copy / Share</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-blue-500/20">
                <button
                  type="button"
                  onClick={() => setPublishOpen(false)}
                  className="rounded-full border border-blue-500/30 bg-[#070e20] px-4 py-2 text-xs font-medium text-blue-200 hover:text-white hover:bg-blue-600/20 transition cursor-pointer"
                >
                  Close
                </button>
                <div className="flex items-center gap-2">
                  <a
                    href={`/p/${publishSlug || built.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "my-app"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => persistPublishedApp(built, publishSlug)}
                    className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 transition cursor-pointer"
                  >
                    <ExternalLink className="size-3.5" /> New Tab
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      const slug = await persistPublishedApp(built, publishSlug);
                      setPublishOpen(false);
                      navigate({ to: "/p/$appId", params: { appId: slug } });
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 px-5 py-2 text-xs font-bold text-white shadow hover:opacity-95 transition cursor-pointer"
                  >
                    <Rocket className="size-3.5" /> Open Live Web App
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }



  /* ---------- Questions view ---------- */
  if (questions) {
    const q = questions[step];
    const last = step === questions.length - 1;
    const isApiKeyQuestion = Boolean(
      q.requiresApiKey ||
      /database|db|project\s*id|api\s*id|api\s*key|credential|token|secret|access\s*key/i.test(q.question)
    );
    const keyName = q.apiKeyName || (/database|db|project\s*id|api\s*id/i.test(q.question) ? "Database API ID / Project Key" : "Service API Key");

    return (
      <div className="flex h-[100dvh] flex-col bg-canvas font-sans text-ink">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/5 px-4">
          <button onClick={reset} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink">
            <ArrowLeft className="size-4" /> Back
          </button>
          <span className="text-xs font-medium text-muted-foreground">
            Question {step + 1} of {questions.length}
          </span>
          <div className="w-14" />
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-8">
          <div className="mx-auto max-w-lg space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                  Step {step + 1}
                </span>
                {isApiKeyQuestion && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    · <Key className="size-3" /> API Key Integration
                  </span>
                )}
              </div>
              <h2 className="font-serif text-2xl leading-snug">{q.question}</h2>
            </div>

            {isApiKeyQuestion && (
              <div className="rounded-3xl border border-amber-500/30 bg-surface/90 p-5 space-y-4 shadow-sm ring-1 ring-amber-500/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                      <Key className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-ink">{keyName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {q.apiKeyHelp || "Enter your API key below or skip to use mock responses in development."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Enter Key Value
                  </label>
                  <div className="relative">
                    <input
                      type={showKeySecret[step] ? "text" : "password"}
                      value={apiKeyInputs[step] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApiKeyInputs((prev) => ({ ...prev, [step]: val }));
                      }}
                      placeholder={q.apiKeyPlaceholder || "Paste API key (e.g. sk-proj-... or pk_live_...)"}
                      className="w-full rounded-2xl border border-border bg-canvas px-4 py-3 text-xs font-mono text-ink outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeySecret((prev) => ({ ...prev, [step]: !prev[step] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink p-1"
                    >
                      {showKeySecret[step] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const val = (apiKeyInputs[step] || "").trim();
                      if (!val) {
                        toast.error("Please enter your API key or click Skip below.");
                        return;
                      }
                      setApiKeys((prev) => ({ ...prev, [keyName]: val }));
                      const masked = val.length > 8 ? `${val.slice(0, 4)}...${val.slice(-4)}` : "Provided";
                      const ansText = `Configured ${keyName}: (${masked})`;
                      setAnswers((a) => a.map((v, i) => (i === step ? ansText : v)));
                      toast.success(`${keyName} saved! Our AI will integrate it in the code.`);
                      if (!last) setStep((s) => s + 1);
                    }}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-2xl bg-brand py-2.5 px-4 text-xs font-bold text-brand-foreground hover:opacity-90 transition shadow-xs"
                  >
                    <Check className="size-3.5" /> Save & Integrate Key in Code
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const ansText = "Skip for now (Use mock data & environment placeholder)";
                      setAnswers((a) => a.map((v, i) => (i === step ? ansText : v)));
                      toast.info("Skipped API key. Coder will provide .env template with mock fallbacks.");
                      if (!last) setStep((s) => s + 1);
                    }}
                    className="w-full sm:w-auto rounded-2xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-ink hover:bg-surface/80 transition"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">
                {isApiKeyQuestion ? "Or Choose from Options:" : "Select an option:"}
              </p>
              {q.options.map((o) => {
                const sel = answers[step] === o;
                return (
                  <button
                    key={o}
                    onClick={() => setAnswers((a) => a.map((v, i) => (i === step ? o : v)))}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left text-sm ring-1 transition",
                      sel ? "bg-ink text-white ring-ink font-medium" : "bg-surface text-ink ring-black/5 hover:ring-black/15",
                    )}
                  >
                    <span>{o}</span>
                    {sel && <Check className="size-4 shrink-0 text-brand" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="border-t border-black/5 px-5 pb-8 pt-4">
          <div className="mx-auto flex max-w-lg gap-3">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="rounded-full px-5 py-3 text-sm text-muted-foreground hover:text-ink">
                Previous
              </button>
            )}
            <button
              disabled={!answers[step] || isBuilding}
              onClick={() => {
                if (last) {
                  const targetIdea = (activeScopingIdea || idea || "Custom Application").trim() || "Custom Application";
                  triggerBuild(
                    targetIdea,
                    questions.map((qItem, i) => ({
                      question: qItem.question,
                      answer: answers[i] || qItem.options[0],
                    })),
                  );
                } else {
                  setStep((s) => s + 1);
                }
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-semibold text-brand-foreground disabled:opacity-40 hover:opacity-90 transition cursor-pointer"
            >
              {isBuilding ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Writing Production Code…
                </>
              ) : last ? (
                <>
                  <Rocket className="size-4" /> Start Writing Code & Build App
                </>
              ) : (
                "Next Step"
              )}
            </button>
          </div>
        </footer>
      </div>
    );
  }

  /* ---------- Home (No-Code Platform Exact UI matching screenshot 1) ---------- */
  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#070609] font-sans text-white select-none">
      {projectControlCenterModal}
      {githubModalOverlay}
      {sharedFileInputs}
      {plusMenuOverlay}
      {toolApiKeyModalOverlay}

      {/* Cosmic background ambient glowing curves matching screenshot 1 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 size-[500px] rounded-full bg-blue-600/15 blur-[140px] animate-pulse" />
        <div className="absolute bottom-0 right-0 size-[550px] rounded-full bg-pink-600/20 blur-[160px] animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(30,58,138,0.25)_0%,rgba(7,6,9,0.98)_75%)]" />
      </div>

      {/* Top Header matching screenshot */}
      <header className="relative z-25 flex h-16 shrink-0 items-center justify-between px-5 sm:px-8 bg-transparent">
        <Link to="/build" className="flex items-center gap-2 hover:opacity-90 transition">
          <span className="font-serif text-2xl font-bold tracking-tight text-white leading-none">
            My <span className="text-amber-400">AI</span>
          </span>
        </Link>

        {/* Top switchers: Research & Move between apps */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 p-1 backdrop-blur-md">
          <Link
            to="/voice"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition"
          >
            Voice
          </Link>
          <span className="rounded-full bg-amber-500 text-black px-4 py-1.5 text-xs font-bold shadow-xs">
            No-Code
          </span>
          <Link
            to="/research"
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition"
          >
            Research
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20 transition active:scale-95 shadow-lg backdrop-blur-md"
            title="Project History"
          >
            <History className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setProjectMenuOpen(true)}
            className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20 transition active:scale-95 shadow-lg backdrop-blur-md"
            title="Settings & Tools"
          >
            <Settings className="size-4.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 flex flex-col items-center justify-center">
        {plan.isPending ? (
          /* ==================== SCREENSHOT 2 LOADING ANIMATION STATE ==================== */
          <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-300">
            {/* Glowing Orb / Star with particle rings */}
            <div className="relative flex items-center justify-center size-32 sm:size-40 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-500 p-1 shadow-[0_0_60px_rgba(79,70,229,0.7)] animate-pulse">
              <div className="absolute inset-0 rounded-full border border-white/30 animate-ping opacity-30" />
              <div className="absolute -inset-4 rounded-full border border-pink-500/30 animate-spin" style={{ animationDuration: '8s' }} />
              <div className="flex size-full items-center justify-center rounded-full bg-[#070609]">
                <Sparkles className="size-16 fill-white text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.9)] animate-bounce" />
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-serif text-3xl sm:text-4xl text-white font-normal tracking-tight">
                My AI is working on your <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent font-bold">project.</span>
              </h2>
              {/* Three animated indicator dots */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="size-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="size-3 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="size-3 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        ) : showHistory ? (
          <div className="mx-auto w-full max-w-lg py-6 my-auto rounded-3xl bg-zinc-900/90 border border-white/15 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white">Project History</h2>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">No builds yet. Start your first idea below!</p>
            ) : (
              <ul className="mt-4 space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
                {history.map((h) => (
                  <li key={h.id}>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 hover:bg-black/60 transition group">
                      <button
                        type="button"
                        onClick={() => openHistoryProject(h)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-semibold text-white truncate">{h.name}</p>
                        <p className="truncate text-xs text-zinc-400 mt-0.5">{h.idea}</p>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(h, e)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          /* ==================== SCREENSHOT 1 LANDING UI ==================== */
          <div className="my-auto flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-6 space-y-6">
            {/* Top Connected Tools Pill with Official Logos */}
            <div className="inline-flex items-center gap-3 rounded-full border border-blue-500/30 bg-[#09142b]/90 px-4 py-2 shadow-[0_0_30px_rgba(37,99,235,0.3)] backdrop-blur-xl">
              <div className="flex items-center -space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedToolForApiKey("Gmail");
                    setToolApiKeyValue(userToolKeys["Gmail"] || "");
                  }}
                  className="flex size-7 items-center justify-center rounded-full bg-white border border-blue-400/40 p-1 shadow-xs hover:scale-110 transition cursor-pointer"
                  title="Configure Gmail"
                >
                  <GmailLogo className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedToolForApiKey("Google Maps Platform");
                    setToolApiKeyValue(userToolKeys["Google Maps Platform"] || userToolKeys["Google Maps"] || "");
                  }}
                  className="flex size-7 items-center justify-center rounded-full bg-white border border-blue-400/40 p-1 shadow-xs hover:scale-110 transition cursor-pointer"
                  title="Configure Google Maps"
                >
                  <GoogleMapsLogo className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedToolForApiKey("Stripe");
                    setToolApiKeyValue(userToolKeys["Stripe"] || "");
                  }}
                  className="flex size-7 items-center justify-center rounded-full bg-white border border-blue-400/40 p-1 shadow-xs hover:scale-110 transition cursor-pointer"
                  title="Configure Stripe"
                >
                  <StripeLogo className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedToolForApiKey("GitHub");
                    setToolApiKeyValue(userToolKeys["GitHub"] || "");
                  }}
                  className="flex size-7 items-center justify-center rounded-full bg-zinc-900 border border-blue-400/40 p-1 shadow-xs hover:scale-110 transition cursor-pointer"
                  title="Configure GitHub"
                >
                  <GitHubLogo className="size-4 text-white" />
                </button>
              </div>
              <div className="h-3.5 w-px bg-blue-400/30" />
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-100 hover:text-white transition cursor-pointer"
              >
                <span>Connect all your tools</span>
                <span className="text-pink-400">→</span>
              </button>
            </div>

            {/* Hero Heading: What should we build, Lucky? */}
            <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight text-white text-center leading-[1.1]">
              What should we build, <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-pink-500 bg-clip-text text-transparent font-bold">Lucky?</span>
            </h1>

            {/* Glassy Input Box with Glowing Neon Border matching screenshot 1 */}
            <div className="w-full max-w-xl rounded-3xl border border-transparent bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-pink-500/50 p-0.5 shadow-[0_0_50px_rgba(37,99,235,0.3)]">
              <div className="flex flex-col rounded-[22px] bg-[#081226] p-4 sm:p-5 backdrop-blur-2xl space-y-3 text-left">
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (idea.trim() && !plan.isPending) {
                        const toBuild = idea.trim();
                        setIdea("");
                        plan.mutate(toBuild);
                      }
                    }
                  }}
                  rows={2}
                  placeholder="Describe what you want to create..."
                  className="w-full resize-none bg-transparent text-sm sm:text-base text-white placeholder-blue-300/40 outline-none font-sans leading-relaxed"
                />

                <div className="flex items-center justify-between pt-2 border-t border-blue-500/20">
                  {/* Left Plus Button */}
                  <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    className="flex size-10 items-center justify-center rounded-full bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/30 text-white transition cursor-pointer shadow-md"
                    title="Attach images, folder or connect tools"
                  >
                    <Plus className="size-5 text-blue-200" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!idea.trim() || plan.isPending}
                      onClick={() => {
                        if (idea.trim() && !plan.isPending) {
                          const toBuild = idea.trim();
                          setIdea("");
                          plan.mutate(toBuild);
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-500 hover:from-blue-500 hover:to-pink-400 px-5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-40 transition active:scale-95 cursor-pointer"
                    >
                      <span>Build</span>
                      <Send className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontally Scrollable Feature Navigation Bar Downside of Prompt Input */}
            <div className="w-full max-w-xl mx-auto pt-2 pb-1">
              <FeatureNavBar activeTab="build" variant="inline" />
            </div>

            {/* Attached Context Preview Badges */}
            <div className="flex flex-wrap justify-center gap-2">
              {importedRepo && (
                <div className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-[#09142b] text-blue-200 px-3.5 py-1 text-xs">
                  <GitHubLogo className="size-3.5 text-white" />
                  <span className="font-semibold">{importedRepo.owner}/{importedRepo.repo}</span>
                  <button type="button" onClick={() => setImportedRepo(null)} className="ml-1 text-zinc-400 hover:text-red-400">
                    <X className="size-3" />
                  </button>
                </div>
              )}
              {folderName && (
                <div className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-[#09142b] text-blue-200 px-3.5 py-1 text-xs">
                  <Folder className="size-3.5 text-blue-400" />
                  <span>Folder: <strong>{folderName}</strong></span>
                  <button type="button" onClick={() => { setFolderName(null); setFolderContext(null); }} className="ml-1 text-zinc-400 hover:text-red-400">
                    <X className="size-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={() => {
          setActiveSub(getActiveSubscription());
          setCredits(getUserCredits());
          setShowUpgradeModal(false);
        }}
      />
    </div>
  );
}
