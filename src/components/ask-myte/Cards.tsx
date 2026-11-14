"use client";

import Link from "next/link";
import { ArrowBendDownRight, CalendarBlank, CheckSquare, Gauge, Handshake, Scales, VideoCamera } from "@phosphor-icons/react";
import { sourceHref, sourceMeta, sourceTitle } from "@/lib/ask-myte/citations";
import type { CardEvent, Source } from "@/lib/ask-myte/types";

/* Rich cards instead of walls of text (ADR-0047 D4 `show_card`): a meeting, a decision with its
   lineage, a task list, the promise ledger, capacity. rag-service builds each from the sources it
   cites: `data.items` are those source objects and `data.detail` the tool's own structured result
   (read defensively: any field may be missing, and the card still shows what it has). A card's
   numbers open the same sources as the inline chips. */

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const dateFmt = (iso: string | null | undefined, withTime = false): string | null => {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(withTime && iso.length > 10 ? { hour: "numeric", minute: "2-digit" } : {}),
    ...(iso.length === 10 ? { timeZone: "UTC" } : {}),
  }).format(d);
};

function itemsOf(card: CardEvent, sources: Source[]): Source[] {
  const fromData = Array.isArray(card.data?.items) ? card.data.items.filter((s): s is Source => isRec(s) && typeof (s as Source).n === "number") : [];
  if (fromData.length) return fromData;
  const want = new Set(card.source_ns);
  return sources.filter((s) => want.has(s.n));
}

function Shell({ icon, kicker, children, ns, onOpen }: { icon: React.ReactNode; kicker: string; children: React.ReactNode; ns: number[]; onOpen: (n: number) => void }) {
  return (
    <section className="rounded-card border border-line bg-surface p-4 shadow-warm-1 sm:p-5" aria-label={kicker}>
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-3">
        <span aria-hidden className="text-signal">
          {icon}
        </span>
        <span className="flex-1">{kicker}</span>
        {ns.length ? (
          <span className="flex gap-1">
            {ns.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onOpen(n)}
                aria-label={`Open source ${n}`}
                className="grid h-6 min-w-6 place-items-center rounded-full bg-surface-2 px-1.5 text-[12.5px] font-semibold text-ink-3 hover:bg-signal-soft hover:text-signal-ink"
              >
                {n}
              </button>
            ))}
          </span>
        ) : null}
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function MeetingCard({ items, detail, ns, onOpen }: { items: Source[]; detail: Rec | null; ns: number[]; onOpen: (n: number) => void }) {
  const first = items[0];
  const title = str(detail?.title) ?? (first ? sourceTitle(first) : "Meeting");
  const start = str(detail?.start) ?? str(detail?.scheduled_start) ?? first?.occurred_at ?? null;
  const href = first ? sourceHref(first) : null;
  const attendees = num(detail?.attendee_count);
  return (
    <Shell icon={<VideoCamera size={16} weight="fill" />} kicker="Meeting" ns={ns} onOpen={onOpen}>
      <p className="display text-[19px] leading-snug text-ink">{title}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink-3">
        {start ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarBlank size={15} aria-hidden />
            {dateFmt(start, true)}
          </span>
        ) : null}
        {attendees !== null ? <span>{attendees === 1 ? "1 person" : `${attendees} people`}</span> : null}
      </p>
      {href ? (
        <Link href={href} className="mt-3 inline-flex min-h-9 items-center text-[14px] font-semibold text-signal-ink underline-offset-4 hover:underline">
          Open meeting
        </Link>
      ) : null}
    </Shell>
  );
}

function lineageOf(detail: Rec | null): { content: string; at: string | null; role: string | null }[] {
  const raw = (detail?.lineage ?? detail?.chain ?? detail?.ancestors) as unknown;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isRec)
    .map((r) => ({ content: str(r.content) ?? str(r.title) ?? "", at: str(r.recorded_at) ?? str(r.confirmed_at) ?? str(r.at) ?? null, role: str(r.role) }))
    .filter((r) => r.content && r.role !== "subject");
}

