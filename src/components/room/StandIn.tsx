"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChatCircleText, CheckCircle, Gavel, LockSimple, PaperPlaneRight, Robot, SealQuestion, X } from "@phosphor-icons/react";
import { RoomDialog } from "@/components/room/RoomDialog";
import { askStandIn } from "@/components/room/stage-actions";
import { AgentOrb } from "@/components/agent/AgentOrb";
import type { StandInAnswerWire } from "@/lib/api/room-stage-types";
import type { AgentFace } from "@/lib/realtime/agent-persona";
import type { DueQuestions } from "@/lib/realtime/stage";

/* Agents that stand in properly (polish program, Phase 1; ADR-0039 B5 send-your-agent).

   - `StandInQuestions`: when an item owned by someone who sent their agent starts, the questions
     they left it come up under the agenda bar, for the host (ADR-0039 B5: the questions are the
     person's and the host's to see). The host raises each one to the room with one click: it goes
     into the meeting chat, so everyone sees it and it is kept with the meeting.
   - `StandInDialog`: the stand-in's whole update, and "Ask Sarah's agent". The question goes
     through core-api's permission-gated A2A path (deny by default, the same grants the agents use
     between themselves); the answer cites Sarah's own records and is also kept in your Agent tab
     as a context card. A denial says plainly which permission is missing. */

const CLASS_PHRASE: Record<string, string> = {
  decision_lineage: "decisions",
  action_status: "task status",
  meeting_context: "meeting context",
};
const SCOPE_PHRASE: Record<string, string> = {
  self: "yourself",
  same_team: "people on your team",
  department: "people in your department",
  org: "people across the workspace",
};

