"use client";

import { AiPausedNote, useAiPaused } from "@/lib/ai-status";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import dynamic from "next/dynamic";
import { listPeerQuestions } from "@/app/actions/myte-v2";
import type { PendingAttachment } from "@/lib/ask-myte/attachments";
import type { PeerQuestion } from "@/lib/ask-myte/types";
import { RoutineDialog } from "./RoutineDialog";
import { faceState, faceWords, plainText, type Answer, type FaceState } from "@/lib/ask-myte/reducer";
import { failureCopy } from "@/lib/ask-myte/compose";
import { pageChipLabel, pageChipNoun, scopeForPage, scopePlaceholder } from "@/lib/ask-myte/page-context";
import type { Starter } from "@/lib/ask-myte/starters";
import { ALL_SCOPE, type AskPage, type AskScope } from "@/lib/ask-myte/types";
import { Composer } from "./Composer";
import { Conversation, type Viewer } from "./Conversation";
import { SourcesPanel } from "./SourcesPanel";
import { MyteFace } from "./parts";
import type { AskMyteState } from "./useAskMyte";
import { useMyteVoice } from "./voice";

/* The conversation surface both the /ask page and the ⌘J sheet are built from: the empty state
   led by the Myte's live plush, the messages, the composer, the sources panel, the face state
   (D9) and the screen-reader announcements. The caller owns the conversation (`useAskMyte`) and
   the frame around it. */


/** How many suggestions the empty chat offers: the two most relevant (the builders put prep for
    the next meeting and what you owe first). More read as a wall of buttons. */
const SHOWN_STARTERS = 2;

export type MytePersona = { name: string; seed: string; personality: string | null };

// Voice mode is heavy (speech engines, Web Audio) and rarely opened: loaded on the first Talk.
const VoiceMode = dynamic(() => import("./VoiceMode").then((m) => m.default), { ssr: false });

const HAPPY_MS = 1400;
const DRAFT_PREFIX = "mx-ask-draft:";

