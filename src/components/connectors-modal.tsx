import { useState, useMemo } from "react";
import {
  ChevronLeft,
  X,
  Search,
  Check,
  Plus,
  Sparkles,
  Bot,
  LogIn,
  CreditCard,
  MessageSquare,
  Bell,
  Mail,
  Phone,
  ShieldCheck,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OpenAILogo } from "@/components/icons/app-logos";

export interface ConnectorItem {
  id: string;
  name: string;
  category: "Payments" | "AI" | "Login" | "Communication";
  description: string;
  iconBg?: string;
  iconType: string;
  questions: {
    question: string;
    placeholder: string;
    help?: string;
    options?: string[];
    isSecret?: boolean;
    defaultValue?: string;
  }[];
}

export const AVAILABLE_CONNECTORS: ConnectorItem[] = [
  {
    id: "google-login",
    name: "Emergent managed Google login",
    category: "Login",
    description: "Let people sign in with Google",
    iconType: "google",
    iconBg: "bg-white",
    questions: [
      {
        question: "Configure Google Sign-In for your application:",
        placeholder: "Enter optional Google OAuth Client ID (or leave blank to use managed zero-config login)",
        help: "Users can click 'Sign in with Google' seamlessly on web and mobile.",
        options: ["Use Managed Zero-Config Google Login", "Provide Custom Google Client ID"],
      },
    ],
  },
  {
    id: "apple-signin",
    name: "Apple sign-in",
    category: "Login",
    description: "Seamless sign-in via Apple for your apps",
    iconType: "apple",
    iconBg: "bg-zinc-100 dark:bg-zinc-800",
    questions: [
      {
        question: "Enter your Apple Services ID / Client ID:",
        placeholder: "com.example.app.service",
        help: "Allows one-tap Apple authentication with Face ID / Touch ID.",
      },
    ],
  },
  {
    id: "push-notifications",
    name: "Emergent managed push notifications",
    category: "Communication",
    description: "Send push notifications to your app users",
    iconType: "bell",
    iconBg: "bg-blue-600 text-white",
    questions: [
      {
        question: "Configure user notifications frequency and permissions prompt:",
        placeholder: "E.g. On new orders, system alerts, or daily summaries",
        help: "Users will receive web and device push notifications.",
        options: ["Immediate alerts on user activity", "Daily summary digests", "Transactional only"],
      },
    ],
  },
  {
    id: "gemini-ai",
    name: "Gemini AI Models",
    category: "AI",
    description: "Enable AI in your applications using Gemini",
    iconType: "gemini",
    iconBg: "bg-indigo-50 dark:bg-indigo-950/60",
    questions: [
      {
        question: "Enter your Google Gemini API Key:",
        placeholder: "AIzaSy...",
        help: "Powers real-time reasoning, vision multimodal analysis, and generation.",
        isSecret: true,
      },
      {
        question: "Select default Gemini model capability tier:",
        placeholder: "gemini-2.5-flash or gemini-2.5-pro",
        options: ["Gemini 2.5 Flash (Ultra-fast)", "Gemini 2.5 Pro (Deep reasoning)", "Gemini 2.0 Flash Lite"],
      },
    ],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    category: "AI",
    description: "Read text aloud in a cloned voice, or transcribe audio",
    iconType: "elevenlabs",
    iconBg: "bg-zinc-100 dark:bg-zinc-800",
    questions: [
      {
        question: "Enter your ElevenLabs API Key:",
        placeholder: "sk_...",
        help: "Enables ultra-realistic text-to-speech audio and voice cloning.",
        isSecret: true,
      },
    ],
  },
  {
    id: "claude-ai",
    name: "Claude AI Models",
    category: "AI",
    description: "Enable AI in your applications using Claude",
    iconType: "claude",
    iconBg: "bg-amber-100/80 dark:bg-amber-950/50",
    questions: [
      {
        question: "Enter your Anthropic Claude API Key:",
        placeholder: "sk-ant-...",
        help: "Access Claude 3.5 Sonnet, Claude 3.7 Sonnet, and Haiku models.",
        isSecret: true,
      },
    ],
  },
  {
    id: "chatgpt-ai",
    name: "ChatGPT AI Models",
    category: "AI",
    description: "Enable AI in your applications using ChatGPT",
    iconType: "openai",
    iconBg: "bg-zinc-100 dark:bg-zinc-850",
    questions: [
      {
        question: "Enter your OpenAI ChatGPT API Key:",
        placeholder: "sk-proj-...",
        help: "Connects GPT-4o, GPT-4o mini, and OpenAI embeddings.",
        isSecret: true,
      },
    ],
  },
  {
    id: "perplexity",
    name: "Perplexity",
    category: "AI",
    description: "Search the web and get sourced answers in your app",
    iconType: "perplexity",
    iconBg: "bg-zinc-900 text-white",
    questions: [
      {
        question: "Enter your Perplexity API Key:",
        placeholder: "pplx-...",
        help: "Live web search and cited answers powered by Sonar models.",
        isSecret: true,
      },
    ],
  },
  {
    id: "razorpay",
    name: "Razorpay",
    category: "Payments",
    description: "Accept payments via UPI, cards and net-banking in India",
    iconType: "razorpay",
    iconBg: "bg-blue-50 dark:bg-blue-950/50",
    questions: [
      {
        question: "Enter your Razorpay Key ID:",
        placeholder: "rzp_live_... or rzp_test_...",
        help: "Enables instant checkout with Google Pay, PhonePe, Paytm & cards.",
      },
      {
        question: "Enter your Razorpay Key Secret:",
        placeholder: "Key Secret",
        help: "Used on the backend to verify webhook signatures.",
        isSecret: true,
      },
    ],
  },
  {
    id: "paypal",
    name: "PayPal",
    category: "Payments",
    description: "Accept payments",
    iconType: "paypal",
    iconBg: "bg-blue-50 dark:bg-blue-950/50",
    questions: [
      {
        question: "Enter your PayPal Client ID:",
        placeholder: "AeA2X...",
        help: "Provides global PayPal checkout and debit/credit card processing.",
      },
    ],
  },
  {
    id: "revenuecat",
    name: "RevenueCat",
    category: "Payments",
    description: "In-app subscriptions for mobile apps",
    iconType: "revenuecat",
    iconBg: "bg-rose-50 dark:bg-rose-950/50",
    questions: [
      {
        question: "Enter your RevenueCat Public API Key:",
        placeholder: "appl_... or goog_...",
        help: "Seamless in-app purchases and subscription entitlement tracking.",
      },
    ],
  },
  {
    id: "twilio",
    name: "Twilio",
    category: "Communication",
    description: "Send text messages and verify phone numbers",
    iconType: "twilio",
    iconBg: "bg-red-50 dark:bg-red-950/50",
    questions: [
      {
        question: "Enter your Twilio Account SID:",
        placeholder: "AC...",
        help: "Found in your Twilio Console dashboard.",
      },
      {
        question: "Enter your Twilio Auth Token:",
        placeholder: "Auth Token",
        isSecret: true,
      },
      {
        question: "Enter your Twilio Phone Number:",
        placeholder: "+1 555 123 4567",
      },
    ],
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    category: "Communication",
    description: "Send emails from your own SendGrid account",
    iconType: "sendgrid",
    iconBg: "bg-blue-50 dark:bg-blue-950/50",
    questions: [
      {
        question: "Enter your SendGrid API Key:",
        placeholder: "SG....",
        help: "Transactional emails, receipts, and user notifications.",
        isSecret: true,
      },
      {
        question: "Enter your Verified Sender Email address:",
        placeholder: "noreply@yourdomain.com",
      },
    ],
  },
];

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  addedConnectorIds: string[];
  onAddConnector: (connector: ConnectorItem) => void;
}

