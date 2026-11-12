"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowsClockwise,
  ArrowsCounterClockwise,
  Bell,
  ChatCircleText,
  ChatTeardropDots,
  Binoculars,
  Check,
  CheckSquare,
  Checks,
  Gavel,
  Hourglass,
  Moon,
  Newspaper,
  Robot,
  Scales,
  ShieldWarning,
  UsersThree,
  Warning,
  X,
} from "@phosphor-icons/react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Page, PageHead } from "@/components/ui/Page";
import { ErrorState } from "@/components/ui/ErrorState";
import { textLinkClass } from "@/components/ui/TextLink";
import { LocalWhen } from "@/components/status/LocalWhen";
import { ReversalActions, taskOf } from "@/components/reversals/ReversalActions";
import { ReopenAnswer, ReopenOutcomeLine } from "@/components/decisions/ReopenRequests";
import { StatusAnswerRow } from "@/components/status/StatusAnswerRow";
import { AgreementAsk } from "@/components/room-signals/AgreementAsk";
import { LastWordActions } from "@/components/room-signals/LastWordActions";
import { parseSignalEvent } from "@/lib/room-signals";
import { InboxInterruption } from "@/components/listening/InboxInterruption";
import { interruptionIdOf } from "@/lib/listening";
import { useStatusAnswers } from "@/components/status/useStatusAnswers";
import { dismissAlert, markAlertRead } from "@/app/actions/notifications";
import { confirmCandidate, dismissCandidate } from "@/app/actions/candidates";
import { warnAfterAccept } from "@/components/promises/ledger/accept-warning";
import { graceful, undoLast } from "@/lib/toast";
import { onPrefsChange, shortcutsOn } from "@/lib/prefs";
import {
  INBOX_COUNT_EVENT,
  filterInbox,
  inboxCounts,
  stepIndex,
  type InboxFilter,
  type InboxItem,
} from "@/lib/inbox";
import type { InboxArm } from "@/lib/inbox-server";
import type { StatusRequestView } from "@/lib/api/personal-types";
import type { FeedItem } from "@/components/notifications/alert-copy";

/* The Inbox: notifications, the updates you owe and your Mytes' detections waiting for review,
   in one list ordered by what needs you first (lib/inbox.ts). Filter chips narrow it by kind.

   Every row has one primary verb, shown as its button and run by `e`: Mark read for a
   notification, Confirm for a detection, and Answer (which moves into the answer field) for an
   update you owe. Mark read, Dismiss and Confirm show their result at once and send the write
   after a short grace period, so Undo (the toast's button, or `z`) simply never sends it.

   Keyboard: the list is one tab stop; inside it Up/Down (and j/k) move between rows, Enter opens
   the row's link, `e` runs the primary verb and `z` undoes the last action. The single-key
   shortcuts only act while focus is in the list and can be turned off in Settings > Appearance
   (WCAG 2.1.4). The sidebar's Inbox number follows as you triage. */

const FILTERS: { key: InboxFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "review", label: "Needs review" },
  { key: "updates", label: "Updates I owe" },
  { key: "notifications", label: "Notifications" },
];

const ARM_LABEL: Record<InboxArm, string> = {
  notifications: "notifications",
  updates: "the updates you owe",
  review: "your Mytes' detections",
};

const PRIORITY_TILE: Record<1 | 2 | 3, string> = {
  1: "bg-priority-high-soft text-priority-high",
  2: "bg-priority-medium-soft text-priority-medium",
  3: "bg-priority-low-soft text-priority-low",
};

const NOTE_ICON = {
  topic_watch: Binoculars,
  already_decided: Gavel,
  alert: Warning,
  reminder: Bell,
  decision_changed: ArrowsClockwise,
  promise_drift: Hourglass,
  weekly_digest: Newspaper,
  decision_challenged: ShieldWarning,
  reopen_requested: ArrowsCounterClockwise,
  reopen_resolved: ArrowsCounterClockwise,
  last_word: ChatCircleText,
  agreement_check: UsersThree,
  late_contribution: ChatTeardropDots,
  interruption: Robot,
  evening_digest: Moon,
} as const;
const NOTE_LABEL = {
  topic_watch: "Topic you watch",
  already_decided: "Already decided",
  alert: "Myte alert",
  reminder: "Reminder",
  decision_changed: "Decision changed",
  promise_drift: "Promise past due",
  weekly_digest: "Weekly digest",
  decision_challenged: "Decision challenged",
  reopen_requested: "Reopen request",
  reopen_resolved: "Reopen request answered",
  last_word: "Your last word",
  agreement_check: "Private question",
  late_contribution: "Late contribution",
  interruption: "Your Myte, from a live meeting",
  evening_digest: "Evening digest",
} as const;

