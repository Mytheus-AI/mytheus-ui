"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle, EnvelopeSimple, FunnelSimple, LockSimple, Microphone, Plus, SlackLogo, Sparkle, VideoCamera } from "@phosphor-icons/react";
import {
  confirmPromise,
  decideProposal,
  loadCapacity,
  renegotiateDate,
  saveCapturePreferences,
  setPromiseDue,
  setPromiseStatus,
  undoHandOff,
} from "@/app/actions/promises";
import { Button } from "@/components/ui/Button";
import { Card, CardHead, Explainer } from "@/components/ui/Card";
import { Chip, Count } from "@/components/ui/Chip";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import type { MemberOption } from "@/components/ui/MemberPicker";
import { PageColumns, SectionBar } from "@/components/ui/Page";
import { inlineLinkClass } from "@/components/ui/TextLink";
import {
  CHANNELS,
  RECIPIENT_ALL,
  channelCounts,
  dayWord,
  filterLedger,
  groupByDue,
  keptPromises,
  localIsoDate,
  pendingReview,
  recipientOptions,
  shortDay,
  type Capacity,
  type CapacityCheck,
  type CaptureSettings,
  type DateProposal,
  type LedgerPromise,
  type PromiseChannel,
  type PromiseLedgerBody,
  type PromiseStatus,
  type RenegotiateResult,
} from "@/lib/promises/ledger";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/toast";
import { PromiseCheck } from "../PromiseCheck";
import { CapacityWeek } from "./CapacityWeek";
import { AddPromiseDialog, HandOffDialog, RenegotiateDialog, type RenegotiateTarget } from "./LedgerDialogs";
import { LedgerRow, ReviewRow } from "./LedgerRow";

/* My work, Promise ledger (Beyond the meeting, Layer 2). Every promise you made, from every
   channel (meetings, phone recordings, Slack, email, added by hand), in one private list:

   - your week first: a capacity bar of what each day already holds;
   - what people asked of you (a date someone who owes you something wants to move);
   - what your Myte found in your messages, waiting for your yes;
   - then the ledger itself, grouped by when things are due, filtered by where they were said
     and who they were promised to. Each row is kept, renegotiated, handed off or dropped, and
     every one of those answers with a toast that can undo it.

   Optimistic throughout: a row moves at once and comes back with the reason if the server says
   no. The week re-reads after every change, in the viewer's own time zone. */

export type SlackState = "connected" | "not_connected" | "unknown";

export type LedgerFocus = {
  /** a capacity warning's "Offer Monday instead?" link */
  offer?: RenegotiateTarget | null;
  proposal?: string | null;
  promise?: string | null;
  review?: boolean;
};

const KEPT_SHOWN = 6;

function short(text: string, n = 80) {
  return text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text;
}

