"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react";
import type { CaptionLine } from "@/lib/realtime/captions";
import { formatOffset } from "@/lib/realtime/meeting-clock";
import { momentLines } from "@/lib/realtime/moments";
import type { MomentTarget } from "@/components/sidebar/MomentLine";

/* The live transcript, opened from a card's moment (polish program, Phase 1: "click to open the
   live transcript there"). It takes the Agent tab's place, so the call keeps its stage and the
   cards keep their state underneath; Back (or Escape) returns to them with focus on the moment
   you came from. The lines the moment points at carry the coral line, the product's mark for
   "this was carried forward", and the view opens scrolled to them with focus on the first. It
   stays live: new lines keep arriving below. */

export function LiveTranscript({
  lines,
  target,
  speakerLabel,
  meetingId,
  onClose,
}: {
  lines: CaptionLine[];
  target: MomentTarget;
  speakerLabel: (speakerId: string) => string;
  meetingId: string;
  onClose: () => void;
}) {
  const finals = useMemo(() => lines.filter((l) => l.isFinal), [lines]);
  const hit = useMemo(() => new Set(momentLines(finals, target.startMs, target.endMs)), [finals, target.startMs, target.endMs]);
  const first = useRef<HTMLLIElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const placed = useRef(false);

  // Scroll to the moment once, when it is first on screen; never pull the view after that.
  useEffect(() => {
    if (placed.current) return;
    if (first.current) {
      placed.current = true;
      first.current.scrollIntoView({ block: "center" });
      first.current.focus({ preventScroll: true });
    } else if (heading.current) {
      placed.current = true;
      heading.current.focus();
    }
  }, [hit]);

  let marked = false;
  return (
    <section
      className="ltx"
      aria-labelledby="ltx-h"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="ltx-head">
        <button type="button" className="nfy-act is-quiet tap" onClick={onClose}>
          <ArrowLeft size={14} weight="bold" aria-hidden />
          Back to your agent
        </button>
        <Link href={`/meetings/${meetingId}/transcript`} target="_blank" rel="noopener" className="ltx-full tap">
          Full transcript
          <ArrowUpRight size={12} weight="bold" aria-hidden />
          <span className="sr-only"> (opens in a new tab)</span>
        </Link>
      </div>
      <h3 id="ltx-h" className="ltx-title" tabIndex={-1} ref={heading}>
        Live transcript
      </h3>
      <p className="ltx-sub">
        Showing {target.label}. {hit.size === 0 ? "That moment is not in the live transcript yet." : null}
      </p>
      {finals.length === 0 ? (
        <p className="agent-quiet">The transcript fills in as people speak.</p>
      ) : (
        <ol className="ltx-list" aria-label="Transcript lines">
          {finals.map((l) => {
            const isHit = hit.has(l.chunkId);
            const isFirst = isHit && !marked;
            if (isHit) marked = true;
            return (
              <li
                key={l.chunkId}
                ref={isFirst ? first : undefined}
                tabIndex={isFirst ? -1 : undefined}
                className={`ltx-line${isHit ? " is-moment" : ""}`}
                aria-current={isHit ? "true" : undefined}
              >
                <time className="ltx-time">{formatOffset(l.startMs / 1000)}</time>
                <span className="ltx-body">
                  <b>{speakerLabel(l.speakerId)}</b>
                  <span>{l.text}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
