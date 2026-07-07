"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MockWindow, Chip, Avatar } from "@/components/landing/mockups";
import { Stagger, StaggerItem } from "@/components/landing/motion";
import type { VisualKey } from "@/lib/marketing/features";

/* Product visuals for the feature pages — one honest scene per feature,
   composed from the shared mockup atoms and brought to life with cheap
   looping micro-demos (pulses, a travelling exchange dot, growing bars, a
   blinking caption caret) plus staggered scroll reveals. Every custom
   animation checks useReducedMotion and degrades to the static scene; the
   FeaturePage template supplies the outer motion (ScrollScale + Tilt).
   All color reads from tokens (signal / priority-*), never raw hex. */

const EASE = [0.16, 1, 0.3, 1] as const;
const VIEWPORT = { once: true, margin: "0px 0px -10% 0px" } as const;

/* ---------------- shared micro-motion atoms ---------------- */

/** A dot with a soft looping "live" pulse ring. Static dot under reduced motion. */
function LiveDot({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={`relative inline-flex h-1.5 w-1.5 flex-none ${className}`} aria-hidden>
      {!reduce && (
        <motion.span
          className="absolute inset-0 rounded-full bg-signal"
          animate={{ scale: [1, 2.4], opacity: [0.55, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className="relative h-1.5 w-1.5 rounded-full bg-signal" />
    </span>
  );
}

function PriorityCard({
  tone,
  label,
  children,
}: {
  tone: "high" | "medium" | "low";
  label: string;
  children: ReactNode;
}) {
  const strip =
    tone === "high"
      ? "bg-priority-high"
      : tone === "medium"
        ? "bg-priority-medium"
        : "bg-priority-low";
  const text =
    tone === "high"
      ? "text-priority-high"
      : tone === "medium"
        ? "text-priority-medium"
        : "text-priority-low";
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-white p-3.5">
      <span className={`w-1 shrink-0 rounded-full ${strip}`} aria-hidden />
      <div className="min-w-0">
        <p className={`font-mono text-[9.5px] uppercase tracking-[0.18em] ${text}`}>
          {label}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-ink">{children}</p>
      </div>
    </div>
  );
}

function SourceChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-2 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-wider text-ink-3">
      <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
      {children}
    </span>
  );
}

/* ---------------- 1. notes — the personal notes sidebar ---------------- */

function NotesVisual() {
  return (
    <MockWindow title="Q3 GTM sync · your notes" meta="live" className="w-full max-w-[520px]">
      <Stagger className="space-y-3 p-4 sm:p-5">
        <StaggerItem>
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
            <LiveDot />
            Streaming · role-relevant
          </p>
        </StaggerItem>
        <StaggerItem>
          <div className="rounded-xl border border-line bg-bg-2/50 p-3.5">
            <p className="text-[13px] leading-snug text-ink">
              Launch at risk if the pricing decision slips past April.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip accent>Decision pending</Chip>
            </div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="rounded-xl border border-line bg-bg-2/50 p-3.5">
            <p className="text-[13px] leading-snug text-ink">
              Sarah owns the pricing rework — revisit scope before sprint start.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip>Action item</Chip>
              <Chip>Owner · Sarah</Chip>
            </div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="rounded-xl border border-signal/25 bg-signal-soft/50 p-3.5">
            <p className="text-[13px] leading-snug text-ink">
              For you: confirm ICP alignment with sales before the messaging review.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip accent>Yours only</Chip>
            </div>
          </div>
        </StaggerItem>
      </Stagger>
    </MockWindow>
  );
}

/* ---------------- 2. suggestions — priority-coded questions ------------ */

function SuggestionsVisual() {
  return (
    <MockWindow title="Suggestions" meta="private to you" className="w-full max-w-[520px]">
      <Stagger className="space-y-2.5 p-4 sm:p-5">
        <StaggerItem>
          <PriorityCard tone="high" label="Act now">
            &ldquo;The launch date depends on this — do we have legal sign-off on the new pricing?&rdquo;
          </PriorityCard>
        </StaggerItem>
        <StaggerItem>
          <PriorityCard tone="medium" label="Attention">
            &ldquo;Should marketing hear this before the announcement draft goes out?&rdquo;
          </PriorityCard>
        </StaggerItem>
        <StaggerItem>
          <PriorityCard tone="low" label="Context">
            &ldquo;Last quarter this was scoped at three weeks — worth re-checking the estimate.&rdquo;
          </PriorityCard>
        </StaggerItem>
      </Stagger>
    </MockWindow>
  );
}

/* ---------------- 3. decision — confirm + lineage ---------------------- */

function DecisionVisual() {
  const reduce = useReducedMotion();
  return (
    <MockWindow title="Decision detected" meta="waiting for confirm" className="w-full max-w-[520px]">
      <div className="p-4 sm:p-5">
        <div className="rounded-xl border border-line bg-bg-2/50 p-4">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-priority-low">
            Decision
          </p>
          <p className="mt-1.5 text-[15px] font-medium leading-snug text-ink-display">
            Lock pricing at $49 for Q3
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <span className="relative inline-flex">
              {!reduce && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-signal"
                  animate={{ scale: [1, 1.4], opacity: [0.35, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <span className="relative rounded-full bg-signal px-3.5 py-1.5 text-[12px] font-medium text-white">
                Confirm
              </span>
            </span>
            <span className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[12px] text-ink-2">
              Edit
            </span>
            <span className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[12px] text-ink-3">
              Dismiss
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SourceChip>Q3 Planning · today</SourceChip>
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-bg-2 px-2.5 py-1 text-[11px] font-medium text-ink-2">
            Q2 Planning <span aria-hidden className="text-ink-3">→</span> Q3 Planning
          </span>
        </div>
      </div>
    </MockWindow>
  );
}

/* ---------------- 4. tasks — captured action items --------------------- */

function TasksVisual() {
  const reduce = useReducedMotion();
  const rows = [
    { text: "Draft the pricing rework scope", who: "SA", due: "Jul 10", done: false },
    { text: "Send the updated deck to sales", who: "MA", due: "Jul 7", done: false },
    { text: "Confirm legal sign-off on $49", who: "PR", due: "Jul 4", done: true },
  ];
  return (
    <MockWindow title="My tasks" meta="from 3 meetings" className="w-full max-w-[520px]">
      <motion.ul
        className="divide-y divide-line"
        initial={reduce ? false : "hidden"}
        whileInView={reduce ? undefined : "show"}
        viewport={VIEWPORT}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
      >
        {rows.map((r) => (
          <motion.li
            key={r.text}
            className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
            variants={
              reduce
                ? undefined
                : {
                    hidden: { opacity: 0, x: -14 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } },
                  }
            }
          >
            <span
              aria-hidden
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                r.done ? "border-signal bg-signal text-white" : "border-line-2 bg-white"
              }`}
            >
              {r.done && (
                <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                  <motion.path
                    d="M2.5 6.2 5 8.5 9.5 3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reduce ? undefined : { pathLength: 0 }}
                    whileInView={reduce ? undefined : { pathLength: 1 }}
                    viewport={VIEWPORT}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.55 }}
                  />
                </svg>
              )}
            </span>
            <span className={`min-w-0 flex-1 truncate text-[13.5px] ${r.done ? "text-ink-3 line-through" : "text-ink"}`}>
              {r.text}
            </span>
            <Avatar initials={r.who} className="h-6 w-6" />
            <span className="font-mono text-[10.5px] tabular-nums text-ink-3">{r.due}</span>
          </motion.li>
        ))}
      </motion.ul>
    </MockWindow>
  );
}

/* ---------------- 5. exchange — the sourced cross-meeting answer ------- */

function ExchangeVisual() {
  const reduce = useReducedMotion();
  return (
    <MockWindow title="Context found" meta="agent → agent" className="w-full max-w-[520px]">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="whitespace-nowrap text-[12px] font-medium text-ink-2">
            Your agent
          </span>
          <span className="relative h-px min-w-8 flex-1 bg-line-2">
            {reduce ? (
              <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal" />
            ) : (
              <motion.span
                aria-hidden
                className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-signal"
                animate={{ left: ["2%", "92%", "2%"], opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </span>
          <span className="whitespace-nowrap text-[12px] font-medium text-ink-2">
            Sarah&rsquo;s agent
          </span>
        </div>
        <motion.div
          className="mt-4 rounded-xl border border-line bg-bg-2/50 p-4"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        >
          <p className="text-[14px] font-medium leading-snug text-ink-display">
            &ldquo;Pricing was locked at $49 in the Q2 planning call — Sarah already owns the rework.&rdquo;
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SourceChip>Sourced · Q2 Planning · Apr 3</SourceChip>
            <SourceChip>Speaker · Sarah</SourceChip>
          </div>
        </motion.div>
      </div>
    </MockWindow>
  );
}

/* ---------------- 6. capacity — the workload read ----------------------- */

function CapacityVisual() {
  const reduce = useReducedMotion();
  const team = [
    { name: "Sarah", util: 96, cls: "bg-priority-high", txt: "text-priority-high" },
    { name: "Priya", util: 88, cls: "bg-priority-medium", txt: "text-priority-medium" },
    { name: "Aisha", util: 74, cls: "bg-signal", txt: "text-ink-3" },
    { name: "Diego", util: 45, cls: "bg-signal", txt: "text-ink-3" },
  ];
  return (
    <MockWindow title="Team capacity · this sprint" meta="live read" className="w-full max-w-[520px]">
      <div className="p-4 sm:p-5">
        <div className="space-y-3">
          {team.map((t, i) => (
            <div key={t.name} className="grid grid-cols-[56px_1fr_36px] items-center gap-2.5 sm:grid-cols-[64px_1fr_40px] sm:gap-3">
              <span className="truncate text-[12.5px] text-ink-2">{t.name}</span>
              <span className="relative h-[14px] overflow-hidden rounded-full bg-bg-2">
                {reduce ? (
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${t.cls}`}
                    style={{ width: `${t.util}%` }}
                  />
                ) : (
                  <motion.span
                    className={`absolute inset-y-0 left-0 rounded-full ${t.cls}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${t.util}%` }}
                    viewport={VIEWPORT}
                    transition={{ duration: 1, ease: EASE, delay: 0.1 + i * 0.12 }}
                  />
                )}
              </span>
              <span className={`text-right font-mono text-[11px] tabular-nums ${t.txt}`}>
                {t.util}%
              </span>
            </div>
          ))}
        </div>
        <motion.div
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-priority-high/25 bg-priority-high-soft px-3.5 py-2.5"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.6, ease: EASE, delay: 0.75 }}
        >
          <span aria-hidden className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-priority-high" />
          <p className="text-[12px] font-medium leading-snug text-priority-high">
            Sarah is at 96% — over capacity this sprint.
          </p>
        </motion.div>
      </div>
    </MockWindow>
  );
}

