"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarBlank,
  CaretRight,
  CheckCircle,
  Flag,
  MagnifyingGlass,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { SidePanel } from "@/components/tasks/SidePanel";
import type { Decision, Priority } from "@/lib/mock/data";

/* The decision log: everything the org has confirmed, newest first, grouped by month. Only
   confirmed decisions exist in the record (dismissed detections never reach it), so every entry
   carries a Confirmed chip. Search, filters and the detail panel are client-side presentation. */

type PriorityFilter = "all" | Priority;

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const longFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

const PRIORITY_FILTERS: { key: PriorityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

function ConfirmedChip() {
  return (
    <Badge tone="success" className="gap-1.5">
      <CheckCircle size={14} weight="fill" aria-hidden />
      Confirmed
    </Badge>
  );
}

function PriorityChip({ priority }: { priority: Priority }) {
  return (
    <Badge tone={priority} className="gap-1.5">
      <Flag size={12} weight="fill" aria-hidden />
      <span className="capitalize">{priority}</span>
      <span className="sr-only"> priority</span>
    </Badge>
  );
}

/* The FOLLOWS_FROM chain, oldest to newest. */
function LineageTrail({ lineage }: { lineage: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-pill border border-line bg-bg px-3 py-1.5 text-[12px]">
      <span className="font-semibold text-ink-3">Follows from</span>
      {lineage.map((m, i) => (
        <span key={`${m}-${i}`} className="inline-flex items-center gap-1.5 font-medium text-ink-2">
          {i > 0 && <CaretRight size={11} weight="bold" className="text-ink-3" aria-hidden />}
          {m}
        </span>
      ))}
    </div>
  );
}

function DecisionCard({
  decision,
  selected,
  onOpen,
}: {
  decision: Decision;
  selected: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <Card
      onClick={() => onOpen(decision.id)}
      className={`cursor-pointer p-4 transition-[border-color,box-shadow] duration-150 hover:border-line-2 hover:shadow-[0_12px_32px_-24px_rgba(40,30,20,0.4)] sm:p-5 ${
        selected ? "border-signal hover:border-signal" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ConfirmedChip />
        <PriorityChip priority={decision.priority} />
        <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
          <CalendarBlank size={14} aria-hidden />
          {shortFmt.format(new Date(decision.confirmedAt))}
        </span>
      </div>

      <h3 className="mt-3 text-[17px] leading-snug">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(decision.id);
          }}
          aria-haspopup="dialog"
          className="rounded-md text-left font-semibold text-ink transition-colors hover:text-signal-deep active:text-signal-deep"
        >
          {decision.title}
        </button>
      </h3>
      <p className="mt-1.5 max-w-[64ch] text-[14px] leading-relaxed text-ink-2">{decision.summary}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <Link
          href={`/meetings/${decision.meetingId}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex max-w-full items-center gap-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-signal-deep active:text-signal-deep"
        >
          <VideoCamera size={14} className="shrink-0" aria-hidden />
          <span className="truncate">{decision.meetingTitle}</span>
        </Link>
        {decision.lineage && decision.lineage.length > 0 && <LineageTrail lineage={decision.lineage} />}
      </div>
    </Card>
  );
}

function DetailBody({ decision }: { decision: Decision }) {
  const lineage = decision.lineage ?? [];
  return (
    <div className="flex flex-col gap-7">
      <h2 className="display text-[26px] leading-tight text-ink-display">{decision.title}</h2>

      <dl className="grid grid-cols-1 gap-x-5 gap-y-5 min-[420px]:grid-cols-2">
        <div>
          <dt className="kicker uppercase">Confirmed</dt>
          <dd className="mt-2 text-[14px] font-medium text-ink">{longFmt.format(new Date(decision.confirmedAt))} UTC</dd>
        </div>
        <div>
          <dt className="kicker uppercase">Priority</dt>
          <dd className="mt-2">
            <PriorityChip priority={decision.priority} />
          </dd>
        </div>
      </dl>

      <section aria-labelledby="decision-summary-heading">
        <h3 id="decision-summary-heading" className="kicker uppercase">
          Summary
        </h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{decision.summary}</p>
      </section>

      <section aria-labelledby="decision-source-heading">
        <h3 id="decision-source-heading" className="kicker uppercase">
          Source
        </h3>
        <Link
          href={`/meetings/${decision.meetingId}`}
          className="group mt-2 flex items-center gap-3 rounded-pill border border-line p-3 transition-colors hover:border-line-2 hover:bg-bg active:bg-bg-2"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-signal-soft text-signal-deep">
            <VideoCamera size={18} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-ink">{decision.meetingTitle}</span>
            <span className="block text-[12.5px] text-ink-3">Where this was decided</span>
          </span>
          <CaretRight size={16} className="shrink-0 text-ink-3 group-hover:text-ink" aria-hidden />
        </Link>
      </section>

      <section aria-labelledby="decision-lineage-heading">
        <h3 id="decision-lineage-heading" className="kicker uppercase">
          Lineage
        </h3>
        {lineage.length > 0 ? (
          <ol className="mt-3 flex flex-col gap-3">
            {lineage.map((m, i) => {
              const current = i === lineage.length - 1;
              return (
                <li key={`${m}-${i}`} className="flex items-center gap-3 text-[14px]">
                  <span
                    aria-hidden
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11.5px] font-semibold ${
                      current ? "bg-signal text-white" : "bg-bg-2 text-ink-2"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className={`min-w-0 flex-1 ${current ? "font-semibold text-ink" : "text-ink-2"}`}>{m}</span>
                  {current && <Badge>This decision</Badge>}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-2 text-[14px] text-ink-3">
            No earlier meetings feed into this decision. It started here.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2.5">
        <LinkButton href={`/meetings/${decision.meetingId}/decisions/${decision.id}`} variant="primary" className="self-start">
          Full lineage
        </LinkButton>
        <LinkButton href={`/meetings/${decision.meetingId}`} variant="outline" className="self-start">
          Open meeting
        </LinkButton>
      </div>
    </div>
  );
}

export function DecisionsLog({ decisions }: { decisions: Decision[] }) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [meeting, setMeeting] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const sorted = useMemo(
    () => [...decisions].sort((a, b) => new Date(b.confirmedAt).getTime() - new Date(a.confirmedAt).getTime()),
    [decisions],
  );
  const meetings = useMemo(() => {
    const seen = new Map<string, string>();
    sorted.forEach((d) => seen.set(d.meetingId, d.meetingTitle));
    return Array.from(seen, ([id, title]) => ({ id, title }));
  }, [sorted]);

  const q = query.trim().toLowerCase();
  const matches = useCallback(
    (d: Decision, skipPriority = false) => {
      if (!skipPriority && priority !== "all" && d.priority !== priority) return false;
      if (meeting !== "all" && d.meetingId !== meeting) return false;
      if (q) {
        const hay = `${d.title} ${d.summary} ${d.meetingTitle} ${(d.lineage ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    },
    [priority, meeting, q],
  );

  const visible = useMemo(() => sorted.filter((d) => matches(d)), [sorted, matches]);
  const anyFilter = q !== "" || priority !== "all" || meeting !== "all";
  const selected = sorted.find((d) => d.id === selectedId) ?? null;

  const months = useMemo(() => {
    const out: { key: string; label: string; items: Decision[] }[] = [];
    visible.forEach((d) => {
      const date = new Date(d.confirmedAt);
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(d);
      else out.push({ key, label: monthFmt.format(date), items: [d] });
    });
    return out;
  }, [visible]);

  const clear = () => {
    setQuery("");
    setPriority("all");
    setMeeting("all");
  };
  const openDecision = useCallback((id: string) => {
    setSelectedId(id);
    setPanelOpen(true);
  }, []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return (
    <div
      className={`mx-auto max-w-[1240px] motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both] ${
        panelOpen ? "min-[1560px]:pr-[460px]" : ""
      }`}
    >
      <h1 className="display text-[clamp(1.8rem,4vw,2.4rem)]">Decisions</h1>
      <p className="mt-2 max-w-[60ch] text-[14px] text-ink-3">
        Every decision here was confirmed by a person in the room. The lineage trail shows what a decision followed
        from, meeting by meeting.
      </p>

      {sorted.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No decisions yet"
          description="Decisions confirmed in meetings will build the org's history here."
          action={<LinkButton href="/meetings">View meetings</LinkButton>}
        />
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 flex-1 basis-64">
                <MagnifyingGlass
                  size={17}
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search decisions and meetings"
                  aria-label="Search decisions"
                  autoComplete="off"
                  className="h-10 w-full rounded-pill border border-line bg-surface pl-10 pr-3 text-[14px] text-ink placeholder:text-ink-3 transition-colors hover:border-line-2 focus-visible:border-signal"
                />
              </div>
              <div
                role="group"
                aria-label="Priority"
                className="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-full bg-bg-2 p-1 max-sm:grid max-sm:w-full max-sm:grid-cols-4"
              >
                {PRIORITY_FILTERS.map(({ key, label }) => {
                  const count = sorted.filter((d) => matches(d, true) && (key === "all" || d.priority === key)).length;
                  const on = priority === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setPriority(key)}
                      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150 focus-visible:!rounded-full ${
                        on ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink active:bg-bg-3"
                      }`}
                    >
                      {label}
                      <span className="min-w-[18px] text-center text-[11.5px] tabular-nums text-ink-3">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select
                label="Filter by meeting"
                value={meeting}
                onChange={setMeeting}
                className="min-w-0 flex-1 basis-48 sm:max-w-[300px]"
                options={[
                  { value: "all", label: "All meetings", icon: <VideoCamera size={16} aria-hidden /> },
                  ...meetings.map((m) => ({ value: m.id, label: m.title })),
                ]}
              />
              {anyFilter && (
                <Button variant="ghost" size="sm" onClick={clear}>
                  <X size={14} aria-hidden />
                  Clear filters
                </Button>
              )}
              <p className="text-[13px] text-ink-3 sm:ml-auto max-sm:w-full" aria-live="polite">
                {visible.length === sorted.length
                  ? `${sorted.length} ${sorted.length === 1 ? "decision" : "decisions"}`
                  : `${visible.length} of ${sorted.length} decisions`}
              </p>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              className="mt-6"
              title="No decisions match"
              description="Try a different word, or remove a filter to see the full log."
              action={
                <Button variant="outline" onClick={clear}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="mt-2">
              {months.map((m) => (
                <section key={m.key} aria-labelledby={`month-${m.key}`}>
                  <div className="sticky top-0 z-10 flex items-baseline gap-3 bg-bg py-4">
                    <h2 id={`month-${m.key}`} className="display text-[22px] text-ink-display sm:text-[24px]">
                      {m.label}
                    </h2>
                    <span className="text-[13px] text-ink-3">
                      {m.items.length} {m.items.length === 1 ? "decision" : "decisions"}
                    </span>
                  </div>
                  <div className={`grid grid-cols-1 gap-3.5 pb-2 ${panelOpen ? "" : "xl:grid-cols-2"}`}>
                    {m.items.map((d) => (
                      <DecisionCard
                        key={d.id}
                        decision={d}
                        selected={panelOpen && selectedId === d.id}
                        onOpen={openDecision}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <SidePanel
        open={panelOpen && !!selected}
        onClose={closePanel}
        label="Decision details"
        closeLabel="Close decision details"
        header={
          selected ? (
            <>
              <ConfirmedChip />
            </>
          ) : null
        }
      >
        {selected ? <DetailBody decision={selected} /> : null}
      </SidePanel>
    </div>
  );
}
