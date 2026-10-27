import { useMemo, useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Copy,
  FileCode2,
  FileJson,
  FileText,
  Braces,
  X,
  Download,
  Github,
  Check,
  Folder,
  FolderOpen,
  Plus,
  Terminal,
  Code2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

export type CodeFile = { path: string; language: string; content: string };

type Node = { name: string; path: string; file?: CodeFile; children: Node[] };

function buildTree(files: CodeFile[]): Node[] {
  const root: Node = { name: "", path: "", children: [] };
  for (const f of files) {
    const parts = f.path.split("/").filter(Boolean);
    let cur = root;
    parts.forEach((part, i) => {
      const isLeaf = i === parts.length - 1;
      let next = cur.children.find((c) => c.name === part && !!c.file === isLeaf);
      if (!next) {
        next = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          children: [],
          ...(isLeaf ? { file: f } : {}),
        };
        cur.children.push(next);
      }
      cur = next;
    });
  }
  const sort = (n: Node[]) => {
    n.sort((a, b) => (!!a.file === !!b.file ? a.name.localeCompare(b.name) : a.file ? 1 : -1));
    n.forEach((c) => sort(c.children));
  };
  sort(root.children);
  return root.children;
}

function iconFor(name: string) {
  if (name.endsWith(".json")) return FileJson;
  if (name.endsWith(".md") || name.endsWith(".txt")) return FileText;
  if (name.endsWith(".css") || name.endsWith(".html")) return Braces;
  return FileCode2;
}

/* ---------------- Enhanced Syntax Highlighting (Classic Blue & Pink Palette) ---------------- */

const KEYWORDS =
  "abstract|as|async|await|break|case|catch|class|const|continue|def|default|delete|do|elif|else|enum|except|export|extends|finally|for|from|function|if|implements|import|in|instanceof|interface|is|lambda|let|new|none|not|null|or|and|pass|print|private|public|raise|return|self|static|super|switch|this|throw|true|false|try|type|typeof|undefined|var|void|while|with|yield|struct|func|package|use|fn|impl|match|pub|mut";

const RULES: { cls: string; re: RegExp }[] = [
  // Strings in bright cyan
  { cls: "text-cyan-300", re: new RegExp(`("""[\\s\\S]*?"""|'''[\\s\\S]*?'''|"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\`(?:\\\\.|[^\`\\\\])*\`)`, "g") },
  // Comments in muted sky blue
  { cls: "text-blue-300/40 italic", re: /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g },
  // Keywords in vibrant glowing pink
  { cls: "text-pink-400 font-semibold", re: new RegExp(`\\b(${KEYWORDS})\\b`, "g") },
  // Numbers in light pink/amber
  { cls: "text-pink-300 font-mono", re: /\b(\d+(?:\.\d+)?)\b/g },
  // Types & Components in luminous electric blue
  { cls: "text-blue-300 font-medium", re: /\b([A-Z][A-Za-z0-9_]+)\b/g },
  // Function calls in bright sky blue
  { cls: "text-sky-300", re: /\b([a-zA-Z_][\w]*)(?=\()/g },
];

type Tok = { text: string; cls?: string };

function tokenize(code: string): Tok[] {
  let toks: Tok[] = [{ text: code }];
  for (const rule of RULES) {
    const next: Tok[] = [];
    for (const t of toks) {
      if (t.cls) {
        next.push(t);
        continue;
      }
      let last = 0;
      const re = new RegExp(rule.re.source, rule.re.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(t.text))) {
        if (m.index > last) next.push({ text: t.text.slice(last, m.index) });
        next.push({ text: m[0], cls: rule.cls });
        last = m.index + m[0].length;
        if (m[0].length === 0) re.lastIndex++;
      }
      if (last < t.text.length) next.push({ text: t.text.slice(last) });
    }
    toks = next;
  }
  return toks;
}

function HighlightedCode({ code }: { code: string }) {
  const lines = useMemo(() => code.split("\n"), [code]);
  return (
    <pre className="min-w-full font-mono text-[12.5px] leading-relaxed text-blue-50/90 select-text">
      {lines.map((line, i) => (
        <div key={i} className="flex hover:bg-blue-500/10 px-2 rounded-sm transition-colors">
          <span className="w-10 shrink-0 select-none pr-4 text-right text-blue-400/35 font-mono text-xs">
            {i + 1}
          </span>
          <code className="whitespace-pre flex-1">
            {tokenize(line).map((t, j) => (
              <span key={j} className={t.cls}>
                {t.text}
              </span>
            ))}
          </code>
        </div>
      ))}
    </pre>
  );
}

