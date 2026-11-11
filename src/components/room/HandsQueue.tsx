"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretDown, HandPalm, Megaphone, X } from "@phosphor-icons/react";
import { initials, toneOf } from "@/components/room/tone";
import { handWait, ordinal } from "@/lib/realtime/room-live";

/* "Hands raised" on the stage (UI polish pass): a chip beside the meeting clock that everyone
   sees while a hand is up, naming who is first and how many wait; it opens the ordered queue,
   oldest first, with how long each hand has been up. The host (or creator) can call on someone,
   which gives them the floor and lowers their hand for the room, or lower a hand; anyone can lower
   their own from here too. The order is the gateway's (the time each hand went up), so every
   screen shows the same queue, and a reconnect re-reads it.

   A disclosure, not a dialog: the chip has aria-expanded and aria-controls; Escape and a click
   outside close the list and focus goes back to the chip. Announcements live in the room (one
   polite live region), not here, so they are said once. */

export type QueuedHand = { userId: string; name: string; at: string; isMe: boolean };

export function HandsQueue({
  queue,
  steers,
  onCallOn,
  onLower,
  onLowerMine,
}: {
  queue: QueuedHand[];
  /** You host or created the meeting: Call on and Lower are yours. */
  steers: boolean;
  onCallOn: (userId: string) => void;
  onLower: (userId: string) => void;
  onLowerMine: () => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const wrap = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLButtonElement>(null);

  // The wait times move once a minute is enough; a quieter clock than the stage's.
  useEffect(() => {
    if (queue.length === 0) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, [queue.length]);

  useEffect(() => {
    if (queue.length === 0) setOpen(false);
  }, [queue.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  if (queue.length === 0) return null;
  const first = queue[0];
  const firstName = first.isMe ? "You" : first.name.split(" ")[0] || first.name;
  const count = queue.length;

  return (
    <div
      ref={wrap}
      className={`hq${open ? " is-open" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          chip.current?.focus();
        }
      }}
    >
      <button
        ref={chip}
        type="button"
        className="hq-chip tap"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`Hands raised: ${count}. ${first.isMe ? "You are" : `${first.name} is`} first. ${open ? "Hide" : "Show"} the queue`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="hq-ico" aria-hidden="true">
          <HandPalm size={15} weight="fill" />
        </span>
        <span className="hq-chip-text" aria-hidden="true">
          {firstName}
          {count > 1 ? <span className="hq-more">+{count - 1}</span> : null}
        </span>
        <CaretDown size={12} weight="bold" aria-hidden="true" className="hq-caret" />
      </button>

      <div id={`${id}-list`} className="hq-panel" role="region" aria-label="Hands raised" hidden={!open}>
        <div className="hq-head">
          <p className="hq-title">Hands raised</p>
          <span className="hq-count">{count}</span>
        </div>
        <ol className="hq-list">
          {queue.map((h, i) => (
            <li key={h.userId} className={`hq-row${i === 0 ? " is-next" : ""}`}>
              <span className="hq-place" aria-hidden="true">
                {i + 1}
              </span>
              <span className="sr-only">{ordinal(i + 1)} in line: </span>
              <span className={`mx-av hq-av ${toneOf(h.userId)}`} aria-hidden="true">
                {initials(h.name)}
              </span>
              <span className="hq-who">
                <strong>{h.isMe ? "You" : h.name}</strong>
                <small>{handWait(h.at, now) === "just now" ? "Raised just now" : `Waiting ${handWait(h.at, now)}`}</small>
              </span>
              <span className="hq-acts">
                {steers && !h.isMe ? (
                  <>
                    <button
                      type="button"
                      className="hq-btn is-primary tap"
                      onClick={() => onCallOn(h.userId)}
                      aria-label={`Call on ${h.name}`}
                    >
                      <Megaphone size={14} aria-hidden="true" />
                      <span>Call on</span>
                    </button>
                    <button
                      type="button"
                      className="hq-btn is-icon tap"
                      onClick={() => onLower(h.userId)}
                      aria-label={`Lower ${h.name}'s hand`}
                      data-tip="Lower hand"
                    >
                      <X size={14} weight="bold" aria-hidden="true" />
                    </button>
                  </>
                ) : h.isMe ? (
                  <button type="button" className="hq-btn tap" onClick={onLowerMine}>
                    Lower
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
        <p className="hq-foot">
          {steers ? "Calling on someone lowers their hand and tells them to go ahead." : "In the order hands went up. The host calls on people from here."}
        </p>
      </div>
    </div>
  );
}
