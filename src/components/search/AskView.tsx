"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MagnifyingGlass, Sparkle, X } from "@phosphor-icons/react";
import { askQuestion } from "@/app/actions/ask";
import { PageHead } from "@/components/app/PageHead";
import { AskPanel, type AskState } from "./AskPanel";

/* Ask: a question about your meetings, answered by rag-service with numbered sources (mytheus-docs
   ADR-0033). The page holds no data of its own: every result comes from `POST /api/rag/query`
   through the gateway, scoped server-side to the meetings this user took part in. */

export function AskView({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<AskState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef(0);

  // "/" jumps to the field from anywhere on the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Arriving from the command palette (`/search?q=...`) asks straight away, once.
  const askedInitial = useRef(false);
  useEffect(() => {
    if (askedInitial.current || !initialQuery.trim()) return;
    askedInitial.current = true;
    ask(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on arrival
  }, []);

  const ask = (raw: string) => {
    const question = raw.trim();
    if (!question || pending) return;
    setQuery(question);
    const ticket = ++latest.current;
    setState({ status: "loading", question });
    startTransition(async () => {
      const res = await askQuestion(question);
      if (ticket !== latest.current) return; // a newer question superseded this one
      setState(
        res.ok
          ? { status: "done", question, result: res.data }
          : { status: "error", question, message: res.message },
      );
    });
  };

  return (
    <div className="mx-auto flex max-w-[960px] flex-col">
      <PageHead
        title="Ask Mytheus"
        context="Ask about the meetings you were in, your team's documents and confirmed decisions. Every answer shows its sources."
      />
      <section aria-label="Ask a question" className="rounded-card border border-line bg-surface p-3 shadow-warm-1 sm:p-4">
        <form
          role="search"
          className="flex items-stretch gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            ask(query);
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Sparkle
              size={21}
              weight="fill"
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-signal"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id="ask-query"
              name="ask-query"
              type="text"
              enterKeyHint="search"
              autoFocus
              maxLength={1000}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Ask Mytheus a question"
              aria-keyshortcuts="/"
              placeholder="Ask a question, like “What did we decide about pricing?”"
              className="h-14 w-full rounded-ctl border border-line-2 bg-surface pl-[50px] pr-12 text-[16px] font-medium text-ink placeholder:font-normal placeholder:text-ink-3 transition-[border-color,box-shadow] hover:border-ink-4 focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--signal-soft)] focus-visible:outline-none sm:text-[17px]"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear the question"
                onClick={() => {
                  setQuery("");
                  latest.current++;
                  setState({ status: "idle" });
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink active:bg-bg-3"
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : (
              <kbd
                aria-hidden
                className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-full border border-line-2 bg-surface-2 px-2 py-0.5 font-sans text-[12px] font-semibold text-ink-3 sm:block"
              >
                /
              </kbd>
            )}
          </div>
          <button
            type="submit"
            disabled={!query.trim() || pending}
            className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-ctl bg-pill px-5 text-[15px] font-semibold text-pill-on transition-[background-color,box-shadow] hover:bg-pill-2 hover:shadow-warm-2 disabled:cursor-not-allowed disabled:opacity-50 max-[520px]:w-14 max-[520px]:px-0"
          >
            <MagnifyingGlass size={18} weight="bold" aria-hidden="true" className="min-[521px]:hidden" />
            <span className="max-[520px]:sr-only">{pending ? "Asking" : "Ask"}</span>
          </button>
        </form>
      </section>
      <div className="mt-7">
        <AskPanel state={state} onAsk={ask} />
      </div>
    </div>
  );
}
