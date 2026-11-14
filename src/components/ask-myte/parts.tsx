"use client";

import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { CaretDown, CheckCircle, CircleNotch, XCircle } from "@phosphor-icons/react";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { sourceKindLabel, sourcePreview, sourceTitle } from "@/lib/ask-myte/citations";
import { faceLabel, type FaceState } from "@/lib/ask-myte/reducer";
import type { Source, StepEvent } from "@/lib/ask-myte/types";

/* The small pieces every Ask Myte surface shares: the Myte's face and signature (D9: it always
   appears as its character), the live steps line, inline citation chips with their preview, and
   the answer's text, rendered from plain text with `[n]` markers. */

/** The Myte's face, live where motion is allowed, with its state. */
export function MyteFace({
  seed,
  name,
  state,
  size,
  live = true,
  followInput,
  celebrate,
  className = "",
}: {
  seed: string;
  name: string;
  state: FaceState;
  size: number;
  live?: boolean;
  followInput?: RefObject<HTMLElement | null> | string;
  celebrate?: number;
  className?: string;
}) {
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }}>
      <AgentOrb
        seed={seed}
        mode={live ? "live" : "still"}
        state={state}
        size={size}
        label={`${name}, your Myte`}
        followInput={followInput}
        celebrate={celebrate}
      />
    </span>
  );
}

/** "Pip, your Myte" with its plush: how every answer is signed. The latest answer's Myte is
 *  live and large enough to watch (thinking while it looks things up, speaking while the answer
 *  streams, idle and blinking after); older answers keep a still face. */
export function MyteSignature({
  seed,
  name,
  state,
  live = false,
}: {
  seed: string;
  name: string;
  state?: FaceState;
  live?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {live ? (
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-surface-2 ring-1 ring-line">
          <MyteFace seed={seed} name={name} state={state ?? "idle"} size={56} />
        </span>
      ) : (
        <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
          <AgentOrb seed={seed} size={40} />
        </span>
      )}
      <p className="text-[15px] leading-tight">
        <span className="font-semibold text-ink">{name}</span>
        <span className="text-ink-3"> your Myte</span>
        {state && state !== "idle" ? (
          <span className="mt-0.5 block text-[13px] text-ink-3" aria-live="polite">
            {faceLabel(state)}
          </span>
        ) : null}
      </p>
    </div>
  );
}

