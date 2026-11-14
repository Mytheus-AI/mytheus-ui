"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClockCounterClockwise, Plus, X } from "@phosphor-icons/react";
import { getMyteThread } from "@/app/actions/myte-threads";
import { notifyError } from "@/lib/toast";
import type { FaceState } from "@/lib/ask-myte/reducer";
import type { Starter } from "@/lib/ask-myte/starters";
import type { AskScope, Thread, ThreadList } from "@/lib/ask-myte/types";
import { AskMyteChat, type MytePersona } from "./AskMyteChat";
import type { Viewer } from "./Conversation";
import { HistoryRail } from "./HistoryRail";
import { MyteFace } from "./parts";
import { TalkButton } from "./TalkButton";
import { useAskMyte } from "./useAskMyte";

/* /ask: history on the left, the conversation in the middle (at most 720px), sources on the right
   when a citation is opened. Below lg the history is a drawer opened from the header; below xl
   the sources open as a sheet. The thread is in the URL (`/ask?t=<id>`), kept in step with the
   browser's own history without a server round trip; ⌘N (Ctrl+N) starts a new question where the
   browser allows it. */

export function AskMytePage({
  persona,
  viewer,
  firstName,
  isAdmin,
  initialThread,
  initialThreads,
  starters,
  autoSend,
  initialScope,
  goneThread,
}: {
  persona: MytePersona;
  viewer: Viewer;
  firstName: string;
  isAdmin: boolean;
  initialThread: Thread | null;
  initialThreads: ThreadList | null;
  starters: Starter[];
  autoSend: string | null;
  initialScope: AskScope | null;
  /** `?t=` named a thread that is not there (deleted, or never yours) */
  goneThread: boolean;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [talk, setTalk] = useState(0);
  const [face, setFace] = useState<{ state: FaceState; words: string }>({ state: "idle", words: `${persona.name} is here` });
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerOpener = useRef<HTMLElement | null>(null);

  const onSaved = useCallback((id: string) => {
    const url = `/ask?t=${id}`;
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(window.history.state, "", url);
    setRefreshKey((k) => k + 1);
  }, []);

  const conv = useAskMyte({ initialThread, onSaved });
  const { load, reset } = conv;

  useEffect(() => {
    if (goneThread) notifyError("That question is no longer in your history.");
    // `?q=` is sent once: drop it so a reload doesn't ask again (the thread id replaces it once saved).
    if (autoSend || goneThread) window.history.replaceState(window.history.state, "", "/ask");
    // on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = useCallback(
    async (id: string, push = true) => {
      setDrawer(false);
      if (id === conv.threadId) return;
      const res = await getMyteThread(id);
      if (!res.ok) {
        notifyError(res.message);
        if (res.gone) setRefreshKey((k) => k + 1);
        return;
      }
      load(res.thread);
      if (push) window.history.pushState(window.history.state, "", `/ask?t=${id}`);
      requestAnimationFrame(() => composerRef.current?.focus());
    },
    [conv.threadId, load],
  );

  const newQuestion = useCallback(() => {
    setDrawer(false);
    reset();
    if (window.location.search) window.history.pushState(window.history.state, "", "/ask");
    requestAnimationFrame(() => composerRef.current?.focus());
  }, [reset]);

  // Back and forward move between threads.
  useEffect(() => {
    const onPop = () => {
      const t = new URLSearchParams(window.location.search).get("t");
      if (t) void open(t, false);
      else reset();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, reset]);

  // ⌘N / Ctrl+N: a new question. Esc stops a streaming answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        newQuestion();
      } else if (e.key === "Escape" && !e.defaultPrevented && conv.streaming) {
        e.preventDefault();
        conv.stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newQuestion, conv]);

  // The history drawer (below lg): focus moves in, stays in, and returns.
  useEffect(() => {
    if (!drawer) return;
    const el = document.activeElement;
    drawerOpener.current = el instanceof HTMLElement ? el : null;
    const t = window.setTimeout(() => drawerRef.current?.querySelector<HTMLElement>("button, input, a[href]")?.focus(), 30);
    return () => {
      window.clearTimeout(t);
      if (drawerOpener.current?.isConnected) drawerOpener.current.focus({ preventScroll: true });
    };
  }, [drawer]);

  const rail = (
    <HistoryRail
      initial={initialThreads}
      activeId={conv.threadId}
      onOpen={(id) => void open(id)}
      onNew={newQuestion}
      refreshKey={refreshKey}
      onDeleted={(id) => {
        if (id === null || id === conv.threadId) newQuestion();
      }}
    />
  );

  const empty = conv.messages.length === 0;

  const header = (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-5">
      <button
        type="button"
        onClick={() => setDrawer(true)}
        aria-label="Your chats"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink lg:hidden"
      >
        <ClockCounterClockwise size={20} aria-hidden />
      </button>
      {empty ? (
        <h1 className="display min-w-0 flex-1 truncate text-[20px] text-ink">Ask {persona.name}</h1>
      ) : (
        <>
          <MyteFace seed={persona.seed} name={persona.name} state={face.state} size={48} followInput={composerRef} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold leading-tight text-ink">{conv.title ?? "New chat"}</h1>
            <p className="truncate text-[13px] leading-tight text-ink-3" aria-hidden>
              {face.words}
            </p>
          </div>
        </>
      )}
      <TalkButton name={persona.name} onTalk={() => setTalk((n) => n + 1)} disabled={conv.streaming} />
      <button
        type="button"
        onClick={newQuestion}
        aria-label="New chat"
        title="New chat"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink lg:hidden"
      >
        <Plus size={20} aria-hidden />
      </button>
    </div>
  );

  return (
    <div className="-mb-12 flex h-[calc(100dvh-68px-20px)] min-h-[520px] overflow-hidden rounded-hero border border-line bg-bg shadow-warm-1">
      <aside aria-label="Your chats" className="hidden w-[272px] shrink-0 border-r border-line bg-bg lg:flex lg:flex-col">
        {rail}
      </aside>

      {drawer ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Your chats"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !e.defaultPrevented) {
              e.stopPropagation();
              setDrawer(false);
            }
            if (e.key !== "Tab" || !drawerRef.current) return;
            const items = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'));
            if (!items.length) return;
            if (e.shiftKey && document.activeElement === items[0]) {
              e.preventDefault();
              items[items.length - 1].focus();
            } else if (!e.shiftKey && document.activeElement === items[items.length - 1]) {
              e.preventDefault();
              items[0].focus();
            }
          }}
        >
          <button type="button" tabIndex={-1} aria-label="Close" onClick={() => setDrawer(false)} className="absolute inset-0 bg-[rgba(26,22,18,0.45)]" />
          <div ref={drawerRef} className="relative flex h-full w-[300px] max-w-[calc(100vw-48px)] flex-col bg-bg shadow-warm-3">
            <div className="flex justify-end px-2 pt-2">
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close your chats"
                className="grid h-10 w-10 place-items-center rounded-ctl text-ink-3 hover:bg-bg-2 hover:text-ink"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1">{rail}</div>
          </div>
        </div>
      ) : null}

      <section aria-label={`Conversation with ${persona.name}`} className="relative flex min-w-0 flex-1 flex-col">
        <AskMyteChat
          conv={conv}
          persona={persona}
          viewer={viewer}
          firstName={firstName}
          isAdmin={isAdmin}
          variant="page"
          starters={starters}
          autoSend={autoSend}
          initialScope={initialScope}
          composerRef={composerRef}
          onFace={(state, words) => setFace((f) => (f.state === state && f.words === words ? f : { state, words }))}
          header={header}
          talkSignal={talk}
        />
      </section>
    </div>
  );
}