export function AskMyteChat({
  conv,
  persona,
  viewer,
  firstName,
  isAdmin,
  variant,
  page = null,
  starters,
  autoSend = null,
  initialScope = null,
  composerRef,
  onFace,
  header,
  talkSignal = 0,
}: {
  conv: AskMyteState;
  persona: MytePersona;
  viewer: Viewer;
  firstName: string;
  isAdmin: boolean;
  variant: "page" | "sheet";
  /** the page the sheet opened on */
  page?: AskPage | null;
  starters: Starter[] | null;
  /** a question to send once, on mount (`/ask?q=`) */
  autoSend?: string | null;
  initialScope?: AskScope | null;
  composerRef: RefObject<HTMLTextAreaElement>;
  /** the face's state, for a header that shows it */
  onFace?: (state: FaceState, words: string) => void;
  header?: ReactNode;
  /** bumped by the frame's Talk button to open voice mode (ADR-0049 F6) */
  talkSignal?: number;
}) {
  const sheet = variant === "sheet";
  const draftKey = `${DRAFT_PREFIX}${variant}`;
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [usePage, setUsePage] = useState(true);
  const [scope, setScope] = useState<AskScope>(initialScope ?? ALL_SCOPE);
  const [happyUntil, setHappyUntil] = useState(0);
  const [celebrate, setCelebrate] = useState(0);
  const [openSource, setOpenSource] = useState<{ key: string; n: number } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [offline, setOffline] = useState(false);
  const [, force] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const sentAuto = useRef(false);
  const sourcesId = useId();
  const voice = useMyteVoice();
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [routine, setRoutine] = useState<{ open: boolean; question: string }>({ open: false, question: "" });
  const [talking, setTalking] = useState(false);
  const [sentPeer, setSentPeer] = useState<PeerQuestion[]>([]);
  // AI paused for the workspace (ADR-0051 D2): nothing is sent; the composer says why instead.
  const paused = useAiPaused();

  // Drafts survive a reload (per surface); a sent question clears its draft.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved && !autoSend) setDraft(saved);
    } catch {
      // storage blocked: drafts last for this visit
    }
  }, [draftKey, autoSend]);
  const changeDraft = (v: string) => {
    setDraft(v);
    try {
      if (v) localStorage.setItem(draftKey, v);
      else localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const pageScope = page && usePage ? scopeForPage(page) : null;
  const effectiveScope = pageScope ?? scope;
  const effectivePage = page && usePage ? page : null;

  const ask = useCallback(
    (q: string) => {
      if (paused) return;
      voice.stop();
      conv.send(q, effectiveScope, effectivePage, { attachments: attachments.map(({ name, text }) => ({ name, text })) });
      setAttachments([]);
      changeDraft("");
      pinned.current = true;
      setOpenSource(null);
    },
    // changeDraft is stable enough (closes over draftKey only)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conv.send, effectiveScope, effectivePage, voice.stop, attachments, paused],
  );

  useEffect(() => {
    if (talkSignal > 0 && !paused) {
      voice.stop();
      setTalking(true);
    }
    // only when the frame asks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talkSignal]);

  // Questions this thread sent to teammates' Mytes (ADR-0049 F1), for its confirmed proposals.
  const hasPeer = conv.messages.some((m) => m.role === "myte" && m.proposals.some((p) => p.kind === "ask_myte" && p.status === "confirmed"));
  useEffect(() => {
    if (!conv.threadId || !hasPeer) return;
    let live = true;
    void listPeerQuestions("sent").then((res) => {
      if (live && res.ok) setSentPeer(res.items.filter((q) => q.thread_id === conv.threadId));
    });
    return () => {
      live = false;
    };
  }, [conv.threadId, hasPeer]);

  useEffect(() => {
    if (autoSend && !sentAuto.current) {
      sentAuto.current = true;
      ask(autoSend);
    }
  }, [autoSend, ask]);

  /* ---------------- the face ---------------- */
  const live = useMemo(() => [...conv.messages].reverse().find((m): m is Answer => m.role === "myte" && m.status === "streaming") ?? null, [conv.messages]);
  const happy = happyUntil > Date.now();
  useEffect(() => {
    if (!happyUntil) return;
    const t = window.setTimeout(() => force((n) => n + 1), Math.max(0, happyUntil - Date.now()) + 20);
    return () => window.clearTimeout(t);
  }, [happyUntil]);
  const face = faceState({ answer: live, typing: focused && draft.trim() !== "", reading: voice.speakingKey !== null, happy });
  const words = faceWords(face, persona.name);
  useEffect(() => onFace?.(face, words), [face, words, onFace]);

  /* ---------------- announcements ---------------- */
  const lastAnswer = useMemo(() => [...conv.messages].reverse().find((m): m is Answer => m.role === "myte") ?? null, [conv.messages]);
  const phase = lastAnswer ? `${lastAnswer.key}:${lastAnswer.status}:${lastAnswer.text ? "t" : ""}` : "";
  useEffect(() => {
    if (!lastAnswer) return;
    if (lastAnswer.status === "streaming") setAnnounce(lastAnswer.text ? `${persona.name} is answering.` : `${persona.name} is looking.`);
    else if (lastAnswer.status === "done") {
      const n = lastAnswer.sources.length;
      const body = plainText(lastAnswer.text);
      setAnnounce(`${persona.name} answered: ${body.slice(0, 400)}${body.length > 400 ? "..." : ""} ${n ? `${n} source${n === 1 ? "" : "s"}.` : ""}`);
    } else if (lastAnswer.status === "stopped") setAnnounce("Stopped.");
    else if (lastAnswer.error) setAnnounce(failureCopy(lastAnswer.error.reason, { name: persona.name, message: lastAnswer.error.message, isAdmin }).title);
    // phase captures what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ---------------- scrolling ---------------- */
  useEffect(() => {
    const el = scroller.current;
    if (el && pinned.current && conv.messages.length) el.scrollTop = el.scrollHeight;
  }, [conv.messages]);

  const sourcesFor = openSource ? conv.messages.find((m): m is Answer => m.role === "myte" && m.key === openSource.key) : null;
  const empty = conv.messages.length === 0;

  const onProposal: Parameters<typeof Conversation>[0]["onProposal"] = (key, id, status, edits) => {
    conv.markProposal(key, id, status, edits);
    if (status === "confirmed") {
      setHappyUntil(Date.now() + HAPPY_MS);
      setCelebrate((c) => c + 1);
    }
  };

  const greeting = (
    <div className={`flex flex-col items-center text-center ${sheet ? "pt-4" : "pt-[clamp(8px,4vh,48px)]"}`}>
      <MyteFace seed={persona.seed} name={persona.name} state={face} size={sheet ? 96 : 136} followInput={composerRef} celebrate={celebrate} />
      <h2 className={`display mt-4 text-balance text-ink ${sheet ? "text-[24px]" : "text-[clamp(26px,3.4vw,34px)]"}`}>
        Hi {firstName || "there"}, it&apos;s {persona.name}. What should I find?
      </h2>
      <p className="mt-2 max-w-[52ch] text-[15px] text-ink-3">I can see the meetings you were in, your work and the company brain.</p>
      {starters && starters.length ? (
        <ul className={`mt-6 grid w-full gap-2.5 text-left ${sheet ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`} aria-label="Ask one of these">
          {starters.slice(0, SHOWN_STARTERS).map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => ask(s.question)}
                disabled={offline || paused}
                className="flex min-h-[64px] w-full flex-col justify-center rounded-card border border-line bg-surface px-4 py-3 text-left transition-[border-color,box-shadow] duration-150 hover:border-line-2 hover:shadow-warm-1 disabled:opacity-60"
              >
                <span className="text-[15px] font-semibold leading-snug text-ink">{s.question}</span>
                <span className="mt-0.5 text-[13px] text-ink-3">{s.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : starters === null ? (
        <ul className={`mt-6 grid w-full gap-2.5 ${sheet ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`} aria-hidden>
          {Array.from({ length: SHOWN_STARTERS }, (_, i) => (
            <li key={i} className="h-[64px] rounded-card bg-bg-2 motion-safe:animate-pulse" />
          ))}
        </ul>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {header}
        <div
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className={`min-h-0 flex-1 overflow-y-auto ${sheet ? "px-4 sm:px-5" : "px-4 sm:px-6"}`}
        >
          <div className={`mx-auto w-full ${sheet ? "max-w-none" : "max-w-[720px]"} pb-6`}>
            {empty ? (
              greeting
            ) : (
              <div className="pt-6">
                <Conversation
                  messages={conv.messages}
                  persona={persona}
                  viewer={viewer}
                  face={face}
                  now={conv.now}
                  isAdmin={isAdmin}
                  voice={voice}
                  onOpenSource={(key, n) => setOpenSource({ key, n })}
                  onRetry={(key) => conv.retry(key)}
                  onFollowup={ask}
                  onProposal={onProposal}
                  onFeedback={(key, fb, reason) => conv.setFeedback(key, fb, reason)}
                  onRoutine={(question) => setRoutine({ open: true, question })}
                  threadId={conv.threadId}
                  sentPeer={sentPeer}
                />
              </div>
            )}
          </div>
        </div>

        <div className={`shrink-0 ${sheet ? "px-4 pb-4 sm:px-5" : "px-4 pb-5 sm:px-6"}`}>
          <div className={`mx-auto w-full ${sheet ? "" : "max-w-[720px]"}`}>
            {offline ? (
              <p className="mb-2 rounded-ctl bg-priority-medium-soft px-3.5 py-2 text-[14px] text-ink" role="status">
                You&apos;re offline. I&apos;ll be ready when you&apos;re back.
              </p>
            ) : null}
            {paused ? (
              <AiPausedNote what={`${persona.name} can't answer or take new questions right now. Your past chats stay here.`} />
            ) : (
            <Composer
              value={draft}
              onChange={changeDraft}
              onSubmit={ask}
              streaming={conv.streaming}
              onStop={conv.stop}
              scope={scope}
              onScope={setScope}
              pageChip={page && usePage ? { label: pageChipLabel(page), short: pageChipNoun(page), kind: page.kind, onRemove: () => setUsePage(false) } : null}
              inputRef={composerRef}
              lastQuestion={conv.lastQuestion}
              placeholder={scopePlaceholder(effectiveScope, empty ? `Ask ${persona.name} anything…` : "Ask a follow-up…")}
              label={`Ask ${persona.name}`}
              offline={offline}
              compact={sheet}
              onFocusChange={setFocused}
              attachments={attachments}
              onAttachments={setAttachments}
              onRoutine={(question) => setRoutine({ open: true, question })}
            />
            )}
            {!sheet && !paused ? <p className="mt-2 text-center text-[12.5px] text-ink-3">{persona.name} answers from what you can see in Mytheus and cites every claim.</p> : null}
          </div>
        </div>
      </div>

      {sourcesFor ? (
        sheet ? (
          <div role="region" aria-labelledby={sourcesId} className="absolute inset-0 z-30 flex flex-col bg-surface">
            <SourcesPanel sources={sourcesFor.sources} focused={openSource?.n ?? null} headingId={sourcesId} onClose={() => setOpenSource(null)} />
          </div>
        ) : (
          <>
            <aside aria-labelledby={sourcesId} className="hidden w-[360px] shrink-0 border-l border-line bg-bg xl:flex xl:flex-col">
              <SourcesPanel sources={sourcesFor.sources} focused={openSource?.n ?? null} headingId={sourcesId} onClose={() => setOpenSource(null)} />
            </aside>
            {/* Below xl the sources open as a sheet over the page. */}
            <div
              className="fixed inset-0 z-50 flex items-end xl:hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${sourcesId}-m`}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setOpenSource(null);
                }
              }}
            >
              <button type="button" tabIndex={-1} aria-label="Close sources" onClick={() => setOpenSource(null)} className="absolute inset-0 bg-[rgba(26,22,18,0.45)]" />
              <div className="relative max-h-[80dvh] w-full overflow-hidden rounded-t-hero bg-surface shadow-warm-3 sm:mx-auto sm:mb-6 sm:max-w-[560px] sm:rounded-hero">
                <SourcesPanel sources={sourcesFor.sources} focused={openSource?.n ?? null} headingId={`${sourcesId}-m`} onClose={() => setOpenSource(null)} />
              </div>
            </div>
          </>
        )
      ) : null}

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announce}
      </p>

      {talking ? (
        <VoiceMode
          conv={conv}
          persona={persona}
          firstName={firstName}
          scope={effectiveScope}
          page={effectivePage}
          isAdmin={isAdmin}
          size={sheet ? 168 : 200}
          onClose={() => {
            setTalking(false);
            requestAnimationFrame(() => composerRef.current?.focus());
          }}
        />
      ) : null}

      <RoutineDialog
        open={routine.open}
        question={routine.question}
        scope={effectiveScope.kind === "all" ? null : effectiveScope}
        myteName={persona.name}
        onClose={() => setRoutine((r) => ({ ...r, open: false }))}
      />
    </div>
  );
}
