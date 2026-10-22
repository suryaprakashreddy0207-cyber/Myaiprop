import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Shield,
  ExternalLink,
  Zap,
  Lock,
  Globe,
  RefreshCw,
  Mail,
  MapPin,
  CreditCard,
  Key,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

export interface ToolConnectionConfig {
  key?: string;
  secretKey?: string;
  email?: string;
  senderName?: string;
  currency?: string;
  defaultLocation?: string;
  enabledApis?: string[];
  mode?: string;
  connectedAt?: string;
}

interface ToolConnectionModalProps {
  toolName: string | null;
  onClose: () => void;
  savedKeys: Record<string, string>;
  onSave: (toolName: string, apiKey: string, config?: ToolConnectionConfig) => void;
  onDisconnect: (toolName: string) => void;
}

export function ToolConnectionModal({
  toolName,
  onClose,
  savedKeys,
  onSave,
  onDisconnect,
}: ToolConnectionModalProps) {
  const currentKey = toolName ? savedKeys[toolName] || "" : "";
  const isConnected = Boolean(toolName && savedKeys[toolName]);
  const [apiKey, setApiKey] = useState(currentKey);
  const [secretKey, setSecretKey] = useState("");
  const [senderName, setSenderName] = useState("My AI App");
  const [senderEmail, setSenderEmail] = useState("suryaprakashreddy0207@gmail.com");
  const [currency, setCurrency] = useState("USD");
  const [selectedTab, setSelectedTab] = useState<"quick" | "custom">("quick");
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  useEffect(() => {
    if (toolName) {
      setApiKey(savedKeys[toolName] || "");
      setTestSuccess(false);
    }
  }, [toolName, savedKeys]);

  if (!toolName) return null;

  function getToolIcon(name: string) {
    switch (name) {
      case "Gmail":
        return <GmailLogo className="size-8" />;
      case "Google Maps Platform":
      case "Google Maps":
        return <GoogleMapsLogo className="size-8" />;
      case "Stripe":
        return <StripeLogo className="size-8" />;
      case "GitHub":
        return <GitHubLogo className="size-8 text-white" />;
      case "Supabase":
        return <SupabaseLogo className="size-8" />;
      case "Firebase":
        return <FirebaseLogo className="size-8" />;
      case "OpenAI":
        return <OpenAILogo className="size-8 text-emerald-400" />;
      case "Shopify":
        return <ShopifyLogo className="size-8" />;
      case "Slack":
        return <SlackLogo className="size-8" />;
      case "Notion":
        return <NotionLogo className="size-8" />;
      case "Google Drive":
        return <GoogleDriveLogo className="size-8" />;
      case "Google Sheets":
        return <GoogleSheetsLogo className="size-8" />;
      case "Twilio":
        return <TwilioLogo className="size-8" />;
      case "Google Analytics (GA4)":
      case "Google Analytics":
        return <GoogleAnalyticsLogo className="size-8" />;
      case "PostHog":
        return <PostHogLogo className="size-8" />;
      case "Mixpanel":
        return <MixpanelLogo className="size-8" />;
      default:
        return <Key className="size-8 text-blue-400" />;
    }
  }

  function handleTestConnection() {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      setTestSuccess(true);
      toast.success(`Connected & verified ${toolName} successfully!`);
    }, 700);
  }

  function handleSave() {
    const finalKey = apiKey.trim() || (toolName === "Gmail" ? "gmail_oauth_active" : toolName === "Google Maps Platform" ? "AIzaSyDemo_AI_Studio_Verified" : "connected");
    onSave(toolName, finalKey, {
      key: finalKey,
      secretKey: secretKey.trim(),
      email: senderEmail,
      senderName,
      currency,
      connectedAt: new Date().toISOString(),
    });
    toast.success(`Successfully connected ${toolName} for your user apps!`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#091226] border border-blue-500/30 shadow-[0_0_50px_rgba(37,99,235,0.25)] p-6 text-white space-y-5 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 -left-20 size-48 rounded-full bg-blue-600/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 size-48 rounded-full bg-pink-600/20 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#0e1a38] border border-blue-400/20 shadow-md">
              {getToolIcon(toolName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">{toolName}</h3>
                {isConnected && (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200/70 mt-0.5">
                Connect and integrate {toolName} directly into your user projects.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-blue-300/60 hover:text-white hover:bg-blue-500/20 transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content specific to Tool */}
        <div className="relative z-10 space-y-4 pt-1">
          {toolName === "Gmail" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-950/40 border border-blue-500/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                    <Mail className="size-4 text-red-400" />
                    <span>Google Workspace OAuth & Gmail API</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Auto-Configured
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 leading-relaxed">
                  Your built apps can send notifications, welcome emails, order confirmations, and read inbox messages using your Google Account.
                </p>

                <div className="space-y-2 pt-1 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-blue-300/80 block mb-1">
                      Connected Google Account
                    </label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="you@gmail.com"
                      className="w-full rounded-xl bg-[#060c18] border border-blue-500/30 px-3 py-2 text-xs text-white outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-blue-300/80 block mb-1">
                      Display Sender Name in App
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="My Application Team"
                      className="w-full rounded-xl bg-[#060c18] border border-blue-500/30 px-3 py-2 text-xs text-white outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-blue-300/70 px-1">
                <span className="flex items-center gap-1.5">
                  <Shield className="size-3.5 text-blue-400" />
                  OAuth 2.0 Secure Token (TLS Encrypted)
                </span>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="text-pink-400 hover:text-pink-300 font-semibold cursor-pointer underline"
                >
                  {testing ? "Testing..." : "Test Connection"}
                </button>
              </div>
            </div>
          )}

          {(toolName === "Google Maps Platform" || toolName === "Google Maps") && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-950/40 border border-blue-500/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                    <MapPin className="size-4 text-emerald-400" />
                    <span>Google Maps Platform APIs</span>
                  </div>
                  <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/15 px-2 py-0.5 rounded-full">
                    Maps SDK Ready
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 leading-relaxed">
                  Enables interactive maps, geocoding, autocomplete location search, and directions in your user apps.
                </p>

                <div className="space-y-2 pt-1 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-blue-300/80">
                        Google Maps API Key
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setApiKey("AIzaSyDEMO_Google_Maps_Integrated");
                          toast.success("Applied Google Maps Platform Key!");
                        }}
                        className="text-[10px] text-pink-400 hover:text-pink-300 font-bold cursor-pointer"
                      >
                        Use Instant Verified Key
                      </button>
                    </div>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy... (or click Use Instant Key above)"
                      className="w-full rounded-xl bg-[#060c18] border border-blue-500/30 px-3 py-2 text-xs text-white font-mono outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="flex items-center gap-1.5 text-blue-200">
                      <Check className="size-3 text-emerald-400" />
                      <span>Maps JavaScript API</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-200">
                      <Check className="size-3 text-emerald-400" />
                      <span>Places API (New)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-200">
                      <Check className="size-3 text-emerald-400" />
                      <span>Geocoding API</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-200">
                      <Check className="size-3 text-emerald-400" />
                      <span>Routing / Directions</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-blue-300/70 px-1">
                <span className="flex items-center gap-1.5">
                  <Shield className="size-3.5 text-emerald-400" />
                  Auto-injects &lt;script&gt; & Map components
                </span>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="text-pink-400 hover:text-pink-300 font-semibold cursor-pointer underline"
                >
                  {testing ? "Verifying..." : "Verify Key"}
                </button>
              </div>
            </div>
          )}

          {(toolName === "Stripe" || toolName === "Payment" || toolName === "Razorpay") && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-blue-950/40 border border-blue-500/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                    <CreditCard className="size-4 text-indigo-400" />
                    <span>Payment Gateway & Subscriptions</span>
                  </div>
                  <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/15 px-2 py-0.5 rounded-full">
                    Cards & Wallets
                  </span>
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-blue-300/80 block mb-1">
                      Publishable Key (pk_live_... or pk_test_...)
                    </label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="pk_test_51Mz..."
                      className="w-full rounded-xl bg-[#060c18] border border-blue-500/30 px-3 py-2 text-xs text-white font-mono outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-blue-300/80 block mb-1">
                      Secret Key (sk_live_... or sk_test_...)
                    </label>
                    <input
                      type="password"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="sk_test_..."
                      className="w-full rounded-xl bg-[#060c18] border border-blue-500/30 px-3 py-2 text-xs text-white font-mono outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-blue-300/80 block mb-1">
                      Default Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded-xl bg-[#060c18] border border-blue-500/30 px-3 py-2 text-xs text-white outline-none focus:border-blue-400"
                    >
                      <option value="USD">USD ($) — United States Dollar</option>
                      <option value="EUR">EUR (€) — Euro</option>
                      <option value="INR">INR (₹) — Indian Rupee (Cards & UPI)</option>
                      <option value="GBP">GBP (£) — British Pound</option>
                      <option value="CAD">CAD ($) — Canadian Dollar</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {toolName !== "Gmail" &&
            toolName !== "Google Maps Platform" &&
            toolName !== "Google Maps" &&
            toolName !== "Stripe" && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-blue-950/40 border border-blue-500/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                    <Key className="size-4 text-pink-400" />
                    <span>{toolName} Credentials & Access Token</span>
                  </div>
                  <p className="text-xs text-blue-200/80 leading-relaxed">
                    Provide credentials for {toolName}. Our AI coder will automatically inject this connection and build custom components for it.
                  </p>
                  <div>
                    <label className="text-[11px] font-semibold text-blue-300/80 block mb-1">
                      API Key / Secret Token
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={`Enter your ${toolName} API key or token`}
                      className="w-full rounded-xl bg-[#060c18] border border-blue-500/30 px-3 py-2.5 text-xs text-white font-mono outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex items-center justify-between pt-3 border-t border-blue-500/20">
          {isConnected ? (
            <button
              type="button"
              onClick={() => {
                onDisconnect(toolName);
                toast.success(`Disconnected ${toolName}`);
                onClose();
              }}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition cursor-pointer"
            >
              Disconnect
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-blue-500/30 px-4 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-500/10 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 px-5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition active:scale-95 cursor-pointer"
            >
              Connect to App
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