/** The live steps ("Found the meeting", "Checked your tasks"), then "How I found this". */
export function StepsLine({ steps, streaming }: { steps: StepEvent[]; streaming: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (steps.length === 0) return null;
  const running = steps.filter((s) => s.state === "running");
  if (streaming) {
    // While it works: the steps as they happen, the running ones with a quiet spinner.
    return (
      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="What I'm doing">
        {steps.map((s) => (
          <li key={s.id} className="inline-flex items-center gap-1.5 text-[14px] text-ink-3">
            <StepIcon state={s.state} />
            {s.label}
          </li>
        ))}
        {running.length === 0 ? null : <span className="sr-only">{running.map((s) => s.label).join(", ")}</span>}
      </ol>
    );
  }
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-ctl px-1 text-[14px] font-semibold text-ink-3 transition-colors hover:text-ink"
      >
        How I found this
        <CaretDown size={14} weight="bold" aria-hidden className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <ol id={id} hidden={!open} className="mt-1 space-y-1 border-l border-line pl-3.5">
        {steps.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5 text-[14px] text-ink-3">
            <StepIcon state={s.state} />
            {s.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepIcon({ state }: { state: StepEvent["state"] }) {
  if (state === "running") return <CircleNotch size={14} weight="bold" aria-hidden className="text-signal motion-safe:animate-spin" />;
  if (state === "failed") return <XCircle size={14} weight="fill" aria-hidden className="text-ink-4" />;
  return <CheckCircle size={14} weight="fill" aria-hidden className="text-ok" />;
}

/** An inline `[n]`: a small numbered chip. Hover or focus previews the source; a click (or the
    number key while the answer is focused) opens it in the sources panel. */
export function CitationChip({ source, n, onOpen }: { source: Source | undefined; n: number; onOpen: (n: number) => void }) {
  const [show, setShow] = useState(false);
  const tipId = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [alignRight, setAlignRight] = useState(false);
  const open = () => {
    const el = ref.current;
    const box = el?.closest("[data-ask-column]")?.getBoundingClientRect();
    const r = el?.getBoundingClientRect();
    setAlignRight(!!box && !!r && r.left - box.left > box.width / 2);
    setShow(true);
  };
  return (
    <span ref={ref} className="relative inline-block align-baseline" onMouseEnter={open} onMouseLeave={() => setShow(false)}>
      <button
        type="button"
        data-cite={n}
        aria-label={source ? `Source ${n}: ${sourceKindLabel(source)}, ${sourceTitle(source)}` : `Source ${n}`}
        aria-describedby={show && source ? tipId : undefined}
        onFocus={open}
        onBlur={() => setShow(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && show) {
            e.stopPropagation();
            setShow(false);
          }
        }}
        onClick={() => onOpen(n)}
        className="mx-0.5 inline-grid h-[20px] min-w-[20px] -translate-y-px place-items-center rounded-full bg-signal-soft px-1.5 text-[12.5px] font-semibold leading-none text-signal-ink transition-colors hover:bg-signal hover:text-pill-on focus-visible:bg-signal focus-visible:text-pill-on"
      >
        {n}
      </button>
      {show && source ? (
        <span
          id={tipId}
          role="tooltip"
          className={`absolute bottom-[calc(100%+8px)] z-30 block w-[min(300px,80vw)] rounded-card border border-line bg-surface p-3.5 text-left shadow-warm-2 ${alignRight ? "right-0" : "left-0"}`}
        >
          <span className="block text-[12.5px] font-semibold text-ink-3">
            {n}, {sourceKindLabel(source)}
          </span>
          <span className="mt-0.5 block text-[14px] font-semibold leading-snug text-ink">{sourceTitle(source)}</span>
          {source.text ? <span className="mt-1 block text-[13.5px] leading-snug text-ink-2">{sourcePreview(source, 160)}</span> : null}
        </span>
      ) : null}
    </span>
  );
}

/* ---------------- the answer's text ---------------- */

type Block = { kind: "p"; text: string } | { kind: "ul" | "ol"; items: string[] };

/** Paragraphs and simple lists, from the model's plain text. */
export function blocksOf(text: string): Block[] {
  const out: Block[] = [];
  for (const chunk of text.split(/\n{2,}/)) {
    const lines = chunk.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;
    const bullet = lines.every((l) => /^\s*[-*•]\s+/.test(l));
    const numbered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
    if (bullet) out.push({ kind: "ul", items: lines.map((l) => l.replace(/^\s*[-*•]\s+/, "")) });
    else if (numbered) out.push({ kind: "ol", items: lines.map((l) => l.replace(/^\s*\d+[.)]\s+/, "")) });
    else out.push({ kind: "p", text: lines.join("\n") });
  }
  return out;
}

function inline(text: string, sources: Source[], onOpen: (n: number) => void, key: string): ReactNode[] {
  const have = new Map(sources.map((s) => [s.n, s]));
  const nodes: ReactNode[] = [];
  const re = /\[(\d+)\]|\*\*([^*]+)\*\*/g;
  let last = 0;
  let i = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      const n = Number(m[1]);
      // A marker that points at no source is dropped rather than drawn as a dead chip.
      if (have.has(n)) nodes.push(<CitationChip key={`${key}-c${i++}`} n={n} source={have.get(n)} onOpen={onOpen} />);
    } else if (m[2]) {
      nodes.push(
        <strong key={`${key}-b${i++}`} className="font-semibold text-ink">
          {m[2]}
        </strong>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function AnswerText({ text, sources, onOpen, streaming }: { text: string; sources: Source[]; onOpen: (n: number) => void; streaming: boolean }) {
  const blocks = blocksOf(text);
  return (
    <div className="space-y-3 text-[16px] leading-[1.65] text-ink-2">
      {blocks.map((b, bi) =>
        b.kind === "p" ? (
          <p key={bi} className="whitespace-pre-line">
            {inline(b.text, sources, onOpen, `p${bi}`)}
            {streaming && bi === blocks.length - 1 ? <Caret /> : null}
          </p>
        ) : b.kind === "ul" ? (
          <ul key={bi} className="list-disc space-y-1 pl-5 marker:text-ink-4">
            {b.items.map((it, ii) => (
              <li key={ii}>{inline(it, sources, onOpen, `u${bi}-${ii}`)}</li>
            ))}
          </ul>
        ) : (
          <ol key={bi} className="list-decimal space-y-1 pl-5 marker:text-ink-3">
            {b.items.map((it, ii) => (
              <li key={ii}>{inline(it, sources, onOpen, `o${bi}-${ii}`)}</li>
            ))}
          </ol>
        ),
      )}
      {streaming && blocks.length === 0 ? <Caret /> : null}
    </div>
  );
}

function Caret() {
  return <span aria-hidden className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] bg-signal motion-safe:animate-pulse" />;
}