export function StandInQuestions({
  due,
  nameOf,
  itemTitleOf,
  onRaise,
  onDone,
}: {
  due: DueQuestions[];
  nameOf: (id: string) => string;
  itemTitleOf: (id: string) => string | null;
  /** Put a question into the meeting chat. */
  onRaise: (text: string) => void;
  onDone: (key: string) => void;
}) {
  const [raised, setRaised] = useState<Record<string, true>>({});
  if (due.length === 0) return null;
  return (
    <div className="sb-standins">
      {due.map((d) => {
        const name = nameOf(d.userId);
        const item = d.itemId ? itemTitleOf(d.itemId) : null;
        return (
          <section key={d.key} className="sb-standin" aria-label={`Questions from ${name}'s agent`}>
            <div className="sb-standin-head">
              <SealQuestion size={16} weight="fill" aria-hidden />
              <p>
                <strong>{name}&rsquo;s agent has {d.questions.length === 1 ? "a question" : `${d.questions.length} questions`}</strong>
                {item ? <span> for {item}</span> : null}
              </p>
              <span className="sb-standin-who">Only you see these until you raise them</span>
              <button type="button" className="sb-x tap" aria-label={`Done with ${name}'s questions`} onClick={() => onDone(d.key)}>
                <X size={14} aria-hidden />
              </button>
            </div>
            <ol className="sb-standin-qs">
              {d.questions.map((q, i) => {
                const k = `${d.key}:${i}`;
                return (
                  <li key={k}>
                    <span className="sb-standin-q">{q}</span>
                    {raised[k] ? (
                      <span className="sb-standin-done">
                        <CheckCircle size={14} weight="fill" aria-hidden />
                        Raised in chat
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="sb-btn tap"
                        aria-label={`Raise in chat: ${q}`}
                        onClick={() => {
                          onRaise(`Question from ${name}'s agent: ${q}`);
                          setRaised((r) => ({ ...r, [k]: true }));
                        }}
                      >
                        <ChatCircleText size={14} aria-hidden />
                        Raise in chat
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

type AskState =
  | { kind: "idle" }
  | { kind: "asking"; question: string }
  | { kind: "answer"; answer: StandInAnswerWire }
  | { kind: "error"; message: string };

export function StandInDialog({
  open,
  onClose,
  meetingId,
  userId,
  name,
  face,
  update,
  questions,
}: {
  open: boolean;
  onClose: () => void;
  meetingId: string;
  userId: string;
  name: string;
  face: AgentFace | null;
  update: string | null;
  /** Their questions, when you may see them (the host, or the person). */
  questions: readonly string[];
}) {
  const uid = useId();
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<AskState>({ kind: "idle" });
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuestion("");
      setState({ kind: "idle" });
    }
  }, [open, userId]);

  const ask = async () => {
    const q = question.trim();
    if (!q) {
      setState({ kind: "error", message: "Type a question first." });
      input.current?.focus();
      return;
    }
    setState({ kind: "asking", question: q });
    const res = await askStandIn(meetingId, userId, q);
    setState(res.ok ? { kind: "answer", answer: res.answer } : { kind: "error", message: res.message });
  };

  const agentName = face?.name ?? `${name}'s agent`;

  return (
    <RoomDialog open={open} onClose={onClose} title={`${agentName}, standing in for ${name}`}>
      <div className="si-dialog">
        <div className="si-head">
          <span className="cx-agent-badge si-face" aria-hidden="true">
            {face ? <AgentOrb seed={face.seed} mode="live" size={40} /> : <Robot size={18} />}
          </span>
          <p className="si-sub">{name} sent their agent instead of joining. It listens and takes notes for them.</p>
        </div>

        <h3 className="si-h">{name}&rsquo;s update</h3>
        <p className="si-update">{update ?? `${name} didn't leave an update.`}</p>

        {questions.length > 0 ? (
          <>
            <h3 className="si-h">Their questions for the room</h3>
            <ul className="si-questions">
              {questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </>
        ) : null}

        <form
          className="si-ask"
          onSubmit={(e) => {
            e.preventDefault();
            void ask();
          }}
        >
          <label htmlFor={`${uid}-q`} className="si-h">
            Ask {name}&rsquo;s agent
          </label>
          <p id={`${uid}-hint`} className="si-hint">
            It answers from {name}&rsquo;s own decisions, tasks and update, if your workspace&rsquo;s agent permissions allow it.
          </p>
          <div className="si-ask-row">
            <input
              ref={input}
              id={`${uid}-q`}
              className="si-input"
              value={question}
              maxLength={300}
              placeholder="What did they decide about pricing?"
              aria-describedby={`${uid}-hint`}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={state.kind === "asking"}
            />
            <button type="submit" className="nfy-act tap" disabled={state.kind === "asking"}>
              <PaperPlaneRight size={15} aria-hidden />
              {state.kind === "asking" ? "Asking..." : "Ask"}
            </button>
          </div>
        </form>

        <div className="si-result" aria-live="polite">
          {state.kind === "asking" ? <p className="si-wait">Asking {agentName}...</p> : null}
          {state.kind === "error" ? <p className="si-error">{state.message}</p> : null}
          {state.kind === "answer" ? <Answer answer={state.answer} name={name} /> : null}
        </div>

        <div className="room-dialog-acts">
          <button type="button" className="nfy-act is-quiet tap" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </RoomDialog>
  );
}

function Answer({ answer, name }: { answer: StandInAnswerWire; name: string }) {
  if (answer.outcome === "denied") {
    return (
      <div className="si-answer is-denied">
        <p className="si-answer-h">
          <LockSimple size={15} aria-hidden />
          Not shared
        </p>
        <p>
          Your workspace doesn&rsquo;t let agents share {CLASS_PHRASE[answer.query_class] ?? "this"} with{" "}
          {SCOPE_PHRASE[answer.target_scope] ?? "you"}. An admin can allow it under Workspace, Agent permissions.
        </p>
      </div>
    );
  }
  if (answer.outcome === "no_answer") {
    return (
      <div className="si-answer">
        <p className="si-answer-h">Nothing on that</p>
        <p>
          {name}&rsquo;s agent has no {CLASS_PHRASE[answer.query_class] ?? "records"} that match. Try other words, or ask{" "}
          {name} after the meeting.
        </p>
      </div>
    );
  }
  return (
    <div className="si-answer is-answered">
      <p className="si-answer-h">
        <CheckCircle size={15} weight="fill" aria-hidden />
        From {name}&rsquo;s records
      </p>
      <ul className="si-sources">
        {answer.sources.map((src, i) => (
          <li key={src.id ?? `${src.kind}-${i}`}>
            <span className="si-kind">
              {src.kind === "decision" ? <Gavel size={13} aria-hidden /> : null}
              {src.kind === "decision" ? "Decision" : src.kind === "action" ? "Task" : "Their update"}
            </span>
            <span className="si-text">{src.text}</span>
            {src.meeting_title ? <span className="si-meta">{src.meeting_title}</span> : null}
          </li>
        ))}
      </ul>
      <p className="si-kept">Also kept in your Agent tab.</p>
    </div>
  );
}
