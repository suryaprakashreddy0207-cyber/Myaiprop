import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Folder,
  BookOpen,
  DollarSign,
  PenTool,
  Settings as SettingsIcon,
  ChevronDown,
  Sparkles,
  Loader2,
} from "lucide-react";
import { createProject } from "@/lib/projects-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects/new")({
  component: NewProjectPage,
});

const SUGGESTIONS = [
  {
    label: "Homework",
    icon: BookOpen,
    category: "Homework" as const,
    color: "text-blue-400 border-blue-500/40 bg-blue-500/10",
    defaultTitle: "Math & Science Homework",
    instructions: "You are an expert tutor. Break down problem steps clearly, explain underlying formulas, and encourage critical thinking.",
  },
  {
    label: "Investing",
    icon: DollarSign,
    category: "Investing" as const,
    color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    defaultTitle: "Investment Portfolio & Research",
    instructions: "Analyze financial concepts, market dynamics, and portfolio allocation strategies with balanced, data-driven reasoning.",
  },
  {
    label: "Writing",
    icon: PenTool,
    category: "Writing" as const,
    color: "text-purple-400 border-purple-500/40 bg-purple-500/10",
    defaultTitle: "Creative Story & Copywriting",
    instructions: "Act as an experienced editor and creative writer. Provide engaging narrative hooks, punchy structure, and refined prose.",
  },
];

function NewProjectPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"Homework" | "Investing" | "Writing" | "General">("General");
  const [instructions, setInstructions] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  function applySuggestion(s: (typeof SUGGESTIONS)[number]) {
    setTitle(s.defaultTitle);
    setCategory(s.category);
    setInstructions(s.instructions);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    try {
      const proj = await createProject({
        title: title.trim(),
        category,
        instructions: instructions.trim(),
      });
      toast.success(`Project "${proj.title}" created!`);
      navigate({
        to: "/projects/$projectId",
        params: { projectId: proj.id },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
      setIsCreating(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col bg-[#070e20] text-blue-100 font-sans overflow-x-hidden">
      {/* Ambient Lighting Glow matching AI Chat */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute top-0 left-1/3 size-[420px] rounded-full bg-blue-600/10 blur-[140px]" />
        <div className="absolute bottom-10 right-10 size-[360px] rounded-full bg-indigo-600/10 blur-[140px]" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between px-4 bg-[#081226]/90 backdrop-blur-md border-b border-blue-500/20">
        <button
          onClick={() => navigate({ to: "/projects" })}
          className="flex size-10 items-center justify-center rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-200 hover:text-white hover:bg-blue-600/30 transition active:scale-95 cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>

        <h1 className="text-base font-semibold text-white">New Project</h1>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
            showSettings
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
              : "bg-blue-600/20 border border-blue-500/30 text-blue-200 hover:text-white hover:bg-blue-600/30"
          }`}
        >
          <SettingsIcon className="size-3.5" />
          <span>Settings</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-between px-4 py-6 max-w-xl mx-auto w-full">
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Main Title Input Card */}
          <div className="flex items-center gap-3 rounded-2xl bg-[#0c1938] px-4 py-3.5 border border-blue-500/30 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition shadow-md">
            <Folder className="size-5 text-blue-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g. Party planning, E-commerce app, Machine Learning…"
              className="w-full bg-transparent text-sm text-white placeholder:text-blue-300/40 outline-none"
            />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => applySuggestion(s)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-blue-500/30 bg-[#0c1938] hover:border-blue-400 px-3.5 py-1.5 text-xs font-medium text-blue-200 hover:text-white transition active:scale-95 cursor-pointer shadow-xs"
              >
                <s.icon className="size-3.5 text-cyan-400" />
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Context Explainer text */}
          <p className="text-xs text-blue-200/80 leading-relaxed pt-2 px-1">
            Projects give My AI shared context across chats and files, all in one place.
          </p>

          {/* Optional Project Settings Panel */}
          {showSettings && (
            <div className="rounded-2xl bg-[#0c1938] p-4 border border-blue-500/30 space-y-3 animate-in fade-in duration-150 shadow-xl">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Sparkles className="size-3.5 text-cyan-400" />
                <span>Custom Instructions for My AI</span>
              </div>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="How should My AI behave or respond in this project? (E.g. concise bullet points, specific programming stack, tone...)"
                className="w-full rounded-xl bg-[#070e20] border border-blue-500/30 p-2.5 text-xs text-white placeholder:text-blue-300/40 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
            </div>
          )}
        </form>

        {/* Bottom Create Button */}
        <div className="pt-8 pb-4">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 px-6 text-sm font-semibold transition shadow-lg active:scale-95 cursor-pointer ${
              title.trim()
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30"
                : "bg-blue-950/40 border border-blue-500/20 text-blue-300/40 cursor-not-allowed"
            }`}
          >
            {isCreating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Project"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
