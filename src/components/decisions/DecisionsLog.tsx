"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowsClockwise,
  CalendarBlank,
  CaretRight,
  CheckCircle,
  ClockCounterClockwise,
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
import type { DecisionView as Decision } from "@/lib/api/decisions";

/* The decision log: every decision confirmed in a meeting you were in, newest first, grouped by
   month (`GET /api/v1/decisions`). Only confirmed decisions exist in the record (dismissed
   detections never reach it); one a later decision replaced is marked Superseded and links to
   its replacement. Search, filters and the detail panel are client-side presentation. */

type StatusFilter = "all" | Decision["status"];

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

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "In force" },
  { key: "superseded", label: "Replaced" },
];

function StatusChip({ status }: { status: Decision["status"] }) {
  return status === "superseded" ? (
    <Badge tone="medium" className="gap-1.5">
      <ClockCounterClockwise size={14} weight="bold" aria-hidden />
      Superseded
    </Badge>
  ) : (
    <Badge tone="success" className="gap-1.5">
      <CheckCircle size={14} weight="fill" aria-hidden />
      Confirmed
    </Badge>
  );
}

/* One FOLLOWS_FROM hop, in either direction: what this decision replaced, or what replaced it.
   The linked decision's text is shown when it is in this log too. */
function LineageHop({
  label,
  target,
  byId,
}: {
  label: string;
  target: string;
  byId: Map<string, Decision>;
}) {
  const other = byId.get(target);
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-pill border border-line bg-bg px-3 py-1.5 text-[12px]">
      <ArrowsClockwise size={12} className="shrink-0 text-ink-3" aria-hidden />
      <span className="shrink-0 font-semibold text-ink-3">{label}</span>
      {other ? <span className="truncate font-medium text-ink-2">{other.content}</span> : null}
    </span>
  );
}

function DecisionCard({
  decision,
  byId,
  selected,
  onOpen,
}: {
  decision: Decision;
  byId: Map<string, Decision>;
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
        <StatusChip status={decision.status} />
        <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
          <CalendarBlank size={14} aria-hidden />
          {shortFmt.format(new Date(decision.recordedAt))}
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
          {decision.content}
        </button>
      </h3>
      {decision.rationale ? (
        <p className="mt-1.5 max-w-[64ch] text-[14px] leading-relaxed text-ink-2">{decision.rationale}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <Link
          href={`/meetings/${decision.meetingId}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex max-w-full items-center gap-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-signal-deep active:text-signal-deep"
        >
          <VideoCamera size={14} className="shrink-0" aria-hidden />
          <span className="truncate">{decision.meetingTitle}</span>
        </Link>
        {decision.supersedes ? <LineageHop label="Replaces" target={decision.supersedes} byId={byId} /> : null}
        {decision.supersededBy ? (
          <LineageHop label="Replaced by" target={decision.supersededBy} byId={byId} />
        ) : null}
      </div>
    </Card>
  );
}

function DetailBody({ decision, byId }: { decision: Decision; byId: Map<string, Decision> }) {
  const hops = [
    decision.supersedes ? { label: "Replaces", id: decision.supersedes } : null,
    decision.supersededBy ? { label: "Replaced by", id: decision.supersededBy } : null,
  ].filter((h): h is { label: string; id: string } => h !== null);
  return (
    <div className="flex flex-col gap-7">
      <h2 className="display text-[26px] leading-tight text-ink-display">{decision.content}</h2>

      <dl className="grid grid-cols-1 gap-x-5 gap-y-5 min-[420px]:grid-cols-2">
        <div>
          <dt className="kicker uppercase">Recorded</dt>
          <dd className="mt-2 text-[14px] font-medium text-ink">{longFmt.format(new Date(decision.recordedAt))} UTC</dd>
        </div>
        <div>
          <dt className="kicker uppercase">Status</dt>
          <dd className="mt-2">
            <StatusChip status={decision.status} />
          </dd>
        </div>
      </dl>

      {decision.rationale ? (
        <section aria-labelledby="decision-summary-heading">
          <h3 id="decision-summary-heading" className="kicker uppercase">
            Why
          </h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{decision.rationale}</p>
        </section>
      ) : null}

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
        {hops.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-3">
            {hops.map((hop) => {
              const other = byId.get(hop.id);
              return (
                <li key={hop.id} className="text-[14px]">
                  <span className="block text-[12.5px] font-semibold text-ink-3">{hop.label}</span>
                  <span className="text-ink-2">
                    {other ? other.content : "A decision from a meeting you were not in"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-[14px] text-ink-3">
            Nothing came before this decision and nothing has replaced it.
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
  const [status, setStatus] = useState<StatusFilter>("all");
  const [meeting, setMeeting] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const sorted = useMemo(
    () => [...decisions].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()),
    [decisions],
  );
  const byId = useMemo(() => new Map(decisions.map((d) => [d.id, d])), [decisions]);
  const meetings = useMemo(() => {
    const seen = new Map<string, string>();
    sorted.forEach((d) => seen.set(d.meetingId, d.meetingTitle));
    return Array.from(seen, ([id, title]) => ({ id, title }));
  }, [sorted]);

  const q = query.trim().toLowerCase();
  const matches = useCallback(
    (d: Decision, skipStatus = false) => {
      if (!skipStatus && status !== "all" && d.status !== status) return false;
      if (meeting !== "all" && d.meetingId !== meeting) return false;
      if (q) {
        const hay = `${d.content} ${d.rationale ?? ""} ${d.meetingTitle}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    },
    [status, meeting, q],
  );

  const visible = useMemo(() => sorted.filter((d) => matches(d)), [sorted, matches]);
  const anyFilter = q !== "" || status !== "all" || meeting !== "all";
  const selected = sorted.find((d) => d.id === selectedId) ?? null;

  const months = useMemo(() => {
    const out: { key: string; label: string; items: Decision[] }[] = [];
    visible.forEach((d) => {
      const date = new Date(d.recordedAt);
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(d);
      else out.push({ key, label: monthFmt.format(date), items: [d] });
    });
    return out;
  }, [visible]);

  const clear = () => {
    setQuery("");
    setStatus("all");
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
        Every decision here was confirmed by a person in a meeting you were in. When a later decision replaces one,
        both stay on the record and link to each other.
      </p>

      {sorted.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No decisions yet"
          description="Decisions confirmed in your meetings build your history here."
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
                aria-label="Status"
                className="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-full bg-bg-2 p-1 max-sm:grid max-sm:w-full max-sm:grid-cols-3"
              >
                {STATUS_FILTERS.map(({ key, label }) => {
                  const count = sorted.filter((d) => matches(d, true) && (key === "all" || d.status === key)).length;
                  const on = status === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setStatus(key)}
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
                        byId={byId}
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
          selected ? <StatusChip status={selected.status} /> : null
        }
      >
        {selected ? <DetailBody decision={selected} byId={byId} /> : null}
      </SidePanel>
    </div>
  );
}
