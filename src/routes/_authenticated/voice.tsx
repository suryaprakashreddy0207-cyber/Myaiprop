import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { askVoiceAssistant, transcribeAudio, type VoiceAssistantMessage } from "@/lib/voice.functions";
import { type MediaPlayerInfo } from "@/lib/live-search";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Plus,
  Send,
  Video,
  Settings,
  X,
  Music,
  Maximize2,
  Minimize2,
  Folder,
  Image as ImageIcon,
  Monitor,
  Camera,
  RefreshCw,
  Sliders,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getMemoryContextPrompt, recordUserMemory } from "@/lib/memory-store";
import {
  getVoiceMinutesRemaining,
  addVoiceMinutesUsed,
  canUseVoiceAssistant,
  getCurrentQuotas,
  triggerUpgradeModal,
} from "@/lib/subscription";
import { getActiveUserStorageKey } from "@/lib/user-session";

export const Route = createFileRoute("/_authenticated/voice")({
  head: () => ({
    meta: [
      { title: "Voice Assistant — My AI Pro" },
      {
        name: "description",
        content:
          "Ultra-fast real-time conversational voice assistant with speech recording, live screen share, front and back camera vision, and speech synthesis.",
      },
      { property: "og:title", content: "Voice Assistant — My AI Pro" },
      {
        property: "og:description",
        content:
          "Ultra-fast real-time conversational voice assistant with speech recording, live screen share, front and back camera vision, and speech synthesis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VoiceAssistantPage,
});

type AssistantState = "idle" | "listening" | "thinking" | "speaking";
type VideoSourceMode = "none" | "front" | "back" | "screen";

export function VoiceAssistantPage() {
  const askFn = useServerFn(askVoiceAssistant);
  const transcribeFn = useServerFn(transcribeAudio);
  const navigate = useNavigate();

  // Assistant State & Messages
  const [messages, setMessages] = useState<VoiceAssistantMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [state, setState] = useState<AssistantState>("idle");
  const [voiceQuota, setVoiceQuota] = useState(() => getVoiceMinutesRemaining());
  const [quotaInfo, setQuotaInfo] = useState(() => getCurrentQuotas());

  useEffect(() => {
    const handleVoiceUpdate = () => {
      setVoiceQuota(getVoiceMinutesRemaining());
      setQuotaInfo(getCurrentQuotas());
    };
    window.addEventListener("myaipro_voice_usage_updated", handleVoiceUpdate);
    window.addEventListener("myaipro_subscription_updated", handleVoiceUpdate);
    return () => {
      window.removeEventListener("myaipro_voice_usage_updated", handleVoiceUpdate);
      window.removeEventListener("myaipro_subscription_updated", handleVoiceUpdate);
    };
  }, []);

  // Recording & Mute State
  const [isRecording, setIsRecording] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Audio Sensitivity & Transcription Processing Options
  const [micSensitivity, setMicSensitivity] = useState<"normal" | "high" | "whisper">("high");
  const [inputLanguage, setInputLanguage] = useState<string>("auto");
  const [sttEngine, setSttEngine] = useState<"auto" | "browser" | "neural">("auto");

  // Camera / Screen Sharing State (Front, Back, Screen)
  const [videoSourceMode, setVideoSourceMode] = useState<VideoSourceMode>("none");
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  // Speech Output (TTS) & Voices
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voiceRate, setVoiceRate] = useState<number>(1.05);
  const [selectedVoice, setSelectedVoice] = useState<string>("default");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Music Player
  const [activeMedia, setActiveMedia] = useState<MediaPlayerInfo | null>(null);
  const [mediaMinimized, setMediaMinimized] = useState(false);

  // Attachments & Plus Menu
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState<number>(0);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);

  // Refs
  const recognitionRef = useRef<any>(null);
  const isRecognitionRunningRef = useRef(false);
  const isRecordingRef = useRef(true);
  const isMutedRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const hasVoiceActivityRef = useRef(false);
  const lastVoiceTimestampRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const isSpeakingCancelledRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const cameraMenuRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const startSpeechRecognitionRef = useRef<() => void>(() => {});

  const handleOpenInVisualBuilder = useCallback((code: string, filename: string, title?: string) => {
    const projId = `proj-${Date.now()}`;
    const appName = title || (filename ? filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") : "Generated Application");
    const isHtml = filename?.endsWith(".html") || code.includes("<!DOCTYPE") || code.includes("<html");
    const previewHtml = isHtml
      ? code
      : `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-zinc-950 text-white p-6 font-sans"><div id="root">${code}</div></body></html>`;

    const newProj = {
      id: projId,
      name: appName,
      description: `Created in Voice Assistant: ${filename}`,
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
  }, [navigate]);

  isRecordingRef.current = isRecording;
  isMutedRef.current = isMuted;

  // 1. Populate Natural Voices for Speech Output
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const populate = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setAvailableVoices(v);
    };
    populate();
    window.speechSynthesis.onvoiceschanged = populate;
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Close camera menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cameraMenuRef.current && !cameraMenuRef.current.contains(event.target as Node)) {
        setCameraMenuOpen(false);
      }
    }
    if (cameraMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [cameraMenuOpen]);

  // Sensitivity Multiplier calculation
  const getGainMultiplier = useCallback((sensitivity: "normal" | "high" | "whisper") => {
    switch (sensitivity) {
      case "whisper":
        return 2.8; // Maximum gain boost for soft whispers & low-gain mics
      case "high":
        return 1.9; // Balanced high sensitivity
      case "normal":
      default:
        return 1.2; // Standard gain
    }
  }, []);

  // Dynamically update hardware gain when sensitivity setting changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = getGainMultiplier(micSensitivity);
    }
  }, [micSensitivity, getGainMultiplier]);

  // 2. Audio Level Analyzer with Hardware Gain Boost & Voice Activity Detection
  const startAudioAnalyzer = useCallback(
    (stream: MediaStream) => {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.25;

        const src = ctx.createMediaStreamSource(stream);

        // Hardware Gain Node: Boosts audio capture sensitivity
        const gainNode = ctx.createGain();
        gainNode.gain.value = getGainMultiplier(micSensitivity);
        gainNodeRef.current = gainNode;

        src.connect(gainNode);
        gainNode.connect(analyser);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const update = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;

          // Scaled normalized volume level 0 - 100
          const scaled = Math.min(100, Math.round((avg / 128) * 100 * 1.6));
          setAudioLevel(scaled);

          // Voice Activity Detection (VAD) with low threshold (>= 6)
          if (scaled >= 6 && !isMutedRef.current && isRecordingRef.current) {
            hasVoiceActivityRef.current = true;
            lastVoiceTimestampRef.current = Date.now();
          }

          animFrameRef.current = requestAnimationFrame(update);
        };
        update();
      } catch {
        // ignore
      }
    },
    [getGainMultiplier, micSensitivity],
  );

  const stopAudioAnalyzer = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    gainNodeRef.current = null;
    setAudioLevel(0);
  }, []);

  // 2.5 MediaRecorder Buffer for Alternative Neural STT Service
  const startMediaRecorder = useCallback((stream: MediaStream) => {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return;
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      let mimeType = "";
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      for (const c of candidates) {
        if (MediaRecorder.isTypeSupported(c)) {
          mimeType = c;
          break;
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          // Rolling buffer of latest 60 chunks (~15 seconds)
          if (recordedChunksRef.current.length > 60) {
            recordedChunksRef.current.splice(0, recordedChunksRef.current.length - 60);
          }
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn("MediaRecorder start notice:", e);
    }
  }, []);

  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;
  }, []);

  // Alternative Neural Speech-to-Text Service
  const triggerAlternativeTranscription = useCallback(async () => {
    if (recordedChunksRef.current.length === 0) return;
    if (stateRef.current === "thinking" || stateRef.current === "speaking") return;

    try {
      const mime = mediaRecorderRef.current?.mimeType || "audio/webm";
      const audioBlob = new Blob(recordedChunksRef.current, { type: mime });
      if (audioBlob.size < 500) return;

      setState("thinking");
      setLiveTranscript("Processing voice with neural AI…");

      const reader = new FileReader();
      reader.onload = async () => {
        const base64Url = reader.result as string;
        try {
          const res = await transcribeFn({
            data: {
              audioDataUrl: base64Url,
              language: inputLanguage === "auto" ? undefined : inputLanguage,
            },
          });

          if (res?.transcript && res.transcript.trim()) {
            hasVoiceActivityRef.current = false;
            handleSendRef.current(res.transcript.trim(), base64Url);
          } else {
            setState(isRecordingRef.current && !isMutedRef.current ? "listening" : "idle");
            setLiveTranscript("");
            hasVoiceActivityRef.current = false;
          }
        } catch {
          setState(isRecordingRef.current && !isMutedRef.current ? "listening" : "idle");
          setLiveTranscript("");
          hasVoiceActivityRef.current = false;
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch {
      setState(isRecordingRef.current && !isMutedRef.current ? "listening" : "idle");
    }
  }, [transcribeFn, inputLanguage]);

  // Periodic Voice Activity & Neural Fallback Watcher
  useEffect(() => {
    const interval = setInterval(() => {
      // If voice was active, and now silent for >1100ms, and prompt is empty or neural mode is active:
      if (
        hasVoiceActivityRef.current &&
        isRecording &&
        !isMuted &&
        state !== "thinking" &&
        state !== "speaking" &&
        Date.now() - lastVoiceTimestampRef.current > 1100
      ) {
        if (sttEngine === "neural" || (!prompt.trim() && !liveTranscript.trim())) {
          triggerAlternativeTranscription();
        }
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isRecording, isMuted, state, prompt, liveTranscript, sttEngine, triggerAlternativeTranscription]);

  // 3. Speech Synthesis (TTS)
  const stopSpeaking = useCallback(() => {
    isSpeakingCancelledRef.current = true;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (stateRef.current === "speaking") {
      setState(isRecordingRef.current && !isMutedRef.current ? "listening" : "idle");
      if (isRecordingRef.current && !isMutedRef.current) {
        startSpeechRecognitionRef.current();
      }
    }
  }, []);

  const speakText = useCallback(
    (textToSpeak: string) => {
      if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;

      stopSpeaking();
      isSpeakingCancelledRef.current = false;
      if (!textToSpeak.trim()) return;

      const clean = textToSpeak
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/#+\s+/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
        .trim();

      const voices = window.speechSynthesis.getVoices();
      const voiceToUse =
        selectedVoice !== "default"
          ? voices.find((v) => v.name === selectedVoice)
          : voices.find(
              (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Natural") ||
                  v.name.includes("Google US") ||
                  v.name.includes("Samantha") ||
                  v.name.includes("Daniel") ||
                  v.name.includes("Jenny") ||
                  v.name.includes("Guy")),
            ) || voices.find((v) => v.lang.startsWith("en"));

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = voiceRate;
      utterance.pitch = 1.0;
      if (voiceToUse) utterance.voice = voiceToUse;

      setState("speaking");

      // Keepalive interval for Chromium speech synthesis bug
      let keepAliveTimer: any = null;
      const startKeepAlive = () => {
        keepAliveTimer = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } else {
            clearInterval(keepAliveTimer);
          }
        }, 8000);
      };

      utterance.onstart = () => {
        startKeepAlive();
      };

      utterance.onend = () => {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        if (!isSpeakingCancelledRef.current) {
          setState(isRecordingRef.current && !isMutedRef.current ? "listening" : "idle");
          if (isRecordingRef.current && !isMutedRef.current) {
            startSpeechRecognitionRef.current();
          }
        }
      };

      utterance.onerror = (e) => {
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        if (e.error !== "canceled") {
          setState(isRecordingRef.current && !isMutedRef.current ? "listening" : "idle");
          if (isRecordingRef.current && !isMutedRef.current) {
            startSpeechRecognitionRef.current();
          }
        }
      };

      // Ensure speech synthesis is resumed from browser power-save/autoplay lock
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {
        /* ignore */
      }

      // Small 40ms delay allows cancel() to settle in Chromium before queueing the new utterance
      setTimeout(() => {
        try {
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        } catch {
          setState(isRecordingRef.current && !isMutedRef.current ? "listening" : "idle");
        }
      }, 40);
    },
    [ttsEnabled, voiceRate, selectedVoice, stopSpeaking],
  );

  // 4. Capture Camera/Screen Frame snapshot for multimodal vision
  const captureVideoSnapshot = useCallback((): string | null => {
    if (!videoRef.current || videoSourceMode === "none") return null;
    try {
      const v = videoRef.current;
      if (v.videoWidth === 0 || v.videoHeight === 0) return null;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(v.videoWidth, 800);
      canvas.height = Math.min(v.videoHeight, 600);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.75);
    } catch {
      return null;
    }
  }, [videoSourceMode]);

  // 5. Send User Prompt to Fast Voice Assistant
  const handleSend = useCallback(
    async (overrideText?: string, overrideAudioUrl?: string) => {
      const text = (overrideText ?? prompt).trim();
      if (!text && videoSourceMode === "none" && attachedImages.length === 0 && !overrideAudioUrl) {
        return;
      }
      if (stateRef.current === "thinking") {
        return;
      }

      setPrompt("");
      setLiveTranscript("");
      stopSpeaking();

      // Check for Navigation Back command
      const lower = text.toLowerCase();
      if (/\b(go back|navigate back|back to chat|back to home|back)\b/i.test(lower)) {
        toast.info("Navigating back to home screen...");
        speakText("Going back now.");
        setTimeout(() => {
          navigate({ to: "/chat" });
        }, 300);
        return;
      }

      if (!canUseVoiceAssistant()) {
        toast.error(
          `Voice speaking limit reached (${quotaInfo.voiceMinutes} mins on ${quotaInfo.multiplierLabel}). Please upgrade for pro to get up to 600 mins!`,
        );
        triggerUpgradeModal();
        setState("idle");
        return;
      }

      setState("thinking");

      // Record what the user said into cross-session memory
      if (text && text.trim()) {
        recordUserMemory({ source: "voice", userStatement: text });
      }

      // Auto capture live video frame if active
      let videoSnapshot: string | null = null;
      if (videoSourceMode !== "none") {
        videoSnapshot = captureVideoSnapshot();
      }

      const userMsg: VoiceAssistantMessage = {
        id: `usr-${Date.now()}`,
        role: "user",
        content: text || (videoSourceMode !== "none" ? "[Shared live visual vision]" : "[Voice recording]"),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        screenUrl: videoSnapshot || undefined,
      };

      setMessages((prev) => [...prev, userMsg]);

      try {
        const history = messages.slice(-4).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        const memoryContext = getMemoryContextPrompt();

        const res = await askFn({
          data: {
            prompt: text,
            audioDataUrl: overrideAudioUrl || undefined,
            screenCaptureUrl: videoSnapshot || undefined,
            folderContext: folderName ? `Attached folder: ${folderName} (${fileCount} files)` : undefined,
            fileCount: fileCount || undefined,
            memoryContext,
            history,
          },
        });

        const reply = res?.text || "I have received your request.";

        // Record assistant response summary to memory
        if (text && text.trim() && reply) {
          recordUserMemory({
            source: "voice",
            userStatement: text,
            assistantSummary: reply.slice(0, 180),
          });
        }

        // Deduct voice speaking duration (~0.25 min / 15 seconds per conversational turn)
        addVoiceMinutesUsed(0.25);

        // Handle Music Player
        if (res?.mediaPlayer) {
          setActiveMedia(res.mediaPlayer);
          setMediaMinimized(false);
        }

        const botMsg: VoiceAssistantMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actions: res?.actions,
          mediaPlayer: res?.mediaPlayer,
        };

        setMessages((prev) => [...prev, botMsg]);

        // Speak aloud with TTS: voice assistant speaks aloud the voice reply while displaying the text in chat
        if (ttsEnabled) {
          speakText(res?.speechText || reply);
        } else {
          setState(isRecordingRef.current && !isMutedRef.current ? "listening" : "idle");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to process voice query");
        setState(isRecordingRef.current && !isMutedRef.current ? "listening" : "idle");
      }
    },
    [
      prompt,
      videoSourceMode,
      attachedImages,
      captureVideoSnapshot,
      stopSpeaking,
      messages,
      askFn,
      ttsEnabled,
      speakText,
      folderName,
      fileCount,
      navigate,
      quotaInfo.voiceMinutes,
      quotaInfo.multiplierLabel,
    ],
  );

  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;

  // 6. Speech Recognition Engine for Continuous Real-Time Recording & Speech-to-Text
  const startSpeechRecognition = useCallback(() => {
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    // If Web Speech API is unsupported in this browser environment, fall back directly to Neural STT
    if (!SR) {
      console.info("Web Speech API unsupported on browser — Neural STT active");
      return;
    }

    if (sttEngine === "neural") {
      return;
    }

    try {
      if (recognitionRef.current && isRecognitionRunningRef.current) {
        recognitionRef.current.stop();
      }

      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 3;
      r.lang = inputLanguage === "auto" ? (navigator.language || "en-US") : inputLanguage;

      r.onresult = (evt: any) => {
        let fullTranscript = "";
        for (let i = 0; i < evt.results.length; i++) {
          fullTranscript += evt.results[i][0]?.transcript || "";
        }

        const currentSpoken = fullTranscript.trim();
        if (currentSpoken) {
          hasVoiceActivityRef.current = true;
          lastVoiceTimestampRef.current = Date.now();
          setLiveTranscript(currentSpoken);
          setPrompt(currentSpoken);

          // Natural 1500ms silence detection to send when user naturally pauses speaking
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (currentSpoken.length >= 2 && !isMutedRef.current && stateRef.current !== "thinking") {
              handleSendRef.current(currentSpoken);
            }
          }, 1500);
        }
      };

      r.onerror = (e: any) => {
        if (e.error !== "no-speech" && e.error !== "aborted") {
          console.warn("Speech recognition notice:", e.error);
        }
        // If Web Speech encounters error (e.g. network/not-allowed), fallback to neural transcription
        if ((e.error === "network" || e.error === "audio-capture" || e.error === "service-not-allowed") && hasVoiceActivityRef.current) {
          triggerAlternativeTranscription();
        }
      };

      r.onend = () => {
        isRecognitionRunningRef.current = false;
        if (isRecordingRef.current && !isMutedRef.current && stateRef.current !== "thinking" && stateRef.current !== "speaking") {
          try {
            r.start();
            isRecognitionRunningRef.current = true;
          } catch {
            // ignore
          }
        }
      };

      recognitionRef.current = r;
      r.start();
      isRecognitionRunningRef.current = true;
    } catch {
      // ignore
    }
  }, [inputLanguage, sttEngine, triggerAlternativeTranscription]);

  startSpeechRecognitionRef.current = startSpeechRecognition;

  useEffect(() => {
    if (state === "listening" && isRecording && !isMuted && !isRecognitionRunningRef.current) {
      startSpeechRecognition();
    }
  }, [state, isRecording, isMuted, startSpeechRecognition]);

  const stopSpeechRecognition = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current && isRecognitionRunningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      isRecognitionRunningRef.current = false;
    }
  }, []);

  // 7. Start & Stop Voice Recording Session
  const startRecordingSession = useCallback(async (isInitialMount = false) => {
    if (typeof window === "undefined") return;
    stopSpeaking();

    try {
      // Enhanced microphone audio capture constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: false }, // Avoid clipping soft speech or whisper
          autoGainControl: { ideal: true },    // Automatically boosts low volume
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints).catch(async () => {
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      });

      mediaStreamRef.current = stream;
      startAudioAnalyzer(stream);
      startMediaRecorder(stream);
      setIsRecording(true);
      setIsMuted(false);
      setState("listening");

      startSpeechRecognition();
      if (!isInitialMount) {
        toast.success("Microphone active — Listening to your voice");
      }
    } catch {
      if (!isInitialMount) {
        toast.error("Microphone permission required for voice recording. Please allow microphone access.");
      }
      setIsRecording(false);
      setState("idle");
    }
  }, [stopSpeaking, startAudioAnalyzer, startMediaRecorder, startSpeechRecognition]);

  // Clean Stop Session and Return to Home Screen
  const handleStopAndGoHome = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    stopSpeechRecognition();
    stopSpeaking();
    stopMediaRecorder();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }

    stopAudioAnalyzer();
    setIsRecording(false);
    setIsMuted(false);
    setState("idle");
    setLiveTranscript("");
    setVideoSourceMode("none");

    toast.success("Voice assistant stopped. Returning to home...");
    navigate({ to: "/chat" });
  }, [stopSpeechRecognition, stopSpeaking, stopMediaRecorder, stopAudioAnalyzer, navigate]);

  // 8. Toggle Mute Functionality
  // If user clicks mute, won't record. If unmuted, records voice and converts into text!
  const toggleMute = useCallback(() => {
    if (!isRecording || !mediaStreamRef.current) {
      startRecordingSession(false);
      return;
    }

    if (isMuted) {
      // Unmute: Start recording user voice and converting into text!
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = true));
      }
      setIsMuted(false);
      setState("listening");
      startSpeechRecognition();
      toast.success("Microphone active — Listening to your voice");
    } else {
      // Mute: Stop recording
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      setIsMuted(true);
      stopSpeechRecognition();
      setState("idle");
      setLiveTranscript("");
      toast.info("Microphone muted — Not recording");
    }
  }, [isRecording, isMuted, startRecordingSession, startSpeechRecognition, stopSpeechRecognition]);

  // 9. Camera & Screen Share Management (Front Camera, Back Camera, Screen Share)
  const stopVideoStream = useCallback(() => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoSourceMode("none");
  }, []);

  const activateVideoSource = useCallback(
    async (mode: "front" | "back" | "screen") => {
      stopVideoStream();
      setCameraMenuOpen(false);

      try {
        let stream: MediaStream;

        if (mode === "screen") {
          // Share Screen
          if (!navigator.mediaDevices?.getDisplayMedia) {
            toast.error("Screen sharing is not supported in this browser.");
            return;
          }
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              cursor: "always",
            } as any,
            audio: false,
          });
        } else if (mode === "back") {
          // Back Camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } else {
          // Front Camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        }

        videoStreamRef.current = stream;
        setVideoSourceMode(mode);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Handle user stopping screen share via native browser bar
        stream.getVideoTracks()[0]?.addEventListener("ended", () => {
          stopVideoStream();
          toast.info("Visual stream ended");
        });

        const label =
          mode === "screen"
            ? "Screen sharing active"
            : mode === "back"
              ? "Back camera active"
              : "Front camera active";
        toast.success(`${label} — Assistant can see your view`);
      } catch (err: any) {
        if (err.name !== "NotAllowedError") {
          toast.error("Could not activate camera or screen share.");
        }
      }
    },
    [stopVideoStream],
  );

  // Attach stream to video element whenever videoSourceMode changes
  useEffect(() => {
    if (videoSourceMode !== "none" && videoStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = videoStreamRef.current;
    }
  }, [videoSourceMode]);

  // Start recording automatically on mount (silent fallback if browser requires user gesture)
  useEffect(() => {
    startRecordingSession(true);
    return () => {
      clearTimeout(silenceTimerRef.current);
      stopSpeechRecognition();
      stopSpeaking();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      stopAudioAnalyzer();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Floating Status Text ("Go ahead", "Thinking...", "Speaking...", or Live Transcript)
  const statusLabel = useMemo(() => {
    if (state === "thinking") return "Thinking…";
    if (state === "speaking") return "Speaking…";
    if (liveTranscript) return liveTranscript;
    if (isMuted) return "Microphone Muted";
    if (isRecording) return "Go ahead";
    return "Go ahead";
  }, [state, liveTranscript, isMuted, isRecording]);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white text-neutral-900 font-sans select-none">
      {/* Subtle organic fluid waves in background matching screenshot */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-30">
        <svg
          className="absolute -top-[10%] left-0 w-full h-[120%] text-neutral-200"
          viewBox="0 0 1000 1000"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-100 200 C 200 150, 400 350, 600 280 C 800 210, 950 380, 1100 320 L 1100 1000 L -100 1000 Z"
            fill="currentColor"
            fillOpacity="0.35"
          />
          <path
            d="M-100 450 C 250 380, 500 550, 750 480 C 950 420, 1050 560, 1150 500 L 1150 1000 L -100 1000 Z"
            fill="currentColor"
            fillOpacity="0.45"
          />
        </svg>
      </div>

      {/* Top Header: Clean Back button + My AI title + Settings */}
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between px-4 bg-transparent border-b border-black/5">
        <button
          onClick={() => navigate({ to: "/chat" })}
          className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition active:scale-95 shadow-xs"
          aria-label="Back to Chat"
          title="Back to Chat"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="flex flex-col items-center">
          <h1 className="font-semibold text-sm text-neutral-800 tracking-tight">
            Voice Assistant
          </h1>
          <button
            type="button"
            onClick={triggerUpgradeModal}
            className="flex items-center gap-1 text-[10px] font-bold text-brand bg-brand/10 hover:bg-brand/20 px-2.5 py-0.5 rounded-full transition cursor-pointer mt-0.5"
            title="Click to view voice minutes & upgrade plans"
          >
            <span>🎙️ {voiceQuota.remaining.toFixed(1)}m / {voiceQuota.total}m left</span>
            <span className="text-[9px] text-muted-foreground font-normal">• {quotaInfo.multiplierLabel}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition active:scale-95 shadow-xs"
          title="Voice Settings"
        >
          <Settings className="size-4" />
        </button>
      </header>

      {/* Live Video Camera / Screen Sharing PIP Preview */}
      {videoSourceMode !== "none" && (
        <div className="fixed top-16 right-4 z-40 w-44 sm:w-60 overflow-hidden rounded-2xl bg-black border-2 border-white shadow-2xl animate-in zoom-in-95">
          <div className="relative aspect-video w-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="size-full object-cover"
            />
            <button
              onClick={stopVideoStream}
              className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black transition"
              title="Close camera"
            >
              <X className="size-3.5" />
            </button>
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5 text-[9px] font-medium text-white/95 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>
                {videoSourceMode === "front"
                  ? "Front Camera"
                  : videoSourceMode === "back"
                    ? "Back Camera"
                    : "Screen Share"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Media Player (Songs & Music) */}
      {activeMedia && (
        <div
          className={cn(
            "fixed z-40 transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border border-neutral-200 bg-white",
            mediaMinimized
              ? "top-16 left-4 w-72 p-2.5 flex items-center justify-between"
              : "top-16 left-4 sm:left-6 w-[320px] sm:w-[380px] p-2",
          )}
        >
          {mediaMinimized ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 truncate">
                <Music className="size-4 text-brand animate-spin" />
                <span className="text-xs font-semibold truncate text-neutral-800">
                  {activeMedia.title}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMediaMinimized(false)}
                  className="p-1 text-neutral-500 hover:text-black rounded"
                >
                  <Maximize2 className="size-3.5" />
                </button>
                <button
                  onClick={() => setActiveMedia(null)}
                  className="p-1 text-neutral-500 hover:text-red-600 rounded"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between pb-1.5 px-1 border-b border-neutral-200 mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 truncate">
                  <Music className="size-3.5 text-brand" />
                  <span className="truncate">{activeMedia.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMediaMinimized(true)}
                    className="p-1 text-neutral-500 hover:text-black rounded"
                  >
                    <Minimize2 className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveMedia(null)}
                    className="p-1 text-neutral-500 hover:text-red-600 rounded"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                <iframe
                  src={activeMedia.embedUrl}
                  title={activeMedia.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="size-full border-0"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Stream Element & Live Screen/Camera Vision Preview Card */}
      <div
        className={cn(
          "fixed z-40 transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border border-emerald-500/50 bg-neutral-950 p-2.5 backdrop-blur-md",
          videoSourceMode !== "none"
            ? "top-16 right-4 sm:right-6 w-64 sm:w-80 space-y-2 block"
            : "hidden",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-white capitalize">
              {videoSourceMode === "screen"
                ? "Live Screen Shared"
                : `${videoSourceMode} Camera Active`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const snap = captureVideoSnapshot();
                if (snap) {
                  toast.success("Snapshot captured for AI assistant!");
                }
              }}
              className="text-[10px] font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-2 py-0.5 rounded-lg border border-white/10 transition cursor-pointer"
              title="Capture snapshot"
            >
              Snapshot
            </button>
            <button
              type="button"
              onClick={() => {
                stopVideoStream();
                toast.info("Turned off visual stream");
              }}
              className="text-[10px] font-bold bg-red-500/20 hover:bg-red-500/40 text-red-300 px-2 py-0.5 rounded-lg border border-red-500/30 transition cursor-pointer"
            >
              Stop
            </button>
          </div>
        </div>

        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-neutral-800">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="size-full object-cover"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-neutral-400 px-1">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <Sparkles className="size-3 animate-pulse" /> Live AI Vision Active
          </span>
          <span className="text-neutral-500">Multimodal Assistant</span>
        </div>
      </div>

      {/* Main Canvas Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-end px-4 pb-2 overflow-hidden">
        {/* Soft Ambient Audio Waveform Aura in Center */}
        <div className="my-auto flex flex-col items-center justify-center text-center overflow-y-auto max-h-[55vh] w-full max-w-lg mx-auto px-2">
          {(!isRecording || !mediaStreamRef.current) && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => startRecordingSession(false)}
                className="flex items-center gap-2 rounded-full bg-black text-white px-5 py-2.5 text-xs font-bold shadow-xl hover:bg-neutral-800 transition active:scale-95 animate-pulse cursor-pointer"
              >
                <Mic className="size-4 text-emerald-400" />
                <span>Tap to Enable Microphone &amp; Start Speaking</span>
              </button>
            </div>
          )}

          <div
            onClick={toggleMute}
            className="relative flex items-center justify-center cursor-pointer group"
            title={isMuted ? "Click to unmute and record voice" : "Click to mute microphone"}
          >
            <div
              className={cn(
                "size-36 sm:size-48 rounded-full transition-all duration-300 blur-3xl",
                isRecording && !isMuted ? "bg-blue-400/25 scale-110" : "bg-neutral-200/50 scale-95",
                state === "speaking" && "bg-brand/35 scale-125 animate-pulse",
                state === "thinking" && "bg-purple-400/35 scale-110 animate-spin",
              )}
              style={{
                transform:
                  isRecording && !isMuted && audioLevel > 0
                    ? `scale(${1 + audioLevel / 110})`
                    : undefined,
              }}
            />
          </div>

          {/* Interactive Messages & Autonomous Action Cards (Browser, Code, Questions, Spotify) */}
          {messages.length > 0 && (
            <div className="mt-4 w-full space-y-2.5 text-left">
              {messages.slice(-2).map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-2xl p-3.5 text-xs shadow-md border transition-all animate-in fade-in",
                    msg.role === "assistant"
                      ? "bg-white/95 border-neutral-200 text-neutral-800"
                      : "bg-neutral-900 text-white border-neutral-800 ml-auto max-w-[85%]",
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed font-sans">{msg.content}</p>

                  {/* Actions (Browser, Code, Spotify, Questions) */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-neutral-100 space-y-2">
                      {msg.actions.map((act, actIdx) => (
                        <div key={actIdx} className="space-y-1.5">
                          {act.type === "code_execution" && act.codeSnippet && (
                            <div className="rounded-xl bg-neutral-950 text-white p-2.5 border border-neutral-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px] text-amber-400 font-bold">{act.title}</span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenInVisualBuilder(
                                        act.codeSnippet!.code,
                                        act.codeSnippet!.filename,
                                        act.title,
                                      )
                                    }
                                    className="rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-2.5 py-1 text-[11px] font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                                  >
                                    <span>Open in Visual Builder →</span>
                                  </button>
                                </div>
                              </div>
                              <pre className="text-[10px] font-mono text-neutral-300 overflow-x-auto max-h-24 p-1.5 bg-black/60 rounded">
                                <code>{act.codeSnippet.code.slice(0, 300)}...</code>
                              </pre>
                            </div>
                          )}

                          {act.type === "app_launcher" && (
                            act.appUrl === "/build" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const codeAct = msg.actions?.find((a) => a.codeSnippet?.code);
                                  if (codeAct?.codeSnippet) {
                                    handleOpenInVisualBuilder(
                                      codeAct.codeSnippet.code,
                                      codeAct.codeSnippet.filename,
                                      act.title,
                                    );
                                  } else {
                                    navigate({ to: "/build", search: { openLatest: true } });
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 text-black px-3.5 py-1.5 text-[11px] font-bold hover:bg-amber-400 transition shadow-xs cursor-pointer"
                              >
                                <span>{act.title} →</span>
                              </button>
                            ) : (
                              <a
                                href={act.appUrl || act.appScheme || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-black text-white px-3 py-1.5 text-[11px] font-bold hover:bg-neutral-800 transition shadow-xs"
                              >
                                <ExternalLink className="size-3" />
                                <span>{act.title}</span>
                              </a>
                            )
                          )}

                          {act.suggestions && act.suggestions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {act.suggestions.map((sug, sIdx) => (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => handleSend(sug)}
                                  className="rounded-full bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 px-2.5 py-1 text-[10px] font-medium text-neutral-800 transition cursor-pointer"
                                >
                                  💬 {sug}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Status Pill matching Screenshot ("Go ahead" / Live Transcript) */}
        <div className="mx-auto mb-4 flex items-center justify-center max-w-sm px-2">
          <div className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 border border-neutral-200 shadow-md text-xs font-medium text-neutral-800 transition max-w-full">
            {/* Waveform icon */}
            <div className="flex items-center gap-0.5 shrink-0">
              <span
                className={`w-0.5 rounded-full bg-neutral-800 transition-all ${
                  isRecording && !isMuted ? "h-3 animate-pulse" : "h-1.5"
                }`}
              />
              <span
                className={`w-0.5 rounded-full bg-neutral-800 transition-all ${
                  isRecording && !isMuted ? "h-4.5 animate-pulse delay-75" : "h-3"
                }`}
              />
              <span
                className={`w-0.5 rounded-full bg-neutral-800 transition-all ${
                  isRecording && !isMuted ? "h-2 animate-pulse delay-150" : "h-1.5"
                }`}
              />
            </div>
            <span className="truncate">{statusLabel}</span>
          </div>
        </div>

        {/* Row of 4 Control Action Buttons matching Screenshot */}
        <div className="mx-auto mb-3 grid w-full max-w-sm grid-cols-4 gap-2.5">
          {/* 1. Camera / Video Button with Popover (Front, Back, Screen Share) */}
          <div className="relative" ref={cameraMenuRef}>
            <button
              type="button"
              onClick={() => setCameraMenuOpen((v) => !v)}
              className={cn(
                "flex w-full items-center justify-center rounded-2xl py-3.5 border transition shadow-xs active:scale-95",
                videoSourceMode !== "none"
                  ? "bg-neutral-900 border-neutral-900 text-white"
                  : "bg-neutral-100/90 border-neutral-200/80 text-neutral-800 hover:bg-neutral-200",
              )}
              title="Camera & Screen Share Options"
            >
              <Video className="size-5" />
            </button>

            {/* Camera / Screen Share Popup Menu */}
            {cameraMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-52 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-neutral-900">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-neutral-500 border-b border-neutral-100 mb-1">
                  Camera & Vision
                </div>

                <button
                  type="button"
                  onClick={() => activateVideoSource("front")}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition text-left",
                    videoSourceMode === "front"
                      ? "bg-neutral-900 text-white"
                      : "hover:bg-neutral-100 text-neutral-800",
                  )}
                >
                  <Camera className="size-4" />
                  <span>Front Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => activateVideoSource("back")}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition text-left",
                    videoSourceMode === "back"
                      ? "bg-neutral-900 text-white"
                      : "hover:bg-neutral-100 text-neutral-800",
                  )}
                >
                  <RefreshCw className="size-4" />
                  <span>Back Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => activateVideoSource("screen")}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition text-left",
                    videoSourceMode === "screen"
                      ? "bg-neutral-900 text-white"
                      : "hover:bg-neutral-100 text-neutral-800",
                  )}
                >
                  <Monitor className="size-4" />
                  <span>Share Screen</span>
                </button>

                {videoSourceMode !== "none" && (
                  <div className="mt-1 pt-1 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        stopVideoStream();
                        setCameraMenuOpen(false);
                        toast.info("Turned off camera");
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      <X className="size-3.5" />
                      <span>Turn Off Camera</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Speaker Button */}
          <button
            type="button"
            onClick={() => {
              if (ttsEnabled) {
                stopSpeaking();
                setTtsEnabled(false);
                toast.info("Voice audio output muted");
              } else {
                setTtsEnabled(true);
                toast.success("Voice audio output unmuted");
              }
            }}
            className={cn(
              "flex items-center justify-center rounded-2xl py-3.5 border transition shadow-xs active:scale-95",
              !ttsEnabled
                ? "bg-neutral-300 border-neutral-300 text-neutral-600"
                : "bg-neutral-100/90 border-neutral-200/80 text-neutral-800 hover:bg-neutral-200",
            )}
            title={ttsEnabled ? "Speech audio active (Click to mute)" : "Speech audio muted"}
          >
            {ttsEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>

          {/* 3. Microphone Button (Mute / Unmute: If muted won't record; if unmuted records and converts into text) */}
          <button
            type="button"
            onClick={toggleMute}
            className={cn(
              "flex items-center justify-center rounded-2xl py-3.5 border transition shadow-xs active:scale-95",
              isMuted
                ? "bg-amber-100 border-amber-300 text-amber-700"
                : isRecording
                  ? "bg-neutral-900 border-neutral-900 text-white"
                  : "bg-neutral-100/90 border-neutral-200/80 text-neutral-800 hover:bg-neutral-200",
            )}
            title={isMuted ? "Click to unmute & record voice" : "Click to mute microphone"}
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          {/* 4. Settings Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex w-full items-center justify-center rounded-2xl py-3.5 bg-neutral-100/90 border border-neutral-200/80 text-neutral-800 hover:bg-neutral-200 transition shadow-xs active:scale-95"
              title="Voice assistant settings"
            >
              <Settings className="size-5" />
            </button>
            <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-neutral-900 text-[9px] text-white">
              ✦
            </span>
          </div>
        </div>

        {/* Bottom Input & STOP Button Bar */}
        <div className="mx-auto flex w-full max-w-sm items-center gap-2 pb-4">
          {/* Pill Input Container */}
          <div className="flex flex-1 items-center gap-2 rounded-full bg-neutral-100 border border-neutral-200 px-3 py-2 shadow-inner focus-within:border-neutral-400 transition">
            <button
              type="button"
              onClick={() => setPlusMenuOpen((v) => !v)}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:text-black hover:bg-neutral-200 transition"
              title="Attach media or files"
            >
              <Plus className="size-4" />
            </button>

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isMuted ? "Muted (Type or unmute)" : "Listening… Ask anything"}
              className="flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-500 outline-none"
            />

            {prompt.trim() && (
              <button
                type="button"
                onClick={() => handleSend()}
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition"
              >
                <Send className="size-3.5" />
              </button>
            )}
          </div>

          {/* Black Pill Button: Always "●●●●● Stop" - Clicking Stop stops and returns to home screen! */}
          <button
            type="button"
            onClick={handleStopAndGoHome}
            className="flex items-center gap-2 rounded-full bg-black px-5 py-3 text-xs font-semibold text-white hover:bg-neutral-800 transition shadow-md active:scale-95 shrink-0"
            title="Stop session and return to home"
          >
            <span className="flex items-center gap-0.5">
              <span className="size-1 rounded-full bg-white" />
              <span className="size-1 rounded-full bg-white" />
              <span className="size-1 rounded-full bg-white" />
              <span className="size-1 rounded-full bg-white" />
              <span className="size-1 rounded-full bg-white" />
            </span>
            <span>Stop</span>
          </button>
        </div>
      </main>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200 text-neutral-900">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Settings className="size-4" />
                <span>Voice Settings</span>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-full p-1 text-neutral-400 hover:text-black transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Audio Capture Sensitivity Boost */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-neutral-600 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="size-3.5 text-neutral-700" />
                    <span>Mic Audio Sensitivity</span>
                  </div>
                  <span className="font-mono text-neutral-900 capitalize">
                    {micSensitivity === "whisper"
                      ? "Whisper (2.8x)"
                      : micSensitivity === "high"
                        ? "High (1.9x)"
                        : "Normal (1.2x)"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["normal", "high", "whisper"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setMicSensitivity(mode);
                        toast.success(
                          mode === "whisper"
                            ? "Whisper boost enabled (2.8x gain)"
                            : mode === "high"
                              ? "High sensitivity active (1.9x gain)"
                              : "Standard mic sensitivity active",
                        );
                      }}
                      className={`rounded-xl py-2 px-1 text-xs font-medium border transition ${
                        micSensitivity === mode
                          ? "bg-black border-black text-white"
                          : "bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      {mode === "whisper"
                        ? "Whisper"
                        : mode === "high"
                          ? "High"
                          : "Normal"}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-neutral-500">
                  Boosts microphone capture gain for soft voices and quiet environments.
                </p>
              </div>

              {/* Speech Recognition Service */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-neutral-600 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-neutral-700" />
                    <span>Speech Processing Service</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "auto", label: "Auto Hybrid" },
                    { id: "browser", label: "Web Speech" },
                    { id: "neural", label: "Neural AI" },
                  ].map((eng) => (
                    <button
                      key={eng.id}
                      type="button"
                      onClick={() => {
                        setSttEngine(eng.id as any);
                        toast.success(`Speech engine set to ${eng.label}`);
                      }}
                      className={`rounded-xl py-2 px-1 text-[11px] font-medium border transition ${
                        sttEngine === eng.id
                          ? "bg-black border-black text-white"
                          : "bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      {eng.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-neutral-500">
                  Auto Hybrid combines real-time Web Speech with Neural AI fallback for 100% accuracy.
                </p>
              </div>

              {/* Speech Input Language */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  Spoken Language
                </label>
                <select
                  value={inputLanguage}
                  onChange={(e) => {
                    setInputLanguage(e.target.value);
                    if (isRecording) {
                      stopSpeechRecognition();
                      setTimeout(() => startSpeechRecognition(), 150);
                    }
                  }}
                  className="w-full rounded-2xl bg-neutral-100 border border-neutral-200 p-2.5 text-xs text-neutral-900 outline-none"
                >
                  <option value="auto">Auto-Detect (Device Language)</option>
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="en-IN">English (India)</option>
                  <option value="es-ES">Spanish (Español)</option>
                  <option value="hi-IN">Hindi (हिन्दी)</option>
                  <option value="fr-FR">French (Français)</option>
                  <option value="de-DE">German (Deutsch)</option>
                  <option value="ja-JP">Japanese (日本語)</option>
                  <option value="zh-CN">Chinese (中文)</option>
                </select>
              </div>

              {/* Natural Voice Selection for TTS */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                  Natural Output Voice
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full rounded-2xl bg-neutral-100 border border-neutral-200 p-2.5 text-xs text-neutral-900 outline-none"
                >
                  <option value="default">Default Natural Voice</option>
                  {availableVoices
                    .filter((v) => v.lang.startsWith("en"))
                    .map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name.replace(/Google|Microsoft/g, "").trim()} ({v.lang})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium text-neutral-600 mb-1.5">
                  <span>Speaking Speed</span>
                  <span className="font-mono text-neutral-900">{voiceRate}x</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[0.8, 1.0, 1.2, 1.5].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setVoiceRate(rate)}
                      className={`rounded-xl py-1.5 text-xs font-medium border transition ${
                        voiceRate === rate
                          ? "bg-black border-black text-white"
                          : "bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    speakText("Hello! I am My AI, your ultra-fast voice assistant with high-sensitivity audio capture.");
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-neutral-100 py-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-200 transition"
                >
                  <Volume2 className="size-3.5" />
                  <span>Test Voice Sample</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plus Menu Modal for Attachments & Files */}
      {plusMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl border border-neutral-200 text-neutral-900 space-y-2 mb-20 animate-in slide-in-from-bottom-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="text-xs font-semibold text-neutral-700">Add to Conversation</span>
              <button onClick={() => setPlusMenuOpen(false)} className="text-neutral-400 hover:text-black">
                <X className="size-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setPlusMenuOpen(false);
                setCameraMenuOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-neutral-50 p-3 text-xs font-medium text-neutral-800 hover:bg-neutral-100 transition"
            >
              <Video className="size-4 text-blue-600" />
              <span>Camera Vision & Screen Share</span>
            </button>

            <button
              onClick={() => {
                setPlusMenuOpen(false);
                fileInputRef.current?.click();
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-neutral-50 p-3 text-xs font-medium text-neutral-800 hover:bg-neutral-100 transition"
            >
              <ImageIcon className="size-4 text-purple-600" />
              <span>Attach Image to Analyze</span>
            </button>

            <button
              onClick={() => {
                setPlusMenuOpen(false);
                folderInputRef.current?.click();
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-neutral-50 p-3 text-xs font-medium text-neutral-800 hover:bg-neutral-100 transition"
            >
              <Folder className="size-4 text-emerald-600" />
              <span>Upload Project Folder / Files</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            const arr: string[] = [];
            Array.from(files).forEach((f) => {
              const reader = new FileReader();
              reader.onload = () => {
                arr.push(reader.result as string);
                if (arr.length === files.length) {
                  setAttachedImages(arr);
                  toast.success(`Attached ${arr.length} image(s)`);
                }
              };
              reader.readAsDataURL(f);
            });
          }
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            setFolderName(files[0]?.webkitRelativePath?.split("/")[0] || "Project Folder");
            setFileCount(files.length);
            toast.success(`Attached folder (${files.length} files)`);
          }
        }}
      />
    </div>
  );
}