/* ---------------- 7. captions — the live caption strip ------------------ */

function CaptionsVisual() {
  const reduce = useReducedMotion();
  const lines = [
    { who: "Marcus", text: "Can we still hit the April launch if pricing slips?", dim: true },
    { who: "Sarah", text: "Okay — lock the price at $49, and I'll own the rework.", dim: false },
  ];
  return (
    <MockWindow title="Live captions" meta="< 2s" className="w-full max-w-[520px]">
      <Stagger className="space-y-3 p-4 sm:p-5">
        {lines.map((l) => (
          <StaggerItem key={l.text}>
            <div className="flex gap-3">
              <Avatar initials={l.who.slice(0, 2).toUpperCase()} className="h-6 w-6 shrink-0" ring={!l.dim} />
              <div className="min-w-0">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-signal-deep">
                  {l.who}
                </p>
                <p className={`mt-0.5 text-[13.5px] leading-snug ${l.dim ? "text-ink-3" : "text-ink"}`}>
                  {l.text}
                  {!l.dim && (
                    <motion.span
                      aria-hidden
                      className="ml-1 inline-block h-[0.95em] w-[2px] translate-y-[2px] rounded-full bg-signal align-middle"
                      animate={reduce ? undefined : { opacity: [1, 1, 0, 0] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "linear", times: [0, 0.5, 0.5, 1] }}
                    />
                  )}
                </p>
              </div>
            </div>
          </StaggerItem>
        ))}
        <StaggerItem>
          <p className="border-t border-line pt-3 font-mono text-[10px] uppercase tracking-wider text-ink-3">
            Click a line to jump to that moment
          </p>
        </StaggerItem>
      </Stagger>
    </MockWindow>
  );
}

