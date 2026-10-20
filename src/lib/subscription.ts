export type SubscriptionPlan = {
  id: string;
  name: string;
  priceINR: number;
  credits: number; // no-coding platform credits
  multiplier: number;
  multiplierLabel: string;
  voiceMinutes: number;
  presentations: number;
  deepResearchDaily: number;
  description?: string;
};

export const FREE_TRIAL_QUOTA = {
  voiceMinutes: 30,
  presentations: 2,
  deepResearchDaily: 1,
  noCodeCredits: 5,
  multiplier: 1,
  multiplierLabel: "Free Trial",
};

export const PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter Plan",
    priceINR: 59,
    multiplier: 2,
    multiplierLabel: "2x (Doubled)",
    voiceMinutes: 60, // 30 * 2
    presentations: 4, // 2 * 2
    deepResearchDaily: 2, // 1 * 2
    credits: 10, // 5 * 2
    description: "All free trial features doubled (2x): 60 mins voice, 4 presentations, 2 deep research/day, 10 no-code credits.",
  },
  {
    id: "pro",
    name: "Pro Plan",
    priceINR: 199,
    multiplier: 5,
    multiplierLabel: "5x (Five times)",
    voiceMinutes: 150, // 30 * 5 (2.5 hrs)
    presentations: 10, // 2 * 5
    deepResearchDaily: 5, // 1 * 5
    credits: 25, // 5 * 5
    description: "All free trial features multiplied 5x: 150 mins voice, 10 presentations, 5 deep research/day, 25 no-code credits.",
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    priceINR: 299,
    multiplier: 10,
    multiplierLabel: "10x (10 times)",
    voiceMinutes: 300, // 30 * 10 (5 hrs)
    presentations: 20, // 2 * 10
    deepResearchDaily: 10, // 1 * 10
    credits: 50, // 5 * 10
    description: "All free trial features multiplied 10x: 300 mins voice, 20 presentations, 10 deep research/day, 50 no-code credits.",
  },
  {
    id: "ultimate",
    name: "Ultimate Pass",
    priceINR: 599,
    multiplier: 20,
    multiplierLabel: "20x (20 times)",
    voiceMinutes: 600, // 30 * 20 (10 hrs)
    presentations: 40, // 2 * 20
    deepResearchDaily: 20, // 1 * 20
    credits: 100, // 5 * 20
    description: "All free trial features multiplied 20x: 600 mins voice, 40 presentations, 20 deep research/day, 100 no-code credits.",
  },
];

export const RAZORPAY_KEY = "TwhG2uxTUB7OI0aFTlpliVaA";

const CREDITS_STORAGE_KEY = "myaipro_user_credits";
const SUBSCRIPTION_STORAGE_KEY = "myaipro_active_subscription";
const USER_ADDRESS_STORAGE_KEY = "myaipro_user_saved_address";
const VOICE_MINUTES_USED_KEY = "myaipro_voice_minutes_used";
const PRESENTATIONS_COUNT_KEY = "myaipro_presentations_count";
const DEEP_RESEARCH_KEY_PREFIX = "myaipro_research_count_";

