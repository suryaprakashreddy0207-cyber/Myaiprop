import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  MessageSquare,
  Folder,
  Mic,
  Blocks,
  Telescope,
  Presentation,
  Bot,
  Crown,
  Zap,
} from "lucide-react";
import {
  getUserCredits,
  hasProSubscription,
  triggerUpgradeModal,
} from "@/lib/subscription";

const TABS = [
  { to: "/chat", label: "AI chat", icon: MessageSquare },
  { to: "/projects", label: "Projects", icon: Folder },
  { to: "/voice", label: "Voice Assistant", icon: Mic },
  { to: "/build", label: "No-code", icon: Blocks },
  { to: "/research", label: "Research", icon: Telescope },
  { to: "/presentations", label: "Slides", icon: Presentation },
  { to: "/agent", label: "Co-worker", icon: Bot },
] as const;

export function TopTabs() {
  const [credits, setCredits] = useState<number>(5);
  const [isPro, setIsPro] = useState<boolean>(false);

  const refreshStatus = () => {
    setCredits(getUserCredits());
    setIsPro(hasProSubscription());
  };

  useEffect(() => {
    refreshStatus();
    const handleCredits = () => refreshStatus();
    const handleSub = () => refreshStatus();
    window.addEventListener("myaipro_credits_updated", handleCredits);
    window.addEventListener("myaipro_subscription_updated", handleSub);
    return () => {
      window.removeEventListener("myaipro_credits_updated", handleCredits);
      window.removeEventListener("myaipro_subscription_updated", handleSub);
    };
  }, []);

  return (
    <nav className="scrollbar-none flex shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-black/5 px-3 py-2 bg-canvas">
      <div className="flex shrink-0 items-center gap-1">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-surface"
            activeProps={{ className: "bg-ink !text-white hover:bg-ink" }}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </Link>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 pl-2">
        {isPro ? (
          <Link
            to="/billing"
            className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-[11px] font-bold text-amber-600 hover:bg-amber-500/20 transition"
            title="Active Pro Subscription"
          >
            <Crown className="size-3" />
            <span>Pro Active</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={triggerUpgradeModal}
            className="flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/30 px-3 py-1 text-[11px] font-bold text-brand hover:bg-brand/20 transition cursor-pointer shadow-2xs"
            title="Click to upgrade for pro"
          >
            <Zap className="size-3" />
            <span>{credits > 0 ? `${credits} Credits Left` : "0 Credits"} • Upgrade for Pro</span>
          </button>
        )}
      </div>
    </nav>
  );
}
