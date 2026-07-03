import type { ReactNode } from "react";
import { MockWindow, Chip, Avatar } from "@/components/landing/mockups";
import type { VisualKey } from "@/lib/marketing/features";

/* Static product visuals for the feature pages — one honest scene per
   feature, composed from the shared mockup atoms. Server components; the
   FeaturePage template supplies the motion (ScrollScale + Tilt) around them.
   All color reads from tokens (signal / priority-*), never raw hex. */

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
      <div className="space-y-3 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">
          Streaming · role-relevant
        </p>
        <div className="rounded-xl border border-line bg-bg-2/50 p-3.5">
          <p className="text-[13px] leading-snug text-ink">
            Launch at risk if the pricing decision slips past April.
          </p>
          <div className="mt-2 flex gap-2">
            <Chip accent>Decision pending</Chip>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-bg-2/50 p-3.5">
          <p className="text-[13px] leading-snug text-ink">
            Sarah owns the pricing rework — revisit scope before sprint start.
          </p>
          <div className="mt-2 flex gap-2">
            <Chip>Action item</Chip>
            <Chip>Owner · Sarah</Chip>
          </div>
        </div>
        <div className="rounded-xl border border-signal/25 bg-signal-soft/50 p-3.5">
          <p className="text-[13px] leading-snug text-ink">
            For you: confirm ICP alignment with sales before the messaging review.
          </p>
          <div className="mt-2 flex gap-2">
            <Chip accent>Yours only</Chip>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

/* ---------------- 2. suggestions — priority-coded questions ------------ */

function SuggestionsVisual() {
  return (
    <MockWindow title="Suggestions" meta="private to you" className="w-full max-w-[520px]">
      <div className="space-y-2.5 p-5">
        <PriorityCard tone="high" label="Act now">
          &ldquo;The launch date depends on this — do we have legal sign-off on the new pricing?&rdquo;
        </PriorityCard>
        <PriorityCard tone="medium" label="Attention">
          &ldquo;Should marketing hear this before the announcement draft goes out?&rdquo;
        </PriorityCard>
        <PriorityCard tone="low" label="Context">
          &ldquo;Last quarter this was scoped at three weeks — worth re-checking the estimate.&rdquo;
        </PriorityCard>
      </div>
    </MockWindow>
  );
}

/* ---------------- 3. decision — confirm + lineage ---------------------- */

function DecisionVisual() {
  return (
    <MockWindow title="Decision detected" meta="waiting for confirm" className="w-full max-w-[520px]">
      <div className="p-5">
        <div className="rounded-xl border border-line bg-bg-2/50 p-4">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-priority-low">
            Decision
          </p>
          <p className="mt-1.5 text-[15px] font-medium leading-snug text-ink-display">
            Lock pricing at $49 for Q3
          </p>
          <div className="mt-3.5 flex items-center gap-2">
            <span className="rounded-full bg-signal px-3.5 py-1.5 text-[12px] font-medium text-white">
              Confirm
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
  const rows = [
    { text: "Draft the pricing rework scope", who: "SA", due: "Jul 10", done: false },
    { text: "Send the updated deck to sales", who: "MA", due: "Jul 7", done: false },
    { text: "Confirm legal sign-off on $49", who: "PR", due: "Jul 4", done: true },
  ];
  return (
    <MockWindow title="My tasks" meta="from 3 meetings" className="w-full max-w-[520px]">
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.text} className="flex items-center gap-3 px-5 py-3.5">
            <span
              aria-hidden
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                r.done ? "border-signal bg-signal text-white" : "border-line-2 bg-white"
              }`}
            >
              {r.done && (
                <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                  <path d="M2.5 6.2 5 8.5 9.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span className={`min-w-0 flex-1 truncate text-[13.5px] ${r.done ? "text-ink-3 line-through" : "text-ink"}`}>
              {r.text}
            </span>
            <Avatar initials={r.who} className="h-6 w-6" />
            <span className="font-mono text-[10.5px] tabular-nums text-ink-3">{r.due}</span>
          </li>
        ))}
      </ul>
    </MockWindow>
  );
}

/* ---------------- 5. exchange — the sourced cross-meeting answer ------- */

function ExchangeVisual() {
  return (
    <MockWindow title="Context found" meta="agent → agent" className="w-full max-w-[520px]">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-medium text-ink-2">Your agent</span>
          <span className="relative h-px flex-1 bg-line-2">
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal" />
          </span>
          <span className="text-[12px] font-medium text-ink-2">Sarah&rsquo;s agent</span>
        </div>
        <div className="mt-4 rounded-xl border border-line bg-bg-2/50 p-4">
          <p className="text-[14px] font-medium leading-snug text-ink-display">
            &ldquo;Pricing was locked at $49 in the Q2 planning call — Sarah already owns the rework.&rdquo;
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SourceChip>Sourced · Q2 Planning · Apr 3</SourceChip>
            <SourceChip>Speaker · Sarah</SourceChip>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

/* ---------------- 6. capacity — the workload read ----------------------- */

function CapacityVisual() {
  const team = [
    { name: "Sarah", util: 96, cls: "bg-priority-high", txt: "text-priority-high" },
    { name: "Priya", util: 88, cls: "bg-priority-medium", txt: "text-priority-medium" },
    { name: "Aisha", util: 74, cls: "bg-signal", txt: "text-ink-3" },
    { name: "Diego", util: 45, cls: "bg-signal", txt: "text-ink-3" },
  ];
  return (
    <MockWindow title="Team capacity · this sprint" meta="live read" className="w-full max-w-[520px]">
      <div className="p-5">
        <div className="space-y-3">
          {team.map((t) => (
            <div key={t.name} className="grid grid-cols-[64px_1fr_40px] items-center gap-3">
              <span className="truncate text-[12.5px] text-ink-2">{t.name}</span>
              <span className="relative h-[14px] overflow-hidden rounded-full bg-bg-2">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full ${t.cls}`}
                  style={{ width: `${t.util}%` }}
                />
              </span>
              <span className={`text-right font-mono text-[11px] tabular-nums ${t.txt}`}>
                {t.util}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-priority-high/25 bg-priority-high-soft px-3.5 py-2.5">
          <span aria-hidden className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-priority-high" />
          <p className="text-[12px] font-medium leading-snug text-priority-high">
            Sarah is at 96% — over capacity this sprint.
          </p>
        </div>
      </div>
    </MockWindow>
  );
}

