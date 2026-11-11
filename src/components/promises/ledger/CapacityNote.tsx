"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { checkCapacity } from "@/app/actions/promises";
import { Button } from "@/components/ui/Button";
import { isIsoDate, type CapacityCheck } from "@/lib/promises/ledger";

/* The agent's word at the moment of saying yes: while a date is picked, it checks that day (a
   private read of your own week) and, when it would get tight, says so in one sentence with one
   tap to use the first day that has room ("That's your seventh promise due Friday. Offer Monday
   instead?"). A day with room gets a quiet line, a failed check says nothing rather than guess.
   `exclude` leaves out the item being re-dated, so it is not counted twice. */

/** The viewer's IANA zone once in the browser (null on the server and the first render). */
export function useViewerZone(): string | null {
  const [tz, setTz] = useState<string | null>(null);
  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || null);
    } catch {
      setTz(null);
    }
  }, []);
  return tz;
}

export function useCapacityCheck(
  due: string,
  tz: string | null,
  exclude?: { kind: "commitment" | "action"; id: string },
): { check: CapacityCheck | null; checking: boolean } {
  const [check, setCheck] = useState<CapacityCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const seq = useRef(0);
  const excludeKey = exclude ? `${exclude.kind}:${exclude.id}` : "";
  useEffect(() => {
    if (!isIsoDate(due)) {
      setCheck(null);
      return;
    }
    const n = ++seq.current;
    setChecking(true);
    const t = window.setTimeout(async () => {
      const res = await checkCapacity(due, tz, exclude);
      if (n !== seq.current) return;
      setChecking(false);
      setCheck(res.ok ? res.check : null);
    }, 250);
    return () => window.clearTimeout(t);
    // `exclude` is compared by its key; the object itself is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due, tz, excludeKey]);
  return { check: isIsoDate(due) ? check : null, checking };
}

export function CapacityNote({
  check,
  checking,
  onUseSuggested,
  suggestVerb = "Use",
}: {
  check: CapacityCheck | null;
  checking: boolean;
  onUseSuggested?: (date: string) => void;
  /** "Use" in a form that sets the date, "Offer" where the date goes to someone */
  suggestVerb?: string;
}) {
  return (
    <div aria-live="polite" className="min-h-[24px]">
      {check ? (
        check.warn ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-ctl bg-priority-medium-soft px-3.5 py-3 text-[14px] leading-relaxed text-ink-2">
            <Sparkle size={16} weight="fill" aria-hidden className="shrink-0 text-priority-medium" />
            <p className="min-w-0 flex-[1_1_220px]">
              <span className="font-semibold text-ink">Your agent: </span>
              {check.message}
            </p>
            {check.suggested_date && onUseSuggested ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onUseSuggested(check.suggested_date as string)}>
                {suggestVerb} {check.suggested_label}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-[13.5px] text-ink-3">
            <Sparkle size={14} aria-hidden className="shrink-0" />
            {check.message}
          </p>
        )
      ) : checking ? (
        <p className="text-[13.5px] text-ink-3">Checking that day...</p>
      ) : null}
    </div>
  );
}
