"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown, Question } from "@phosphor-icons/react";
import { askSuggestion, dismissSuggestion, saveSuggestion } from "@/app/actions/suggestions";
import { useSpeakingHold } from "@/components/sidebar/useSpeakingHold";
import { heldSuggestions } from "@/lib/realtime/calm";
import type { Suggestion } from "@/lib/realtime/suggestions";

/* The question your Myte wants you to ask, docked at the bottom left of the room.

   A decision or a task can wait for the end of the meeting; a question cannot: it only helps if it
   is asked while the topic is still on the table. So it does not wait in the sidebar (which may be
   closed, or on the People or Chat tab). It comes up over the room, in the corner away from the
   panel, for its owner only, and stays until they ask it, save it for later or dismiss it. It
   draws the eye once when it arrives (a slide and one ring in the priority colour, none with
   reduced motion) and is announced to a screen reader; it never arrives mid-sentence, because it
   waits while you speak, like the sidebar's card. Minimise it and it becomes a small pill that
   keeps the count; a new question opens it again. The same suggestion is still listed in the
   sidebar, and settling it in either place settles it in both. */

const TONE: Record<Suggestion["priority"], string> = { 1: "is-p1", 2: "is-p2", 3: "is-p3" };
const WHEN: Record<Suggestion["priority"], string> = { 1: "Ask this now", 2: "Worth asking now", 3: "You could ask" };

export function QuestionDock({
  suggestions,
  localSpeaking,
  onResolved,
  onSaved,
  onNotice,
}: {
  /** Your open suggestions, most urgent first. */
  suggestions: Suggestion[];
  /** You are speaking right now: a new question waits until you pause. */
  localSpeaking: boolean;
  onResolved: (id: string, outcome: "asked" | "dismissed") => void;
  onSaved: (id: string) => void;
  onNotice: (message: string, tone: "error" | "info" | "success") => void;
}) {
  const holding = useSpeakingHold(localSpeaking);
  const released = useRef<Set<string>>(new Set());
  const { shown } = heldSuggestions(suggestions, released.current, holding);
  useEffect(() => {
    if (!holding) for (const s of suggestions) released.current.add(s.id);
  }, [holding, suggestions]);

  const [minimised, setMinimised] = useState(false);
  const [busy, setBusy] = useState<null | "ask" | "save" | "dismiss">(null);
  const current = shown[0];

  // A question you have not seen yet opens the dock again.
  const seen = useRef<Set<string>>(new Set());
  const ids = shown.map((s) => s.id).join(",");
  useEffect(() => {
    let fresh = false;
    for (const s of shown) {
      if (!seen.current.has(s.id)) fresh = true;
      seen.current.add(s.id);
    }
    if (fresh) setMinimised(false);
    // `shown` is derived each render; its ids are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  if (!current) return null;
  const more = shown.length - 1;

  const run = async (verb: "ask" | "save" | "dismiss") => {
    setBusy(verb);
    if (verb === "ask") {
      // Copy first, while the click still counts as a user gesture for the clipboard.
      navigator.clipboard?.writeText(current.question).catch(() => undefined);
    }
    const res =
      verb === "ask" ? await askSuggestion(current.id) : verb === "save" ? await saveSuggestion(current.id) : await dismissSuggestion(current.id);
    setBusy(null);
    if (!res.ok) {
      onNotice(res.message, "error");
      if (res.gone) onResolved(current.id, "dismissed");
      return;
    }
    if (verb === "save") {
      onSaved(current.id);
      onNotice("Saved. It comes back in your next meeting.", "success");
    } else {
      onResolved(current.id, verb === "ask" ? "asked" : "dismissed");
      if (verb === "ask") onNotice("Marked as asked. It is copied too, if you would rather put it in chat.", "success");
    }
  };

  if (minimised) {
    return (
      <button
        type="button"
        className={`qdock-pill tap ${TONE[current.priority]}`}
        onClick={() => setMinimised(false)}
        aria-label={shown.length === 1 ? "Show the question your Myte suggests" : `Show the ${shown.length} questions your Myte suggests`}
      >
        <Question size={16} weight="bold" aria-hidden />
        {shown.length === 1 ? "1 question for you" : `${shown.length} questions for you`}
      </button>
    );
  }

  return (
    <section
      // Keyed by the question, so each new one arrives (and is announced) afresh.
      key={current.id}
      className={`qdock ${TONE[current.priority]}`}
      aria-label="A question your Myte suggests you ask"
      aria-busy={busy !== null || undefined}
    >
      <div className="qdock-head">
        <span className="qdock-ico" aria-hidden>
          <Question size={16} weight="bold" />
        </span>
        <span className="qdock-when">{WHEN[current.priority]}</span>
        <span className="qdock-private">Only you see this</span>
        <button type="button" className="qdock-min tap" onClick={() => setMinimised(true)} aria-label="Minimise this question">
          <CaretDown size={14} weight="bold" aria-hidden />
        </button>
      </div>
      <p className="qdock-q" role={current.priority === 1 ? "alert" : "status"}>
        {current.question}
      </p>
      {current.moment?.why || current.rationale ? <p className="qdock-why">{current.moment?.why ?? current.rationale}</p> : null}
      <div className="nfy-acts">
        <button type="button" className="nfy-act tap" disabled={busy !== null} onClick={() => void run("ask")}>
          {busy === "ask" ? "Marking..." : "I asked it"}
        </button>
        <button type="button" className="nfy-act is-quiet tap" disabled={busy !== null} onClick={() => void run("save")}>
          {busy === "save" ? "Saving..." : "Save for later"}
        </button>
        <button type="button" className="nfy-act is-quiet tap" disabled={busy !== null} onClick={() => void run("dismiss")}>
          {busy === "dismiss" ? "Dismissing..." : "Dismiss"}
        </button>
      </div>
      {more > 0 ? <p className="qdock-more">{more === 1 ? "1 more question after this one" : `${more} more questions after this one`}</p> : null}
    </section>
  );
}