function DecisionCard({ items, detail, ns, onOpen }: { items: Source[]; detail: Rec | null; ns: number[]; onOpen: (n: number) => void }) {
  const first = items[0];
  const content = str(detail?.content) ?? first?.text ?? (first ? sourceTitle(first) : "");
  const superseded = (str(detail?.status) ?? first?.status) === "superseded";
  const lineage = lineageOf(detail);
  const meta = first ? sourceMeta(first) : "";
  const href = first ? sourceHref(first) : null;
  return (
    <Shell icon={<Scales size={16} weight="fill" />} kicker={superseded ? "Superseded decision" : "Confirmed decision"} ns={ns} onOpen={onOpen}>
      <p className="display text-[19px] leading-snug text-ink">{content}</p>
      {meta ? <p className="mt-1 text-[14px] text-ink-3">{meta}</p> : null}
      {lineage.length ? (
        <ol className="mt-3 space-y-1.5" aria-label="Its lineage">
          {lineage.map((l, i) => (
            <li key={i} className="flex gap-2 text-[14px] text-ink-3">
              <ArrowBendDownRight size={15} aria-hidden className="mt-0.5 shrink-0 text-ink-4" />
              <span>
                {l.role === "descendant" ? "Later: " : "Replaces "}
                <span className="text-ink-2">&ldquo;{l.content}&rdquo;</span>
                {l.at ? ` from ${dateFmt(l.at)}` : ""}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      {href ? (
        <Link href={href} className="mt-3 inline-flex min-h-9 items-center text-[14px] font-semibold text-signal-ink underline-offset-4 hover:underline">
          Open decision
        </Link>
      ) : null}
    </Shell>
  );
}

function ListCard({ kind, items, ns, onOpen }: { kind: "tasks" | "promises"; items: Source[]; ns: number[]; onOpen: (n: number) => void }) {
  const tasks = kind === "tasks";
  return (
    <Shell icon={tasks ? <CheckSquare size={16} weight="fill" /> : <Handshake size={16} weight="fill" />} kicker={tasks ? "Your tasks" : "Your promises"} ns={ns} onOpen={onOpen}>
      {items.length === 0 ? (
        <p className="text-[14px] text-ink-3">{tasks ? "No open tasks." : "No open promises."}</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((s) => {
            const due = dateFmt(s.due_date ?? null);
            return (
              <li key={s.n} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <button type="button" onClick={() => onOpen(s.n)} className="min-w-0 text-left text-[15px] text-ink hover:text-signal-ink">
                  {sourceTitle(s)}
                </button>
                {due ? <span className="shrink-0 text-[13px] tabular-nums text-ink-3">Due {due}</span> : null}
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href={tasks ? "/work/tasks" : "/work/promises"}
        className="mt-3 inline-flex min-h-9 items-center text-[14px] font-semibold text-signal-ink underline-offset-4 hover:underline"
      >
        {tasks ? "Open My work" : "Open promise ledger"}
      </Link>
    </Shell>
  );
}

function CapacityCard({ items, detail, ns, onOpen }: { items: Source[]; detail: Rec | null; ns: number[]; onOpen: (n: number) => void }) {
  const summary = str(detail?.summary) ?? str(detail?.verdict_text) ?? items[0]?.text ?? null;
  const days = Array.isArray(detail?.days)
    ? (detail!.days as unknown[]).filter(isRec).map((d) => ({ label: str(d.label) ?? str(d.date) ?? "", load: num(d.load) ?? num(d.hours) ?? num(d.count) ?? 0, over: d.over === true }))
    : [];
  const max = Math.max(1, ...days.map((d) => d.load));
  return (
    <Shell icon={<Gauge size={16} weight="fill" />} kicker="Your capacity" ns={ns} onOpen={onOpen}>
      {summary ? <p className="text-[15px] leading-snug text-ink-2">{summary}</p> : null}
      {days.length ? (
        <ul className="mt-3 grid grid-cols-7 items-end gap-1.5" aria-label="Load by day">
          {days.slice(0, 7).map((d, i) => (
            <li key={i} className="flex flex-col items-center gap-1">
              <span className="flex h-14 w-full items-end overflow-hidden rounded-ctl bg-bg-2" aria-hidden>
                <span className={`w-full rounded-ctl ${d.over ? "bg-priority-medium" : "bg-signal"}`} style={{ height: `${Math.max(6, (d.load / max) * 100)}%` }} />
              </span>
              <span className="text-[12.5px] text-ink-3">{d.label.slice(0, 3)}</span>
              <span className="sr-only">{`${d.label}: ${d.load}${d.over ? ", over capacity" : ""}`}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Shell>
  );
}

export function AnswerCard({ card, sources, onOpen }: { card: CardEvent; sources: Source[]; onOpen: (n: number) => void }) {
  const items = itemsOf(card, sources);
  const detail = isRec(card.data?.detail) ? (card.data!.detail as Rec) : null;
  const ns = card.source_ns.filter((n) => sources.some((s) => s.n === n));
  switch (card.kind) {
    case "meeting":
      return <MeetingCard items={items} detail={detail} ns={ns} onOpen={onOpen} />;
    case "decision":
      return <DecisionCard items={items} detail={detail} ns={ns} onOpen={onOpen} />;
    case "tasks":
    case "promises":
      return <ListCard kind={card.kind} items={items} ns={ns} onOpen={onOpen} />;
    case "capacity":
      return <CapacityCard items={items} detail={detail} ns={ns} onOpen={onOpen} />;
    default:
      return null;
  }
}
