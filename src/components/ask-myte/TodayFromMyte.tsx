"use client";

import Link from "next/link";
import { X } from "@phosphor-icons/react";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { Card } from "@/components/ui/Card";
import type { NudgeData } from "@/app/actions/myte-v2";
import { useAskMyteSheet } from "./sheet-context";
import { useNudges } from "./nudges-client";

/* "Today from Myte" on Home (ADR-0049 F2): up to three openers your Myte picked from the day
   (a meeting about to start, a teammate's question waiting, a routine's answer, what is overdue
   or due today, new decisions since your last visit), each one tap from being asked in the sheet.
   Led by the Myte's live plush. Dismissed openers stay away for the day; with nothing to say it
   says so in one quiet line. */

export function TodayFromMyte({ data, name, seed }: { data: NudgeData; name: string; seed: string }) {
  const { open } = useAskMyteSheet();
  const { nudges, dismissNudge } = useNudges(data, 3);

  return (
    <Card as="section" flush aria-labelledby="today-myte-h">
      <div className="flex items-center gap-3.5 px-4 pb-3 pt-[18px] sm:px-[22px]">
        <span className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full bg-surface-2 ring-1 ring-line">
          <span className="block h-[52px] w-[52px]">
            <AgentOrb seed={seed} mode="live" state="idle" size={52} label={`${name}, your Myte`} />
          </span>
        </span>
        <div className="min-w-0">
          <h2 id="today-myte-h" className="text-[17px] font-semibold leading-snug text-ink">
            Today from {name}
          </h2>
          <p className="font-display text-[15px] leading-snug text-ink-3">{nudges.length ? "A few things worth a moment" : "Nothing pressing right now"}</p>
        </div>
      </div>
      {nudges.length ? (
        <ul className="divide-y divide-line border-t border-line">
          {nudges.map((n) => (
            <li key={n.id} className="flex items-start gap-2 px-4 py-3.5 sm:px-[22px]">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-snug text-ink">{n.text}</p>
                <div className="mt-2">
                  {n.action.type === "ask" ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (n.action.type === "ask") open({ question: n.action.question });
                      }}
                      className="inline-flex h-9 items-center rounded-full border border-line-2 bg-surface px-3.5 text-[14px] font-semibold text-ink transition-colors hover:border-signal-line hover:bg-surface-2"
                    >
                      {n.cta}
                    </button>
                  ) : (
                    <Link
                      href={n.action.href}
                      className="inline-flex h-9 items-center rounded-full border border-line-2 bg-surface px-3.5 text-[14px] font-semibold text-ink transition-colors hover:border-signal-line hover:bg-surface-2"
                    >
                      {n.cta}
                    </Link>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissNudge(n.id)}
                aria-label={`Dismiss for today: ${n.text}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
              >
                <X size={15} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-line px-4 py-3.5 text-[14.5px] text-ink-3 sm:px-[22px]">I&apos;ll say something here when a meeting is close, something is due, or a teammate asks me a question.</p>
      )}
    </Card>
  );
}
