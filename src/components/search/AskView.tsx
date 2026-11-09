"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, Sparkle, X } from "@phosphor-icons/react";
import { askQuestion } from "@/app/actions/ask";
import { PageHeader } from "@/components/settings/primitives";
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ask"
        description="Answers from the meetings you were in, your team's documents and confirmed decisions."
      />
      <form
        role="search"
        className="flex items-center gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          ask(query);
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Sparkle
            size={21}
            weight="fill"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-signal-deep"
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
            placeholder="Ask a question, like “What did we decide about pricing?”"
            className="h-14 w-full rounded-pill border border-line-2 bg-surface pl-[50px] pr-12 text-[16px] font-medium text-ink placeholder:font-normal placeholder:text-ink-3 transition-colors hover:border-ink-3 focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--signal-soft)] focus-visible:outline-none focus-visible:!rounded-pill sm:text-[17px]"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => {
                setQuery("");
                latest.current++;
                setState({ status: "idle" });
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[10px] text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink active:bg-bg-3 focus-visible:!rounded-[10px]"
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line-2 bg-bg px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-3 sm:block">
              /
            </kbd>
          )}
        </div>
        <button
          type="submit"
          disabled={!query.trim() || pending}
          className="inline-flex h-14 shrink-0 items-center gap-2 rounded-pill bg-pill px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:!rounded-pill"
        >
          Ask
          <ArrowRight size={16} weight="bold" aria-hidden="true" />
        </button>
      </form>
      <AskPanel state={state} onAsk={ask} />
    </div>
  );
}
