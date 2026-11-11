"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowsClockwise,
  CaretRight,
  CheckCircle,
  ClockCounterClockwise,
  MagnifyingGlass,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import { Chip } from "@/components/ui/Chip";
import { cardClass } from "@/components/ui/Card";
import { fieldClass } from "@/components/ui/Form";
import { Button, LinkButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page, PageHead } from "@/components/ui/Page";
import { SidePanel } from "@/components/tasks/SidePanel";
import { DecisionsMoreLinks } from "@/components/time-machine/DecisionsMoreLinks";
import type { DecisionView as Decision } from "@/lib/api/decisions";

/* The decision log: every decision confirmed in a meeting you were in, newest first, grouped by
   month (`GET /api/v1/decisions`). Only confirmed decisions exist in the record (dismissed
   detections never reach it); one a later decision replaced is marked Replaced and links to
   its replacement. Search, filters and the detail panel are client-side presentation.

   In the detail panel the lineage is drawn as the memory line: one straight coral thread with a
   bead per decision, from what this one replaced to what replaced it. */

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
    <Chip icon={<ClockCounterClockwise size={14} weight="bold" />}>Replaced</Chip>
  ) : (
    <Chip tone="ok" icon={<CheckCircle size={14} weight="fill" />}>
      In force
    </Chip>
  );
}

/* One FOLLOWS_FROM hop on a card, in either direction: what this decision replaced, or what
   replaced it. The linked decision's text is shown when it is in this log too. */
