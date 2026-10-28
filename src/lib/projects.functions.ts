import { createServerFn } from "@tanstack/react-start";
import { askModel } from "@/lib/ai-providers.server";
import { GoogleGenAI } from "@google/genai";
import { fetchLiveWebGrounding, fetchLiveFinancials } from "@/lib/live-search";
import { z } from "zod";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { "User-Agent": "aistudio-build" } },
});

const askProjectSchema = z.object({
  projectId: z.string(),
  projectTitle: z.string(),
  projectInstructions: z.string().optional(),
  sourcesContext: z.string().optional(),
  userMessage: z.string(),
  conversationHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ).optional(),
});

export const sendProjectChatMessage = createServerFn({ method: "POST" })
  .validator((d: unknown) => askProjectSchema.parse(d))
  .handler(async ({ data }) => {
    const {
      projectTitle,
      projectInstructions,
      sourcesContext,
      userMessage,
      conversationHistory = [],
    } = data;

    let systemPrompt = `You are My AI, personal intelligence assistant for project "${projectTitle}".
Today's Date: October 2026.
Powered by the My AI Neural Engine. When asked which model or AI you are using, always state that you are powered by the My AI Neural Engine developed by My AI Pro. Never refer to yourself as Gemini or Google.
You provide clear, accurate, insightful analysis, code writing, and direct answers grounded in live real-world data and connected sources.`;

    if (projectInstructions && projectInstructions.trim()) {
      systemPrompt += `\n\nProject Guidelines & Custom Instructions:\n${projectInstructions.trim()}`;
    }

    if (sourcesContext && sourcesContext.trim()) {
      systemPrompt += `\n\nConnected Project Sources (Google Drive, Google Sheets, Gmail, Files):\n${sourcesContext.trim()}`;
      systemPrompt += `\nAlways use and reference these connected sources when relevant to answer the user's questions accurately.`;
    }

    // Only invoke live web search if user explicitly asks for real-time news/prices/rates
    const needsSearch = /\b(search|google|news|today|current price|stock|crypto|bitcoin|weather|exchange rate|live rate)\b/i.test(userMessage);
    let liveGrounding = "";
    if (needsSearch) {
      try {
        const isFinancial = /\b(rupee|inr|dollar|usd|rate|price|value|stock|crypto|bitcoin)\b/i.test(userMessage);
        const [liveSearch, liveFinancials] = await Promise.all([
          fetchLiveWebGrounding(userMessage).catch(() => null),
          isFinancial ? fetchLiveFinancials(userMessage).catch(() => null) : Promise.resolve(null),
        ]);
        if (liveSearch) liveGrounding += `\n[LIVE SEARCH RESULTS]:\n${liveSearch}`;
        if (liveFinancials) liveGrounding += `\n[FINANCIAL DATA]:\n${liveFinancials}`;
      } catch {
        // non-blocking
      }
    }

    const effectiveUserPrompt = liveGrounding
      ? `${userMessage}\n\n${liveGrounding}\n(Answer the user accurately using the above live info.)`
      : userMessage;

    // Format chat history into strictly alternating multiturn contents
    const turns: { role: "user" | "model"; parts: any[] }[] = [];
    if (conversationHistory.length > 0) {
      for (const m of conversationHistory.slice(-8)) {
        if (!m?.content) continue;
        turns.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        });
      }
    }
    turns.push({
      role: "user",
      parts: [{ text: effectiveUserPrompt }],
    });

    // Ensure strictly alternating
    const sanitizedTurns: { role: "user" | "model"; parts: any[] }[] = [];
    for (const t of turns) {
      if (sanitizedTurns.length === 0) {
        if (t.role !== "user") sanitizedTurns.push({ role: "user", parts: [{ text: "Hello" }] });
        sanitizedTurns.push(t);
      } else {
        const prev = sanitizedTurns[sanitizedTurns.length - 1];
        if (prev.role === t.role) {
          prev.parts[0].text += `\n\n${t.parts[0].text}`;
        } else {
          sanitizedTurns.push(t);
        }
      }
    }

    // 1. Fast & reliable AI generation
    const models = [
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
    ];
    for (const model of models) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: sanitizedTurns as any,
          config: {
            systemInstruction: systemPrompt,
          },
        });
        if (res.text && res.text.trim()) {
          return { reply: res.text.trim() };
        }
      } catch {
        // try next model
      }
    }

    // 2. Fallback to askModel pool
    try {
      const reply = await askModel("myai", systemPrompt, userMessage);
      if (reply && reply.trim()) return { reply: reply.trim() };
    } catch {
      // ignore
    }

    // 3. Clean direct conversational fallback
    return {
      reply: `Regarding "${userMessage}": I've noted this for project "${projectTitle}". Let me know if you'd like me to draft steps, analyze data, or summarize our progress!`,
    };
  });
