"use client";

import { useState } from "react";
import { ArrowSquareOut, Info, Microphone, ShieldCheck, SpeakerHigh, StopCircle } from "@phosphor-icons/react";
import { Dialog } from "@/components/ui/Dialog";

/* "What it records": the last line of the setup card. It opens a dialog that says exactly what
   the extension captures, when, and what the person capturing has to do first. */

const POINTS = [
  {
    icon: SpeakerHigh,
    text: "The meeting tab's audio: everyone else on the call, told apart as Speaker 1, Speaker 2 and so on. You keep hearing the call as usual.",
  },
  {
    icon: Microphone,
    text: "Your microphone, as you. Without it your own words would be missing.",
  },
  {
    icon: StopCircle,
    text: "Only while you transcribe. A bar on the meeting page says so the whole time, and capture stops when you press Stop, leave the call or close the tab.",
  },
  {
    icon: ShieldCheck,
    text: "Tell everyone first. Mytheus asks you to confirm you did before every capture, keeps that confirmation with the meeting, and gives you a note to paste into the chat.",
  },
];

export function WhatItRecords() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-8 items-center gap-2 rounded-ctl text-[14.5px] font-semibold text-ink underline decoration-line-2 underline-offset-4 transition-colors duration-150 hover:decoration-current"
      >
        <Info size={17} aria-hidden />
        What it records
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="What it records"
        description="Capture listens to one call at a time, and only after you start it."
      >
        <ul className="flex flex-col gap-4 text-[15px] leading-relaxed text-ink-2">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="grid grid-cols-[22px_minmax(0,1fr)] gap-3">
              <Icon size={20} className="mt-0.5 text-ink-3" aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-line pt-4 text-[14px] leading-relaxed text-ink-3">
          Chrome on a computer only. The Zoom desktop app is not supported; join from the browser instead.{" "}
          <a
            href="https://support.google.com/chrome_webstore/answer/2664769"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-ink underline underline-offset-2"
          >
            About Chrome extensions
            <ArrowSquareOut size={14} aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </p>
      </Dialog>
    </>
  );
}