export function PromiseLedger({
  initial,
  initialCapacity,
  incoming: initialIncoming,
  members,
  slack,
  serverToday,
  focus = {},
}: {
  initial: PromiseLedgerBody;
  initialCapacity: Capacity | null;
  incoming: DateProposal[];
  members: readonly MemberOption[] | null;
  slack: SlackState;
  serverToday: string;
  focus?: LedgerFocus;
}) {
  const [items, setItems] = useState<LedgerPromise[]>(initial.items);
  const [capture, setCapture] = useState<CaptureSettings>(initial.capture);
  const [incoming, setIncoming] = useState<DateProposal[]>(initialIncoming);
  const [capacity, setCapacity] = useState<Capacity | null>(initialCapacity);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [today, setToday] = useState(serverToday);
  const [tz, setTz] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, true>>({});
  const [channels, setChannels] = useState<PromiseChannel[]>([]);
  const [recipient, setRecipient] = useState<string>(RECIPIENT_ALL);
  const [adding, setAdding] = useState(false);
  const [renegotiating, setRenegotiating] = useState<RenegotiateTarget | null>(null);
  const [handingOff, setHandingOff] = useState<LedgerPromise | null>(null);
  const [showAllKept, setShowAllKept] = useState(false);
  const [savingCapture, setSavingCapture] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const tzRef = useRef<string | null>(null);

  /* ---- the viewer's own day and week ---- */

  const refreshCapacity = useCallback(async () => {
    const res = await loadCapacity(tzRef.current);
    if (res.ok) {
      setCapacity(res.capacity);
      setCapacityError(null);
    } else {
      setCapacityError(res.message);
    }
  }, []);

  useEffect(() => {
    let zone: string | null = null;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
      zone = null;
    }
    tzRef.current = zone;
    setTz(zone);
    setToday(localIsoDate(new Date()));
    void refreshCapacity();
  }, [refreshCapacity]);

  /* ---- arriving from a notification ---- */

  useEffect(() => {
    if (focus.offer) {
      const p = focus.offer.kind === "commitment" ? itemsRef.current.find((x) => x.id === focus.offer?.id) : null;
      setRenegotiating(
        p
          ? { ...focus.offer, content: p.content, due: p.due_at, askName: p.recipient_user_id ? p.recipient_name : null }
          : focus.offer,
      );
    }
    const target = focus.promise ? `promise-${focus.promise}` : focus.proposal ? `proposal-${focus.proposal}` : focus.review ? "review-h" : null;
    if (target) {
      window.setTimeout(() => {
        const el = document.getElementById(target);
        el?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }, 60);
    }
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- local edits ---- */

  const patch = (id: string, next: Partial<LedgerPromise> | null) =>
    setItems((list) => (next === null ? list.filter((p) => p.id !== id) : list.map((p) => (p.id === id ? { ...p, ...next } : p))));
  const replace = (row: LedgerPromise) => setItems((list) => (list.some((p) => p.id === row.id) ? list.map((p) => (p.id === row.id ? row : p)) : [row, ...list]));
  const busy = (id: string, on: boolean) =>
    setPending((s) => {
      const copy = { ...s };
      if (on) copy[id] = true;
      else delete copy[id];
      return copy;
    });

  const offerFrom = (p: LedgerPromise, check: CapacityCheck) => () =>
    setRenegotiating({
      kind: "commitment",
      id: p.id,
      content: p.content,
      due: check.due_date,
      askName: p.recipient_user_id ? p.recipient_name : null,
      suggested: check.suggested_date,
    });

  /* ---- kept, drop, reopen (and the review queue's dismiss) ---- */

  const setStatus = useCallback(
    async (id: string, next: PromiseStatus, verb: string, isUndo = false) => {
      const before = itemsRef.current.find((p) => p.id === id);
      if (!before || before.status === next) return;
      const now = new Date().toISOString();
      patch(id, { status: next, done_at: next === "done" ? now : null, updated_at: now });
      busy(id, true);
      const res = await setPromiseStatus(id, next);
      busy(id, false);
      if (!res.ok) {
        patch(id, res.gone ? null : { status: before.status, done_at: before.done_at, updated_at: before.updated_at });
        notifyError(res.message);
        return;
      }
      replace(res.promise);
      void refreshCapacity();
      if (isUndo) return;
      notifySuccess(verb, {
        description: short(before.content),
        undo: () => void setStatus(id, before.status, "", true),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshCapacity],
  );

  /* ---- confirm what the agent found ---- */

  const confirm = async (p: LedgerPromise) => {
    patch(p.id, { review_state: "confirmed" });
    busy(p.id, true);
    const res = await confirmPromise(p.id, null, tzRef.current);
    busy(p.id, false);
    if (!res.ok) {
      patch(p.id, res.gone ? null : { review_state: "pending" });
      notifyError(res.message);
      return;
    }
    replace(res.promise);
    void refreshCapacity();
    const check = res.capacity;
    if (check?.warn && check.suggested_date) {
      notifySuccess("Promise confirmed", {
        description: check.message,
        undo: offerFrom(res.promise, check),
        undoLabel: `Offer ${check.suggested_label}`,
      });
    } else {
      notifySuccess("Promise confirmed", { description: check?.warn ? check.message : short(p.content) });
    }
  };

  /* ---- renegotiate ---- */

  const afterRenegotiate = (result: RenegotiateResult, target: RenegotiateTarget) => {
    setRenegotiating(null);
    if (target.kind === "commitment") {
      if (result.mode === "applied") patch(target.id, { due_at: result.due_at, pending_proposal: null });
      else if (result.proposal)
        patch(target.id, {
          pending_proposal: {
            id: result.proposal.id,
            proposed_due: result.proposal.proposed_due,
            state: "pending",
            requester_name: result.proposal.requester_name,
          },
        });
    }
    void refreshCapacity();
    if (result.mode === "proposed" && result.proposal) {
      const proposal = result.proposal;
      notifySuccess(`Asked ${proposal.requester_name ?? "them"} for ${shortDay(proposal.proposed_due)}`, {
        description: "They accept or decline; the date changes only if they accept.",
        undo: async () => {
          const res = await decideProposal(proposal.id, "withdraw");
          if (!res.ok) {
            notifyError(res.message);
            return;
          }
          if (target.kind === "commitment") patch(target.id, { pending_proposal: null });
          notifyInfo("Request withdrawn");
        },
      });
      return;
    }
    const previous = result.previous_due;
    const canUndo = target.kind === "commitment" || previous !== null;
    notifySuccess(`Date moved to ${result.due_at ? shortDay(result.due_at) : "no date"}`, {
      description: short(target.content),
      undo: canUndo
        ? async () => {
            const res =
              target.kind === "commitment"
                ? await setPromiseDue(target.id, previous)
                : await renegotiateDate({ target: "action", targetId: target.id, proposedDue: previous as string, note: null });
            if (!res.ok) {
              notifyError(res.message);
              return;
            }
            if (target.kind === "commitment") patch(target.id, { due_at: previous });
            void refreshCapacity();
          }
        : undefined,
    });
  };

  /* ---- hand off ---- */

  const afterHandOff = (row: LedgerPromise, name: string | null) => {
    const id = row.id;
    setHandingOff(null);
    replace(row);
    void refreshCapacity();
    notifySuccess(`Handed off to ${name ?? "your colleague"}`, {
      description: "They confirm or dismiss it. You can take it back until they do.",
      undo: async () => {
        busy(id, true);
        const res = await undoHandOff(id);
        busy(id, false);
        if (!res.ok) {
          notifyError(res.message);
          return;
        }
        replace(res.promise);
        void refreshCapacity();
        notifyInfo("Promise taken back");
      },
    });
  };

  /* ---- added by hand ---- */

  const afterAdd = (row: LedgerPromise, check: CapacityCheck | null) => {
    setAdding(false);
    replace(row);
    void refreshCapacity();
    if (check?.warn && check.suggested_date) {
      notifySuccess("Promise added", { description: check.message, undo: offerFrom(row, check), undoLabel: `Offer ${check.suggested_label}` });
    } else {
      notifySuccess("Promise added", {
        description: short(row.content),
        undo: () => void setStatus(row.id, "dismissed", "", true),
      });
    }
  };

  /* ---- asked of you ---- */

  const decide = async (p: DateProposal, verb: "accept" | "decline") => {
    setIncoming((list) => list.filter((x) => x.id !== p.id));
    const res = await decideProposal(p.id, verb);
    if (!res.ok) {
      if (!res.gone) setIncoming((list) => [p, ...list]);
      notifyError(res.message);
      return;
    }
    notifySuccess(verb === "accept" ? `Accepted ${shortDay(p.proposed_due)}` : `Kept ${p.current_due ? shortDay(p.current_due) : "the original date"}`, {
      description: `${p.proposer_name ?? "They"} will be told.`,
    });
  };

  /* ---- where the agent looks ---- */

  const toggleSlack = async () => {
    const next = { slack_enabled: !capture.slack_enabled, email_enabled: capture.email_enabled };
    const before = capture;
    setCapture({ ...capture, ...next });
    setSavingCapture(true);
    const res = await saveCapturePreferences(next);
    setSavingCapture(false);
    if (!res.ok) {
      setCapture(before);
      notifyError(res.message);
      return;
    }
    setCapture(res.capture);
    notifySuccess(res.capture.slack_enabled ? "Your Myte will look in Slack" : "Your Myte stopped looking in Slack");
  };

  /* ---- derived ---- */

  const review = useMemo(() => pendingReview(items), [items]);
  const counts = useMemo(() => channelCounts(items.filter((p) => p.review_state === "confirmed")), [items]);
  const recipients = useMemo(() => recipientOptions(items.filter((p) => p.review_state === "confirmed")), [items]);
  const filtered = useMemo(() => filterLedger(items, { channels, recipient }), [items, channels, recipient]);
  const groups = useMemo(() => groupByDue(filtered, today), [filtered, today]);
  const kept = useMemo(() => keptPromises(items), [items]);
  const openCount = items.filter((p) => p.status === "open" && p.review_state === "confirmed").length;
  const dueThisWeek = capacity ? capacity.days.filter((d) => d.date >= today).reduce((n, d) => n + d.items, 0) : null;
  const filtering = channels.length > 0 || recipient !== RECIPIENT_ALL;
  const nothingAtAll = items.length === 0 && incoming.length === 0;
  const canHandOff = Boolean(members && members.some((m) => !m.isYou));

  const recipientChoices: DropdownOption[] = [
    { value: RECIPIENT_ALL, label: "Everyone" },
    ...recipients.map((r) => ({ value: r.value, label: r.label, description: `${r.count} open` })),
  ];
  const toggleChannel = (c: PromiseChannel) => setChannels((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]));

  /* ---- render ---- */

  const aside = (
    <>
      <Card flush className="grid grid-cols-2 divide-x divide-line">
        <div className="px-5 py-4">
          <p className="display text-[30px] leading-none text-ink">{openCount}</p>
          <p className="mt-1.5 text-[14px] text-ink-3">Open</p>
        </div>
        <div className="px-5 py-4">
          <p className="display text-[30px] leading-none text-ink">
            {kept.filter((p) => Date.parse(p.done_at ?? p.updated_at) > Date.now() - 7 * 86_400_000).length}
          </p>
          <p className="mt-1.5 text-[14px] text-ink-3">Kept in the last 7 days</p>
        </div>
      </Card>

      <Card as="section" flush aria-labelledby="sources-h">
        <CardHead id="sources-h" title="Where your Myte looks" />
        <ul className="divide-y divide-line border-t border-line text-[14px]">
          <li className="flex items-start gap-3 px-4 py-3 sm:px-[22px]">
            <VideoCamera size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Meetings</p>
              <p className="text-ink-3">What you say you will do in meetings you are in.</p>
            </div>
            <Chip tone="ok">On</Chip>
          </li>
          <li className="flex items-start gap-3 px-4 py-3 sm:px-[22px]">
            <Microphone size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">In person</p>
              <p className="text-ink-3">Conversations you record on the Mytheus phone app.</p>
            </div>
            <Chip tone="ok">On</Chip>
          </li>
          <li className="flex items-start gap-3 px-4 py-3 sm:px-[22px]">
            <SlackLogo size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
            <div className="min-w-0 flex-1">
              <p id="slack-capture-label" className="font-semibold text-ink">
                Slack
              </p>
              <p id="slack-capture-help" className="text-ink-3">
                {slack === "not_connected"
                  ? "Slack is not connected to this workspace yet. An admin connects it in Integrations."
                  : "Messages you post where the Mytheus app is a member. Each promise waits for your yes."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={capture.slack_enabled}
              aria-labelledby="slack-capture-label"
              aria-describedby="slack-capture-help"
              disabled={savingCapture}
              onClick={toggleSlack}
              className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60 ${
                capture.slack_enabled ? "bg-ok" : "bg-line-2"
              }`}
            >
              <span
                aria-hidden
                className={`inline-block h-5 w-5 rounded-full bg-surface shadow-warm-1 transition-transform duration-150 motion-reduce:transition-none ${
                  capture.slack_enabled ? "translate-x-[22px]" : "translate-x-[2px]"
                }`}
              />
            </button>
          </li>
          <li className="flex items-start gap-3 px-4 py-3 sm:px-[22px]">
            <EnvelopeSimple size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Email</p>
              <p className="text-ink-3">
                {capture.email_connected
                  ? "Emails you send."
                  : "Not connected: Mytheus does not read mail yet. Add an email promise by hand for now."}
              </p>
            </div>
            <Chip tone="outline">{capture.email_connected ? (capture.email_enabled ? "On" : "Off") : "Not connected"}</Chip>
          </li>
        </ul>
      </Card>

      <Card as="section" flush aria-labelledby="kept-h">
        <CardHead id="kept-h" title="Kept" right={kept.length ? <Count n={kept.length} label="kept" /> : undefined} />
        {kept.length === 0 ? (
          <p className="px-4 pb-5 text-[14px] text-ink-3 sm:px-[22px]">Promises you keep land here.</p>
        ) : (
          <>
            <ul id="kept-list" className="divide-y divide-line border-t border-line">
              {(showAllKept ? kept : kept.slice(0, KEPT_SHOWN)).map((p) => (
                <li key={p.id} aria-busy={pending[p.id] || undefined} className="flex items-start gap-3 px-4 py-3 sm:px-[22px]">
                  <PromiseCheck content={p.content} done busy={!!pending[p.id]} onToggle={() => void setStatus(p.id, "open", "Promise moved back to open")} />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[14px] leading-snug text-ink-3 line-through decoration-ink-4">{p.content}</p>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
                      Kept {p.done_at ? dayWord(p.done_at.slice(0, 10), today) : ""}, {p.source.label}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {kept.length > KEPT_SHOWN ? (
              <div className="border-t border-line px-4 py-1.5 sm:px-[22px]">
                <Button variant="ghost" size="sm" aria-expanded={showAllKept} aria-controls="kept-list" onClick={() => setShowAllKept((v) => !v)}>
                  {showAllKept ? "Show fewer" : `Show all ${kept.length}`}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Explainer id="ledger-about-h" title="How the ledger works">
        <p className="flex gap-2">
          <LockSimple size={16} aria-hidden className="mt-1 shrink-0 text-ink-3" />
          <span>Only you see this list. Nothing here is assigned to anyone; shared action items stay in{" "}
            <Link href="/work/tasks" className={inlineLinkClass}>
              Tasks
            </Link>
            .
          </span>
        </p>
        <p>Before you say yes to a date, your Myte checks your week. When a day is full it offers a better one, and can ask the person waiting for you in one tap.</p>
      </Explainer>
    </>
  );

  return (
    <div>
      <SectionBar
        liveContext
        context={
          nothingAtAll
            ? "Every promise you make, from meetings, Slack and by hand, in one private list."
            : `${openCount === 0 ? "Nothing open" : `${openCount} open`}${dueThisWeek !== null ? `, ${dueThisWeek} due this week` : ""}${review.length ? `, ${review.length} to review` : ""}. Only you see this list.`
        }
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} weight="bold" aria-hidden />
            Add a promise
          </Button>
        }
      />

      <div className="space-y-5">
        <CapacityWeek capacity={capacity} today={today} loading={!capacity} error={capacityError} onRetry={() => void refreshCapacity()} />

        {incoming.length ? (
          <Card as="section" flush aria-labelledby="asked-h">
            <CardHead id="asked-h" title="Asked of you" description="People who owe you something asked to move the date." right={<Count n={incoming.length} label="waiting" />} />
            <ul className="divide-y divide-line border-t border-line">
              {incoming.map((p) => (
                <li key={p.id} id={`proposal-${p.id}`} className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:flex-nowrap sm:px-5 ${focus.proposal === p.id ? "bg-signal-soft/40" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium leading-snug text-ink">{p.content}</p>
                    <p className="mt-1 text-[14px] text-ink-3">
                      <span className="font-semibold text-ink-2">{p.proposer_name ?? "A colleague"}</span> asks for {shortDay(p.proposed_due)}
                      {p.current_due ? ` instead of ${shortDay(p.current_due)}` : ""}.
                      {p.note ? <span className="mt-1 block font-display ">&ldquo;{p.note}&rdquo;</span> : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" onClick={() => void decide(p, "accept")} aria-label={`Accept ${shortDay(p.proposed_due)} for: ${p.content}`}>
                      Accept {shortDay(p.proposed_due)}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void decide(p, "decline")} aria-label={`Decline and keep the date for: ${p.content}`}>
                      Keep the date
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {review.length ? (
          <Card as="section" flush aria-labelledby="review-h">
            <CardHead
              id="review-h"
              title="Found by your Myte"
              description="Promises it heard in your messages, or a colleague handed you. Confirm the ones you meant."
              right={<Count n={review.length} label="to review" tone="accent" />}
            />
            <ul className="divide-y divide-line border-t border-line">
              {review.map((p) => (
                <ReviewRow
                  key={p.id}
                  p={p}
                  today={today}
                  busy={!!pending[p.id]}
                  focused={focus.promise === p.id}
                  onConfirm={() => void confirm(p)}
                  onDismiss={() => void setStatus(p.id, "dismissed", "Promise dismissed")}
                />
              ))}
            </ul>
          </Card>
        ) : null}

        {nothingAtAll ? (
          <EmptyState
            art="promises"
            title="No promises yet"
            description="When you say you will do something in a meeting, in a recorded conversation or in Slack, your Myte writes it down here, privately. You can add one by hand too."
            action={
              <Button onClick={() => setAdding(true)}>
                <Plus size={16} weight="bold" aria-hidden />
                Add a promise
              </Button>
            }
            className="py-16"
          />
        ) : (
          <PageColumns aside={aside} asideLabel="Your tally, sources and kept promises">
            <section aria-labelledby="ledger-h" className="min-w-0 space-y-4">
              <h2 id="ledger-h" className="sr-only">
                Open promises by due date
              </h2>
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by where the promise was made">
                <FunnelSimple size={16} aria-hidden className="text-ink-3" />
                {CHANNELS.filter((c) => counts[c.value] > 0 || channels.includes(c.value)).map((c) => {
                  const on = channels.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleChannel(c.value)}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal ${
                        on ? "border-pill bg-pill text-pill-on" : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2"
                      }`}
                    >
                      {c.label}
                      <span className={`tabular-nums ${on ? "text-pill-on/80" : "text-ink-3"}`}>{counts[c.value]}</span>
                    </button>
                  );
                })}
                {recipients.length ? (
                  <Dropdown
                    value={recipient}
                    onChange={setRecipient}
                    options={recipientChoices}
                    label="Promised to"
                    size="sm"
                    tone="field"
                    shape="round"
                    renderValue={(o) => (o && o.value !== RECIPIENT_ALL ? `To ${o.label}` : "Promised to anyone")}
                  />
                ) : null}
                {filtering ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setChannels([]);
                      setRecipient(RECIPIENT_ALL);
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>

              {groups.length === 0 ? (
                filtering ? (
                  <EmptyState
                    art="search"
                    title="Nothing matches"
                    description="No open promise fits these filters."
                    action={
                      <Button
                        variant="outline"
                        onClick={() => {
                          setChannels([]);
                          setRecipient(RECIPIENT_ALL);
                        }}
                      >
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <Card className="flex items-center gap-4">
                    <CheckCircle size={28} weight="fill" aria-hidden className="shrink-0 text-ok" />
                    <div>
                      <p className="display text-[22px] text-ink">Nothing open</p>
                      <p className="mt-0.5 text-[14px] text-ink-3">Every promise you made has been kept, moved on or dropped.</p>
                    </div>
                  </Card>
                )
              ) : (
                groups.map((g) => (
                  <Card as="section" flush key={g.key} aria-labelledby={`g-${g.key}`}>
                    <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line bg-surface-2 px-4 py-3 sm:px-5">
                      <h3 id={`g-${g.key}`} className={`text-[15px] font-semibold ${g.key === "overdue" ? "text-priority-high" : "text-ink"}`}>
                        {g.title}
                      </h3>
                      <span className="min-w-0 flex-1 text-[13px] text-ink-3">{g.hint}</span>
                      <Count n={g.items.length} label={g.items.length === 1 ? "promise" : "promises"} tone={g.key === "overdue" ? "high" : "neutral"} />
                    </header>
                    <ul className="divide-y divide-line">
                      {g.items.map((p) => (
                        <LedgerRow
                          key={p.id}
                          p={p}
                          today={today}
                          busy={!!pending[p.id]}
                          focused={focus.promise === p.id}
                          canHandOff={canHandOff}
                          onKept={() => void setStatus(p.id, "done", "Promise kept")}
                          onDrop={() => void setStatus(p.id, "dismissed", "Promise dropped")}
                          onHandOff={() => setHandingOff(p)}
                          onRenegotiate={() =>
                            setRenegotiating({
                              kind: "commitment",
                              id: p.id,
                              content: p.content,
                              due: p.due_at,
                              askName: p.recipient_user_id ? p.recipient_name : null,
                            })
                          }
                        />
                      ))}
                    </ul>
                  </Card>
                ))
              )}

              {review.length === 0 && capture.slack_enabled && slack === "connected" ? (
                <p className="flex items-center gap-2 px-1 text-[13.5px] text-ink-3">
                  <Sparkle size={14} aria-hidden />
                  Your Myte is reading the Slack messages you post for promises. Nothing new to review.
                </p>
              ) : null}
            </section>
          </PageColumns>
        )}
      </div>

      <AddPromiseDialog open={adding} onClose={() => setAdding(false)} onAdded={afterAdd} members={members} tz={tz} today={today} />
      <RenegotiateDialog target={renegotiating} onClose={() => setRenegotiating(null)} onDone={afterRenegotiate} tz={tz} today={today} />
      <HandOffDialog promise={handingOff} members={members} onClose={() => setHandingOff(null)} onDone={afterHandOff} />
    </div>
  );
}
