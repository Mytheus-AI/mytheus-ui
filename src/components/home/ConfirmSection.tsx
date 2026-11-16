"use client";

import { useState } from "react";
import { ArrowCounterClockwise, Check, CheckCircle, X } from "@phosphor-icons/react";
import s from "@/components/home/home.module.css";

/* The promise the product is built on, made operable: your Myte proposes, you confirm. The card
   is a real control on the page. Confirm stamps it as yours and sends it down the week, where it
   shows up as context in every meeting after it; Dismiss drops it and nothing is kept. "Reset"
   puts the proposal back. Reduced motion swaps states without the travel. Sample content. */

const WEEK = [
  { day: "Tue", title: "Q3 launch sync", note: "Decided here" },
  { day: "Wed", title: "Pricing review", note: "Shown as context" },
  { day: "Thu", title: "Eng planning", note: "Shown as context" },
  { day: "Fri", title: "Friday standup", note: "Answered from it" },
];

type State = "proposed" | "confirmed" | "dismissed";

export function ConfirmSection() {
  const [state, setState] = useState<State>("proposed");

  return (
    <section id="confirm" data-snap="" data-snap-label="You confirm" className="py-[clamp(72px,10vw,136px)] min-[1000px]:flex min-[1000px]:min-h-[100svh] min-[1000px]:flex-col min-[1000px]:justify-center">
      <div className="mx-auto w-[min(1280px,100%-40px)] sm:w-[min(1280px,100%-80px)]">
        <div className="grid items-center gap-x-[clamp(32px,6vw,96px)] gap-y-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div data-snap-in="">
            <h2 className="display max-w-[13ch] text-[clamp(2.4rem,5.2vw,4.2rem)] leading-[0.98]">Nothing is written until you say so.</h2>
            <p className="mt-5 max-w-[44ch] text-[clamp(1.06rem,1.5vw,1.2rem)] leading-relaxed text-ink-3">
              Your Myte proposes. You confirm, edit or dismiss. Only a confirmed decision is saved and carried into the meetings after it.
              Try it.
            </p>
          </div>

          <div data-snap-in="" style={{ ["--si" as string]: 2 }} className="relative">
            <div
              className={`${s.proposal} ${state === "confirmed" ? s.proposalOn : ""} ${state === "dismissed" ? s.proposalOff : ""} rounded-hero border bg-surface p-[clamp(18px,2.4vw,28px)]`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-[10px] py-[3px] text-[12.5px] font-semibold ${
                    state === "confirmed" ? "bg-ok-soft text-ok" : state === "dismissed" ? "bg-bg-2 text-ink-3" : "bg-signal-soft text-signal-ink"
                  }`}
                >
                  {state === "confirmed" ? <CheckCircle size={14} weight="fill" aria-hidden /> : null}
                  {state === "confirmed" ? "Confirmed by you" : state === "dismissed" ? "Dismissed, nothing kept" : "Proposed by your Myte"}
                </span>
                <span className="text-[13.5px] text-ink-3">Q3 launch sync, Tuesday 14:20</span>
              </div>
              <p className={`mt-4 font-display text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.08] text-ink ${state === "dismissed" ? "line-through decoration-ink-4" : ""}`}>
                The Q3 launch moves to August 14.
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-3">Heard from Maya and Priya, after QA asked for two days past code freeze.</p>

              <div className="mt-6 flex flex-wrap items-center gap-3" aria-live="polite">
                {state === "proposed" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setState("confirmed")}
                      className="inline-flex h-11 items-center gap-2 rounded-ctl bg-pill px-[18px] text-[15px] font-semibold text-pill-on transition-[background-color,transform] hover:bg-pill-2 motion-safe:active:scale-[.98]"
                    >
                      <Check size={18} weight="bold" aria-hidden />
                      Confirm decision
                    </button>
                    <button
                      type="button"
                      onClick={() => setState("dismissed")}
                      className="inline-flex h-11 items-center gap-2 rounded-ctl px-[18px] text-[15px] font-semibold text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink"
                    >
                      <X size={18} aria-hidden />
                      Dismiss
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[15px] font-semibold text-ink">{state === "confirmed" ? "Decision confirmed." : "Dismissed. Your Myte will not bring it up again."}</p>
                    <button
                      type="button"
                      onClick={() => setState("proposed")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-ctl px-3 text-[14px] font-semibold text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
                    >
                      <ArrowCounterClockwise size={15} aria-hidden />
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div>

            <ol className={`${s.week2} ${state === "confirmed" ? s.week2On : ""} mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4`} aria-label="Where the confirmed decision shows up">
              {WEEK.map((w, i) => (
                <li
                  key={w.day}
                  className="relative rounded-card border border-line bg-surface-2 px-3.5 py-3"
                  style={{ ["--dl" as string]: `${0.15 + i * 0.18}s` }}
                >
                  <span className="text-[13px] font-semibold text-ink-3">{w.day}</span>
                  <p className="text-[14.5px] font-semibold leading-snug text-ink">{w.title}</p>
                  <p className={`${s.weekNote} mt-1 text-[13px] text-signal-ink`}>{w.note}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
