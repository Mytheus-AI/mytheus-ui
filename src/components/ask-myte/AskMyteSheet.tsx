"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowsOut, Plus, X } from "@phosphor-icons/react";
import { myteStarters } from "@/app/actions/myte-threads";
import { useOrgContext } from "@/lib/org-context";
import type { FaceState } from "@/lib/ask-myte/reducer";
import type { Starter } from "@/lib/ask-myte/starters";
import type { AskPage } from "@/lib/ask-myte/types";
import { AskMyteChat, type MytePersona } from "./AskMyteChat";
import { MyteFace } from "./parts";
import { TalkButton } from "./TalkButton";
import { useAskMyte } from "./useAskMyte";

/* The ⌘J sheet (the approved plan, "⌘J on any page"): a panel on the right (full screen on a
   phone) headed by the Myte's live plush, its name and what it is doing. It knows the page it
   opened on (a meeting, a decision, a person) and shows that as a removable scope chip. It reads
   and writes the same threads as /ask, and "Open full page" moves the thread there.

   A modal dialog: focus moves in on open, Tab stays inside, and focus returns to whatever opened
   it. Escape stops a streaming answer first, then closes. */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AskMyteSheet({
  open,
  onClose,
  persona,
  pathPage,
  request,
  modKey,
}: {
  open: boolean;
  onClose: () => void;
  persona: MytePersona;
  /** the page under the sheet, from the path and the breadcrumb */
  pathPage: AskPage | null;
  /** the latest open request: a page and a question an entry point passed */
  request: { page: AskPage | null; question: string | null; n: number } | null;
  modKey: string;
}) {
  const router = useRouter();
  const { user } = useOrgContext();
  const conv = useAskMyte();
  const panel = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [face, setFace] = useState<{ state: FaceState; words: string }>({ state: "idle", words: `${persona.name} is here` });
  const [starters, setStarters] = useState<Record<string, Starter[] | null>>({});
  const [autoSend, setAutoSend] = useState<{ q: string; n: number } | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [talk, setTalk] = useState(0);

  const page = request?.page ?? pathPage;
  const pageKey = page?.id ? `${page.kind}:${page.id}` : "home";

  // Starters for this page (or the six from your week), read once per page.
  useEffect(() => {
    if (!open || pageKey in starters) return;
    setStarters((s) => ({ ...s, [pageKey]: null }));
    void myteStarters(page).then((list) => setStarters((s) => ({ ...s, [pageKey]: list })));
  }, [open, pageKey, page, starters]);

  // An entry point that passed a question asks it as the sheet opens.
  useEffect(() => {
    if (request?.question) setAutoSend({ q: request.question, n: request.n });
  }, [request]);

  // Focus in on open.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => composerRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open, request?.n]);

  const newQuestion = useCallback(() => {
    conv.reset();
    setAutoSend(null);
    setChatKey((k) => k + 1);
    requestAnimationFrame(() => composerRef.current?.focus());
  }, [conv]);

  const openFull = () => {
    const href = conv.threadId ? `/ask?t=${conv.threadId}` : "/ask";
    onClose();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // A dialog inside the sheet (voice mode, the routine form) handles its own keys.
    const inner = (e.target as HTMLElement | null)?.closest?.('[role="dialog"]');
    if (inner && inner !== panel.current) return;
    if (e.key === "Escape" && !e.defaultPrevented) {
      e.preventDefault();
      if (conv.streaming) conv.stop();
      else onClose();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const empty = conv.messages.length === 0;

  return (
    <div className="fixed inset-0 z-[60]" hidden={!open} onKeyDown={onKeyDown}>
      <button type="button" tabIndex={-1} aria-label="Close Ask Myte" onClick={onClose} className="absolute inset-0 bg-[rgba(26,22,18,0.28)]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Ask ${persona.name}`}
        className="mx-pop absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden bg-bg shadow-warm-3 sm:inset-y-3 sm:right-3 sm:w-[min(460px,calc(100vw-24px))] sm:rounded-hero sm:border sm:border-line"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <MyteFace seed={persona.seed} name={persona.name} state={face.state} size={44} live={open} followInput={composerRef} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight text-ink">{persona.name}</p>
            <p className="truncate text-[13px] leading-tight text-ink-3">
              <span>Your Myte</span>
              <span aria-hidden>{face.state === "idle" ? "" : `, ${face.words.replace(`${persona.name} is `, "")}`}</span>
            </p>
          </div>
          <TalkButton compact name={persona.name} onTalk={() => setTalk((n) => n + 1)} disabled={conv.streaming} />
          {!empty ? (
            <button
              type="button"
              onClick={newQuestion}
              aria-label="New question"
              title="New question"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
            >
              <Plus size={18} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={openFull}
            disabled={conv.streaming}
            aria-label="Open full page"
            title={conv.streaming ? "Available when the answer finishes" : "Open full page"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink disabled:opacity-40"
          >
            <ArrowsOut size={18} aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close (Esc). ${modKey}J opens it again`}
            title="Close (Esc)"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="relative min-h-0 flex-1">
          <AskMyteChat
            key={`${chatKey}:${autoSend?.n ?? 0}:${pageKey}`}
            conv={conv}
            persona={persona}
            viewer={{ name: user.name || "You", email: user.email, seed: user.avatarSeed ?? null, image: user.imageUrl ?? null }}
            firstName={(user.name.split(/\s+/)[0] ?? "").trim()}
            isAdmin={user.role === "admin"}
            variant="sheet"
            page={page}
            starters={starters[pageKey] ?? null}
            autoSend={autoSend?.q ?? null}
            composerRef={composerRef}
            onFace={(state, words) => setFace((f) => (f.state === state && f.words === words ? f : { state, words }))}
            talkSignal={talk}
          />
        </div>
      </div>
    </div>
  );
}
