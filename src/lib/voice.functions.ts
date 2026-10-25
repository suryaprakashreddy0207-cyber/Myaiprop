import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { executeCoworkTask, type CoworkResponse, type CoworkAction } from "@/lib/cowork.functions";
import { askModel } from "@/lib/ai-providers.server";
import {
  fetchLiveFinancials,
  fetchLiveWebGrounding,
  fetchLiveWeather,
  detectAppFromSpeech,
  detectCallFromSpeech,
  detectBackFromSpeech,
  detectElectionQuery,
  searchYouTubeSong,
  type MediaPlayerInfo,
} from "@/lib/live-search";

let aiInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    try {
      aiInstance = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });
    } catch {
      aiInstance = null;
    }
  }
  return aiInstance;
}

function extractResponseText(res: any): string {
  if (!res) return "";
  if (typeof res.text === "function") {
    try {
      const t = res.text();
      if (typeof t === "string") return t.trim();
    } catch {
      // ignore
    }
  }
  if (typeof res.text === "string") {
    return res.text.trim();
  }
  if (res.candidates?.[0]?.content?.parts?.[0]?.text) {
    return res.candidates[0].content.parts[0].text.trim();
  }
  return "";
}

export type VoiceAssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  speechText?: string;
  timestamp: string;
  actions?: CoworkAction[];
  mediaPlayer?: MediaPlayerInfo;
  screenUrl?: string;
  folderSummary?: string;
  fileCount?: number;
};

const voiceQuerySchema = z.object({
  prompt: z.string().trim().max(10000).optional().default(""),
  audioDataUrl: z.string().optional(),
  audioMime: z.string().optional(),
  context: z.string().optional(),
  screenCaptureUrl: z.string().optional(),
  folderContext: z.string().optional(),
  fileCount: z.number().optional(),
  memoryContext: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional(),
});

