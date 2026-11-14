"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ChatCircleDots } from "@phosphor-icons/react";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { LinkButton, buttonClass } from "@/components/ui/Button";
import { LIMITS } from "@/lib/ask-myte/types";
import { useAskMyteSheet } from "./sheet-context";
import { useModKey } from "./mod-key";
import { AI_PAUSED_TITLE, useAiPaused } from "@/lib/ai-status";

/* An ask box that hands off to Ask Myte: Your Myte's page (a large box at the top, plus "Open Ask
   Myte") and Home (a bar under the greeting with two starters). Sending opens /ask with the
   question already asked; a starter does the same. Small and dependency-light on purpose: the
   full Ask Myte code only loads on /ask or when the sheet opens. */

export function AskBox({
  name,
  seed,
  placeholder,
  starters = [],
  size = "md",
  openButton = false,
  sheet = false,
}: {
  /** the Myte's name, for the label */
  name: string;
  seed?: string | null;
  placeholder: string;
  starters?: { question: string; hint?: string }[];
  size?: "md" | "lg";
  /** show "Open Ask Myte" beside the box */
  openButton?: boolean;
  /** open the ⌘J sheet instead of the page */
  sheet?: boolean;
}) {
  const router = useRouter();
  const { open } = useAskMyteSheet();
  const mod = useModKey();
  const [q, setQ] = useState("");
  const id = useId();
  // AI paused for the workspace: the box stays where it is, says so and sends nothing.
  const paused = useAiPaused();
  const go = (question: string) => {
    if (paused) return;
    const text = question.trim().slice(0, LIMITS.question);
    if (!text) return;
    if (sheet) open({ question: text });
    else router.push(`/ask?q=${encodeURIComponent(text)}`);
    setQ("");
  };
  const lg = size === "lg";

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className={`flex items-center gap-2 rounded-hero border border-line-2 bg-surface shadow-warm-1 transition-[border-color,box-shadow] duration-150 focus-within:border-ink-4 focus-within:shadow-warm-2 ${lg ? "p-2.5 pl-3" : "p-2 pl-2.5"}`}
      >
        {seed ? (
          <span className={`block shrink-0 overflow-hidden rounded-full bg-surface-2 ${lg ? "h-11 w-11" : "h-9 w-9"}`}>
            <AgentOrb seed={seed} size={lg ? 44 : 36} />
          </span>
        ) : (
          <ChatCircleDots size={20} aria-hidden className="ml-1 shrink-0 text-ink-3" />
        )}
        <label htmlFor={id} className="sr-only">
          Ask {name}
        </label>
        <input
          id={id}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={LIMITS.question}
          placeholder={paused ? AI_PAUSED_TITLE : placeholder}
          disabled={paused}
          autoComplete="off"
          data-ring="none"
          className={`min-w-0 flex-1 bg-transparent px-1 text-ink !outline-none placeholder:text-ink-3 disabled:cursor-not-allowed ${lg ? "h-11 text-[17px]" : "h-10 text-[15.5px]"}`}
        />
        <kbd aria-hidden className="hidden shrink-0 rounded-full border border-line-2 bg-surface-2 px-2 py-0.5 font-sans text-[12.5px] font-semibold text-ink-3 md:inline">
          {mod === "⌘" ? "⌘J" : `${mod} J`}
        </kbd>
        <button
          type="submit"
          disabled={paused || !q.trim()}
          aria-label={`Ask ${name}`}
          className={`grid shrink-0 place-items-center rounded-full bg-pill text-pill-on transition-[background-color,opacity] hover:bg-pill-2 disabled:opacity-40 ${lg ? "h-11 w-11" : "h-10 w-10"}`}
        >
          <ArrowUp size={18} weight="bold" aria-hidden />
        </button>
      </form>
      {!paused && (starters.length || openButton) ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {starters.map((s) => (
            <button
              key={s.question}
              type="button"
              onClick={() => go(s.question)}
              className="min-h-10 rounded-full border border-line-2 bg-surface px-3.5 text-left text-[14px] font-medium text-ink-2 transition-colors hover:border-signal-line hover:text-ink"
            >
              {s.question}
              {s.hint ? <span className="text-ink-3">, {s.hint}</span> : null}
            </button>
          ))}
          {openButton ? (
            <LinkButton href="/ask" variant="outline" size="sm" className="ml-auto">
              Open Ask Myte
            </LinkButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** "Ask about this meeting" / "Ask about this decision": opens the sheet scoped to it. */
export function AskAboutButton({ kind, id, title, className = "" }: { kind: "meeting" | "decision" | "person"; id: string; title: string | null; className?: string }) {
  const { open } = useAskMyteSheet();
  const noun = kind === "meeting" ? "this meeting" : kind === "decision" ? "this decision" : title ? title.split(/\s+/)[0] : "them";
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => open({ page: { kind, id, title } })}
      className={buttonClass({ variant: "outline", className })}
    >
      <ChatCircleDots size={18} aria-hidden />
      Ask about {noun}
    </button>
  );
}
