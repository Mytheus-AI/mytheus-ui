"use client";

import Link from "next/link";
import { ArrowUpRight, EnvelopeSimple, Microphone, PencilSimpleLine, SlackLogo, VideoCamera } from "@phosphor-icons/react";
import { chipClass } from "@/components/ui/Chip";
import type { PromiseChannel, PromiseSource } from "@/lib/promises/ledger";

/* Where a promise was made, as a chip that opens the original moment or message: the meeting
   (an app link), the Slack message (its permalink, in a new tab), the email, or who added it. The
   quote, when there is one, is the chip's title so a hover shows the words; screen readers get the
   whole source in the accessible name. A source with nothing to open is a plain chip. */

const ICON: Record<PromiseChannel, typeof VideoCamera> = {
  meeting: VideoCamera,
  in_person: Microphone,
  slack: SlackLogo,
  email: EnvelopeSimple,
  manual: PencilSimpleLine,
};

const KIND: Record<PromiseChannel, string> = {
  meeting: "Said in the meeting",
  in_person: "Said in person, recorded on the phone",
  slack: "Written in Slack",
  email: "Written in an email",
  manual: "Added by hand",
};

export function SourceChip({ source, className = "" }: { source: PromiseSource; className?: string }) {
  const Icon = ICON[source.channel];
  const inner = (
    <>
      <Icon size={13} weight="bold" aria-hidden className="shrink-0" />
      <span className="truncate">{source.label}</span>
      {source.link && source.external ? <ArrowUpRight size={12} weight="bold" aria-hidden className="shrink-0" /> : null}
    </>
  );
  const quote = source.quote ? `: "${source.quote}"` : "";
  const name = `${KIND[source.channel]}${source.channel === "meeting" || source.channel === "in_person" ? `, ${source.label}` : ""}${quote}`;
  const cls = chipClass("outline", `max-w-[240px] ${className}`);
  if (!source.link) {
    return (
      <span className={cls} title={source.quote ?? undefined}>
        <span className="sr-only">{name}</span>
        <span aria-hidden className="inline-flex min-w-0 items-center gap-1.5">
          {inner}
        </span>
      </span>
    );
  }
  const interactive = `${cls} transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal`;
  const label = `${name}. Open the ${source.channel === "slack" ? "message in Slack" : source.channel === "email" ? "email" : source.link.startsWith("/") ? "meeting" : "link"}`;
  if (source.external) {
    return (
      <a href={source.link} target="_blank" rel="noopener noreferrer" className={interactive} aria-label={label} title={source.quote ?? undefined}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={source.link} className={interactive} aria-label={label} title={source.quote ?? undefined}>
      {inner}
    </Link>
  );
}
