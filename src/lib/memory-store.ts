import { getActiveUserStorageKey } from "@/lib/user-session";

export interface MemoryItem {
  id: string;
  source: "chat" | "voice";
  topic: string;
  userStatement: string;
  assistantSummary?: string;
  timestamp: string;
  threadId?: string;
}

const MEMORY_STORAGE_PREFIX = "myaipro_long_term_memories_v1_";

function getMemoryKey(): string {
  const userKey = getActiveUserStorageKey();
  return `${MEMORY_STORAGE_PREFIX}${userKey}`;
}

/** Retrieve all remembered items across chats and voice sessions */
export function getLongTermMemories(): MemoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getMemoryKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Save a new memory from chat or voice interaction */
export function recordUserMemory(input: {
  source: "chat" | "voice";
  userStatement: string;
  assistantSummary?: string;
  topic?: string;
  threadId?: string;
}): void {
  if (typeof window === "undefined") return;
  const cleanStatement = input.userStatement.trim();
  if (!cleanStatement || cleanStatement.length < 3) return;

  // Don't record trivial greetings or short single words
  const lower = cleanStatement.toLowerCase();
  if (["hi", "hello", "hey", "ok", "yes", "no", "bye", "thanks", "thank you"].includes(lower)) {
    return;
  }

  try {
    const existing = getLongTermMemories();

    // Deduce topic if not provided
    let topic = input.topic;
    if (!topic) {
      if (cleanStatement.length > 60) {
        topic = cleanStatement.slice(0, 50) + "…";
      } else {
        topic = cleanStatement;
      }
    }

    const newItem: MemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source: input.source,
      topic,
      userStatement: cleanStatement.slice(0, 500),
      assistantSummary: input.assistantSummary?.slice(0, 500),
      timestamp: new Date().toISOString(),
      threadId: input.threadId,
    };

    // Keep the most recent 60 memories
    const updated = [newItem, ...existing.filter((m) => m.userStatement !== cleanStatement)].slice(0, 60);
    localStorage.setItem(getMemoryKey(), JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent("myaipro_memory_updated", { detail: newItem }));
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Format remembered topics & conversations into a structured context prompt
 * to inject into Gemini for cross-session continuity.
 */
export function getMemoryContextPrompt(): string {
  const memories = getLongTermMemories();
  if (!memories || memories.length === 0) return "";

  const recent = memories.slice(0, 15);
  const memoryLines = recent.map((m) => {
    const timeAgo = formatTimeAgo(m.timestamp);
    const channel = m.source === "voice" ? "Voice Assistant" : "AI Chat";
    return `- [${channel} • ${timeAgo}]: User discussed/said: "${m.userStatement}"${
      m.assistantSummary ? ` (Key takeaway: ${m.assistantSummary})` : ""
    }`;
  });

  return `
[CROSS-SESSION LONG-TERM MEMORY — REMEMBER WHAT USER SAID]
The user has previously spoken with you in past conversations and voice sessions. Here are remembered topics and statements from earlier sessions:
${memoryLines.join("\n")}

CRITICAL MEMORY DIRECTIVE:
1. When the user asks: "Do you remember?", "What was I speaking about?", "I was speaking about this, do you remember?", or asks about any past project, idea, problem, or topic:
   - You MUST acknowledge that you remember immediately!
   - Say: "Yes, I remember! Earlier you were speaking about [topic]..." and elaborate on what they discussed.
2. Even in a brand-new chat thread or voice session, draw upon these past topics when the user refers back to previous discussions. Maintain continuity as their unified, lifelong personal AI companion.
`.trim();
}

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "earlier";
  }
}
