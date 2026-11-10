"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MagnifyingGlass, Sparkle, X } from "@phosphor-icons/react";
import { askQuestion } from "@/app/actions/ask";
import { Button } from "@/components/ui/Button";
import { Page, PageHead } from "@/components/ui/Page";
import { AskPanel, type AskState } from "./AskPanel";

/* Ask: a question about your meetings, answered by rag-service with numbered sources (mytheus-docs
   ADR-0033). The page holds no data of its own: every result comes from `POST /api/rag/query`
   through the gateway, scoped server-side to the meetings this user took part in.

   The composer is one rounded box: the field, the clear control and Ask sit inside a single
   bordered surface whose coral outline shows while anything in it has focus. */

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
    <Page width="read">
      <PageHead
        title="Ask Mytheus"
        context="Ask about the meetings you were in, your team's documents and confirmed decisions. Every answer shows its sources."
      />
      <form
        role="search"
        aria-label="Ask a question"
        onSubmit={(e) => {
          e.preventDefault();
          ask(query);
        }}
        className="flex items-center gap-2 rounded-card border border-line-2 bg-surface py-2 pl-4 pr-2 shadow-warm-1 transition-[border-color] duration-150 hover:border-ink-4 focus-within:border-signal focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-signal"
      >
        <Sparkle size={21} weight="fill" className="shrink-0 text-signal" aria-hidden="true" />
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
          data-ring="none"
          placeholder="Ask a question, like “What did we decide about pricing?”"
          className="h-11 min-w-0 flex-1 bg-transparent text-[17px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-3"
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon
            aria-label="Clear the question"
            onClick={() => {
              setQuery("");
              latest.current++;
              setState({ status: "idle" });
              inputRef.current?.focus();
            }}
          >
            <X size={16} aria-hidden="true" />
          </Button>
        ) : (
          <kbd
            aria-hidden
            className="pointer-events-none hidden shrink-0 rounded-full border border-line-2 bg-surface-2 px-2 py-0.5 font-sans text-[12.5px] font-semibold text-ink-3 sm:block"
          >
            /
          </kbd>
        )}
        <Button type="submit" disabled={!query.trim() || pending} aria-busy={pending} className="max-[520px]:w-11 max-[520px]:px-0">
          <MagnifyingGlass size={18} weight="bold" aria-hidden="true" className="min-[521px]:hidden" />
          <span className="max-[520px]:sr-only">{pending ? "Asking" : "Ask"}</span>
        </Button>
      </form>
      <div className="mt-7">
        <AskPanel state={state} onAsk={ask} />
      </div>
    </Page>
  );
}
