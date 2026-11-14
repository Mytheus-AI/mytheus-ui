"use client";

import { useState } from "react";
import { orgInitial } from "@/lib/org-logo";

/* The workspace's mark wherever the workspace appears (ADR-0047): its logo in a rounded square,
   or, when there is none or the image fails to load, its initial. The logo sits on the card
   surface with a hairline ring drawn over its edge, so a white or transparent logo still has a
   shape on cream and on the dark theme; `object-fit: cover` fills the square.

   - `tone="pill"`: the initial is a dark circle (the sidebar switcher's mark since the start).
   - `tone="peach"`: the initial is a peach rounded square (the workspace chooser's rows).

   `alt` defaults to "{name} logo". Pass `decorative` where the name is already read next to it
   (the switcher's link label, a heading), so a screen reader does not hear it twice. */

const SIZES = {
  30: { box: "h-[30px] w-[30px]", text: "text-[12.5px]" },
  40: { box: "h-10 w-10", text: "text-[15px]" },
  44: { box: "h-11 w-11", text: "text-[20px]" },
  96: { box: "h-24 w-24", text: "text-[40px]" },
} as const;

export type OrgMarkSize = keyof typeof SIZES;

export function OrgMark({
  name,
  logoUrl,
  size = 30,
  tone = "pill",
  decorative = false,
  className = "",
}: {
  name: string;
  logoUrl?: string | null;
  size?: OrgMarkSize;
  tone?: "pill" | "peach";
  decorative?: boolean;
  className?: string;
}) {
  // Keyed by URL, so a new logo gets a fresh try after an earlier one failed.
  const [failed, setFailed] = useState<string | null>(null);
  const s = SIZES[size];
  const showLogo = Boolean(logoUrl) && failed !== logoUrl;

  if (showLogo) {
    return (
      <span className={`relative inline-block shrink-0 overflow-hidden rounded-ctl bg-surface ${s.box} ${className}`} data-org-mark="logo">
        {/* eslint-disable-next-line @next/next/no-img-element -- a same-origin, versioned, private image */}
        <img
          src={logoUrl!}
          alt={decorative ? "" : `${name} logo`}
          width={size}
          height={size}
          decoding="async"
          draggable={false}
          onError={() => setFailed(logoUrl!)}
          className="h-full w-full object-cover"
        />
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-ctl ring-1 ring-inset ring-line-2" />
      </span>
    );
  }

  const fallback =
    tone === "pill"
      ? `rounded-full bg-pill font-bold text-pill-on ${s.text}`
      : `rounded-ctl bg-tint-peach font-display font-medium text-ink ${s.text}`;
  return (
    <span
      className={`grid shrink-0 place-items-center leading-none ${s.box} ${fallback} ${className}`}
      data-org-mark="initial"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative ? true : undefined}
    >
      {orgInitial(name)}
    </span>
  );
}