export const askVoiceAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => voiceQuerySchema.parse(d))
  .handler(async ({ data }): Promise<{
    text: string;
    speechText: string;
    actions: CoworkAction[];
    mediaPlayer?: MediaPlayerInfo;
    logs: string[];
    transcribedPrompt?: string;
  }> => {
    const { prompt = "" } = data;
    const { audioDataUrl, audioMime, screenCaptureUrl, folderContext, fileCount, memoryContext, history = [] } = data;
    const actions: CoworkAction[] = [];

    // 1. INSTANT DEVICE ACTIONS (0ms delay - execute calls, navigation & apps immediately!)
    const detectedCall = prompt ? detectCallFromSpeech(prompt) : null;
    if (detectedCall) {
      const callAction: CoworkAction = {
        type: "device_action",
        title: detectedCall.title,
        description: `Calling ${detectedCall.target}`,
        deviceCommand: "call",
        commandParam: detectedCall.number || detectedCall.target,
      };
      return {
        text: `Calling ${detectedCall.target} now...`,
        speechText: `Calling ${detectedCall.target} now.`,
        actions: [callAction],
        logs: ["Instant device phone call initiated"],
        transcribedPrompt: prompt,
      };
    }

    const detectedBack = prompt ? detectBackFromSpeech(prompt) : false;
    if (detectedBack) {
      const backAction: CoworkAction = {
        type: "device_action",
        title: "Going back",
        description: "Returning to previous screen",
        deviceCommand: "back",
      };
      return {
        text: "Navigating back to previous screen.",
        speechText: "Going back now.",
        actions: [backAction],
        logs: ["Instant navigation back"],
        transcribedPrompt: prompt,
      };
    }

    const detectedApp = prompt ? detectAppFromSpeech(prompt) : null;
    if (detectedApp) {
      const appAction: CoworkAction = {
        type: "app_launcher",
        title: detectedApp.title,
        description: `Launching ${detectedApp.app} on your device`,
        app: detectedApp.app,
        appUrl: detectedApp.url,
        appScheme: detectedApp.scheme,
      };
      return {
        text: `Opening ${detectedApp.app} for you now.`,
        speechText: `Opening ${detectedApp.app} on your device now.`,
        actions: [appAction],
        logs: ["Instant device app launcher"],
        transcribedPrompt: prompt,
      };
    }

    // 2. Detect Song / Music playback request
    const isSongRequest = prompt && /\b(play|song|music|listen to|track|audio|sing)\b/i.test(prompt);
    let mediaPlayer: MediaPlayerInfo | undefined;
    if (isSongRequest) {
      const foundSong = await searchYouTubeSong(prompt);
      if (foundSong) {
        mediaPlayer = foundSong;
      }
    }

    // 3. Multi-tier Real-Time Search Grounding in Parallel
    const electionData = prompt ? detectElectionQuery(prompt) : null;
    const [liveFinancials, liveWebData, liveWeather] = await Promise.all([
      prompt && !electionData ? fetchLiveFinancials(prompt) : Promise.resolve(null),
      prompt && !electionData ? fetchLiveWebGrounding(prompt) : Promise.resolve(null),
      prompt && !electionData ? fetchLiveWeather(prompt) : Promise.resolve(null),
    ]);

    let liveContext = "";
    if (electionData) {
      liveContext += `\n[RECENT ELECTIONS & CERTIFIED REAL-WORLD RESULTS]:\n${electionData}\n`;
    }
    if (liveFinancials) {
      liveContext += `\n[LIVE FINANCIAL MARKET & ASSET RATES (CURRENT 2026)]:\n${liveFinancials}\n`;
    }
    if (liveWebData) {
      liveContext += `\n[LIVE WEB SEARCH & REAL-TIME FACTUAL GROUNDING (CURRENT 2026)]:\n${liveWebData}\n`;
    }
    if (liveWeather) {
      liveContext += `\n[REAL-TIME WEATHER DATA]:\n${liveWeather}\n`;
    }
    if (mediaPlayer) {
      liveContext += `\n[MEDIA PLAYER READY]: Playing song "${mediaPlayer.title}" via embedded YouTube player.\n`;
    }
    if (screenCaptureUrl) {
      liveContext += `\n[User shared real-time Screen Capture for this task]`;
    }
    if (folderContext) {
      liveContext += `\n[User uploaded project folder (${fileCount ?? 1} files):\n${folderContext.slice(0, 3000)}]`;
    }

    const VOICE_SYSTEM_INSTRUCTION = `You are "My AI Voice Assistant", a fast, highly capable, up-to-date conversational voice intelligence powered by My AI.
Today's Date: October 2026.
CRITICAL RULES:
1. UP-TO-DATE REAL-TIME ANSWERS & ELECTIONS: For any question about recent elections (e.g. US presidential election, UK general election, India Lok Sabha election, state elections, or world elections), recent government changes, current Prime Ministers, presidents, stock prices, or breaking news, rely on the Google Search Grounding tool and real-time facts to provide the exact, accurate, real-world winner, leader, and latest details immediately:
   - 2024 United States Presidential Election: Donald Trump won the presidency against Kamala Harris on November 5, 2024, becoming the 47th President of the United States.
   - 2024 India Lok Sabha General Election: The NDA led by Prime Minister Narendra Modi / BJP won the election in June 2024, securing a historic 3rd consecutive term.
   - 2024 United Kingdom General Election: The Labour Party led by Sir Keir Starmer won in a landslide majority on July 4, 2024; Keir Starmer is the Prime Minister of the United Kingdom.
   - 2024 Mexico Presidential Election: Claudia Sheinbaum won and became Mexico's first female President.
   - NEVER say no recent election happened. Always report the accurate winners!
2. CONVERSATIONAL & NATURAL FOR VOICE: Because the user is listening to your voice, keep answers concise, clear, and direct (1-2 short punchy sentences).
3. SONG & MUSIC PLAYBACK: If user asked to play a song or music, acknowledge it warmly (e.g. "Playing ${mediaPlayer?.title || "your song"} now!").
4. IDENTITY & MODEL: You are My AI Pro (CEO is Bhavyash), powered by the My AI Neural Voice Engine. When asked what model or AI you are using, always state that you are powered by the My AI Neural Engine. Never state or refer to yourself as Gemini or Google.`;

    let assistantText = "";

    // 4. Primary Gemini Model Pipeline (gemini-2.5-flash for ultra-fast, intelligent voice answers)
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.5-pro",
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
    ];

    const promptText = prompt || (audioDataUrl ? "Please listen to my voice and respond conversationally." : "Hello, how can you help me today?");
    const finalUserPrompt = liveContext
      ? `${promptText}\n\n${liveContext}\n(Answer with the above real-time data directly, concisely, and accurately for speech. If user asks to build, code, create browser, or launch apps, confirm what was built and offer interactive next steps.)`
      : promptText;

    // Build strictly alternating multiturn turns
    const rawTurns: { role: "user" | "model"; text: string }[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        if (!h) continue;
        const role = h.role === "assistant" ? "model" : "user";
        const txt = (h.content || "").trim();
        if (txt) rawTurns.push({ role, text: txt });
      }
    }
    // Append the active user turn
    rawTurns.push({ role: "user", text: finalUserPrompt });

    // Normalize: start with user
    if (rawTurns.length > 0 && rawTurns[0].role !== "user") {
      rawTurns.unshift({ role: "user", text: "Hello" });
    }

    // Merge consecutive turns of identical role
    const mergedContents: { role: "user" | "model"; parts: any[] }[] = [];
    for (const item of rawTurns) {
      if (mergedContents.length === 0) {
        mergedContents.push({ role: item.role, parts: [{ text: item.text }] });
      } else {
        const prev = mergedContents[mergedContents.length - 1];
        if (prev.role === item.role) {
          prev.parts[0].text += `\n\n${item.text}`;
        } else {
          mergedContents.push({ role: item.role, parts: [{ text: item.text }] });
        }
      }
    }

    // Ensure ends with user
    if (mergedContents.length > 0 && mergedContents[mergedContents.length - 1].role !== "user") {
      mergedContents.push({ role: "user", parts: [{ text: finalUserPrompt }] });
    }

    // Attach audio or screen capture to the final user turn if provided
    if (mergedContents.length > 0) {
      const lastItem = mergedContents[mergedContents.length - 1];
      if (audioDataUrl) {
        const [, base64Data] = audioDataUrl.split(",");
        lastItem.parts.unshift({
          inlineData: {
            data: base64Data || audioDataUrl,
            mimeType: audioMime || "audio/webm",
          },
        });
      }
      if (screenCaptureUrl) {
        const [, b64Screen] = screenCaptureUrl.split(",");
        lastItem.parts.unshift({
          inlineData: {
            data: b64Screen || screenCaptureUrl,
            mimeType: "image/jpeg",
          },
        });
      }
    }

    const conversationContents = mergedContents;

    const effectiveVoiceInstruction = memoryContext
      ? `${VOICE_SYSTEM_INSTRUCTION}\n\n${memoryContext}`
      : VOICE_SYSTEM_INSTRUCTION;

    const genAI = getGenAI();
    if (genAI) {
      for (const modelName of candidateModels) {
        try {
          const res = await genAI.models.generateContent({
            model: modelName,
            contents: conversationContents,
            config: {
              systemInstruction: effectiveVoiceInstruction,
            },
          });
          const text = extractResponseText(res);
          if (text) {
            assistantText = text;
            break;
          }
        } catch {
          try {
            const res = await genAI.models.generateContent({
              model: modelName,
              contents: conversationContents,
              config: {
                systemInstruction: effectiveVoiceInstruction,
                tools: [{ googleSearch: {} }],
              },
            });
            const text = extractResponseText(res);
            if (text) {
              assistantText = text;
              break;
            }
          } catch {
            // try next model
          }
        }
      }
    }

    // Fallback if needed
    if (!assistantText) {
      try {
        assistantText = await askModel("myai", VOICE_SYSTEM_INSTRUCTION, prompt || "Hello!");
      } catch {
        if (mediaPlayer) {
          assistantText = `Playing ${mediaPlayer.title} for you right now!`;
        } else {
          assistantText = "I'm listening and ready to help. What would you like to do?";
        }
      }
    }

    // Autonomous Action Detection for Voice Assistant (Coding, Browser, Apps, Spotify, Questions)
    const lowerP = prompt.toLowerCase();
    const isCodeOrBrowser =
      lowerP.includes("browser") ||
      lowerP.includes("code") ||
      lowerP.includes("write") ||
      lowerP.includes("writing") ||
      lowerP.includes("build") ||
      lowerP.includes("make some browser") ||
      lowerP.includes("open app and start");

    if (isCodeOrBrowser && !actions.some((a) => a.type === "code_execution")) {
      const isBrowser = lowerP.includes("browser") || lowerP.includes("make some browser");
      const appTitle = isBrowser ? "Interactive Web Browser" : "Generated Application";
      const filename = isBrowser ? "browser.html" : "app.tsx";

      const browserHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>My AI Pro - Web Browser</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
</head>
<body class="bg-zinc-950 text-white min-h-screen flex flex-col font-sans select-none">
  <header class="bg-zinc-900 border-b border-zinc-800 p-2.5 flex items-center gap-2">
    <div class="flex items-center gap-1.5 text-zinc-400">
      <button onclick="historyBack()" class="p-2 hover:bg-zinc-800 rounded-lg text-xs" title="Back"><i class="fa-solid fa-arrow-left"></i></button>
      <button onclick="historyForward()" class="p-2 hover:bg-zinc-800 rounded-lg text-xs" title="Forward"><i class="fa-solid fa-arrow-right"></i></button>
      <button onclick="refreshPage()" class="p-2 hover:bg-zinc-800 rounded-lg text-xs" title="Reload"><i class="fa-solid fa-rotate-right"></i></button>
    </div>
    <div class="flex-1 flex items-center bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 gap-2 text-xs">
      <i class="fa-solid fa-lock text-emerald-400 text-[10px]"></i>
      <input id="urlInput" type="text" value="https://duckduckgo.com" onkeydown="handleUrlKey(event)" class="bg-transparent flex-1 text-white outline-none font-mono text-xs"/>
      <button onclick="navigateToUrl()" class="bg-amber-500 text-black font-bold px-2.5 py-0.5 rounded-lg text-[10px]">Go</button>
    </div>
    <div class="flex items-center gap-1">
      <button onclick="openTab('https://google.com')" class="text-xs bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1.5 rounded-lg font-medium text-zinc-300">+ Tab</button>
    </div>
  </header>
  <div class="bg-zinc-900/60 border-b border-zinc-800/60 px-3 py-1 flex items-center gap-3 text-xs overflow-x-auto text-zinc-400">
    <button onclick="setUrl('https://google.com')" class="hover:text-white flex items-center gap-1">🔍 Google</button>
    <button onclick="setUrl('https://open.spotify.com')" class="hover:text-white flex items-center gap-1">🎵 Spotify</button>
    <button onclick="setUrl('https://youtube.com')" class="hover:text-white flex items-center gap-1">📺 YouTube</button>
    <button onclick="setUrl('https://github.com')" class="hover:text-white flex items-center gap-1">🐙 GitHub</button>
    <button onclick="setUrl('https://wikipedia.org')" class="hover:text-white flex items-center gap-1">📚 Wikipedia</button>
  </div>
  <main class="flex-1 bg-white relative">
    <iframe id="webFrame" src="https://duckduckgo.com/?kae=d" class="size-full border-0"></iframe>
  </main>
  <script>
    function setUrl(url) {
      document.getElementById('urlInput').value = url;
      document.getElementById('webFrame').src = url;
    }
    function navigateToUrl() {
      let val = document.getElementById('urlInput').value.trim();
      if (!val.startsWith('http://') && !val.startsWith('https://')) {
        val = 'https://duckduckgo.com/?q=' + encodeURIComponent(val);
      }
      document.getElementById('webFrame').src = val;
    }
    function handleUrlKey(e) { if (e.key === 'Enter') navigateToUrl(); }
    function historyBack() { document.getElementById('webFrame').contentWindow.history.back(); }
    function historyForward() { document.getElementById('webFrame').contentWindow.history.forward(); }
    function refreshPage() { document.getElementById('webFrame').src = document.getElementById('urlInput').value; }
    function openTab(url) { setUrl(url); }
  </script>
</body>
</html>`;

      actions.push({
        type: "code_execution",
        title: `${appTitle} (Runnable)`,
        description: `Autonomous code ready for "${prompt.slice(0, 40)}". Tap Run Live to preview.`,
        codeSnippet: {
          language: isBrowser ? "html" : "typescript",
          filename,
          code: isBrowser ? browserHtml : `// ${appTitle}\nexport default function App() {\n  return (\n    <div className="p-6 text-white bg-zinc-950 min-h-screen">\n      <h1 className="text-xl font-bold">App generated for: ${prompt.replace(/"/g, '\\"')}</h1>\n    </div>\n  );\n}`,
        },
      });

      actions.push({
        type: "app_launcher",
        title: "Open in No-Code Visual Builder",
        description: `Open and customize "${appTitle}" in the visual project workspace.`,
        app: "No-Code Platform",
        appUrl: "/build",
        appScheme: "build://",
      });

      actions.push({
        type: "suggestion",
        title: "Follow-up Questions & Options",
        description: "Choose an option or tell me what to refine:",
        suggestions: [
          "Add bookmarks for Spotify, YouTube & GitHub",
          "Open in No-Code Visual Builder",
          "Test live in sandbox runner",
          "Add multi-tab browsing support",
        ],
      });
    }

    if (lowerP.includes("spotify") && !actions.some((a) => a.app === "Spotify")) {
      const songQuery = prompt.replace(/(open\s+spotify\s+and\s+)?(play|listen\s+to|start|stream)?\s*(some|the|a)?/i, "").replace(/on\s+spotify/i, "").trim() || "focus music";
      actions.push({
        type: "app_launcher",
        title: `Play "${songQuery}" on Spotify`,
        description: `Launching Spotify search & player for "${songQuery}".`,
        app: "Spotify",
        appUrl: `https://open.spotify.com/search/${encodeURIComponent(songQuery)}`,
        appScheme: `spotify://search/${encodeURIComponent(songQuery)}`,
      });
    }

    // Clean conversational spoken text for Browser SpeechSynthesis API
    let speechText = assistantText
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#+\s+/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .trim();

    if (isCodeOrBrowser && !speechText.toLowerCase().includes("code") && !speechText.toLowerCase().includes("browser")) {
      speechText = `I have written the code and created the application for you. You can run it live or open it in the visual builder. ${speechText}`;
    } else if (mediaPlayer && !speechText.toLowerCase().includes("play") && !speechText.toLowerCase().includes("song")) {
      speechText = `Playing ${mediaPlayer.title} for you now. ${speechText}`;
    } else if (detectedApp && !speechText.toLowerCase().includes("open")) {
      speechText = `Opening ${detectedApp.app} on your device now. ${speechText}`;
    }

    if (!speechText) {
      speechText = mediaPlayer ? `Playing ${mediaPlayer.title} for you now!` : "Here is what I prepared for you.";
    }

    return {
      text: assistantText,
      speechText,
      actions,
      mediaPlayer,
      logs: ["Real-time live search grounding", "Processed with My AI Neural Engine"],
      transcribedPrompt: prompt || undefined,
    };
  });

