import { getActiveUserSession } from "@/lib/user-session";

export interface PresentationCollaborator {
  email: string;
  role: "view" | "edit";
  sharedAt: string;
}

export interface PresentationDeckItem {
  id: string;
  title: string;
  topic?: string;
  ownerEmail?: string;
  ownerId?: string;
  sharedWith: PresentationCollaborator[];
  isSharedWithMe?: boolean;
  userRole?: "owner" | "edit" | "view";
  slides: {
    title: string;
    bullets: string[];
    notes?: string;
    image_url?: string;
    imageLayout?: "side" | "banner" | "card";
  }[];
  slideCount?: number;
  cover?: string | null;
  updated_at: string;
  video_url?: string | null;
  themeId?: string;
  customBgColor?: string;
  customTextColor?: string;
}

export const SAVED_DECKS_STORAGE_KEY = "myaipro_saved_presentations";

export function getCurrentUserEmail(): string {
  const session = getActiveUserSession();
  if (session?.email) return session.email.toLowerCase();
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("myaipro_user_email");
    if (stored) return stored.toLowerCase();
    const guestId = localStorage.getItem("myaipro_guest_id") || "user";
    return `${guestId}@myaipro.com`;
  }
  return "user@myaipro.com";
}

export function loadAllPresentations(): PresentationDeckItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_DECKS_STORAGE_KEY);
    if (!raw) return getSampleDecks();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getSampleDecks();
  } catch {
    return getSampleDecks();
  }
}

export function saveAllPresentations(list: PresentationDeckItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_DECKS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("myaipro_presentations_updated", { detail: list }));
  } catch {
    // ignore
  }
}

export function sharePresentationWithEmail(
  deckId: string,
  email: string,
  role: "view" | "edit" = "view",
): PresentationDeckItem | null {
  const decks = loadAllPresentations();
  const index = decks.findIndex((d) => d.id === deckId);
  if (index === -1) return null;

  const targetDeck = { ...decks[index] };
  const cleanEmail = email.trim().toLowerCase();

  const existingShared = targetDeck.sharedWith ? [...targetDeck.sharedWith] : [];
  const colIndex = existingShared.findIndex((c) => c.email.toLowerCase() === cleanEmail);

  if (colIndex >= 0) {
    existingShared[colIndex] = { ...existingShared[colIndex], role, sharedAt: new Date().toISOString() };
  } else {
    existingShared.push({
      email: cleanEmail,
      role,
      sharedAt: new Date().toISOString(),
    });
  }

  targetDeck.sharedWith = existingShared;
  targetDeck.updated_at = new Date().toISOString();
  decks[index] = targetDeck;
  saveAllPresentations(decks);
  return targetDeck;
}

export function removeCollaboratorFromPresentation(
  deckId: string,
  email: string,
): PresentationDeckItem | null {
  const decks = loadAllPresentations();
  const index = decks.findIndex((d) => d.id === deckId);
  if (index === -1) return null;

  const targetDeck = { ...decks[index] };
  const cleanEmail = email.trim().toLowerCase();
  targetDeck.sharedWith = (targetDeck.sharedWith || []).filter(
    (c) => c.email.toLowerCase() !== cleanEmail,
  );
  targetDeck.updated_at = new Date().toISOString();
  decks[index] = targetDeck;
  saveAllPresentations(decks);
  return targetDeck;
}

function getSampleDecks(): PresentationDeckItem[] {
  const currentEmail = getCurrentUserEmail();
  return [
    {
      id: "deck-ai-strategy-2026",
      title: "AI Strategy & Roadmap 2026",
      topic: "Artificial Intelligence Enterprise Transformation",
      ownerEmail: currentEmail,
      sharedWith: [],
      slideCount: 5,
      cover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      slides: [
        {
          title: "AI Strategy & Enterprise Roadmap 2026",
          bullets: [
            "Autonomous Agents & Real-Time Intelligence",
            "Accelerating Workflow Automation & Efficiency",
            "Data Governance, Security, and Scalability",
          ],
          notes: "Welcome everyone to our AI strategic briefing.",
          image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
        },
        {
          title: "Executive Architecture & Key Drivers",
          bullets: [
            "Modular LLM routing across Gemini, Claude, and GPT-4o",
            "Multi-tenant data isolation and edge delivery",
            "Real-time vector search & cognitive memory integration",
          ],
          notes: "Focusing on architectural resilience and system speed.",
        },
      ],
    },
    {
      id: "deck-shared-pitch-deck",
      title: "Shared Investor Pitch Deck",
      topic: "Series A Funding Round & Market Expansion",
      ownerEmail: "partner@collaborator.com",
      sharedWith: [
        { email: currentEmail, role: "edit", sharedAt: new Date(Date.now() - 7200000).toISOString() },
      ],
      isSharedWithMe: true,
      userRole: "edit",
      slideCount: 4,
      cover: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
      updated_at: new Date(Date.now() - 7200000).toISOString(),
      slides: [
        {
          title: "Series A Investor Deck — Growth & Vision",
          bullets: [
            "Exponential 340% YoY ARR expansion",
            "Leading competitive moat with proprietary AI workflows",
            "Clear pathway to $10M ARR in next 18 months",
          ],
          notes: "Shared by partner for collaborative review and slide edits.",
          image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
        },
      ],
    },
  ];
}
