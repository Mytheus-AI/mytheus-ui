"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notifyError, notifySuccess } from "@/lib/toast";
import { clearAttendanceChoice, setAttendanceChoice } from "@/app/actions/listening";
import type { AttendanceChoice, MeetingAttendanceChoice } from "@/lib/api/listening-types";
import { CHOICE_HELP } from "@/lib/listening";
import { ChoiceControl } from "./ChoiceControl";

/* Your choice for this meeting (In every meeting at once): attend, let your agent listen for you,
   or skip. "Agent listens" is the same as sending your agent (the card under this one adds an
   update and questions for the room). A choice made here beats your rules; "Use my rules" puts the
   rules back in charge. A confidential meeting has no listening agent. */

export function MeetingChoiceCard({
  meetingId,
  title,
  initial,
  confidential,
  editable,
}: {
  meetingId: string;
  title: string;
  initial: MeetingAttendanceChoice | null;
  confidential: boolean;
  /** false once it has ended */
  editable: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<MeetingAttendanceChoice | null>(initial);
  const [busy, setBusy] = useState(false);
  const choice: AttendanceChoice = state?.choice ?? "attend";

  const apply = async (run: () => ReturnType<typeof setAttendanceChoice>, message: string | null, undo?: () => void) => {
    setBusy(true);
    const res = await run();
    setBusy(false);
    if (!res.ok) return notifyError(res.message);
    setState(res.data);
    router.refresh();
    if (message) notifySuccess(message, undo ? { undo } : {});
  };

  const choose = (next: AttendanceChoice) => {
    if (next === choice || busy) return;
    const before = state;
    const message = next === "agent_listens" ? "Your agent will listen for you" : next === "skip" ? "Skipping this meeting" : "You're attending";
    void apply(() => setAttendanceChoice(meetingId, next), message, () => {
      if (!before || before.source !== "manual") void apply(() => clearAttendanceChoice(meetingId), null);
      else void apply(() => setAttendanceChoice(meetingId, before.choice), null);
    });
  };

  return (
    <section className="mx-card" aria-labelledby="md-choice-h">
      <h2 id="md-choice-h" className="text-[17px] font-semibold text-ink">
        Will you be there?
      </h2>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-3">{CHOICE_HELP[choice]}</p>
      <div className="mt-3">
        <ChoiceControl
          name={meetingId}
          value={choice}
          onChange={choose}
          label={`Your choice for ${title}`}
          agentDisabledReason={confidential ? "This meeting is confidential, so no agent listens to it." : null}
          disabled={!editable || busy}
        />
      </div>
      <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
        {state?.source === "rule" ? <span>Set by one of your rules.</span> : null}
        {state?.source === "manual" && editable ? (
          <button
            type="button"
            className="font-semibold text-ink-2 underline-offset-4 hover:underline"
            disabled={busy}
            onClick={() => void apply(() => clearAttendanceChoice(meetingId), "Back to your rules")}
          >
            Use my rules
          </button>
        ) : null}
        {state && state.agents_listening > 0 ? (
          <span>
            {state.agents_listening} {state.agents_listening === 1 ? "agent listens" : "agents listen"} here.
          </span>
        ) : null}
        <Link href="/meetings/listening" className="font-semibold text-ink-2 underline-offset-4 hover:underline">
          Your week
        </Link>
      </p>
    </section>
  );
}
