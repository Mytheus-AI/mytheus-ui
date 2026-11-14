"use client";

import Link from "next/link";
import { ArrowBendDownRight, CalendarBlank, CheckSquare, Gauge, Handshake, Scales, VideoCamera } from "@phosphor-icons/react";
import { sourceHref, sourceMeta, sourceTitle } from "@/lib/ask-myte/citations";
import type { CardEvent, Source } from "@/lib/ask-myte/types";
import { capacityView, decisionView, meetingView, minutesWords, relationWords, type Load } from "@/lib/ask-myte/cards";

/* Rich cards instead of walls of text (ADR-0047 D4 `show_card`): a meeting, a decision with its
   lineage, a task list, the promise ledger, capacity. rag-service builds each from the sources it
   cites: `data.items` are those source objects and `data.detail` the tool's own structured result
   (read defensively: any field may be missing, and the card still shows what it has). A card's
   numbers open the same sources as the inline chips. */

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);

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

function MeetingCard({ items, detail, ns, onOpen }: { items: Source[]; detail: unknown; ns: number[]; onOpen: (n: number) => void }) {
  const v = meetingView(detail, items);
  const href = v.id ? `/meetings/${v.id}` : items[0] ? sourceHref(items[0]) : null;
  const facts = [
    v.hosting ? "You host" : v.host ? `Hosted by ${v.host}` : null,
    v.attendees !== null ? (v.attendees === 1 ? "1 person" : `${v.attendees} people`) : null,
    v.attendance === "agent" ? "Your Myte attends for you" : null,
  ].filter(Boolean);
  return (
    <Shell icon={<VideoCamera size={16} weight="fill" />} kicker={v.live ? "Meeting, live now" : "Meeting"} ns={ns} onOpen={onOpen}>
      <p className="display text-[19px] leading-snug text-ink">{v.title}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink-3">
        {v.start ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarBlank size={15} aria-hidden />
            {dateFmt(v.start, true)}
          </span>
        ) : null}
        {facts.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </p>
      {v.decisions.length || v.actions.length || v.agenda.length ? (
        <dl className="mt-3 space-y-2.5 text-[14px]">
          {v.decisions.length ? (
            <div>
              <dt className="font-semibold text-ink-3">Decided</dt>
              <dd>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-ink-2 marker:text-ink-4">
                  {v.decisions.slice(0, 3).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          {v.actions.length ? (
            <div>
              <dt className="font-semibold text-ink-3">Tasks</dt>
              <dd>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-ink-2 marker:text-ink-4">
                  {v.actions.slice(0, 3).map((x) => (
                    <li key={x.content}>
                      {x.content}
                      {x.owner || x.due ? <span className="text-ink-3">{`, ${[x.owner, x.due ? `due ${dateFmt(x.due)}` : null].filter(Boolean).join(", ")}`}</span> : null}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          {!v.decisions.length && !v.actions.length && v.agenda.length ? (
            <div>
              <dt className="font-semibold text-ink-3">Agenda</dt>
              <dd className="mt-0.5 text-ink-2">{v.agenda.slice(0, 4).map((x) => x.title).join(", ")}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {href ? (
        <Link href={href} className="mt-3 inline-flex min-h-9 items-center text-[14px] font-semibold text-signal-ink underline-offset-4 hover:underline">
          Open meeting
        </Link>
      ) : null}
    </Shell>
  );
}

function DecisionCard({ items, detail, ns, onOpen }: { items: Source[]; detail: unknown; ns: number[]; onOpen: (n: number) => void }) {
  const v = decisionView(detail, items);
  const superseded = v.status === "superseded";
  const meta = items[0] ? sourceMeta(items[0]) : v.meetingTitle ?? "";
  const href = items[0] ? sourceHref(items[0]) : null;
  return (
    <Shell icon={<Scales size={16} weight="fill" />} kicker={superseded ? "Superseded decision" : "Confirmed decision"} ns={ns} onOpen={onOpen}>
      <p className="display text-[19px] leading-snug text-ink">{v.content}</p>
      {meta ? <p className="mt-1 text-[14px] text-ink-3">{meta}</p> : null}
      {v.rationale ? (
        <p className="mt-2 text-[14.5px] leading-snug text-ink-2">
          <span className="font-semibold text-ink">Why: </span>
          {v.rationale}
        </p>
      ) : null}
      {v.lineage.length ? (
        <ol className="mt-3 space-y-1.5" aria-label="Its lineage">
          {v.lineage.map((l, i) => (
            <li key={i} className="flex gap-2 text-[14px] text-ink-3">
              <ArrowBendDownRight size={15} aria-hidden className="mt-0.5 shrink-0 text-ink-4" />
              <span>
                {relationWords(l.relation)}{" "}
                {l.content === null ? (
                  <span>a decision from a meeting you were not in</span>
                ) : (
                  <span className="text-ink-2">&ldquo;{l.content}&rdquo;</span>
                )}
                {l.status === "superseded" ? ", since superseded" : ""}
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

const LOAD_BAR: Record<Load, string> = {
  light: "bg-ok",
  ok: "bg-signal",
  busy: "bg-priority-medium",
  full: "bg-priority-high",
  away: "bg-ink-4",
  unknown: "bg-signal",
};
const LOAD_WORDS: Record<Load, string> = { light: "light", ok: "fine", busy: "busy", full: "full", away: "away", unknown: "" };

function CapacityCard({ items, detail, ns, onOpen }: { items: Source[]; detail: unknown; ns: number[]; onOpen: (n: number) => void }) {
  const v = capacityView(detail, items);
  return (
    <Shell icon={<Gauge size={16} weight="fill" />} kicker="Your capacity" ns={ns} onOpen={onOpen}>
      {v.shape === "day" ? (
        <>
          {v.message ? <p className="text-[15px] leading-snug text-ink-2">{v.message}</p> : null}
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[14px] text-ink-3">
            {v.dueLabel ? <span>{v.dueLabel}</span> : null}
            {v.itemsOnDay !== null ? <span>{v.itemsOnDay === 1 ? "1 thing due" : `${v.itemsOnDay} things due`}</span> : null}
            {minutesWords(v.meetingMinutes) ? <span>{minutesWords(v.meetingMinutes)} of meetings</span> : null}
          </p>
          {v.suggestedLabel ? (
            <p className="mt-2 text-[14.5px] text-ink">
              <span className="font-semibold">A better day:</span> {v.suggestedLabel}
            </p>
          ) : null}
        </>
      ) : v.shape === "week" ? (
        <>
          {v.days.length ? (
            <ul className="grid grid-cols-7 items-end gap-1.5" aria-label="Your week">
              {v.days.slice(0, 7).map((d, i) => {
                const max = Math.max(1, ...v.days.map((x) => x.items));
                return (
                  <li key={i} className="flex flex-col items-center gap-1">
                    <span className="flex h-14 w-full items-end overflow-hidden rounded-ctl bg-bg-2" aria-hidden>
                      <span className={`w-full rounded-ctl ${LOAD_BAR[d.load]}`} style={{ height: `${d.load === "away" ? 100 : Math.max(8, (d.items / max) * 100)}%`, opacity: d.load === "away" ? 0.35 : 1 }} />
                    </span>
                    <span className="text-[12.5px] text-ink-3">{d.label.slice(0, 3)}</span>
                    <span className="sr-only">{`${d.label}: ${d.load === "away" ? "away" : `${d.items} item${d.items === 1 ? "" : "s"}`}${LOAD_WORDS[d.load] && d.load !== "away" ? `, ${LOAD_WORDS[d.load]}` : ""}`}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <p className="mt-2 flex flex-wrap gap-x-3 text-[13.5px] text-ink-3">
            {v.overdue ? <span>{v.overdue === 1 ? "1 thing overdue" : `${v.overdue} things overdue`}</span> : null}
            {v.calendarSynced === false ? <span>Your calendar isn&apos;t connected, so meetings aren&apos;t counted.</span> : null}
          </p>
        </>
      ) : v.text ? (
        <p className="text-[15px] leading-snug text-ink-2">{v.text}</p>
      ) : null}
    </Shell>
  );
}

export function AnswerCard({ card, sources, onOpen }: { card: CardEvent; sources: Source[]; onOpen: (n: number) => void }) {
  const items = itemsOf(card, sources);
  const detail = card.data?.detail ?? null;
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