function asFilter(v: string | null): InboxFilter {
  return v === "review" || v === "updates" || v === "notifications" ? v : "all";
}

type Result = { ok: true } | { ok: false; message: string; gone?: boolean };
const plain = (r: { ok: true } | { ok: false; message: string; gone?: boolean }): Result =>
  r.ok ? { ok: true } : { ok: false, message: r.message, gone: r.gone };

export function InboxView({ initial, failed, nowIso }: { initial: InboxItem[]; failed: InboxArm[]; nowIso: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [filter, setFilterState] = useState<InboxFilter>(asFilter(params.get("filter")));
  const [items, setItems] = useState(initial);
  const [active, setActive] = useState(0);
  const [keys, setKeys] = useState(true);
  const list = useRef<HTMLUListElement>(null);

  const pendingUpdates = useMemo(
    () => initial.filter((i): i is Extract<InboxItem, { kind: "update" }> => i.kind === "update").map((i) => i.update),
    [initial],
  );
  const answers = useStatusAnswers(pendingUpdates);
  const openUpdateIds = useMemo(() => new Set(answers.open.map((u) => u.id)), [answers.open]);

  // An update you answered is no longer waiting on you.
  const live = useMemo(
    () => items.map((i) => (i.kind === "update" && i.open && !openUpdateIds.has(i.id) ? { ...i, open: false } : i)),
    [items, openUpdateIds],
  );
  const counts = useMemo(() => inboxCounts(live), [live]);
  const visible = useMemo(() => filterInbox(live, filter), [live, filter]);
  const waiting = visible.filter((i) => i.open);
  const earlier = visible.filter((i) => !i.open);
  const rows = useMemo(() => [...waiting, ...earlier], [waiting, earlier]);

  useEffect(() => {
    setKeys(shortcutsOn());
    return onPrefsChange(() => setKeys(shortcutsOn()));
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(INBOX_COUNT_EVENT, { detail: counts.all }));
  }, [counts.all]);

  useEffect(() => {
    setActive((a) => Math.min(Math.max(a, 0), Math.max(rows.length - 1, 0)));
  }, [rows.length]);

  // A refresh (a live interruption arrived, say) brings rows this list has not seen: add them
  // without undoing anything the person is in the middle of.
  useEffect(() => {
    setItems((list) => {
      const known = new Set(list.map((i) => i.key));
      const fresh = initial.filter((i) => !known.has(i.key));
      return fresh.length ? [...fresh, ...list] : list;
    });
  }, [initial]);

  // `?interruption={id}` (the link on a live interruption's notification and push): that row is
  // the active one, in view and focused, once.
  const target = params.get("interruption");
  const targeted = useRef(false);
  useEffect(() => {
    if (!target || targeted.current) return;
    const i = rows.findIndex((r) => r.kind === "notification" && interruptionIdOf(r.notification.sourceEventId) === target.toLowerCase());
    if (i < 0) return;
    targeted.current = true;
    setActive(i);
    requestAnimationFrame(() => {
      const el = list.current?.querySelector<HTMLElement>(`[data-index="${i}"]`);
      el?.scrollIntoView({ block: "center", behavior: "auto" });
      el?.focus({ preventScroll: true });
    });
  }, [target, rows]);

  const setFilter = (f: InboxFilter) => {
    setFilterState(f);
    setActive(0);
    const qs = new URLSearchParams(params.toString());
    if (f === "all") qs.delete("filter");
    else qs.set("filter", f);
    router.replace(`/inbox${qs.toString() ? `?${qs}` : ""}`, { scroll: false });
  };

  const patch = useCallback((key: string, change: (i: InboxItem) => InboxItem | null) => {
    setItems((list) => {
      const out: InboxItem[] = [];
      for (const i of list) {
        if (i.key !== key) out.push(i);
        else {
          const next = change(i);
          if (next) out.push(next);
        }
      }
      return out;
    });
  }, []);

  const restore = useCallback((item: InboxItem) => {
    setItems((list) => (list.some((i) => i.key === item.key) ? list.map((i) => (i.key === item.key ? item : i)) : [...list, item]));
  }, []);

  /* ---------------- the verbs ---------------- */

  const markRead = (item: Extract<InboxItem, { kind: "notification" }>) => {
    if (!item.open) return;
    graceful({
      message: "Marked read",
      apply: () => patch(item.key, (i) => (i.kind === "notification" ? { ...i, open: false, notification: { ...i.notification, unread: false } } : i)),
      revert: () => restore(item),
      commit: async () => plain(await markAlertRead(item.id)),
    });
  };

  const dismissNote = (item: Extract<InboxItem, { kind: "notification" }>) =>
    graceful({
      message: "Notification dismissed",
      apply: () => patch(item.key, () => null),
      revert: () => restore(item),
      commit: async () => plain(await dismissAlert(item.id)),
    });

  const settleReview = (item: Extract<InboxItem, { kind: "review" }>, verb: "confirm" | "dismiss") => {
    const decision = item.review.kind === "decision";
    graceful({
      message: verb === "confirm" ? (decision ? "Decision confirmed" : "Task confirmed") : decision ? "Decision dismissed" : "Task dismissed",
      apply: () => patch(item.key, () => null),
      revert: () => restore(item),
      commit: async () => {
        const res = await (verb === "confirm" ? confirmCandidate : dismissCandidate)(item.review.kind, item.id);
        if (res.ok) router.refresh();
        // Promise ledger: a task you just took on, checked against your week.
        if (res.ok && verb === "confirm" && item.review.kind === "action") void warnAfterAccept(item.id, (href) => router.push(href));
        return res.ok ? { ok: true } : { ok: false, message: res.message, gone: res.gone };
      },
    });
  };

  const focusAnswer = (key: string) => {
    const row = list.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
    (row?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]') ?? row?.querySelector<HTMLElement>('[role="radio"], input'))?.focus();
  };

  const primary = (item: InboxItem) => {
    if (item.kind === "notification") markRead(item);
    else if (item.kind === "review") settleReview(item, "confirm");
    else if (item.open) focusAnswer(item.key);
  };

  /* ---------------- keyboard ---------------- */

  const focusRow = (i: number) => {
    setActive(i);
    list.current?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.focus();
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    // Shortcuts act only while a row itself has focus: never while typing an answer or moving
    // through a row's own controls (the quick pick uses the arrows itself).
    if (!(e.target as HTMLElement).hasAttribute("data-index")) return;
    const onRow = true;
    const k = e.key;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === "ArrowDown" || (keys && k === "j")) {
      e.preventDefault();
      focusRow(stepIndex(active, 1, rows.length));
    } else if (k === "ArrowUp" || (keys && k === "k")) {
      e.preventDefault();
      focusRow(stepIndex(active, -1, rows.length));
    } else if (k === "Home" && onRow) {
      e.preventDefault();
      focusRow(0);
    } else if (k === "End" && onRow) {
      e.preventDefault();
      focusRow(rows.length - 1);
    } else if (keys && k === "e" && rows[active]) {
      e.preventDefault();
      primary(rows[active]);
      // The row leaves or moves to Earlier; keep focus on whatever now sits in its place.
      if (rows[active].kind !== "update")
        requestAnimationFrame(() => list.current?.querySelector<HTMLElement>('[data-index][tabindex="0"]')?.focus());
    } else if (keys && k === "z") {
      e.preventDefault();
      undoLast();
    } else if (k === "Enter" && onRow) {
      const href = rowHref(rows[active]);
      if (href) {
        e.preventDefault();
        if (rows[active]?.kind === "notification") markRead(rows[active] as Extract<InboxItem, { kind: "notification" }>);
        router.push(href);
      }
    }
  };

  const unreadNotes = live.filter((i) => i.kind === "notification" && i.open) as Extract<InboxItem, { kind: "notification" }>[];
  const markAllRead = () => {
    const before = unreadNotes;
    graceful({
      message: before.length === 1 ? "Marked read" : `${before.length} marked read`,
      apply: () =>
        setItems((list) =>
          list.map((i) => (i.kind === "notification" && i.open ? { ...i, open: false, notification: { ...i.notification, unread: false } } : i)),
        ),
      revert: () => before.forEach(restore),
      commit: async () => {
        const results = await Promise.all(before.map((n) => markAlertRead(n.id)));
        const bad = results.find((r) => !r.ok && !r.gone);
        return bad && !bad.ok ? { ok: false, message: bad.message } : { ok: true };
      },
    });
  };

  const context =
    counts.all === 0
      ? "You are all caught up. New alerts, updates you owe and detections to review land here."
      : `${counts.all} waiting on you. Alerts from your Myte, updates you owe and what your Mytes detected.`;

  let index = -1;
  const renderRow = (item: InboxItem) => {
    index += 1;
    const i = index;
    return (
      <li
        key={item.key}
        data-key={item.key}
        data-index={i}
        tabIndex={i === active ? 0 : -1}
        aria-current={i === active ? "true" : undefined}
        onFocus={(e) => {
          if (e.target === e.currentTarget) setActive(i);
        }}
        onClick={() => setActive(i)}
        className={`relative outline-offset-[-2px] transition-colors duration-100 ${i === active ? "bg-surface-2" : ""}`}
      >
        {item.kind === "notification" ? (
          <NotificationRow item={item} nowIso={nowIso} onRead={() => markRead(item)} onDismiss={() => dismissNote(item)} />
        ) : item.kind === "review" ? (
          <ReviewRow item={item} onConfirm={() => settleReview(item, "confirm")} onDismiss={() => settleReview(item, "dismiss")} />
        ) : item.open ? (
          <UpdateRow
            req={answers.open.find((u) => u.id === item.id) ?? item.update}
            nowIso={nowIso}
            answers={answers}
          />
        ) : (
          <AnsweredLine req={answers.done.find((u) => u.id === item.id) ?? item.update} />
        )}
      </li>
    );
  };

  return (
    <Page>
      <PageHead
        title="Inbox"
        liveContext
        context={context}
        action={
          <>
            <LinkButton href="/digest" variant="ghost">
              <Newspaper size={16} aria-hidden />
              Weekly digest
            </LinkButton>
            {unreadNotes.length > 0 ? (
              <Button variant="outline" onClick={markAllRead}>
                <Checks size={16} aria-hidden />
                Mark all read
              </Button>
            ) : null}
          </>
        }
      />

      <div role="group" aria-label="Show" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const on = filter === f.key;
          const n = counts[f.key];
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(f.key)}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[14px] font-semibold transition-colors duration-150 ${
                on ? "border-pill bg-pill text-pill-on" : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {f.label}
              {n > 0 ? (
                <span className={`tabular-nums ${on ? "opacity-80" : "text-ink-3"}`}>
                  {n}
                  <span className="sr-only"> waiting</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {failed.length > 0 ? (
        <Card flush className="mb-5">
          <ErrorState
            variant="inline"
            className="!pt-[18px]"
            title={failed.length === 3 ? "Your inbox did not load" : "Part of your inbox did not load"}
            text={`We could not read ${failed.map((a) => ARM_LABEL[a]).join(" or ")}. Everything else is here, and nothing was lost.`}
          />
        </Card>
      ) : null}

      {rows.length === 0 ? (
        failed.length === 3 ? null : (
          <EmptyState
            art="inbox"
            title={filter === "all" ? "Nothing waiting on you" : `No ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} right now`}
            description={
              filter === "review"
                ? "Decisions and tasks your Mytes detect in your meetings wait here until someone confirms or dismisses them."
                : filter === "updates"
                  ? "An hour before a follow-up meeting, your Myte asks here how your actions from the last one are going."
                  : "Alerts from your Myte, updates you owe and detections to review all land here."
            }
          />
        )
      ) : (
        <Card flush>
          <ul ref={list} aria-label="Inbox" aria-describedby="inbox-keys" onKeyDown={onListKey} className="divide-y divide-line">
            {waiting.length > 0 ? <GroupHead label="Waiting on you" n={waiting.length} /> : null}
            {waiting.map(renderRow)}
            {earlier.length > 0 ? <GroupHead label="Earlier" n={earlier.length} /> : null}
            {earlier.map(renderRow)}
          </ul>
        </Card>
      )}

      <p id="inbox-keys" className="mt-3 text-[12.5px] text-ink-3">
        {keys
          ? "In the list: j and k (or the arrows) move, e does the row's main action, z undoes, Enter opens. Turn single-key shortcuts off in Settings, Appearance."
          : "In the list: the arrows move and Enter opens. Single-key shortcuts are off (Settings, Appearance)."}
      </p>
    </Page>
  );
}

function rowHref(item: InboxItem | undefined): string | null {
  if (!item) return null;
  if (item.kind === "notification") return item.notification.href;
  if (item.kind === "review") return `/meetings/${item.review.meeting_id}`;
  return null;
}

function GroupHead({ label, n }: { label: string; n: number }) {
  return (
    <li className="flex items-center gap-2.5 bg-surface-2 px-4 py-2.5 sm:px-[22px]">
      <span className="text-[14px] font-semibold text-ink">{label}</span>
      <Chip className="tabular-nums">{n}</Chip>
    </li>
  );
}

/* ---------------- rows ---------------- */

function NotificationRow({
  item,
  nowIso,
  onRead,
  onDismiss,
}: {
  item: Extract<InboxItem, { kind: "notification" }>;
  nowIso: string;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const n = item.notification;
  const Icon = NOTE_ICON[n.kind];
  return (
    <div className="flex gap-3.5 px-4 py-4 sm:gap-4 sm:px-[22px]">
      <span aria-hidden className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-ctl ${PRIORITY_TILE[n.priority]}`}>
        <Icon size={19} weight={n.priority === 1 ? "fill" : "regular"} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-3">
          {NOTE_LABEL[n.kind]}
          {n.unread ? <Chip tone="accent">New</Chip> : null}
        </p>
        <h3 className={`mt-0.5 text-[15px] leading-snug text-ink ${n.unread ? "font-semibold" : "font-medium"}`}>{n.title}</h3>
        {n.quote ? (
          <blockquote className="mt-2 max-w-[75ch] rounded-ctl bg-bg-2 px-3.5 py-2.5 font-display text-[15px]  leading-snug text-ink-2">
            {n.quote}
          </blockquote>
        ) : null}
        {n.body ? <p className="mt-1.5 max-w-[75ch] text-[14px] leading-relaxed text-ink-3">{n.body}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-4">
          <span className="text-[12.5px] text-ink-3">
            <LocalWhen iso={n.createdAt} nowIso={nowIso} mode="past" />
          </span>
          {n.href ? (
            <Link href={n.href} onClick={() => (n.unread ? onRead() : undefined)} className={textLinkClass}>
              {n.linkLabel}
              <ArrowRight size={12} weight="bold" aria-hidden />
            </Link>
          ) : null}
        </div>
        {n.kind === "last_word" ? <LastWordRow n={n} notificationId={item.id} /> : null}
        {n.kind === "agreement_check" ? <AgreementRow n={n} notificationId={item.id} /> : null}
        {n.kind === "interruption" ? <InboxInterruption interruption={n.interruption ?? null} /> : null}
        {n.kind === "decision_changed" && n.sourceEventId ? (
          <ReversalActions
            reversalId={n.reversal?.id ?? n.sourceEventId.slice("decision-reversal:".length)}
            status={n.reversal?.status ?? "pending"}
            task={taskOf(n.reversal)}
            notificationId={item.id}
            label={n.reversal?.action.content}
          />
        ) : null}
        {n.kind === "reopen_requested" && n.reopen && n.reopen.viewer_role === "owner" ? (
          <ReopenAnswer request={n.reopen} notificationId={item.id} />
        ) : null}
        {n.kind === "reopen_resolved" && n.reopen && n.reopen.status !== "pending" ? <ReopenOutcomeLine request={n.reopen} /> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
        {n.unread ? (
          <Button variant="ghost" size="sm" onClick={onRead} aria-label={`Mark read: ${n.title}`}>
            <Checks size={15} aria-hidden />
            <span className="hidden md:inline">Mark read</span>
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" icon onClick={onDismiss} aria-label={`Dismiss: ${n.title}`}>
          <X size={15} weight="bold" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function ReviewRow({
  item,
  onConfirm,
  onDismiss,
}: {
  item: Extract<InboxItem, { kind: "review" }>;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const r = item.review;
  const decision = r.kind === "decision";
  const Icon = decision ? Scales : CheckSquare;
  return (
    <div className="px-4 py-4 sm:px-[22px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-ink-3">
        <Chip tone={decision ? "medium" : "low"} icon={<Icon size={14} weight="fill" />}>
          {decision ? "Proposed decision" : "Proposed task"}
        </Chip>
        <Link href={`/meetings/${r.meeting_id}`} className="min-w-0 truncate rounded-ctl underline-offset-4 hover:text-ink hover:underline">
          {r.meeting_title ?? "Untitled meeting"}
        </Link>
      </div>
      <h3 className="mt-2.5 max-w-[75ch] text-[15px] font-semibold leading-snug text-ink">{r.content}</h3>
      <p className="mt-1 text-[14px] text-ink-3">Detected by your Mytes. Nothing is final until someone confirms.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onConfirm}>
          <Check size={15} weight="bold" aria-hidden />
          {decision ? "Confirm decision" : "Confirm task"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          <X size={15} aria-hidden />
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function UpdateRow({
  req,
  nowIso,
  answers,
}: {
  req: StatusRequestView;
  nowIso: string;
  answers: ReturnType<typeof useStatusAnswers>;
}) {
  return (
    <div className="px-0 py-0">
      <p className="px-4 pt-4 sm:px-[22px]">
        <Chip tone="medium">Update you owe</Chip>
      </p>
      <StatusAnswerRow
        as="div"
        className="px-4 pb-4 pt-2.5 sm:px-[22px]"
        req={req}
        wide
        nowIso={nowIso}
        draft={answers.draftOf(req.id)}
        error={answers.errors[req.id]}
        saving={!!answers.saving[req.id]}
        onDraft={(next) => answers.setDraft(req.id, next)}
        onSubmit={() => void answers.submit(req)}
      />
    </div>
  );
}

function AnsweredLine({ req }: { req: StatusRequestView }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-4 sm:px-[22px]">
      <Chip tone="ok" icon={<Check size={13} weight="bold" />}>
        Update sent
      </Chip>
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{req.actionTitle}</span>
      {req.status_text ? <span className="w-full text-[14px] text-ink-3 sm:w-auto">{req.status_text}</span> : null}
    </div>
  );
}

/* The room-signals rows (a3): settled in place, like a decision reversal. */

function LastWordRow({ n, notificationId }: { n: FeedItem; notificationId: string }) {
  const e = parseSignalEvent(n.sourceEventId);
  const meetingId = n.lastWord?.meeting_id ?? n.meetingId ?? null;
  if (e?.kind !== "lastword" || !meetingId) return null;
  return <LastWordActions nudge={n.lastWord ?? null} nudgeId={e.nudgeId} meetingId={meetingId} notificationId={notificationId} />;
}

function AgreementRow({ n, notificationId }: { n: FeedItem; notificationId: string }) {
  const e = parseSignalEvent(n.sourceEventId);
  if (e?.kind !== "agreement") return null;
  return (
    <>
      {n.agreementCheck ? (
        <p className="mt-2 max-w-[75ch] rounded-ctl bg-bg-2 px-3.5 py-2.5 font-display text-[15px]  leading-snug text-ink-2">
          <span className="sr-only">The decision: </span>
          {n.agreementCheck.decision_content}
          <span className="mt-1 block font-sans text-[12.5px] not-italic text-ink-3">From {n.agreementCheck.meeting_title}</span>
        </p>
      ) : null}
      <AgreementAsk
        check={n.agreementCheck ?? null}
        checkId={e.checkId}
        notificationId={notificationId}
        decisionLabel={n.agreementCheck?.decision_content}
      />
    </>
  );
}