/* ---------------- Tree Row ---------------- */

function Row({
  node,
  depth,
  open,
  toggle,
  activePath,
  onPick,
}: {
  node: Node;
  depth: number;
  open: Record<string, boolean>;
  toggle: (p: string) => void;
  activePath?: string;
  onPick: (f: CodeFile) => void;
}) {
  const isOpen = open[node.path] ?? true;
  if (node.file) {
    const Icon = iconFor(node.name);
    const isSelected = activePath === node.path;
    return (
      <button
        onClick={() => onPick(node.file!)}
        style={{ paddingLeft: 12 + depth * 14 }}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl py-1.5 pr-2.5 text-left text-xs transition cursor-pointer group",
          isSelected
            ? "bg-gradient-to-r from-blue-600/30 to-pink-500/15 border-l-2 border-pink-400 text-white font-semibold shadow-xs"
            : "text-blue-100/70 hover:bg-blue-500/10 hover:text-white",
        )}
      >
        <Icon className={cn("size-3.5 shrink-0", isSelected ? "text-pink-400" : "text-blue-400/60 group-hover:text-blue-300")} />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }
  return (
    <div>
      <button
        onClick={() => toggle(node.path)}
        style={{ paddingLeft: 12 + depth * 14 }}
        className="flex w-full items-center gap-2 rounded-xl py-1.5 pr-2.5 text-left text-xs font-semibold text-blue-200/80 hover:bg-blue-500/10 hover:text-white transition cursor-pointer"
      >
        {isOpen ? <ChevronDown className="size-3.5 shrink-0 text-blue-400" /> : <ChevronRight className="size-3.5 shrink-0 text-blue-400/60" />}
        {isOpen ? (
          <FolderOpen className="size-3.5 shrink-0 text-blue-400" />
        ) : (
          <Folder className="size-3.5 shrink-0 text-blue-400/70" />
        )}
        <span className="truncate">{node.name}</span>
        <span className="ml-auto text-[10px] text-blue-300/40 font-normal">
          {node.children.length}
        </span>
      </button>
      {isOpen &&
        node.children.map((c) => (
          <Row
            key={c.path}
            node={c}
            depth={depth + 1}
            open={open}
            toggle={toggle}
            activePath={activePath}
            onPick={onPick}
          />
        ))}
    </div>
  );
}

/* ---------------- Main Split-Pane CodeExplorer Component ---------------- */

