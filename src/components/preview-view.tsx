import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, MonitorPlay, Code2, ArrowLeft, Rocket, ExternalLink, Sparkles, BookOpen, Heart, MoreVertical, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PreviewProps {
  appName: string;
  appDescription: string;
  previewHtml?: string;
  onBackToChat: () => void;
  onPublish: () => void;
  onOpenLiveView: () => void;
  onSeeCode?: () => void;
}

export function Preview({
  appName,
  appDescription,
  previewHtml,
  onBackToChat,
  onPublish,
  onOpenLiveView,
  onSeeCode,
}: PreviewProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "book">("preview");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function handleDownloadApp() {
    const payload = {
      name: appName,
      description: appDescription,
      preview_html: previewHtml || "",
      exportedAt: new Date().toISOString(),
      platform: "My AI Pro Universal Applet",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${appName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-full-app.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Full app downloaded successfully to your device!");
    setMenuOpen(false);
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#0f0f11] text-white font-sans antialiased overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-white/10 bg-[#141416]/90 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToChat}
            className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-semibold text-white transition cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Chat</span>
          </button>

          {/* 3 Dots Menu next to Back to Chat / Cancel logo */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex size-9 items-center justify-center rounded-xl transition cursor-pointer",
                menuOpen ? "bg-white/20 text-white" : "bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white"
              )}
              title="More options"
              aria-label="More options"
            >
              <MoreVertical className="size-4" />
            </button>

            {menuOpen && (
              <div className="absolute left-0 mt-2 w-52 rounded-2xl bg-[#1c1c1e] p-1.5 shadow-2xl border border-white/10 z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onPublish();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-white/10 transition text-left cursor-pointer"
                >
                  <Rocket className="size-4 text-indigo-400" />
                  <span>Publish</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onBackToChat();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-white/10 transition text-left cursor-pointer"
                >
                  <ArrowLeft className="size-4 text-zinc-400" />
                  <span>Back to chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (onSeeCode) onSeeCode();
                    else toast.info("Code explorer is available in the build view.");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-white/10 transition text-left cursor-pointer"
                >
                  <Code2 className="size-4 text-emerald-400" />
                  <span>See the code</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadApp}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white hover:bg-white/10 transition text-left cursor-pointer border-t border-white/5 mt-1 pt-2"
                >
                  <Download className="size-4 text-blue-400" />
                  <span>Download the app</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
              {appName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">{appName}</h1>
              <p className="text-[10px] text-zinc-400 truncate max-w-[200px] sm:max-w-xs">{appDescription}</p>
            </div>
          </div>
        </div>

        {/* Center Mode Tabs */}
        <div className="hidden md:flex items-center gap-1.5 rounded-xl bg-white/5 p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition",
              activeTab === "preview" ? "bg-white text-zinc-950 font-semibold shadow-sm" : "text-zinc-400 hover:text-white"
            )}
          >
            <MonitorPlay className="size-3.5" /> Full-Screen App
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("book")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition",
              activeTab === "book" ? "bg-white text-zinc-950 font-semibold shadow-sm" : "text-zinc-400 hover:text-white"
            )}
          >
            <BookOpen className="size-3.5" /> Book Preview & Dedication
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLiveView}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-semibold text-white transition cursor-pointer"
          >
            <ExternalLink className="size-3.5" /> Live URL
          </button>
          <button
            type="button"
            onClick={onPublish}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg transition cursor-pointer"
          >
            <Rocket className="size-3.5" /> Publish
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex flex-1 flex-col overflow-hidden relative bg-[#121214]">
        {activeTab === "preview" ? (
          <div className="flex flex-1 flex-col h-full w-full bg-white">
            {previewHtml ? (
              <iframe
                title="Full-screen Application Preview"
                srcDoc={
                  previewHtml.includes("<html") || previewHtml.includes("<!DOCTYPE")
                    ? previewHtml
                    : `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-950 text-white p-6 font-sans">${previewHtml}</body></html>`
                }
                sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
                className="w-full flex-1 border-0"
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-zinc-950 text-white space-y-4">
                <Sparkles className="size-10 text-indigo-400 animate-pulse" />
                <h2 className="text-lg font-bold">Interactive Full-Screen Preview for {appName}</h2>
                <p className="text-xs text-zinc-400 max-w-md leading-relaxed">{appDescription}</p>
                <button
                  type="button"
                  onClick={onPublish}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-xs font-bold text-white transition shadow-lg"
                >
                  Publish & Run Live App
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Book First Page & Blue Signature for Annie */
          <div className="flex flex-1 items-center justify-center p-6 bg-[#18181b] overflow-y-auto">
            <div className="w-full max-w-2xl rounded-3xl bg-[#fdfbf7] p-8 md:p-12 text-zinc-900 shadow-2xl border border-amber-200/50 flex flex-col justify-between min-h-[560px] relative">
              {/* Book Header / Page Number */}
              <div className="flex items-center justify-between border-b border-amber-900/10 pb-4 text-xs font-serif text-amber-900/60 uppercase tracking-widest">
                <span>{appName}</span>
                <span>Page 1 · First Edition</span>
              </div>

              {/* Book Content / First Page Screenshot representation */}
              <div className="my-8 space-y-6 text-center md:text-left font-serif">
                <div className="inline-block rounded-2xl bg-amber-100/70 border border-amber-200 px-4 py-1.5 text-[11px] font-sans font-semibold text-amber-800 uppercase tracking-wider mb-2">
                  Author's Dedication & Opening
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 font-serif">
                  {appName}
                </h2>
                <p className="text-sm md:text-base text-zinc-700 leading-relaxed italic font-serif">
                  "{appDescription}"
                </p>
                <div className="py-4 border-y border-amber-900/10 my-4 text-xs text-zinc-600 font-sans leading-relaxed">
                  Every great journey begins with a single spark of imagination. This platform brings vision into reality through code and design.
                </div>
              </div>

              {/* Quote Signed in Blue at the Bottom saying to Annie and John */}
              <div className="pt-8 border-t border-amber-900/10 flex flex-col items-end text-right space-y-2">
                <p className="text-xs italic text-zinc-500 font-serif">
                  "May this creation inspire wondrous new horizons for John & Annie."
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Heart className="size-4 text-blue-600 fill-blue-600 animate-pulse" />
                  <span className="font-handwriting text-xl md:text-2xl font-bold text-blue-600 tracking-wide select-none drop-shadow-xs" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    To John & Annie, With Love & Dedication
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Navigation Bar for Mobile & Desktop */}
      <div className="flex md:hidden items-center justify-between bg-[#141416] px-4 py-3 border-t border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "preview" ? "book" : "preview")}
          className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-white"
        >
          {activeTab === "preview" ? <BookOpen className="size-4 text-amber-400" /> : <MonitorPlay className="size-4 text-indigo-400" />}
          <span>{activeTab === "preview" ? "View Book & Dedication" : "Full-Screen App"}</span>
        </button>
        <button
          type="button"
          onClick={onBackToChat}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="size-3.5" /> Back to Chat
        </button>
      </div>
    </div>
  );
}
