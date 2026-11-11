"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { LockSimple, PlugsConnected } from "@phosphor-icons/react";
import { readBlastRadius } from "@/app/actions/blast-radius";
import { Button } from "@/components/ui/Button";
import { CardFoot, CardHead, cardClass } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { Bone } from "@/components/ui/Page";
import type { BlastRadius, Load, RingNumber } from "@/lib/api/why-blast-types";
import { BLAST_POLL, RING_LABEL, checkedLine, effectPhrase, itemLabel } from "@/lib/blast-radius";
import { dayLabel } from "@/lib/decision-why";
import { RippleMap } from "./RippleMap";
import { EffectDot, RippleDetail } from "./RippleParts";
import { RippleStack } from "./RippleStack";
import "./blast-radius.css";

/* Blast radius on a decision's page (#blast): what this decision touches, as ripples. Ring 1 is
   the work it changes, ring 2 goals and other teams' decisions, ring 3 customers. Read on the
   server with the page; this island re-reads on Retry and while the agent is still working it out
   (every 5 s for a minute).

   Wide enough (600px of section), it is a map; narrower, the same rings stack as lists. A
   visually hidden list carries the whole ripple for screen readers either way. */

const HEAD_ID = "blast-h";
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function BlastRadiusSection({ decisionId, initial }: { decisionId: string; initial: Load<BlastRadius> }) {
  const [load, setLoad] = useState<Load<BlastRadius>>(initial);
  const [retrying, setRetrying] = useState(false);
  const [slow, setSlow] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [stackOpen, setStackOpen] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<RingNumber>>(() => new Set());
  const [width, setWidth] = useState(760);
  const [animate, setAnimate] = useState(true);
  const mapBox = useRef<HTMLDivElement>(null);

  useEffect(() => setLoad(initial), [initial]);

  const reread = useCallback(async () => {
    const next = await readBlastRadius(decisionId);
    setLoad((prev) => (next.ok || !prev.ok ? next : prev));
    return next;
  }, [decisionId]);

  const data = load.ok ? load.data : null;
  const pending = data?.state === "pending";

  useEffect(() => {
    if (!pending) return;
    setSlow(false);
    const started = Date.now();
    const t = window.setInterval(() => {
      if (Date.now() - started > BLAST_POLL.forMs) {
        window.clearInterval(t);
        setSlow(true);
        return;
      }
      void reread().then((r) => {
        if (r.ok && r.data.state === "ready") window.clearInterval(t);
      });
    }, BLAST_POLL.everyMs);
    return () => window.clearInterval(t);
  }, [pending, reread]);

  // The map lays itself out for the section's own width.
  useBrowserLayoutEffect(() => {
    const el = mapBox.current;
    if (!el) return;
    // 0 while the map is not displayed (the section is narrow and shows the list instead).
    const measure = () => {
      const w = Math.round(el.clientWidth);
      if (w > 0) setWidth(w);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data?.state]);

  // The rings draw once, when the map first appears; later re-renders do not replay it.
  useEffect(() => {
    if (data?.state !== "ready") return;
    const t = window.setTimeout(() => setAnimate(false), 2400);
    return () => window.clearTimeout(t);
  }, [data?.state]);

  const retry = async () => {
    setRetrying(true);
    await reread();
    setRetrying(false);
  };

  const frame = (body: ReactNode, opts: { description?: ReactNode; foot?: ReactNode } = {}) => (
    <section id="blast" aria-labelledby={HEAD_ID} className={`${cardClass({ flush: true, clip: false })} scroll-mt-24`}>
      <CardHead
        id={HEAD_ID}
        title="Blast radius"
        description={opts.description ?? "What this decision touches: the work it changes, goals and other teams, and customers."}
        divided
      />
      {body}
      {opts.foot}
    </section>
  );

  if (!load.ok) {
    if (load.reason === "error") {
      return frame(
        <div className="pt-4">
          <ErrorState
            variant="inline"
            title="We couldn't work out what this decision touches"
            text="Nothing was lost. This is usually a passing problem reaching the workspace."
            onRetry={() => void retry()}
          />
          {retrying ? <span className="sr-only" role="status">Retrying</span> : null}
        </div>,
      );
    }
    return frame(
      <div className="px-4 py-[18px] sm:px-[22px]">
        <Note>
          <span className="inline-flex items-center gap-1.5">
            <LockSimple size={15} aria-hidden className="shrink-0" />
            Only people who were in this decision&rsquo;s meeting can see what it touches.
          </span>
        </Note>
      </div>,
    );
  }

  const blast = load.data;
  const hubspotMissing = blast.crm.hubspot === "not_connected";

  if (blast.state === "pending") {
    return frame(
      <div className="px-4 py-[18px] sm:px-[22px]" role="status" aria-live="polite">
        <div className="flex items-center gap-5">
          <svg viewBox="0 0 120 120" aria-hidden className="h-24 w-24 shrink-0">
            {[22, 40, 56].map((r) => (
              <circle key={r} cx={20} cy={60} r={r} className="br-ring" />
            ))}
            <circle cx={20} cy={60} r={9} className="fill-[var(--signal)]" />
          </svg>
          <div className="min-w-0 flex-1 space-y-2.5">
            <Bone className="h-8 w-[60%] !rounded-full" />
            <Bone className="h-8 w-[44%] !rounded-full" />
            <Bone className="h-8 w-[52%] !rounded-full" />
          </div>
        </div>
        <p className="mt-4 font-display text-[16px] italic text-ink-3">
          {slow ? "This is taking longer than usual. Your agent is still working it out." : "Working out what this decision touches"}
        </p>
        {slow ? (
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => void retry()} disabled={retrying}>
            {retrying ? "Checking" : "Check again"}
          </Button>
        ) : null}
      </div>,
    );
  }

  const total = blast.rings.reduce((n, r) => n + r.items.length, 0);
  if (total === 0) {
    return frame(
      <div className="flex flex-col items-start gap-3 px-4 py-6 sm:flex-row sm:items-center sm:gap-5 sm:px-[22px]">
        <svg viewBox="0 0 120 64" aria-hidden className="mx-draw line-stroke h-12 w-[90px] shrink-0">
          <path pathLength={1} d="M4 32 H40" />
          <path pathLength={1} d="M52 32 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0" style={{ ["--dl" as string]: "0.4s" }} />
          <path pathLength={1} d="M84 32 H116" style={{ ["--dl" as string]: "0.7s" }} />
        </svg>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">No ripple found</p>
          <p className="mt-1 max-w-[62ch] text-[14px] leading-relaxed text-ink-3">
            {checkedLine(blast.crm.hubspot)} Nothing else seems to depend on this decision.
          </p>
          {hubspotMissing ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-bg-2 px-3 py-1 text-[13px] text-ink-3">
              <PlugsConnected size={14} aria-hidden />
              HubSpot not connected
            </p>
          ) : null}
        </div>
      </div>,
      { description: "No ripple found." },
    );
  }

  const rings = blast.rings.map((r) => ({ ...r, label: r.label || RING_LABEL[r.ring] }));
  const chosen = rings.flatMap((r) => r.items).find((i) => i.id === selected) ?? null;

  const legend = (
    <CardFoot className="rounded-b-card !gap-y-1.5 text-[13px] text-ink-3">
      <span className="sr-only">Colours on the map:</span>
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <li className="inline-flex items-center gap-1.5">
          <EffectDot effect="risks" size={20} />
          Needs attention: blocks, puts at risk, may clash
        </li>
        <li className="inline-flex items-center gap-1.5">
          <EffectDot effect="advances" size={20} />
          Good news: advances, unblocks
        </li>
        <li className="inline-flex items-center gap-1.5">
          <EffectDot effect="changes" size={20} />
          Changes or commits
        </li>
      </ul>
    </CardFoot>
  );

  return frame(
    <div className="br-wrap px-4 py-[18px] sm:px-[22px]">
      <div ref={mapBox} className="br-map">
        <RippleMap
          rings={rings}
          width={width}
          selectedId={selected}
          onSelect={setSelected}
          expanded={expanded}
          onExpand={(ring) => setExpanded((s) => new Set(s).add(ring))}
          hubspotMissing={hubspotMissing}
          animate={animate}
        />
        <div aria-live="polite" className="mt-4 rounded-card bg-surface-2 px-4 py-4 sm:px-5">
          {chosen ? (
            <div className="flex items-start gap-3">
              <EffectDot effect={chosen.effect} size={34} />
              <RippleDetail item={chosen} />
            </div>
          ) : (
            <p className="text-[14px] text-ink-3">
              Pick anything on the map to see why it is affected, who owns it and when it is due. With a keyboard, Tab to a ring and
              use the arrow keys.
            </p>
          )}
        </div>
      </div>
      <div className="br-stack">
        <RippleStack rings={rings} selectedId={stackOpen} onSelect={setStackOpen} hubspotMissing={hubspotMissing} />
      </div>

      {/* The whole ripple as a plain list, for screen readers. */}
      <div className="sr-only">
        <h3>Everything this decision touches, as a list</h3>
        {rings.map((r) => (
          <div key={r.ring}>
            <h4>
              Ring {r.ring}, {r.label}: {r.items.length} {r.items.length === 1 ? "item" : "items"}
            </h4>
            {r.items.length ? (
              <ul>
                {r.items.map((i) => (
                  <li key={i.id}>
                    {itemLabel(i)}. {effectPhrase(i)}.{i.why ? ` ${i.why}` : ""}
                    {i.owner ? ` Owner ${i.owner.name}.` : ""}
                    {i.team ? ` Team ${i.team}.` : ""}
                    {i.due ? ` Due ${dayLabel(i.due)}.` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nothing here.</p>
            )}
            {r.ring === 3 && hubspotMissing ? <p>HubSpot not connected.</p> : null}
          </div>
        ))}
      </div>
    </div>,
    { description: blast.summary || undefined, foot: legend },
  );
}