export function CodeExplorer({
  files,
  appName = "my-app",
  onUpdateFiles,
  onExportGitHub,
}: {
  files: CodeFile[];
  appName?: string;
  onUpdateFiles?: (updated: CodeFile[]) => void;
  onExportGitHub?: () => void;
}) {
  // Ensure there are always real multi-file codebase items
  const resolvedFiles = useMemo(() => {
    if (files && files.length > 0) return files;
    return [
      {
        path: "src/App.tsx",
        language: "typescript",
        content: `import React, { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">\n      <header className="max-w-4xl mx-auto flex items-center justify-between border-b border-blue-500/20 pb-4">\n        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent">\n          ${appName}\n        </h1>\n        <button onClick={() => setCount(c => c + 1)} className="rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white">\n          Clicks: {count}\n        </button>\n      </header>\n    </div>\n  );\n}\n`,
      },
      {
        path: "index.html",
        language: "html",
        content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${appName}</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n  </head>\n  <body class="bg-slate-950 text-white">\n    <div id="root"></div>\n  </body>\n</html>\n`,
      },
      {
        path: "package.json",
        language: "json",
        content: `{\n  "name": "${appName.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}",\n  "version": "1.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build"\n  },\n  "dependencies": {\n    "react": "^18.3.1",\n    "react-dom": "^18.3.1",\n    "lucide-react": "^0.475.0"\n  }\n}\n`,
      },
    ];
  }, [files, appName]);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // Default selected to App.tsx or index.html or first file so the code is ALWAYS visible!
  const [selected, setSelected] = useState<CodeFile>(() => {
    return (
      resolvedFiles.find((f) => f.path.includes("App.tsx") || f.path.includes("index.html")) ||
      resolvedFiles[0]
    );
  });

  // Keep selected in sync if files list changes
  useEffect(() => {
    if (resolvedFiles.length > 0 && !resolvedFiles.some((f) => f.path === selected?.path)) {
      setSelected(
        resolvedFiles.find((f) => f.path.includes("App.tsx") || f.path.includes("index.html")) ||
        resolvedFiles[0],
      );
    }
  }, [resolvedFiles, selected]);

  const [downloadingZip, setDownloadingZip] = useState(false);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [mobilePane, setMobilePane] = useState<"code" | "files">("code");

  const q = query.trim().toLowerCase();
  const filteredFiles = useMemo(() => {
    if (!q) return resolvedFiles;
    return resolvedFiles.filter(
      (f) => f.path.toLowerCase().includes(q) || f.content.toLowerCase().includes(q),
    );
  }, [resolvedFiles, q]);

  const tree = useMemo(() => buildTree(filteredFiles), [filteredFiles]);

  function copy(f: CodeFile) {
    navigator.clipboard.writeText(f.content);
    toast.success(`Copied ${f.path}`);
  }

  async function handleDownloadZip() {
    try {
      setDownloadingZip(true);
      const zip = new JSZip();
      resolvedFiles.forEach((f) => {
        const cleanPath = f.path.startsWith("/") ? f.path.slice(1) : f.path;
        zip.file(cleanPath, f.content);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${appName.toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "project"}-codebase.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Codebase downloaded as ZIP file!");
    } catch {
      toast.error("Failed to generate ZIP");
    } finally {
      setDownloadingZip(false);
    }
  }

  function handleCreateFile() {
    const cleaned = newFilePath.trim().replace(/^\/+/, "");
    if (!cleaned) return;
    const finalPath = cleaned.includes(".") ? cleaned : `${cleaned}.tsx`;
    const newF: CodeFile = {
      path: finalPath,
      language: finalPath.endsWith(".json") ? "json" : finalPath.endsWith(".html") ? "html" : "typescript",
      content: `// ${finalPath}\n// Component created for ${appName}\n\nexport default function Component() {\n  return <div>Component: ${finalPath}</div>;\n}\n`,
    };
    const next = [...resolvedFiles.filter((f) => f.path !== finalPath), newF];
    onUpdateFiles?.(next);
    setSelected(newF);
    setNewFilePath("");
    setShowNewFileInput(false);
    toast.success(`Created file ${finalPath}`);
  }

  // Top quick file tabs (e.g. App.tsx, index.html, package.json)
  const topTabs = useMemo(() => {
    return resolvedFiles.slice(0, 6);
  }, [resolvedFiles]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#070e1e] text-white font-sans select-none sm:select-auto">
      {/* Top Bar with Glow, Active File, and Actions */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-blue-500/20 bg-[#09142b]/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 rounded-xl bg-blue-500/15 border border-blue-400/30 px-3 py-1.5 text-xs font-bold text-blue-200">
            <Code2 className="size-3.5 text-pink-400" />
            <span className="truncate max-w-[140px] sm:max-w-none">{appName} Codebase</span>
          </div>

          {/* Quick Tabs */}
          <div className="hidden sm:flex items-center gap-1 ml-2">
            {topTabs.map((f) => {
              const active = selected?.path === f.path;
              return (
                <button
                  key={f.path}
                  onClick={() => {
                    setSelected(f);
                    setMobilePane("code");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition cursor-pointer",
                    active
                      ? "bg-blue-600/30 border border-pink-500/40 text-white font-semibold shadow-xs"
                      : "text-blue-200/60 hover:bg-blue-500/10 hover:text-white",
                  )}
                >
                  <span className="truncate max-w-[120px]">{f.path.split("/").pop()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile Pane Switcher */}
          <div className="flex sm:hidden rounded-lg bg-blue-950/80 p-0.5 border border-blue-500/20 text-xs">
            <button
              onClick={() => setMobilePane("files")}
              className={cn("px-2 py-1 rounded", mobilePane === "files" ? "bg-blue-600 text-white" : "text-blue-300")}
            >
              Files
            </button>
            <button
              onClick={() => setMobilePane("code")}
              className={cn("px-2 py-1 rounded", mobilePane === "code" ? "bg-blue-600 text-white" : "text-blue-300")}
            >
              Code
            </button>
          </div>

          <button
            onClick={() => selected && copy(selected)}
            className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-900/30 hover:bg-blue-800/40 px-3 py-1.5 text-xs font-semibold text-blue-200 transition active:scale-95 cursor-pointer shadow-xs"
            title="Copy current file code"
          >
            <Copy className="size-3.5 text-pink-400" />
            <span className="hidden sm:inline">Copy Code</span>
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white transition active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            title="Download full project code as ZIP"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export ZIP</span>
          </button>

          {onExportGitHub && (
            <button
              onClick={onExportGitHub}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-3.5 py-1.5 text-xs font-semibold text-white transition active:scale-95 cursor-pointer shadow-xs"
              title="Export codebase directly to GitHub repository"
            >
              <Github className="size-3.5 text-white" />
              <span className="hidden sm:inline">Export to GitHub</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout: Left File Explorer + Right Code Viewer */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Explorer Pane */}
        <div
          className={cn(
            "w-full sm:w-64 md:w-72 shrink-0 border-r border-blue-500/20 bg-[#081226] flex flex-col overflow-hidden",
            mobilePane === "files" ? "flex" : "hidden sm:flex",
          )}
        >
          {/* Search Bar */}
          <div className="p-3 border-b border-blue-500/15">
            <div className="flex items-center gap-2 rounded-xl bg-[#0b1836] border border-blue-500/25 px-3 py-1.5 text-xs text-white">
              <Search className="size-3.5 text-blue-400/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search files..."
                className="w-full bg-transparent outline-none placeholder:text-blue-300/40 text-xs"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-blue-400 hover:text-white">
                  <X className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* New file input toggle */}
          {showNewFileInput ? (
            <div className="p-2 border-b border-blue-500/15 flex items-center gap-1.5 bg-[#0b1836]">
              <input
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFile()}
                placeholder="src/components/MyComponent.tsx"
                className="flex-1 rounded-lg bg-black/40 px-2.5 py-1 text-xs text-white outline-none font-mono"
              />
              <button
                onClick={handleCreateFile}
                className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-bold text-white hover:bg-blue-500"
              >
                Add
              </button>
            </div>
          ) : (
            <div className="px-3 py-2 flex items-center justify-between border-b border-blue-500/15 text-[11px] font-bold uppercase tracking-wider text-blue-300/60">
              <span>EXPLORER ({resolvedFiles.length})</span>
              <button
                onClick={() => setShowNewFileInput(true)}
                className="text-blue-400 hover:text-pink-400 transition"
                title="Create file"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          )}

          {/* Tree View */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {tree.map((n) => (
              <Row
                key={n.path}
                node={n}
                depth={0}
                open={open}
                toggle={(p) => setOpen((o) => ({ ...o, [p]: !(o[p] ?? true) }))}
                activePath={selected?.path}
                onPick={(f) => {
                  setSelected(f);
                  setMobilePane("code");
                }}
              />
            ))}
          </div>
        </div>

        {/* Right Code Editor Pane (ALWAYS SHOWS CODE!) */}
        <div
          className={cn(
            "flex-1 min-h-0 flex-col overflow-hidden bg-[#060c18]",
            mobilePane === "code" ? "flex" : "hidden sm:flex",
          )}
        >
          {selected ? (
            <>
              {/* File Header Bar */}
              <div className="flex h-10 shrink-0 items-center justify-between border-b border-blue-500/15 bg-[#081226]/60 px-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-200">{selected.path}</span>
                  <span className="rounded-full bg-pink-500/20 border border-pink-500/30 px-2 py-0.5 text-[10px] font-semibold text-pink-300">
                    {selected.language || "typescript"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-blue-400/60 text-[11px]">
                  <span>{selected.content.split("\n").length} lines</span>
                  <span>{(new Blob([selected.content]).size / 1024).toFixed(1)} KB</span>
                </div>
              </div>

              {/* Code Surface with Line Numbers & Syntax Highlights */}
              <div className="flex-1 overflow-auto p-4 bg-[#060c18]">
                <HighlightedCode code={selected.content} />
              </div>
            </>
          ) : (
            <div className="flex size-full items-center justify-center p-8 text-center text-blue-400/60">
              <p>Select a file from the explorer to view code.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
