"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle, Gavel, HourglassMedium, ListChecks, SignOut, UserCircle, X } from "@phosphor-icons/react";
import { confirmCandidate, dismissCandidate } from "@/app/actions/candidates";
import { setAgendaItemStatus } from "@/app/actions/agenda";
import { useCallToast } from "@/components/call/CallToast";
import { Dropdown } from "@/components/ui/Dropdown";
import { RoomDialog } from "@/components/room/RoomDialog";
import { assignActionCard, closeMeeting, loadWrapUp } from "@/components/room/stage-actions";
import type { AgendaItem } from "@/lib/api/meeting-agenda-types";
import type { WrapUpCardWire, WrapUpClosedWire, WrapUpWire } from "@/lib/api/room-stage-types";
import type { CandidateOutcome } from "@/lib/realtime/candidates";
import { clock, secondsLeft, type WrapUpState } from "@/lib/realtime/stage";
import type { MeetingSocketState, RoomAck } from "@/lib/realtime/useMeetingSocket";

/* The close-out ritual (polish program, Phase 1).

   `WrapUpSheet`, for the host: "End for everyone" no longer ends the call at once. It opens this
   sheet with a 60-second countdown everyone shares (the deadline is core-api's stored start plus
   60 s). In that minute the host settles what would otherwise drift: the cards nobody confirmed
   (Confirm, Dismiss, and an owner for a task that has none), and the agenda items still open
   (Covered, Skip). "End now", or the countdown running out, closes the meeting through core-api:
   it ends for everyone, and every card still open goes to the review queue of the person named at
   the bottom (you, by default), so nothing is left without an owner. "Keep the meeting going"
   (or Escape) cancels the wrap-up for the whole room.

   `WrappingBanner`, for everyone else: "Maya is wrapping up" with the same countdown and a way to
   leave now; when the meeting closes, the room's ended screen takes over. */

type Ledger = {
  settle: (id: string, outcome: "confirmed" | "dismissed", by?: string | null) => void;
  announce: (id: string, outcome: CandidateOutcome) => Promise<RoomAck>;
};

function useSecondsLeft(endsAt: string | null | undefined): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return now === null ? null : secondsLeft(endsAt, now);
}

