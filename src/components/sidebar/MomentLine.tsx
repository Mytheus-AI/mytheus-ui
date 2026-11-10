"use client";

import { ArrowUpRight, Info } from "@phosphor-icons/react";
import { formatOffset } from "@/lib/realtime/meeting-clock";
import { hasMoment, type Moment } from "@/lib/realtime/moments";
import { useRoomName } from "@/lib/realtime/room-names";

/* What a card points at (polish program, Phase 1: "cards tied to the moment"): the words that
   were said, who said them and when, on the meeting's own clock (the transcript's timeline, which
   starts when the call does). The whole line is one button: it opens the live transcript at that
   moment, with the lines highlighted. A result from before quotes existed still has its time, so
   it still opens the transcript there. Nothing at all to point at: nothing is drawn. */

export interface MomentTarget {
  startMs: number;
  endMs: number | null;
  /** What the transcript view says it is showing ("Maya Chen at 1:01"). */
  label: string;
}

/** The speaker as the room knows them: "You", a member's name, the agent's label, or nothing. */
export function useSpeakerName(meId: string | null): (m: Moment) => string | null {
  const nameOf = useRoomName();
  return (m: Moment) => {
    if (m.speakerId && meId && m.speakerId === meId) return "You";
    if (m.speakerId) {
      const known = nameOf(m.speakerId, "");
      if (known) return known;
    }
    return m.speakerLabel;
  };
}

export function MomentLine({
  moment,
  meId,
  onOpen,
}: {
  moment: Moment | undefined;
  meId: string | null;
  /** Opens the live transcript at the moment; the opener gets focus back on close. */
  onOpen?: (target: MomentTarget, opener: HTMLElement) => void;
}) {
  const speakerOf = useSpeakerName(meId);
  if (!hasMoment(moment)) return null;
  const speaker = speakerOf(moment);
  const time = moment.startMs !== null ? formatOffset(moment.startMs / 1000) : null;
  const label = [speaker, time ? `at ${time}` : null].filter(Boolean).join(" ") || "This moment";
  const canOpen = Boolean(onOpen && moment.startMs !== null);
  const open = (el: HTMLElement) => {
    if (onOpen && moment.startMs !== null) onOpen({ startMs: moment.startMs, endMs: moment.endMs, label }, el);
  };

  const body = (
    <>
      {moment.quote ? <q className="mc-quote">{moment.quote}</q> : null}
      <span className="mc-said-meta">
        {speaker ? <b>{speaker}</b> : null}
        {time ? <time className="mc-time">{moment.quote || speaker ? time : `Said at ${time}`}</time> : null}
        {canOpen ? (
          <span className="mc-open">
            Transcript
            <ArrowUpRight size={12} weight="bold" aria-hidden />
          </span>
        ) : null}
      </span>
    </>
  );

  if (!canOpen) return <div className={`mc-said${moment.quote ? "" : " is-time-only"}`}>{body}</div>;
  return (
    <button
      type="button"
      className={`mc-said tap${moment.quote ? "" : " is-time-only"}`}
      aria-label={`Open the transcript at ${time}${speaker ? `, ${speaker === "You" ? "you" : speaker} said` : ""}${moment.quote ? `: ${moment.quote}` : ""}`}
      onClick={(e) => open(e.currentTarget)}
    >
      {body}
    </button>
  );
}

/** "Why you're seeing this", when the agent said why. */
export function WhyLine({ why }: { why: string | null | undefined }) {
  if (!why) return null;
  return (
    <p className="mc-why">
      <Info size={14} aria-hidden />
      <span>
        <span className="mc-why-label">Why you&apos;re seeing this: </span>
        {why}
      </span>
    </p>
  );
}