export function getActiveSubscription(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasProSubscription(): boolean {
  return true;
}

export function isFreeUser(): boolean {
  return false;
}

/** Get effective quotas based on active plan or free trial */
export function getCurrentQuotas() {
  return {
    voiceMinutes: 999999,
    presentations: 999999,
    deepResearchDaily: 999999,
    noCodeCredits: 999999,
    multiplier: 100,
    multiplierLabel: "Unlimited Free",
  };
}

/* ----------------- No-Code Credits ----------------- */

export function getUserCredits(): number {
  return 9999;
}

export function deductUserCredit(): boolean {
  return true;
}

export function addUserCredits(count: number) {
  if (typeof window === "undefined") return;
  try {
    const current = getUserCredits();
    const next = current + count;
    localStorage.setItem(CREDITS_STORAGE_KEY, String(next));
    dispatchCreditsChanged(next);
  } catch {
    /* ignore */
  }
}

/* ----------------- Voice Assistant Minutes ----------------- */

export function getVoiceMinutesRemaining(): { used: number; total: number; remaining: number } {
  const quotas = getCurrentQuotas();
  if (typeof window === "undefined") {
    return { used: 0, total: quotas.voiceMinutes, remaining: quotas.voiceMinutes };
  }
  try {
    const used = Number(localStorage.getItem(VOICE_MINUTES_USED_KEY) || "0");
    const remaining = Math.max(0, quotas.voiceMinutes - used);
    return { used, total: quotas.voiceMinutes, remaining };
  } catch {
    return { used: 0, total: quotas.voiceMinutes, remaining: quotas.voiceMinutes };
  }
}

export function addVoiceMinutesUsed(minutes: number) {
  if (typeof window === "undefined") return;
  try {
    const { used, total } = getVoiceMinutesRemaining();
    const next = Math.round((used + minutes) * 10) / 10;
    localStorage.setItem(VOICE_MINUTES_USED_KEY, String(next));
    window.dispatchEvent(new CustomEvent("myaipro_voice_usage_updated", { detail: { used: next, total } }));
  } catch {
    /* ignore */
  }
}

export function canUseVoiceAssistant(): boolean {
  const { remaining } = getVoiceMinutesRemaining();
  return remaining > 0;
}

/* ----------------- Presentations Quota ----------------- */

export function getPresentationsRemaining(): { used: number; total: number; remaining: number } {
  const quotas = getCurrentQuotas();
  if (typeof window === "undefined") {
    return { used: 0, total: quotas.presentations, remaining: quotas.presentations };
  }
  try {
    const used = Number(localStorage.getItem(PRESENTATIONS_COUNT_KEY) || "0");
    const remaining = Math.max(0, quotas.presentations - used);
    return { used, total: quotas.presentations, remaining };
  } catch {
    return { used: 0, total: quotas.presentations, remaining: quotas.presentations };
  }
}

export function consumePresentationCredit(): boolean {
  if (typeof window === "undefined") return true;
  const { remaining, used, total } = getPresentationsRemaining();
  if (remaining <= 0) {
    triggerUpgradeModal();
    return false;
  }
  try {
    const next = used + 1;
    localStorage.setItem(PRESENTATIONS_COUNT_KEY, String(next));
    window.dispatchEvent(new CustomEvent("myaipro_presentations_updated", { detail: { used: next, total } }));
    return true;
  } catch {
    return true;
  }
}

/* ----------------- Deep Research Quota (Daily) ----------------- */

function getTodayKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${DEEP_RESEARCH_KEY_PREFIX}${today}`;
}

export function getDeepResearchRemainingToday(): { used: number; total: number; remaining: number } {
  const quotas = getCurrentQuotas();
  if (typeof window === "undefined") {
    return { used: 0, total: quotas.deepResearchDaily, remaining: quotas.deepResearchDaily };
  }
  try {
    const key = getTodayKey();
    const used = Number(localStorage.getItem(key) || "0");
    const remaining = Math.max(0, quotas.deepResearchDaily - used);
    return { used, total: quotas.deepResearchDaily, remaining };
  } catch {
    return { used: 0, total: quotas.deepResearchDaily, remaining: quotas.deepResearchDaily };
  }
}

export function consumeDeepResearchCredit(): boolean {
  if (typeof window === "undefined") return true;
  const { remaining, used, total } = getDeepResearchRemainingToday();
  if (remaining <= 0) {
    triggerUpgradeModal();
    return false;
  }
  try {
    const key = getTodayKey();
    const next = used + 1;
    localStorage.setItem(key, String(next));
    window.dispatchEvent(new CustomEvent("myaipro_research_quota_updated", { detail: { used: next, total } }));
    return true;
  } catch {
    return true;
  }
}

/* ----------------- Subscription Activation ----------------- */

export function setActiveSubscriptionData(plan: SubscriptionPlan, paymentId: string) {
  if (typeof window === "undefined") return;
  try {
    const sub = {
      planId: plan.id,
      planName: plan.name,
      priceINR: plan.priceINR,
      multiplier: plan.multiplier,
      multiplierLabel: plan.multiplierLabel,
      paymentId,
      activatedAt: new Date().toISOString(),
    };
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(sub));
    // Set no-coding credits
    addUserCredits(plan.credits);
    window.dispatchEvent(new CustomEvent("myaipro_subscription_updated", { detail: sub }));
  } catch {
    /* ignore */
  }
}

export function cancelSubscription(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("myaipro_subscription_updated", { detail: null }));
  } catch {
    // ignore
  }
}

/* ----------------- Address Helpers ----------------- */

export function getUserAddress(): string {
  if (typeof window === "undefined") return "Indiranagar, Bengaluru, Karnataka 560038, India";
  try {
    return localStorage.getItem(USER_ADDRESS_STORAGE_KEY) || "Indiranagar, Bengaluru, Karnataka 560038, India";
  } catch {
    return "Indiranagar, Bengaluru, Karnataka 560038, India";
  }
}

export function setUserAddress(address: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_ADDRESS_STORAGE_KEY, address.trim());
    window.dispatchEvent(new CustomEvent("myaipro_address_updated", { detail: address.trim() }));
  } catch {
    /* ignore */
  }
}

function dispatchCreditsChanged(credits: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("myaipro_credits_updated", { detail: credits }));
}

export function triggerUpgradeModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("myaipro_open_upgrade_modal"));
}
