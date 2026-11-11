"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowClockwise, Lock, PaperPlaneRight, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { askAgent } from "@/app/actions/ask";
import { segmentAnswer } from "@/lib/rag/answer";
import { askCitationHref, askCitationInline, askCitationLabel, askCitationMeta, excerpt, type AskAnswer } from "@/lib/rag/ask-live";

/* Ask your agent, live (polish program, Phase 1). Every rival lets you ask during the call; this is
   Mytheus's: a private box in the Agent tab over the existing ask path (bff `POST /api/v1/ask`
   through the gateway, the same retrieval as the Ask page), answering from your past meetings,
   confirmed decisions and tasks and the company brain, with every source listed under the answer
   on the coral line. PRIVATE: the question and the answer are never posted to the room, never sent
   to chat and never stored by this screen beyond this visit.

   States: empty (what you can ask), loading (the question stays visible, the answer reserves its
   space), answered, nothing found (the agent says so instead of guessing), not connected on this
   workspace, and any other failure with Retry. The last few answers stay, newest first. */

type Exchange = {
  id: number;
  question: string;
  thisMeeting: boolean;
  status: "loading" | "done" | "error";
  data?: AskAnswer;
  message?: string;
  notConnected?: boolean;
};

const KEEP = 4;

function Answer({ ex, meetingId }: { ex: Exchange; meetingId: string }) {
  const base = useId();
  const data = ex.data!;
  const count = data.citations.reduce((m, c) => Math.max(m, c.n), 0);
  const srcId = (n: number) => `${base}-src-${n}`;
  const focusSource = (n: number) => document.getElementById(srcId(n))?.focus();
  const segments = data.answer ? segmentAnswer(data.answer, count) : [];
  const body: ReactNode[] = segments.map((s, i) =>
    s.kind === "text" ? (
      <span key={i}>{s.text}</span>
    ) : (
      <button key={i} type="button" className="ask-mark tap" aria-label={`Source ${s.n}`} onClick={() => focusSource(s.n)}>
        {s.n}
      </button>
    ),
  );
  return (
    <>
      {data.abstained || !data.answer ? (
        <p className="ask-none">
          Your agent found nothing in your meetings or the company brain that answers this. Try other words, or ask the room.
        </p>
      ) : (
        <p className="ask-text">{body}</p>
      )}
      {data.degraded ? <p className="ask-note">A shorter answer than usual: your workspace&apos;s AI budget for today is nearly used.</p> : null}
      {data.citations.length > 0 ? (
        <ol className="nfy-cites ask-sources" aria-label="Sources">
          {[...data.citations]
            .sort((a, b) => a.n - b.n)
            .map((c) => {
              const href = askCitationHref(c);
              const label = askCitationLabel(c, meetingId);
              const meta = askCitationMeta(c);
              return (
                <li key={c.n} id={srcId(c.n)} tabIndex={-1} className="ask-source">
                  <span className="ask-source-n" aria-hidden>
                    {c.n}
                  </span>
                  <span className="ask-source-body">
                    {href ? (
                      <Link href={href} target="_blank" rel="noopener" className="ask-source-link tap">
                        {label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </Link>
                    ) : (
                      <span className="ask-source-label">{label}</span>
                    )}
                    {meta ? <span className="ask-source-meta">{meta}</span> : null}
                    {askCitationInline(c) ? (
                      <DocumentPassage text={c.text} n={c.n} />
                    ) : c.text ? (
                      <span className="ask-source-text">{excerpt(c.text)}</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
        </ol>
      ) : null}
    </>
  );
}

/* A company-brain passage, read in place: no service serves a document page, so the cited text is
   the view everyone gets, admin or member. Collapsed to an excerpt; "Show passage" opens all of it. */
function DocumentPassage({ text, n }: { text: string; n: number }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const short = excerpt(text);
  const long = short !== text.replace(/\s+/g, " ").trim();
  return (
    <>
      <span id={id} className="ask-source-text">
        {open || !long ? text : short}
      </span>
      {long ? (
        <button type="button" className="ask-source-link tap" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          {open ? "Show less" : "Show passage"}
          <span className="sr-only"> from source {n}</span>
        </button>
      ) : null}
    </>
  );
}

export function AskAgent({ meetingId }: { meetingId: string }) {
  const [question, setQuestion] = useState("");
  const [thisMeeting, setThisMeeting] = useState(false);
  const [history, setHistory] = useState<Exchange[]>([]);
  const [announce, setAnnounce] = useState("");
  const seq = useRef(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const hintId = useId();
  const loading = history.some((h) => h.status === "loading");

  const run = async (q: string, scoped: boolean, reuseId?: number) => {
    const id = reuseId ?? ++seq.current;
    const pending: Exchange = { id, question: q, thisMeeting: scoped, status: "loading" };
    setHistory((h) => (reuseId ? h.map((x) => (x.id === id ? pending : x)) : [pending, ...h].slice(0, KEEP)));
    setAnnounce("Your agent is looking.");
    const res = await askAgent(q, scoped ? meetingId : null);
    setHistory((h) =>
      h.map((x) =>
        x.id !== id
          ? x
          : res.ok
            ? { ...x, status: "done", data: res.data }
            : { ...x, status: "error", message: res.message, notConnected: res.reason === "not_connected" },
      ),
    );
    setAnnounce(
      res.ok
        ? res.data.abstained || !res.data.answer
          ? "Your agent found nothing that answers this."
          : `Your agent answered, with ${res.data.citations.length} source${res.data.citations.length === 1 ? "" : "s"}.`
        : res.message,
    );
  };

  const submit = () => {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion("");
    void run(q, thisMeeting);
  };

  return (
    <section className="ask" aria-labelledby={`${fieldId}-h`}>
      <div className="side-sec">
        <h3 id={`${fieldId}-h`}>Ask your agent</h3>
        <span className="side-sec-end">
          <span className="mx-chip">
            <Lock size={13} weight="fill" aria-hidden />
            Only you
          </span>
        </span>
      </div>
      <form
        className="ask-box"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={fieldId} className="sr-only">
          Ask your agent privately
        </label>
        <textarea
          id={fieldId}
          ref={input}
          rows={1}
          maxLength={1000}
          value={question}
          aria-describedby={hintId}
          placeholder="What did we decide about pricing?"
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button type="submit" className="ask-send tap" disabled={!question.trim() || loading} aria-label="Ask your agent">
          <PaperPlaneRight size={16} weight="fill" aria-hidden />
        </button>
      </form>
      <div className="ask-scope">
        <label className="ask-check">
          <input type="checkbox" checked={thisMeeting} onChange={(e) => setThisMeeting(e.target.checked)} />
          Only this meeting
        </label>
        <span id={hintId} className="ask-hint">
          Answers come from your meetings and the company brain. Nothing is shared with the room.
        </span>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {history.length === 0 ? null : (
        <ol className="ask-list" aria-label="Your questions and answers">
          {history.map((ex) => (
            <li key={ex.id} className="ask-item" aria-busy={ex.status === "loading" || undefined}>
              <p className="ask-q">
                <span className="sr-only">You asked: </span>
                {ex.question}
                {ex.thisMeeting ? <span className="ask-q-scope">This meeting</span> : null}
              </p>
              {ex.status === "loading" ? (
                <div className="ask-loading" aria-hidden>
                  <Sparkle size={14} weight="fill" />
                  <span className="ask-skel" />
                  <span className="ask-skel is-short" />
                </div>
              ) : ex.status === "error" ? (
                <div className={`ask-error${ex.notConnected ? " is-quiet" : ""}`}>
                  <p>
                    <WarningCircle size={15} weight="bold" aria-hidden />
                    {ex.message}
                  </p>
                  {ex.notConnected ? null : (
                    <button type="button" className="nfy-act is-quiet tap" disabled={loading} onClick={() => void run(ex.question, ex.thisMeeting, ex.id)}>
                      <ArrowClockwise size={14} weight="bold" aria-hidden />
                      Try again
                    </button>
                  )}
                </div>
              ) : (
                <Answer ex={ex} meetingId={meetingId} />
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