function LineageHop({ label, target, byId }: { label: string; target: string; byId: Map<string, Decision> }) {
  const other = byId.get(target);
  return (
    <Chip icon={<ArrowsClockwise size={13} className="text-ink-3" />} className="min-w-0">
      <span className="shrink-0">{label}</span>
      {other ? <span className="truncate font-normal text-ink-3">{other.content}</span> : null}
    </Chip>
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
  const replaced = decision.status === "superseded";
  const hasHops = !!decision.supersedes || !!decision.supersededBy;
  return (
    <article
      onClick={() => onOpen(decision.id)}
      className={cardClass({
        className: `flex cursor-pointer flex-col gap-3 transition-[border-color,box-shadow] duration-150 ${
          selected ? "!border-signal shadow-[0_0_0_4px_var(--signal-soft)]" : "hover:border-line-2"
        }`,
      })}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] text-ink-3">
        <StatusChip status={decision.status} />
        <Link
          href={`/meetings/${decision.meetingId}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-ctl font-medium text-ink-2 underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          <VideoCamera size={14} className="shrink-0" aria-hidden />
          <span className="truncate">{decision.meetingTitle}</span>
        </Link>
        <time dateTime={decision.recordedAt} className="ml-auto whitespace-nowrap">
          {shortFmt.format(new Date(decision.recordedAt))}
        </time>
      </div>

      <h3 className="text-[17px] leading-snug">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(decision.id);
          }}
          aria-haspopup="dialog"
          className={`rounded-ctl text-left font-semibold transition-colors hover:text-signal-ink ${replaced ? "text-ink-3" : "text-ink"}`}
        >
          {decision.content}
        </button>
      </h3>
      {decision.rationale ? (
        <p className="line-clamp-3 max-w-[64ch] text-[14px] leading-relaxed text-ink-2">{decision.rationale}</p>
      ) : null}

      {hasHops ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {decision.supersedes ? <LineageHop label="Replaces" target={decision.supersedes} byId={byId} /> : null}
          {decision.supersededBy ? <LineageHop label="Replaced by" target={decision.supersededBy} byId={byId} /> : null}
        </div>
      ) : null}
    </article>
  );
}

/* The lineage as the memory line: older at the top, this decision in the middle (filled bead),
   newer below. Linked decisions in this log open in the panel. */
function Lineage({
  decision,
  byId,
  onOpen,
}: {
  decision: Decision;
  byId: Map<string, Decision>;
  onOpen: (id: string) => void;
}) {
  const steps: { key: string; label: string; text: string; id?: string; self?: boolean }[] = [];
  if (decision.supersedes) {
    const o = byId.get(decision.supersedes);
    steps.push({
      key: "before",
      label: "It replaced",
      text: o ? o.content : "A decision from a meeting you were not in",
      id: o?.id,
    });
  }
  steps.push({ key: "self", label: "This decision", text: decision.content, self: true });
  if (decision.supersededBy) {
    const o = byId.get(decision.supersededBy);
    steps.push({
      key: "after",
      label: "Replaced by",
      text: o ? o.content : "A decision from a meeting you were not in",
      id: o?.id,
    });
  }

  if (steps.length === 1) {
    return <p className="mt-2 text-[14px] text-ink-3">Nothing came before this decision and nothing has replaced it.</p>;
  }

  return (
    <ol className="mt-3">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const body = (
          <>
            <span className="block text-[12.5px] font-semibold text-ink-3">{s.label}</span>
            <span className={`block text-[14px] leading-snug ${s.self ? "font-semibold text-ink" : "text-ink-2"}`}>
              {s.text}
            </span>
          </>
        );
        return (
          <li key={s.key} className="relative grid grid-cols-[20px_minmax(0,1fr)] gap-x-3">
            {!last ? (
              <span aria-hidden className="absolute -bottom-[19px] left-[9px] top-[19px] w-0.5 rounded-full bg-signal-line" />
            ) : null}
            <span aria-hidden className="relative z-[1] flex justify-center pt-[13px]">
              <span
                className={`h-[13px] w-[13px] rounded-full border-2 ${
                  s.self
                    ? "border-signal-line bg-signal-line shadow-[0_0_0_4px_var(--signal-soft)]"
                    : "border-signal-line bg-surface"
                }`}
              />
            </span>
            {s.id ? (
              <button
                type="button"
                onClick={() => onOpen(s.id as string)}
                className="-mx-2 my-0.5 rounded-ctl px-2 py-2 text-left transition-colors hover:bg-surface-2"
              >
                {body}
              </button>
            ) : (
              <div className="my-0.5 py-2">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function DetailBody({
  decision,
  byId,
  onOpen,
}: {
  decision: Decision;
  byId: Map<string, Decision>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-7">
      <h2 className="display text-[22px] leading-tight text-ink-display">{decision.content}</h2>

      <dl className="grid grid-cols-1 gap-x-5 gap-y-5 min-[420px]:grid-cols-2">
        <div>
          <dt className="kicker">Recorded</dt>
          <dd className="mt-1.5 text-[14px] font-medium text-ink">{longFmt.format(new Date(decision.recordedAt))} UTC</dd>
        </div>
        <div>
          <dt className="kicker">Status</dt>
          <dd className="mt-1.5">
            <StatusChip status={decision.status} />
          </dd>
        </div>
      </dl>

      {decision.rationale ? (
        <section aria-labelledby="decision-summary-heading">
          <h3 id="decision-summary-heading" className="kicker">
            Why
          </h3>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{decision.rationale}</p>
        </section>
      ) : null}

      <section aria-labelledby="decision-source-heading">
        <h3 id="decision-source-heading" className="kicker">
          Where it was decided
        </h3>
        <Link
          href={`/meetings/${decision.meetingId}`}
          className="group mt-2 flex items-center gap-3 rounded-ctl border border-line p-3 transition-colors hover:border-line-2 hover:bg-surface-2 active:bg-bg-2"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-ctl bg-signal-soft text-signal-ink">
            <VideoCamera size={18} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-ink">{decision.meetingTitle}</span>
            <span className="block text-[12.5px] text-ink-3">Open the meeting</span>
          </span>
          <CaretRight size={16} className="shrink-0 text-ink-3 group-hover:text-ink" aria-hidden />
        </Link>
      </section>

      <section aria-labelledby="decision-lineage-heading">
        <h3 id="decision-lineage-heading" className="kicker">
          Lineage
        </h3>
        <Lineage decision={decision} byId={byId} onOpen={onOpen} />
      </section>

      <div className="flex flex-wrap gap-2.5">
        <LinkButton href={`/meetings/${decision.meetingId}/decisions/${decision.id}`} variant="primary">
          Open full lineage
        </LinkButton>
        <LinkButton href={`/meetings/${decision.meetingId}`} variant="outline">
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
  const inForce = sorted.filter((d) => d.status !== "superseded").length;

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
    <Page className={panelOpen ? "min-[1560px]:pr-[460px]" : ""}>
      <PageHead
        title="Decisions"
        context="What your meetings decided. Every entry was confirmed by a person; when one is replaced, both stay on the record."
        action={
          <>
            {sorted.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2" aria-label="Summary">
                <Chip tone="ok" icon={<CheckCircle size={14} weight="fill" />}>
                  {inForce} in force
                </Chip>
                {sorted.length - inForce > 0 ? (
                  <Chip icon={<ClockCounterClockwise size={14} weight="bold" />}>{sorted.length - inForce} replaced</Chip>
                ) : null}
              </div>
            ) : null}
            <DecisionsMoreLinks />
          </>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          art="decisions"
          title="No decisions yet"
          description="When someone confirms a decision in one of your meetings, it goes on the record here with the meeting it came from."
          action={<LinkButton href="/meetings">Open meetings</LinkButton>}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
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
                  className={`${fieldClass} pl-10`}
                />
              </div>
              <div
                role="group"
                aria-label="Status"
                className="inline-flex h-11 shrink-0 items-center gap-0.5 rounded-ctl bg-bg-2 p-1 max-sm:grid max-sm:w-full max-sm:grid-cols-3"
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
                      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-ctl px-3.5 text-[14px] font-semibold transition-colors duration-150 ${
                        on ? "bg-surface text-ink" : "text-ink-3 hover:text-ink active:bg-bg-3"
                      }`}
                    >
                      {label}
                      <span className="min-w-[18px] text-center text-[12.5px] tabular-nums text-ink-3">{count}</span>
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
              {anyFilter ? (
                <Button variant="ghost" size="sm" onClick={clear}>
                  <X size={14} aria-hidden />
                  Clear filters
                </Button>
              ) : null}
              <p className="text-[14px] text-ink-3 max-sm:w-full sm:ml-auto" aria-live="polite">
                {visible.length === sorted.length
                  ? `${sorted.length} ${sorted.length === 1 ? "decision" : "decisions"}`
                  : `${visible.length} of ${sorted.length} decisions`}
              </p>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              art="search"
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
                  <div className="sticky top-0 z-10 -mx-1 flex items-baseline gap-3 bg-bg px-1 pb-2.5 pt-5">
                    <h2 id={`month-${m.key}`} className="display text-[22px] text-ink-display">
                      {m.label}
                    </h2>
                    <span className="text-[14px] text-ink-3">
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
        header={selected ? <StatusChip status={selected.status} /> : null}
      >
        {selected ? <DetailBody decision={selected} byId={byId} onOpen={openDecision} /> : null}
      </SidePanel>
    </Page>
  );
}
