export interface PlanStep {
  id: string;
  title: string;
  phase: "planning" | "researching" | "coding" | "optimizing" | "monitoring";
  status: "pending" | "in_progress" | "completed";
  details?: string;
  completedAt?: number;
}

export interface AutonomousProjectTask {
  threadId: string;
  projectName: string;
  projectIdea: string;
  status: "waiting_approval" | "working" | "paused" | "stopped";
  currentPhase: "planning" | "researching" | "coding" | "optimizing" | "monitoring";
  startedAt: number;
  updatedAt: number;
  planSteps: PlanStep[];
  logs: {
    at: number;
    text: string;
    type: "plan" | "research" | "code" | "review";
    codeSnippet?: string;
  }[];
  generatedFiles: { path: string; language: string; content: string }[];
  iterationCount: number;
}

const STORAGE_KEY = "myaipro_autonomous_tasks_v2";

export function getAllAutonomousTasks(): Record<string, AutonomousProjectTask> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getAutonomousTask(threadId: string): AutonomousProjectTask | null {
  const all = getAllAutonomousTasks();
  return all[threadId] || null;
}

export function saveAutonomousTask(task: AutonomousProjectTask): void {
  if (typeof window === "undefined") return;
  try {
    const all = getAllAutonomousTasks();
    all[task.threadId] = {
      ...task,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(
      new CustomEvent("myaipro_autonomous_task_updated", { detail: task }),
    );
  } catch (e) {
    console.warn("Failed to save autonomous task:", e);
  }
}

export function stopAutonomousTask(threadId: string): AutonomousProjectTask | null {
  const task = getAutonomousTask(threadId);
  if (!task) return null;
  task.status = "stopped";
  task.updatedAt = Date.now();
  task.logs.unshift({
    at: Date.now(),
    text: "Task stopped by user command. Progress and generated code saved.",
    type: "review",
  });
  saveAutonomousTask(task);
  return task;
}

export function createAutonomousTask(
  threadId: string,
  projectIdea: string,
  projectName?: string,
): AutonomousProjectTask {
  const cleanName =
    projectName ||
    projectIdea
      .split(/[.,!?\n]/)[0]
      .replace(/^(build|make|create|work on|develop)\s+/i, "")
      .trim()
      .slice(0, 40) ||
    "Dream Project";

  const task: AutonomousProjectTask = {
    threadId,
    projectName: cleanName,
    projectIdea,
    status: "working",
    currentPhase: "planning",
    startedAt: Date.now(),
    updatedAt: Date.now(),
    iterationCount: 1,
    planSteps: [
      {
        id: "step-1",
        title: "Architecture Planning & Tech Stack Selection",
        phase: "planning",
        status: "completed",
        details: "Analyzed project requirements and formulated execution roadmap.",
        completedAt: Date.now(),
      },
      {
        id: "step-2",
        title: "Deep Technical Research & API Specification",
        phase: "researching",
        status: "in_progress",
        details: "Investigating optimal protocols, database schemas, and external integrations.",
      },
      {
        id: "step-3",
        title: "Core System Implementation & Codebase Writing",
        phase: "coding",
        status: "pending",
        details: "Writing production-grade source code, modules, and API handlers.",
      },
      {
        id: "step-4",
        title: "Automated Optimization, Error Auditing & Hardening",
        phase: "optimizing",
        status: "pending",
        details: "Running self-healing checks, performance profiling, and test suites.",
      },
      {
        id: "step-5",
        title: "Continuous Autonomous Evolution & Feature Expansion",
        phase: "monitoring",
        status: "pending",
        details: "Continuous background development and iterative capability additions.",
      },
    ],
    logs: [
      {
        at: Date.now(),
        text: `Autonomous agent initiated for "${cleanName}". Formulating multi-phase implementation plan.`,
        type: "plan",
      },
      {
        at: Date.now() + 100,
        text: `Research phase started: Analyzing core system architecture, data models, and integrations.`,
        type: "research",
      },
    ],
    generatedFiles: [
      {
        path: "README.md",
        language: "markdown",
        content: `# ${cleanName}\n\nAutonomous Project Blueprint\nIdea: ${projectIdea}\n\n## Status\nAutonomous Agent actively working on system implementation.`,
      },
    ],
  };

  saveAutonomousTask(task);
  return task;
}
