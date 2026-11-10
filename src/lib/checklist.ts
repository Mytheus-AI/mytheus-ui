/**
 * Home's first-run checklist: the few steps that make Mytheus useful, in the order they pay off.
 * It replaces the three stacked onboarding banners (the agent-profile prompt, the new joiner brief
 * and the brain readiness card). Pure, so the states are tested under `node --test`.
 *
 * Each step is `done`, `todo`, or `unknown` (its read failed). Unknown is never shown as a nag and
 * never as done: the checklist is visible only while some step is plainly `todo`, and hides when
 * everything it can see is done. The current step is the first `todo`; the memory line runs
 * through the steps that are done.
 */

export type StepKey = "role" | "agent" | "calendar" | "meeting" | "brain";
export type StepState = "done" | "todo" | "unknown";

export type ChecklistSignals = {
  /** the person told their agent their role (null: the profile could not be read) */
  role: boolean | null;
  /** they named or drew their agent */
  agent: boolean | null;
  calendar: boolean | null;
  /** they have held at least one meeting */
  meeting: boolean | null;
  /** admins only: the company brain's readiness checks are all done */
  brain?: boolean | null;
  isAdmin: boolean;
};

export type ChecklistStep = {
  key: StepKey;
  title: string;
  text: string;
  href: string;
  action: string;
  state: StepState;
};

const STEPS: Omit<ChecklistStep, "state">[] = [
  {
    key: "role",
    title: "Tell your agent what you do",
    text: "Your agent takes no notes for you until it knows your role. About a minute.",
    href: "/onboarding/profile",
    action: "Add your role",
  },
  {
    key: "agent",
    title: "Meet your agent",
    text: "Give it a name and a face, and choose how much it speaks up.",
    href: "/agent",
    action: "Meet your agent",
  },
  {
    key: "calendar",
    title: "Connect your calendar",
    text: "Your meetings arrive on their own, with agendas drafted before they start.",
    href: "/settings/integrations",
    action: "Connect calendar",
  },
  {
    key: "meeting",
    title: "Hold your first meeting",
    text: "Your agent listens, keeps notes and proposes decisions for you to confirm.",
    href: "/meetings?new=1",
    action: "Start a meeting",
  },
  {
    key: "brain",
    title: "Set up the company brain",
    text: "What the company does, its words and its goals, so every agent listens better.",
    href: "/workspace/brain",
    action: "Open the company brain",
  },
];

function state(v: boolean | null | undefined): StepState {
  return v === true ? "done" : v === false ? "todo" : "unknown";
}

export function checklistSteps(s: ChecklistSignals): ChecklistStep[] {
  return STEPS.filter((step) => step.key !== "brain" || s.isAdmin).map((step) => ({ ...step, state: state(s[step.key]) }));
}

export type ChecklistProgress = {
  done: number;
  total: number;
  /** the first step still to do, or null */
  current: StepKey | null;
  /** shown only while some step is plainly to do */
  visible: boolean;
  /** how far the memory line runs: 0 to 1, through the last done step in order */
  line: number;
};

export function checklistProgress(steps: readonly ChecklistStep[]): ChecklistProgress {
  const done = steps.filter((s) => s.state === "done").length;
  const current = steps.find((s) => s.state === "todo")?.key ?? null;
  let lastDone = -1;
  steps.forEach((s, i) => {
    if (s.state === "done") lastDone = i;
  });
  const line = steps.length > 1 ? Math.max(0, lastDone) / (steps.length - 1) : lastDone === 0 ? 1 : 0;
  return { done, total: steps.length, current, visible: current !== null, line };
}