/* ---------------- 7. captions — the live caption strip ------------------ */

function CaptionsVisual() {
  const lines = [
    { who: "Marcus", text: "Can we still hit the April launch if pricing slips?", dim: true },
    { who: "Sarah", text: "Okay — lock the price at $49, and I'll own the rework.", dim: false },
  ];
  return (
    <MockWindow title="Live captions" meta="< 2s" className="w-full max-w-[520px]">
      <div className="space-y-3 p-5">
        {lines.map((l) => (
          <div key={l.text} className="flex gap-3">
            <Avatar initials={l.who.slice(0, 2).toUpperCase()} className="h-6 w-6 shrink-0" ring={!l.dim} />
            <div className="min-w-0">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-signal-deep">
                {l.who}
              </p>
              <p className={`mt-0.5 text-[13.5px] leading-snug ${l.dim ? "text-ink-3" : "text-ink"}`}>
                {l.text}
                {!l.dim && (
                  <span aria-hidden className="ml-1 inline-block h-[0.95em] w-[2px] translate-y-[2px] rounded-full bg-signal align-middle" />
                )}
              </p>
            </div>
          </div>
        ))}
        <p className="border-t border-line pt-3 font-mono text-[10px] uppercase tracking-wider text-ink-3">
          Click a line to jump to that moment
        </p>
      </div>
    </MockWindow>
  );
}

/* ---------------- 8. search — the cited answer -------------------------- */

function SearchVisual() {
  return (
    <MockWindow title="Search" meta="semantic + cited" className="w-full max-w-[520px]">
      <div className="p-5">
        <div className="flex items-center gap-2.5 rounded-full border border-line bg-bg-2/60 px-4 py-2.5">
          <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-ink-3" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="4.4" stroke="currentColor" strokeWidth="1.4" />
            <path d="m10.4 10.4 3.1 3.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="text-[13.5px] text-ink">what did we agree on pricing?</span>
        </div>
        <div className="mt-4 rounded-xl border border-line bg-bg-2/50 p-4">
          <p className="text-[14px] font-medium leading-snug text-ink-display">
            Pricing was locked at $49 for Q3, with Sarah owning the rework.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SourceChip>Q2 Planning · Apr 3</SourceChip>
            <SourceChip>Speaker · Sarah</SourceChip>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

/* ---------------- 9. graph — connected org memory ----------------------- */

function GraphVisual() {
  return (
    <MockWindow title="Knowledge graph" meta="your org" className="w-full max-w-[520px]">
      <div className="p-5">
        <svg viewBox="0 0 440 220" className="h-auto w-full" role="img" aria-label="A graph connecting a person, two meetings, a decision, an action, and a topic">
          {/* edges */}
          <g stroke="var(--line-2)" strokeWidth="1.4">
            <line x1="110" y1="60" x2="220" y2="110" />
            <line x1="110" y1="170" x2="220" y2="110" />
            <line x1="220" y1="110" x2="330" y2="55" />
            <line x1="220" y1="110" x2="335" y2="165" />
            <line x1="330" y1="55" x2="335" y2="165" strokeDasharray="4 4" />
          </g>
          {/* nodes */}
          <g fontFamily="var(--font-mono)" fontSize="10" textAnchor="middle">
            <circle cx="110" cy="60" r="26" fill="var(--signal-soft)" stroke="var(--signal)" strokeWidth="1.4" />
            <text x="110" y="64" fill="var(--signal-deep)">Sarah</text>
            <circle cx="110" cy="170" r="26" fill="var(--bg-2)" stroke="var(--line-2)" strokeWidth="1.4" />
            <text x="110" y="174" fill="var(--ink-3)">Q2 call</text>
            <circle cx="220" cy="110" r="30" fill="var(--signal)" />
            <text x="220" y="114" fill="#fff">$49</text>
            <circle cx="330" cy="55" r="26" fill="var(--bg-2)" stroke="var(--line-2)" strokeWidth="1.4" />
            <text x="330" y="59" fill="var(--ink-3)">Rework</text>
            <circle cx="335" cy="165" r="26" fill="var(--bg-2)" stroke="var(--line-2)" strokeWidth="1.4" />
            <text x="335" y="169" fill="var(--ink-3)">Pricing</text>
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
      <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-signal" aria-hidden />
    </div>
  );
}

function IntegrationsVisual() {
  return (
    <MockWindow title="Integrations" meta="connected" className="w-full max-w-[520px]">
      <div className="grid gap-2.5 p-5 sm:grid-cols-2">
        <IntegrationTile name="Google Calendar" sub="meetings & scheduling" />
        <IntegrationTile name="Slack" sub="decision & task routing" />
        <IntegrationTile name="Linear" sub="action items → issues" />
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-line-2 p-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-ink-3">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
              <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </span>
          <p className="text-[12px] leading-snug text-ink-3">
            Jira available — one tracker per workspace
          </p>
        </div>
      </div>
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