export function ConnectorsModal({
  isOpen,
  onClose,
  addedConnectorIds = [],
  onAddConnector,
}: ConnectorsModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");

  const categories = ["All", "Payments", "AI", "Login", "Communication"];

  const filteredItems = useMemo(() => {
    return AVAILABLE_CONNECTORS.filter((item) => {
      if (activeCategory !== "All" && item.category !== activeCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeCategory, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Outer sheet container matching user screenshots */}
      <div className="relative flex flex-col w-full max-w-lg max-h-[88vh] rounded-t-[32px] sm:rounded-[32px] bg-white dark:bg-[#111625] text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden font-sans border border-zinc-200 dark:border-blue-900/40">
        {/* Top Header with Back arrow, title, Close button */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="size-5" />
          </button>

          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            Connectors
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content body with search and filter pills */}
        <div className="flex flex-col overflow-y-auto px-5 pt-4 pb-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Connectors
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Connect popular services to unlock more features for your app.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 size-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 pl-9 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer",
                    active
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs"
                      : "bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700",
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Items List matching cards in screenshot */}
          <div className="space-y-3 pt-1">
            {filteredItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-400">
                No connectors found for "{search}"
              </div>
            ) : (
              filteredItems.map((item) => {
                const isAdded = addedConnectorIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-3.5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs",
                          item.iconBg || "bg-zinc-100 dark:bg-zinc-800",
                        )}
                      >
                        {item.iconType === "google" && (
                          <svg className="size-5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                        )}
                        {item.iconType === "apple" && (
                          <svg className="size-5 fill-current" viewBox="0 0 24 24">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.76 1.05-1.82.93-2.88-.9.04-2 .6-2.64 1.36-.57.65-1.07 1.73-.93 2.76 1.01.08 2.02-.48 2.64-1.24z" />
                          </svg>
                        )}
                        {item.iconType === "bell" && <Bell className="size-5 text-white" />}
                        {item.iconType === "gemini" && <Sparkles className="size-5 text-blue-500 fill-blue-500/20" />}
                        {item.iconType === "elevenlabs" && (
                          <div className="flex gap-1 items-center">
                            <div className="w-1.5 h-4 bg-zinc-900 dark:bg-white rounded-full" />
                            <div className="w-1.5 h-4 bg-zinc-900 dark:bg-white rounded-full" />
                          </div>
                        )}
                        {item.iconType === "claude" && (
                          <span className="text-amber-700 dark:text-amber-300 font-serif text-lg font-bold">✴</span>
                        )}
                        {item.iconType === "openai" && (
                          <OpenAILogo className="size-5 text-zinc-900 dark:text-white" />
                        )}
                        {item.iconType === "perplexity" && (
                          <span className="text-sm font-black text-cyan-400">⌘</span>
                        )}
                        {item.iconType === "razorpay" && (
                          <span className="text-blue-600 dark:text-blue-400 font-black italic text-base">R</span>
                        )}
                        {item.iconType === "paypal" && (
                          <span className="text-blue-700 dark:text-blue-400 font-bold italic text-base">P</span>
                        )}
                        {item.iconType === "revenuecat" && (
                          <span className="text-red-500 font-bold text-xs">RC</span>
                        )}
                        {item.iconType === "twilio" && (
                          <div className="size-5 rounded-full border-2 border-red-500 flex items-center justify-center p-0.5">
                            <div className="size-2 rounded-full bg-red-500" />
                          </div>
                        )}
                        {item.iconType === "sendgrid" && (
                          <Mail className="size-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>

                      {/* Text */}
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {item.name}
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Add button */}
                    <button
                      type="button"
                      onClick={() => {
                        onAddConnector(item);
                        onClose();
                      }}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold shrink-0 transition cursor-pointer",
                        isAdded
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-xs",
                      )}
                    >
                      {isAdded ? (
                        <>
                          <Check className="size-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="size-3.5 text-zinc-500 dark:text-zinc-400" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
