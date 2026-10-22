import React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Code2,
  Telescope,
  MessageSquare,
  Mic,
  Folder,
  Monitor,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FeatureTabId =
  | "build"
  | "research"
  | "chat"
  | "voice"
  | "projects"
  | "slides"
  | "cowork";

export interface FeatureNavBarProps {
  activeTab: FeatureTabId;
  className?: string;
  variant?: "top" | "inline";
}

const FEATURES: {
  id: FeatureTabId;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "build", label: "No-Code Platform", path: "/build", icon: Code2 },
  { id: "research", label: "Deep Research", path: "/research", icon: Telescope },
  { id: "chat", label: "AI Chat", path: "/chat", icon: MessageSquare },
  { id: "voice", label: "Voice Assistant", path: "/voice", icon: Mic },
  { id: "projects", label: "Projects", path: "/projects", icon: Folder },
  { id: "slides", label: "Slide Presentations", path: "/presentations", icon: Monitor },
  { id: "cowork", label: "My AI Co-worker", path: "/cowork", icon: Bot },
];

export function FeatureNavBar({
  activeTab,
  className,
  variant = "top",
}: FeatureNavBarProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "w-full max-w-full px-2 sm:px-4",
        variant === "top" ? "py-2" : "py-1.5",
        className
      )}
    >
      <div className="relative mx-auto flex max-w-3xl items-center rounded-full bg-[#081126]/90 border border-blue-500/25 p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_20px_rgba(37,99,235,0.2)] backdrop-blur-2xl">
        <div className="flex w-full items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth px-1">
          {FEATURES.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!isActive) {
                    navigate({ to: item.path as any });
                  }
                }}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer select-none",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-pink-500 text-white shadow-[0_0_18px_rgba(236,72,153,0.6)] ring-1 ring-pink-400/80 scale-[1.02]"
                    : "text-blue-200/75 hover:text-white hover:bg-white/10 active:scale-95"
                )}
                title={`Switch to ${item.label}`}
              >
                <Icon
                  className={cn(
                    "size-3.5 shrink-0 transition-colors",
                    isActive ? "text-white" : "text-blue-300/80 group-hover:text-white"
                  )}
                />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
