"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChatsCircle, Check, Sparkle, X } from "@phosphor-icons/react";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CharCount, textareaClass } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { answerPeerQuestion, declinePeerQuestion, getPeerQuestion } from "@/app/actions/myte-v2";
import { useMyAgent } from "@/lib/my-agent";
import { useOrgContext } from "@/lib/org-context";
import { defaultDoodleSeed } from "@/lib/doodle";
import { notifyError, notifySuccess } from "@/lib/toast";
import { browserTimeZone } from "@/lib/timezone";
import { failureCopy } from "@/lib/ask-myte/compose";
import { sourceKindLabel, sourcePreview, sourceTitle } from "@/lib/ask-myte/citations";
import { ago, cleanDraft, firstName } from "@/lib/ask-myte/peer";
import { faceState, newAnswer, reduceAnswer, type Answer } from "@/lib/ask-myte/reducer";
import { ALL_SCOPE, LIMITS, type PeerQuestion } from "@/lib/ask-myte/types";
import { AnswerText, StepsLine } from "@/components/ask-myte/parts";
import { streamAsk } from "@/components/ask-myte/stream";

/* Questions for your Myte (ADR-0049 F1), the recipient's side, in the Inbox. A teammate asked
   your Myte something; nothing leaves until you review it. Open one to read the question with
   the asker's doodle, let your own Myte draft an answer from your data (the Ask Myte stream in
   `peer_answer` mode, run in your session: you see its sources, the asker never does), edit it,
   then Send or Decline (with an optional reason). The section opens a question by itself when
   the page is reached from its notification (`?peer_question=<id>`). */