export function WrapUpSheet({
  meetingId,
  wrapUp,
  initial,
  participantIds,
  meId,
  nameOf,
  ledger,
  agendaHost,
  onKeepGoing,
  onClosed,
}: {
  meetingId: string;
  wrapUp: WrapUpState;
  /** What the start returned, shown while the fresh read loads. */
  initial: WrapUpWire | null;
  participantIds: string[];
  meId: string | null;
  nameOf: (id: string) => string;
  ledger: Ledger;
  agendaHost: MeetingSocketState["agendaHost"];
  onKeepGoing: () => Promise<void>;
  onClosed: (closed: WrapUpClosedWire) => Promise<void>;
}) {
  const uid = useId();
  const toast = useCallToast();
  const [data, setData] = useState<WrapUpWire | null>(initial);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<Record<string, true>>({});
  const [owner, setOwner] = useState<string>(meId ?? "");
  const [closing, setClosing] = useState<"host" | "timer" | null>(null);
  const [keeping, setKeeping] = useState(false);
  const [warned, setWarned] = useState("");
  const left = useSecondsLeft(wrapUp.endsAt);
  const fired = useRef(false);
  const keepButton = useRef<HTMLButtonElement>(null);
  // The safe choice takes focus when the sheet opens (after the dialog's own showModal, which
  // would otherwise focus the first control in it).
  useEffect(() => {
    keepButton.current?.focus();
  }, []);

  const refresh = useCallback(() => {
    setLoadFailed(false);
    void loadWrapUp(meetingId).then((res) => {
      if (res.ok) setData(res.wrapUp);
      else setLoadFailed(true);
    });
  }, [meetingId]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const close = useCallback(
    async (reason: "host" | "timer") => {
      if (closing) return;
      setClosing(reason);
      const res = await closeMeeting(meetingId, owner || meId, reason);
      if (!res.ok) {
        setClosing(null);
        fired.current = reason === "timer" ? true : fired.current;
        toast(res.message, "error");
        return;
      }
      await onClosed(res.closed);
    },
    [closing, meetingId, owner, meId, onClosed, toast],
  );

  // The countdown ran out: the meeting closes, with whatever is left handed to the named owner.
  useEffect(() => {
    if (left === 0 && !fired.current && !keeping) {
      fired.current = true;
      void close("timer");
    }
    if (left !== null && left <= 10 && left > 0 && !warned) setWarned("Ten seconds left before the meeting ends for everyone.");
  }, [left, close, keeping, warned]);

  const mark = (id: string, on: boolean) =>
    setBusy((b) => {
      const next = { ...b };
      if (on) next[id] = true;
      else delete next[id];
      return next;
    });

  const removeCard = (id: string) =>
    setData((d) => (d ? { ...d, pending: d.pending.filter((c) => c.id !== id), unowned_action_ids: d.unowned_action_ids.filter((x) => x !== id) } : d));

  const settle = async (card: WrapUpCardWire, outcome: "confirmed" | "dismissed") => {
    mark(card.id, true);
    const res = outcome === "confirmed" ? await confirmCandidate(card.kind, card.id) : await dismissCandidate(card.kind, card.id);
    mark(card.id, false);
    if (!res.ok) {
      if (res.gone) removeCard(card.id);
      toast(res.message, "error");
      return;
    }
    removeCard(card.id);
    ledger.settle(card.id, outcome, meId);
    void ledger.announce(card.id, outcome);
    const noun = card.kind === "decision" ? "Decision" : "Task";
    toast(`${noun} ${outcome}`, "success");
  };

  const assign = async (card: WrapUpCardWire, assigneeId: string) => {
    if (!assigneeId) return;
    mark(card.id, true);
    const res = await assignActionCard(card.id, assigneeId);
    mark(card.id, false);
    if (!res.ok) {
      toast(res.message, "error");
      return;
    }
    setData((d) =>
      d
        ? {
            ...d,
            pending: d.pending.map((c) => (c.id === card.id ? { ...c, assignee_id: res.assigneeId } : c)),
            unowned_action_ids: d.unowned_action_ids.filter((x) => x !== card.id),
          }
        : d,
    );
    void ledger.announce(card.id, "edited");
    toast(`Task assigned to ${nameOf(assigneeId)}`, "success");
  };

  const finishItem = async (item: AgendaItem, status: "covered" | "skipped") => {
    const op = Date.now();
    mark(item.id, true);
    agendaHost.begin(item.id, status, op);
    const res = await setAgendaItemStatus(meetingId, item.id, status);
    mark(item.id, false);
    if (!res.ok) {
      agendaHost.rollback(item.id, op);
      toast(res.message, "error");
      return;
    }
    agendaHost.commit(item.id, op, res.item);
    void agendaHost.announce(item.id);
    setData((d) => (d ? { ...d, open_items: d.open_items.filter((it) => it.id !== item.id) } : d));
  };

  const keepGoing = async () => {
    if (closing || keeping) return;
    setKeeping(true);
    await onKeepGoing();
    setKeeping(false);
  };

  const pending = data?.pending ?? [];
  const openItems = (data?.open_items ?? []) as AgendaItem[];
  const unowned = new Set(data?.unowned_action_ids ?? []);
  const nothingLeft = data !== null && pending.length === 0 && openItems.length === 0;
  const total = 60;
  const pct = left === null ? 100 : Math.max(0, Math.min(100, (left / total) * 100));

  return (
    <RoomDialog open onClose={() => void keepGoing()} title="Wrap up before everyone leaves">
      <div className="wu">
        <div className="wu-timer">
          <HourglassMedium size={18} aria-hidden />
          <p>
            The meeting ends for everyone in{" "}
            <span role="timer" aria-label={left === null ? "about a minute" : `${left} seconds`} className="wu-count">
              {left === null ? "1:00" : clock(left)}
            </span>
          </p>
          <span className="wu-drain" aria-hidden>
            <i style={{ width: `${pct}%` }} />
          </span>
        </div>
        <p className="sr-only" aria-live="assertive">
          {warned}
        </p>
        <p className="wu-lead">Everyone sees that you are wrapping up. Settle what you can; whatever is left goes to one person&rsquo;s review queue.</p>

        {data === null && !loadFailed ? (
          <div className="wu-loading" aria-busy="true">
            <span className="sb-skel" aria-hidden />
            <span className="sb-skel is-short" aria-hidden />
            <span className="sr-only">Loading what is left</span>
          </div>
        ) : null}
        {loadFailed && data === null ? (
          <p className="wu-error" role="status">
            Couldn&rsquo;t load what is left. You can still end the meeting; open cards go to the review queue.{" "}
            <button type="button" className="sb-link tap" onClick={refresh}>
              Retry
            </button>
          </p>
        ) : null}
        {nothingLeft ? (
          <p className="wu-clear">
            <CheckCircle size={16} weight="fill" aria-hidden />
            Nothing left open. You can end the meeting.
          </p>
        ) : null}

        {pending.length > 0 ? (
          <section className="wu-sec" aria-labelledby={`${uid}-cards`}>
            <h3 id={`${uid}-cards`} className="wu-h">
              <Gavel size={15} aria-hidden />
              Cards nobody confirmed <span className="wu-n">{pending.length}</span>
            </h3>
            <ul className="wu-list">
              {pending.map((card) => {
                const isBusy = Boolean(busy[card.id]);
                const noOwner = card.kind === "action" && unowned.has(card.id);
                return (
                  <li key={card.id} className="wu-card">
                    <p className="wu-kind">{card.kind === "decision" ? "Decision" : "Task"}</p>
                    <p className="wu-text">{card.content}</p>
                    {card.kind === "action" ? (
                      <div className="wu-owner">
                        <UserCircle size={15} aria-hidden />
                        {noOwner ? (
                          <>
                            <label htmlFor={`${uid}-a-${card.id}`} className="wu-owner-label">
                              No owner yet
                            </label>
                            <Dropdown
                              id={`${uid}-a-${card.id}`}
                              label={`Assign: ${card.content}`}
                              size="sm"
                              className="wu-select"
                              value={null}
                              placeholder="Assign to..."
                              disabled={isBusy}
                              options={participantIds.map((id) => ({ value: id, label: id === meId ? "Me" : nameOf(id) }))}
                              onChange={(v) => void assign(card, v)}
                            />
                          </>
                        ) : (
                          <span>{card.assignee_id ? nameOf(card.assignee_id) : "No owner"}</span>
                        )}
                      </div>
                    ) : null}
                    <div className="wu-acts">
                      <button
                        type="button"
                        className="nfy-act tap"
                        disabled={isBusy}
                        aria-label={`Confirm: ${card.content}`}
                        onClick={() => void settle(card, "confirmed")}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="nfy-act is-quiet tap"
                        disabled={isBusy}
                        aria-label={`Dismiss: ${card.content}`}
                        onClick={() => void settle(card, "dismissed")}
                      >
                        Dismiss
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {openItems.length > 0 ? (
          <section className="wu-sec" aria-labelledby={`${uid}-items`}>
            <h3 id={`${uid}-items`} className="wu-h">
              <ListChecks size={15} aria-hidden />
              Agenda items still open <span className="wu-n">{openItems.length}</span>
            </h3>
            <ul className="wu-list">
              {openItems.map((item) => (
                <li key={item.id} className="wu-card is-item">
                  <p className="wu-text">{item.title}</p>
                  <p className="wu-kind">{item.status === "in_progress" ? "In progress" : "Not discussed"}</p>
                  <div className="wu-acts">
                    <button
                      type="button"
                      className="nfy-act is-quiet tap"
                      disabled={Boolean(busy[item.id])}
                      aria-label={`Mark ${item.title} covered`}
                      onClick={() => void finishItem(item, "covered")}
                    >
                      Covered
                    </button>
                    <button
                      type="button"
                      className="nfy-act is-quiet tap"
                      disabled={Boolean(busy[item.id])}
                      aria-label={`Skip ${item.title}`}
                      onClick={() => void finishItem(item, "skipped")}
                    >
                      Skip
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="wu-foot">
          <label htmlFor={`${uid}-owner`} className="wu-foot-label">
            Leftover cards go to
          </label>
          <Dropdown
            id={`${uid}-owner`}
            label="Leftover cards go to"
            size="sm"
            className="wu-select"
            value={owner}
            disabled={closing !== null}
            options={participantIds.map((id) => ({ value: id, label: id === meId ? "Me" : nameOf(id) }))}
            onChange={setOwner}
          />
        </div>

        <div className="room-dialog-acts">
          <button
            ref={keepButton}
            type="button"
            className="nfy-act is-quiet tap"
            onClick={() => void keepGoing()}
            disabled={closing !== null || keeping}
          >
            {keeping ? "Keeping it going..." : "Keep the meeting going"}
          </button>
          <button type="button" className="nfy-act is-danger tap" onClick={() => void close("host")} disabled={closing !== null || keeping}>
            {closing ? "Ending..." : "End now"}
          </button>
        </div>
      </div>
    </RoomDialog>
  );
}

export function WrappingBanner({
  wrapUp,
  hostName,
  leaveHref,
}: {
  wrapUp: WrapUpState;
  hostName: string;
  leaveHref: string;
}) {
  const left = useSecondsLeft(wrapUp.endsAt);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="wrapping-banner">
      <HourglassMedium size={16} aria-hidden />
      <p role="status">
        {hostName} is wrapping up. The meeting ends for everyone in about a minute.
      </p>
      <span className="wrapping-count" aria-hidden>
        {left === null ? "1:00" : clock(left)}
      </span>
      <Link href={leaveHref} className="sb-btn tap">
        <SignOut size={14} aria-hidden />
        Leave now
      </Link>
      <button type="button" className="sb-x tap" aria-label="Hide this notice" onClick={() => setDismissed(true)}>
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
