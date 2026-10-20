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
    </nav>
  );
}