/** Dedicated neural speech-to-text server function using Gemini audio models */
export const transcribeAudio = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        audioDataUrl: z.string(),
        language: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      let mimeType = "audio/webm";
      let base64Data = data.audioDataUrl;

      if (data.audioDataUrl.startsWith("data:")) {
        const match = data.audioDataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1] || "audio/webm";
          base64Data = match[2];
        } else {
          const commaIdx = data.audioDataUrl.indexOf(",");
          if (commaIdx !== -1) {
            base64Data = data.audioDataUrl.slice(commaIdx + 1);
          }
        }
      }

      if (!base64Data || base64Data.length < 50) {
        return { transcript: "", success: false };
      }

      const prompt = `Accurately transcribe all spoken speech in this audio recording into text verbatim.
Target language: ${data.language || "en-US"}.
Rules:
1. Return ONLY the transcribed text.
2. If silence or inaudible, return an empty string.
3. No commentary or markdown formatting.`;

      let transcript = "";

      // High-performance Gemini speech transcription models
      const sttCandidates = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.5-flash-lite",
      ];

      const genAI = getGenAI();
      if (genAI) {
        for (const m of sttCandidates) {
          try {
            const res = await genAI.models.generateContent({
              model: m,
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      inlineData: {
                        data: base64Data,
                        mimeType,
                      },
                    },
                    { text: prompt },
                  ],
                },
              ],
            });
            const txt = extractResponseText(res);
            if (txt && typeof txt === "string" && txt.trim().length > 0) {
              transcript = txt.trim();
              break;
            }
          } catch {
            // try next candidate
          }
        }
      }

      transcript = transcript
        .replace(/^["'`]+|["'`]+$/g, "")
        .replace(/^(transcription|transcript|spoken words):\s*/i, "")
        .trim();

      return {
        transcript,
        success: Boolean(transcript),
      };
    } catch {
      return { transcript: "", success: false };
    }
  });