export function PeerQuestionsSection({ initial, openId = null, nowIso }: { initial: PeerQuestion[] | null; openId?: string | null; nowIso: string }) {
  const [items, setItems] = useState<PeerQuestion[]>(initial ?? []);
  const [open, setOpen] = useState<PeerQuestion | null>(null);
  const now = Date.parse(nowIso);

  useEffect(() => setItems(initial ?? []), [initial]);

  // Reached from a notification: open that question (read fresh, it may have been settled).
  useEffect(() => {
    if (!openId) return;
    const known = (initial ?? []).find((q) => q.id === openId);
    if (known) setOpen(known);
    else
      void getPeerQuestion(openId).then((res) => {
        if (res.ok) setOpen(res.question);
        else notifyError(res.message);
      });
  }, [openId, initial]);

  const pending = items.filter((q) => q.status === "pending");
  const settled = items.filter((q) => q.status !== "pending").slice(0, 3);

  const onSettled = (q: PeerQuestion) => {
    setItems((list) => list.map((x) => (x.id === q.id ? q : x)));
    setOpen(null);
  };

  if (initial === null) {
    return (
      <Note tone="warning" className="mb-5">
        Questions teammates asked your Myte couldn&apos;t be loaded just now. They are safe, and nothing was sent.
      </Note>
    );
  }
  if (!items.length) return null;

  return (
    <>
      <Card as="section" flush id="peer-questions" aria-labelledby="peer-h" className="mb-5 scroll-mt-4">
        <CardHead
          id="peer-h"
          title="Questions for your Myte"
          description="Teammates asked your Myte. Nothing is sent until you review it."
          right={pending.length ? <Chip tone="accent">{pending.length} waiting</Chip> : null}
          divided
        />
        <ul className="divide-y divide-line">
          {[...pending, ...settled].map((q) => (
            <li key={q.id} className="flex flex-wrap items-start gap-3 px-4 py-4 sm:flex-nowrap sm:px-[22px]">
              <Avatar name={q.from_user.name} id={q.from_user.id} size="md" className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-ink-3">
                  <span className="font-semibold text-ink">{q.from_user.name}</span> asked your Myte
                  <span>, {ago(q.created_at, now)}</span>
                </p>
                <p className="mt-1 line-clamp-2 text-[15.5px] leading-snug text-ink">{q.question}</p>
                {q.status !== "pending" ? (
                  <p className="mt-1.5">
                    <Chip tone={q.status === "answered" ? "ok" : "neutral"} icon={q.status === "answered" ? <Check size={13} weight="bold" /> : undefined}>
                      {q.status === "answered" ? "Answer sent" : "Declined"}
                    </Chip>
                  </p>
                ) : null}
              </div>
              {q.status === "pending" ? (
                <Button size="sm" onClick={() => setOpen(q)} className="ml-auto" aria-label={`Review ${firstName(q.from_user.name)}'s question`}>
                  Review
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      {open ? <PeerReviewSheet question={open} onClose={() => setOpen(null)} onSettled={onSettled} /> : null}
    </>
  );
}

/* ---------------- the review screen ---------------- */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function PeerReviewSheet({ question: q, onClose, onSettled }: { question: PeerQuestion; onClose: () => void; onSettled: (q: PeerQuestion) => void }) {
  const uid = useId();
  const { user } = useOrgContext();
  const agent = useMyAgent();
  const my = {
    name: agent?.name ?? (user.name.split(" ")[0] ? `${user.name.split(" ")[0]}'s Myte` : "Your Myte"),
    seed: agent?.seed ?? defaultDoodleSeed(`agent:${user.id}`),
  };
  const asker = firstName(q.from_user.name);
  const [draft, setDraft] = useState<Answer | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"send" | "decline" | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [happy, setHappy] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const abort = useRef<AbortController | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const settled = q.status !== "pending";

  useEffect(() => {
    const el = document.activeElement;
    opener.current = el instanceof HTMLElement ? el : null;
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(), 40);
    return () => {
      window.clearTimeout(t);
      abort.current?.abort();
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    };
  }, []);

  const runDraft = useCallback(() => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setError(null);
    let a = newAnswer("peer", Date.now());
    setDraft(a);
    void streamAsk(
      {
        question: q.question,
        scope: ALL_SCOPE,
        page: null,
        mode: "peer_answer",
        peer: { question_id: q.id, from_name: q.from_user.name, question: q.question },
        timezone: browserTimeZone(),
      },
      (ev) => {
        a = reduceAnswer(a, ev, Date.now());
        setDraft(a);
        if (ev.event === "done") {
          setText(cleanDraft(a.text).slice(0, LIMITS.peerAnswer));
          requestAnimationFrame(() => field.current?.focus());
        }
      },
      controller.signal,
    ).then(() => {
      if (controller.signal.aborted) return;
      setDraft((d) => (d && d.status === "streaming" ? { ...d, status: "error", error: { reason: "unavailable", message: "" } } : d));
    });
  }, [q]);

  const send = async () => {
    const answer = text.trim();
    if (!answer) {
      setError(`Write the answer for ${asker} first.`);
      field.current?.focus();
      return;
    }
    setBusy("send");
    const res = await answerPeerQuestion(q.id, answer);
    setBusy(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setHappy((n) => n + 1);
    notifySuccess(`Answer sent to ${asker}`);
    onSettled(res.question);
  };

  const decline = async () => {
    setBusy("decline");
    const res = await declinePeerQuestion(q.id, reason.trim() || null);
    setBusy(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    notifySuccess("Question declined");
    onSettled(res.question);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && !e.defaultPrevented && !busy) {
      e.preventDefault();
      if (draft?.status === "streaming") abort.current?.abort();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    if (e.shiftKey && document.activeElement === items[0]) {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (!e.shiftKey && document.activeElement === items[items.length - 1]) {
      e.preventDefault();
      items[0].focus();
    }
  };

  const streaming = draft?.status === "streaming";
  const face = faceState({ answer: draft, typing: false, reading: false, happy: false });
  const failure = draft?.status === "error" && draft.error ? failureCopy(draft.error.reason, { name: my.name, message: draft.error.message, isAdmin: user.role === "admin" }) : null;

  return (
    <div className="fixed inset-0 z-[60]" onKeyDown={onKeyDown}>
      <button type="button" tabIndex={-1} aria-label="Close" onClick={() => !busy && onClose()} className="absolute inset-0 bg-[rgba(26,22,18,0.28)]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-t`}
        aria-describedby={`${uid}-d`}
        className="mx-pop absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden bg-bg shadow-warm-3 sm:inset-y-3 sm:right-3 sm:w-[min(560px,calc(100vw-24px))] sm:rounded-hero sm:border sm:border-line"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-signal-soft text-signal-ink">
            <ChatsCircle size={18} weight="bold" />
          </span>
          <h2 id={`${uid}-t`} className="min-w-0 flex-1 truncate text-[16px] font-semibold text-ink">
            {asker}&apos;s question for {my.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            aria-label="Close (Esc)"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <Avatar name={q.from_user.name} id={q.from_user.id} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] text-ink-3">
                <span className="font-semibold text-ink">{q.from_user.name}</span> asked your Myte, {ago(q.created_at, Date.now())}
              </p>
              <blockquote className="display mt-2 text-[21px] leading-snug text-ink">&ldquo;{q.question}&rdquo;</blockquote>
            </div>
          </div>
          <p id={`${uid}-d`} className="mt-4 rounded-ctl bg-bg-2 px-3.5 py-3 text-[14px] leading-relaxed text-ink-2">
            {asker} sees only the answer you send. What {my.name} reads to draft it, and its sources, stay with you.
          </p>

          {settled ? (
            <Note tone="info" className="mt-5">
              {q.status === "answered" ? "You already sent an answer to this question." : "You declined this question."}
            </Note>
          ) : (
            <>
              {/* Draft with my Myte */}
              <section aria-label={`${my.name}'s draft`} className="mt-5 rounded-card border border-line bg-surface p-4 sm:p-5" data-ask-column="">
                <div className="flex items-center gap-3">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-surface-2 ring-1 ring-line">
                    <span className="block h-14 w-14">
                      <AgentOrb seed={my.seed} mode="live" state={face} size={56} label={`${my.name}, your Myte`} celebrate={happy} />
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{my.name}</p>
                    <p className="text-[13px] text-ink-3" aria-live="polite">
                      {streaming ? (draft?.text ? "Writing a draft" : "Looking through your work") : draft?.status === "done" ? "Drafted from what you can see" : "Can draft an answer from your work"}
                    </p>
                  </div>
                  {!streaming ? (
                    <Button size="sm" variant={draft ? "outline" : "primary"} onClick={runDraft} data-autofocus="">
                      <Sparkle size={15} weight="fill" aria-hidden />
                      {draft ? "Draft again" : `Draft with ${my.name}`}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => abort.current?.abort()}>
                      Stop
                    </Button>
                  )}
                </div>
                {draft ? (
                  <div className="mt-3">
                    <StepsLine steps={draft.steps} streaming={streaming} />
                    {draft.text ? (
                      <div className="mt-3 rounded-ctl bg-surface-2 px-3.5 py-3">
                        <AnswerText text={draft.text} sources={draft.sources} onOpen={() => {}} streaming={streaming} />
                      </div>
                    ) : null}
                    {draft.status === "done" && draft.sources.length ? (
                      <details className="mt-3 group">
                        <summary className="cursor-pointer rounded-ctl py-1 text-[14px] font-semibold text-ink-3 hover:text-ink">
                          {draft.sources.length === 1 ? "1 source" : `${draft.sources.length} sources`}, only you see these
                        </summary>
                        <ol className="mt-1.5 space-y-2">
                          {draft.sources.map((s) => (
                            <li key={s.n} className="rounded-ctl border border-line px-3 py-2 text-[13.5px]">
                              <p className="font-semibold text-ink">
                                {s.n}, {sourceKindLabel(s)}: {sourceTitle(s)}
                              </p>
                              {s.text ? <p className="mt-0.5 text-ink-3">{sourcePreview(s, 180)}</p> : null}
                            </li>
                          ))}
                        </ol>
                      </details>
                    ) : null}
                    {failure ? (
                      <p className="mt-3 text-[14px] text-ink-2" role="alert">
                        <span className="font-semibold">{failure.title}</span> {failure.detail}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <div className="mt-5">
                <label htmlFor={`${uid}-a`} className="mb-1.5 block text-[14px] font-semibold text-ink">
                  Your answer to {asker}
                </label>
                <textarea
                  id={`${uid}-a`}
                  ref={field}
                  rows={7}
                  maxLength={LIMITS.peerAnswer}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={draft ? "" : `Write it yourself, or let ${my.name} draft it first.`}
                  className={`${textareaClass} resize-y`}
                />
                <div className="mt-1 flex justify-between gap-2 text-[12.5px] text-ink-3">
                  <span>Citations are left out of what {asker} receives.</span>
                  <CharCount n={text.length} max={LIMITS.peerAnswer} />
                </div>
              </div>

              {declining ? (
                <div className="mt-4 rounded-card border border-line bg-surface p-4">
                  <label htmlFor={`${uid}-r`} className="mb-1.5 block text-[14px] font-semibold text-ink">
                    Why not? (optional, {asker} sees it)
                  </label>
                  <textarea id={`${uid}-r`} rows={2} maxLength={LIMITS.declineReason} value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="danger-outline" onClick={() => void decline()} disabled={!!busy}>
                      {busy === "decline" ? "Declining" : "Decline question"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeclining(false)} disabled={!!busy}>
                      Keep it
                    </Button>
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="mt-3 text-[14px] text-priority-high" role="alert">
                  {error}
                </p>
              ) : null}
            </>
          )}
        </div>

        {!settled ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-bg px-4 py-3 sm:px-5">
            {!declining ? (
              <Button variant="ghost" onClick={() => setDeclining(true)} disabled={!!busy || streaming}>
                Decline
              </Button>
            ) : null}
            <Button onClick={() => void send()} disabled={!!busy || streaming || !text.trim()}>
              {busy === "send" ? "Sending" : `Send to ${asker}`}
            </Button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