/* ---------------- 8. search — the cited answer -------------------------- */

function SearchVisual() {
  const reduce = useReducedMotion();
  return (
    <MockWindow title="Search" meta="semantic + cited" className="w-full max-w-[520px]">
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2.5 rounded-full border border-line bg-bg-2/60 px-4 py-2.5">
          <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-ink-3" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="4.4" stroke="currentColor" strokeWidth="1.4" />
            <path d="m10.4 10.4 3.1 3.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="min-w-0 truncate text-[13.5px] text-ink">
            what did we agree on pricing?
          </span>
        </div>
        <motion.div
          className="mt-4 rounded-xl border border-line bg-bg-2/50 p-4"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
        >
          <p className="text-[14px] font-medium leading-snug text-ink-display">
            Pricing was locked at $49 for Q3, with Sarah owning the rework.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SourceChip>Q2 Planning · Apr 3</SourceChip>
            <SourceChip>Speaker · Sarah</SourceChip>
          </div>
        </motion.div>
      </div>
    </MockWindow>
  );
}

/* ---------------- 9. graph — connected org memory ----------------------- */

function GraphVisual() {
  const reduce = useReducedMotion();
  const nodes = [
    { cx: 110, cy: 60, label: "Sarah", accent: true },
    { cx: 110, cy: 170, label: "Q2 call", accent: false },
    { cx: 330, cy: 55, label: "Rework", accent: false },
    { cx: 335, cy: 165, label: "Pricing", accent: false },
  ];
  return (
    <MockWindow title="Knowledge graph" meta="your org" className="w-full max-w-[520px]">
      <div className="p-4 sm:p-5">
        <svg viewBox="0 0 440 220" className="h-auto w-full" role="img" aria-label="A graph connecting a person, two meetings, a decision, an action, and a topic">
          {/* edges */}
          <g stroke="var(--line-2)" strokeWidth="1.4">
            <line x1="110" y1="60" x2="220" y2="110" />
            <line x1="110" y1="170" x2="220" y2="110" />
            <line x1="220" y1="110" x2="330" y2="55" />
            <line x1="220" y1="110" x2="335" y2="165" />
            <line x1="330" y1="55" x2="335" y2="165" strokeDasharray="4 4" />
          </g>
          {/* looping pulse around the decision node */}
          {!reduce && (
            <motion.circle
              cx={220}
              cy={110}
              fill="none"
              stroke="var(--signal)"
              strokeWidth="1.4"
              initial={{ r: 30, opacity: 0.5 }}
              animate={{ r: [30, 44], opacity: [0.5, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          {/* nodes */}
          <g fontFamily="var(--font-mono)" fontSize="10" textAnchor="middle">
            <circle cx="220" cy="110" r="30" fill="var(--signal)" />
            <text x="220" y="114" fill="var(--bg)">$49</text>
            {nodes.map((n, i) => (
              <motion.g
                key={n.label}
                initial={reduce ? undefined : { opacity: 0 }}
                whileInView={reduce ? undefined : { opacity: 1 }}
                viewport={VIEWPORT}
                transition={{ duration: 0.6, ease: EASE, delay: 0.15 + i * 0.12 }}
              >
                <circle
                  cx={n.cx}
                  cy={n.cy}
                  r="26"
                  fill={n.accent ? "var(--signal-soft)" : "var(--bg-2)"}
                  stroke={n.accent ? "var(--signal)" : "var(--line-2)"}
                  strokeWidth="1.4"
                />
                <text x={n.cx} y={n.cy + 4} fill={n.accent ? "var(--signal-deep)" : "var(--ink-3)"}>
                  {n.label}
                </text>
              </motion.g>
            ))}
          </g>
        </svg>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip accent>Decision</Chip>
          <Chip>Person</Chip>
          <Chip>Meeting</Chip>
          <Chip>Action</Chip>
          <Chip>Topic</Chip>
        </div>
      </div>
    </MockWindow>
  );
}

/* ---------------- 10. integrations — the connected tools ---------------- */

function IntegrationTile({ name, sub }: { name: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-signal-soft font-mono text-[11px] font-bold text-signal-deep">
        {name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-ink">{name}</p>
        <p className="truncate text-[11px] text-ink-3">{sub}</p>
      </div>
      <LiveDot className="ml-auto" />
    </div>
  );
}

function IntegrationsVisual() {
  return (
    <MockWindow title="Integrations" meta="connected" className="w-full max-w-[520px]">
      <Stagger className="grid gap-2.5 p-4 sm:grid-cols-2 sm:p-5">
        <StaggerItem>
          <IntegrationTile name="Google Calendar" sub="meetings & scheduling" />
        </StaggerItem>
        <StaggerItem>
          <IntegrationTile name="Slack" sub="decision & task routing" />
        </StaggerItem>
        <StaggerItem>
          <IntegrationTile name="Linear" sub="action items → issues" />
        </StaggerItem>
        <StaggerItem className="h-full">
          <div className="flex h-full items-center gap-3 rounded-xl border border-dashed border-line-2 p-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-3">
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
                <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <p className="text-[12px] leading-snug text-ink-3">
              Jira available — one tracker per workspace
            </p>
          </div>
        </StaggerItem>
      </Stagger>
    </MockWindow>
  );
}

/* ------------------------------------------------------------------ */

export const FEATURE_VISUALS: Record<VisualKey, () => ReactNode> = {
  notes: NotesVisual,
  suggestions: SuggestionsVisual,
  decision: DecisionVisual,
  tasks: TasksVisual,
  exchange: ExchangeVisual,
  capacity: CapacityVisual,
  captions: CaptionsVisual,
  search: SearchVisual,
  graph: GraphVisual,
  integrations: IntegrationsVisual,
};

/** Client-side lookup wrapper so server components (FeaturePage) can pick a
    visual by its serializable key instead of dotting into this client module. */
export function FeatureVisual({ visual }: { visual: VisualKey }) {
  const Visual = FEATURE_VISUALS[visual];
  return <Visual />;
}
