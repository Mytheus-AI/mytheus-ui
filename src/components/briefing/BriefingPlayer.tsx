"use client";

import { useMyAgent } from "@/lib/my-agent";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowSquareOut, Pause, Play, SkipBack, SkipForward, SpeakerHigh, Sparkle, Waveform } from "@phosphor-icons/react";
import { briefMe, briefingAudioUrl, markBriefingHeard, pollBriefing, saveBriefingPreferences } from "@/app/actions/briefings";
import { Button } from "@/components/ui/Button";
import { cardClass, cardPadX } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { AgentOrb, type OrbState } from "@/components/agent/AgentOrb";
import { Dropdown } from "@/components/ui/Dropdown";
import { ErrorState, RetryButton } from "@/components/ui/ErrorState";
import { useOrgContext } from "@/lib/org-context";
import { notifyError, notifySuccess } from "@/lib/toast";
import {
  KIND_LABEL,
  POLL_LIMIT_MS,
  POLL_MS,
  SPEEDS,
  agentSeed,
  clock,
  coverLine,
  isWriting,
  momentHref,
  momentLabel,
  nearestSpeed,
  speedLabel,
  unavailableCopy,
  type Briefing,
  type BriefingPreferences,
} from "@/lib/briefing";
import { useBriefingSpeech } from "./useBriefingSpeech";
import "@/styles/briefing.css";

/* The briefing player: the agent's face and name, the briefing spoken in its voice, the words
   lighting up as they are said, and every point one tap from its moment in the meeting.

   Variants: `full` (the after page and /briefings) shows the whole transcript beside the controls;
   `compact` (Home) shows the line being said, large, with the transcript a disclosure away.

   Every state is drawn: nothing yet (Brief me, or why not), being written (the face, a calm line,
   skeleton text, polled every 2.5 s for up to 3 minutes), ready, nothing to say, could not be
   written (Try again), and a page that could not load it (Retry). Keyboard: Space plays or
   pauses and the arrow keys skip, whenever focus is inside the player; every control is a real
   button with a name. Reduced motion: the speaking ring and the highlight do not animate. */

type Props = {
  initial: Briefing | null;
  /** The meeting this player is about (the after page), or null (Home: since the last one). */
  meetingId?: string | null;
  canRequest?: boolean;
  enabled?: boolean;
  /** The person's preferences, or null when they could not be read (the player still works). */
  preferences: BriefingPreferences | null;
  variant?: "full" | "compact";
  headingLevel?: 2 | 3;
};

const DEFAULTS: BriefingPreferences = {
  enabled: true,
  auto_play: false,
  length: "standard",
  language: "en",
  voice: null,
  server_voice: null,
  rate: 1,
};

export function BriefingPlayer({
  initial,
  meetingId = null,
  canRequest = true,
  enabled = true,
  preferences,
  variant = "full",
  headingLevel = 2,
}: Props) {
  const ids = useId();
  const { user } = useOrgContext();
  const [briefing, setBriefing] = useState<Briefing | null>(initial);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [prefs, setPrefs] = useState<BriefingPreferences>(preferences ?? DEFAULTS);

  useEffect(() => setBriefing(initial), [initial]);

  // Poll while the agent writes.
  const pollStarted = useRef<number | null>(null);
  const briefingId = briefing?.id ?? null;
  const writing = isWriting(briefing);
  useEffect(() => {
    if (!writing || !briefingId) {
      pollStarted.current = null;
      return;
    }
    pollStarted.current ??= Date.now();
    if (Date.now() - pollStarted.current > POLL_LIMIT_MS) {
      setSlow(true);
      return;
    }
    const t = window.setTimeout(async () => {
      const res = await pollBriefing(briefingId);
      if (res.ok) setBriefing(res.briefing);
      else setBriefing((b) => (b ? { ...b } : b)); // keep polling on a passing failure
    }, POLL_MS);
    return () => window.clearTimeout(t);
  }, [writing, briefingId, briefing]);

  const ask = useCallback(async () => {
    setAsking(true);
    setAskError(null);
    setSlow(false);
    pollStarted.current = null;
    const res = await briefMe(meetingId);
    setAsking(false);
    if (res.ok) setBriefing(res.briefing);
    else setAskError(res.message);
  }, [meetingId]);

  const headingId = `${ids}-h`;
  const H = headingLevel === 2 ? "h2" : "h3";
  // The briefing stores the agent as it was when written; show the agent as it is now.
  const mine = useMyAgent();
  const stored = briefing?.agent ?? null;
  const agent = stored && mine ? { ...stored, name: mine.name, seed: mine.seed } : stored;
  const seed = mine?.seed ?? agentSeed(agent?.seed, user.id);

  if (!briefing || briefing.status === "empty" || briefing.status === "unavailable" || writing) {
    return (
      <section aria-labelledby={headingId} className={cardClass({ flush: true, className: "brf" })}>
        <div className={`flex flex-wrap items-center gap-4 py-5 ${cardPadX}`}>
          <Face seed={seed} size={variant === "compact" ? 52 : 60} speaking={writing} orb={writing ? "thinking" : "idle"} />
          <div className="min-w-0 flex-[1_1_16rem]">
            <p className="text-[13px] font-semibold text-ink-3">Your briefing</p>
            <H id={headingId} className="display text-[22px] leading-tight text-ink">
              {writing
                ? `${agent?.name ?? "Your Myte"} is writing your briefing`
                : briefing?.status === "empty"
                  ? "Nothing needs you right now"
                  : briefing?.status === "unavailable"
                    ? "Your briefing could not be written"
                    : "A briefing from your Myte"}
            </H>
            <p className="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-ink-3" aria-live="polite">
              {writing
                ? slow
                  ? "This is taking longer than usual. You can keep waiting or ask again."
                  : "About 90 seconds of what changed for you, who is waiting on you, your promises and what is still open. It takes a few seconds."
                : briefing?.status === "empty"
                  ? "Nothing changed for you, nobody is waiting on you and nothing is open. Your Myte will brief you when something comes up."
                  : briefing?.status === "unavailable"
                    ? unavailableCopy(briefing.reason)
                    : canRequest
                      ? enabled
                        ? "What changed for you, who is waiting on you, your promises and the questions still open, in your Myte's voice."
                        : "Briefings after meetings are off. You can still ask for one whenever you like."
                      : "Your Myte can brief you on this meeting once it has ended."}
            </p>
            {askError ? (
              <p role="alert" className="mt-2 text-[14px] font-semibold text-priority-high">
                {askError}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {writing && !slow ? null : briefing?.status === "unavailable" ? (
              <RetryButton onRetry={() => void ask()} label="Try again" />
            ) : canRequest ? (
              <Button type="button" variant={briefing ? "outline" : "primary"} size="sm" onClick={() => void ask()} disabled={asking} aria-busy={asking}>
                <Sparkle size={16} aria-hidden />
                {asking ? "Asking your Myte" : briefing ? "Ask again" : "Brief me"}
              </Button>
            ) : null}
            {!enabled && !briefing ? (
              <Link href="/settings/briefings" className="text-[14px] font-semibold text-ink-2 underline decoration-line-2 underline-offset-4 hover:text-ink">
                Briefing settings
              </Link>
            ) : null}
          </div>
        </div>
        {writing ? <WritingLines /> : null}
      </section>
    );
  }

  return (
    <ReadyPlayer
      key={briefing.id}
      briefing={briefing}
      seed={seed}
      variant={variant}
      headingId={headingId}
      H={H}
      prefs={prefs}
      setPrefs={setPrefs}
      canSave={preferences !== null}
      onAsk={canRequest ? ask : null}
      asking={asking}
    />
  );
}

function ReadyPlayer({
  briefing,
  seed,
  variant,
  headingId,
  H,
  prefs,
  setPrefs,
  canSave,
  onAsk,
  asking,
}: {
  briefing: Briefing;
  seed: string;
  variant: "full" | "compact";
  headingId: string;
  H: "h2" | "h3";
  prefs: BriefingPreferences;
  setPrefs: (p: BriefingPreferences) => void;
  canSave: boolean;
  onAsk: (() => Promise<void>) | null;
  asking: boolean;
}) {
  const mine = useMyAgent();
  const ids = useId();
  const [heard, setHeard] = useState(Boolean(briefing.listened_at));
  const [showAll, setShowAll] = useState(variant === "full");
  const segments = briefing.segments;
  const rate = nearestSpeed(prefs.rate);
  const audio = useMemo(
    () =>
      briefing.audio.status === "ready"
        ? async () => {
            const res = await briefingAudioUrl(briefing.id);
            return res.ok ? res.url : null;
          }
        : null,
    [briefing.id, briefing.audio.status],
  );
  const { state, play, toggle, seek, next, prev } = useBriefingSpeech({
    segments,
    language: briefing.language,
    personality: briefing.agent.personality,
    seed,
    title: briefing.meeting_title ? `Briefing: ${briefing.meeting_title}` : "Your briefing",
    agentName: mine?.name ?? briefing.agent.name,
    preferredVoice: prefs.voice ?? null,
    rate,
    audio,
    onFirstPlay: () => {
      if (!heard) {
        setHeard(true);
        void markBriefingHeard(briefing.id);
      }
    },
  });

  // Auto-play a new briefing when the person asked for that (the browser may still refuse).
  const tried = useRef(false);
  useEffect(() => {
    if (tried.current || !prefs.auto_play || briefing.listened_at) return;
    tried.current = true;
    const t = window.setTimeout(() => void play(), 400);
    return () => window.clearTimeout(t);
  }, [prefs.auto_play, briefing.listened_at, play]);

  // Keep the line being said in view inside the transcript.
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!state.playing) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-seg="${state.index}"]`);
    el?.scrollIntoView?.({ block: "nearest", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [state.index, state.playing]);

  const save = async (patch: Partial<BriefingPreferences>, label: string) => {
    const nextPrefs = { ...prefs, ...patch };
    setPrefs(nextPrefs);
    if (!canSave) return;
    const res = await saveBriefingPreferences(nextPrefs);
    if (res.ok) notifySuccess(label);
    else notifyError(res.message);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).closest("[role=listbox],[role=dialog]")) return;
    if (e.key === " " && tag !== "BUTTON" && tag !== "A") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  };

  const current = segments[state.index];
  const voiceOptions = state.voices.map((v) => ({ value: v.name, label: v.name.replace(/\s*\(.*\)$/, ""), description: v.lang }));
  const deviceVoice = state.engine === "device";

  return (
    <section aria-labelledby={headingId} className={cardClass({ flush: true, className: "brf" })} onKeyDown={onKey} aria-keyshortcuts="Space ArrowLeft ArrowRight">
      <div className={`brf-head ${cardPadX} pt-5`}>
        <div className="flex flex-wrap items-center gap-4">
          <Face seed={seed} size={variant === "compact" ? 56 : 64} speaking={state.playing} orb={state.playing ? "speaking" : "idle"} />
          <div className="min-w-0 flex-[1_1_14rem]">
            <p className="text-[13px] font-semibold text-ink-3">{coverLine(briefing)}</p>
            <H id={headingId} className="display mt-0.5 text-[24px] leading-tight text-ink sm:text-[28px]">
              A briefing from {mine?.name ?? briefing.agent.name}
            </H>
            {/* The length is not repeated here: the player's own clock shows it. The row only
                appears when there is something to flag, so the title block is centred on the face. */}
            {!heard || state.engine === "audio" ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {!heard ? <Chip tone="accent">New</Chip> : null}
                {state.engine === "audio" ? (
                  <Chip tone="neutral" icon={<Waveform size={13} />}>
                    Recorded voice
                  </Chip>
                ) : null}
              </div>
            ) : null}
          </div>
          {onAsk ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => void onAsk()} disabled={asking} aria-busy={asking} className="shrink-0">
              <Sparkle size={16} aria-hidden />
              {asking ? "Asking" : "Brief me again"}
            </Button>
          ) : null}
        </div>

        {/* The line being said, in the interface sans (it is a caption, not a title), kept well
            below the title's size so the title still leads the card. */}
        <p className="brf-now mt-4 min-h-[3.2em] font-sans text-[clamp(16px,1.5vw,18px)] leading-relaxed text-ink-2" aria-hidden={state.playing ? undefined : true}>
          {current ? <Highlighted text={current.text} word={state.playing ? state.word : null} /> : null}
        </p>
        <p className="sr-only" aria-live="polite">
          {state.playing ? `Playing point ${state.index + 1} of ${segments.length}` : state.finished ? "Briefing finished" : ""}
        </p>
      </div>

      {/* Controls */}
      <div className={`${cardPadX} pb-4 pt-3`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="ghost" size="md" icon onClick={prev} aria-label="Previous point" disabled={state.index === 0 || state.engine === "none"}>
              <SkipBack size={20} weight="fill" aria-hidden />
            </Button>
            <button
              type="button"
              onClick={toggle}
              disabled={state.engine === "none" || state.loading}
              aria-label={state.playing ? "Pause briefing" : state.finished ? "Play briefing again" : "Play briefing"}
              aria-pressed={state.playing}
              className="brf-play inline-grid h-[52px] w-[52px] place-items-center rounded-full bg-pill text-pill-on shadow-warm-2 transition-[background-color,transform] duration-150 hover:bg-pill-2 motion-safe:active:scale-[0.96] disabled:opacity-50"
            >
              {state.playing ? <Pause size={22} weight="fill" aria-hidden /> : <Play size={22} weight="fill" aria-hidden className="translate-x-[1px]" />}
            </button>
            <Button type="button" variant="ghost" size="md" icon onClick={next} aria-label="Next point" disabled={state.index >= segments.length - 1 || state.engine === "none"}>
              <SkipForward size={20} weight="fill" aria-hidden />
            </Button>
          </div>

          <div className="flex min-w-[12rem] flex-[1_1_14rem] items-center gap-3">
            <Track segments={segments.length} starts={segments} index={state.index} progress={state.progress} onSeek={(i) => (state.playing ? seek(i) : void play(i))} />
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-3">
              <span className="sr-only">Elapsed </span>
              {clock(state.elapsed)}
              <span aria-hidden> / </span>
              <span className="sr-only"> of </span>
              {clock(state.total)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Dropdown
              label="Speed"
              size="sm"
              shape="round"
              tone="soft"
              value={String(rate)}
              onChange={(v) => void save({ rate: Number(v) }, "Speed saved")}
              options={SPEEDS.map((s) => ({ value: String(s), label: speedLabel(s) }))}
              renderValue={(o) => <span className="tabular-nums">{o?.label ?? "1x"}</span>}
            />
            {deviceVoice && voiceOptions.length > 0 ? (
              <Dropdown
                label="Voice"
                size="sm"
                shape="round"
                tone="soft"
                icon={<SpeakerHigh size={15} aria-hidden />}
                value={state.voice?.name ?? null}
                onChange={(v) => void save({ voice: v }, "Voice remembered")}
                options={voiceOptions}
                placeholder="Voice"
                panelMinWidth={240}
                className="max-w-[14rem]"
              />
            ) : null}
          </div>
        </div>
        {state.blocked ? (
          <p className="mt-3 text-[14px] text-ink-3" role="status">
            Your browser held back auto-play. Press play to listen.
          </p>
        ) : state.engine === "none" ? (
          <p className="mt-3 text-[14px] text-ink-3" role="status">
            This browser cannot speak it aloud. The whole briefing is written out below.
          </p>
        ) : null}
      </div>

      {/* The transcript */}
      <div className="border-t border-line bg-surface-2">
        {variant === "compact" ? (
          <div className={`${cardPadX} py-3`}>
            <button
              type="button"
              aria-expanded={showAll}
              aria-controls={`${ids}-list`}
              onClick={() => setShowAll((s) => !s)}
              className="text-[14px] font-semibold text-ink-2 underline decoration-line-2 underline-offset-4 hover:text-ink"
            >
              {showAll ? "Hide the transcript" : "Read the transcript"}
            </button>
          </div>
        ) : null}
        <ol
          id={`${ids}-list`}
          ref={listRef}
          hidden={!showAll}
          aria-label="Transcript"
          className={`brf-list ${variant === "full" ? "max-h-[440px]" : "max-h-[320px]"} overflow-y-auto py-2`}
        >
          {segments.map((s, i) => {
            const active = i === state.index && (state.playing || state.progress > 0);
            const href = momentHref(s.link);
            return (
              <li key={s.id} data-seg={i} aria-current={active ? "true" : undefined} className={`brf-seg ${cardPadX} ${active ? "is-active" : ""}`}>
                <div className="flex items-start gap-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => (state.playing ? seek(i) : void play(i))}
                    className="brf-seg-text min-w-0 flex-1 rounded-ctl text-left"
                    aria-label={`Play from: ${s.text}`}
                  >
                    <span className="block text-[12.5px] font-semibold text-ink-3">{KIND_LABEL[s.kind]}</span>
                    <span className="mt-0.5 block text-[15.5px] leading-relaxed text-ink-2">
                      {active ? <Highlighted text={s.text} word={state.playing ? state.word : null} /> : s.text}
                    </span>
                  </button>
                  {href ? (
                    <Link
                      href={href}
                      className="mt-5 inline-flex shrink-0 items-center gap-1.5 rounded-ctl px-2 py-1.5 text-[13.5px] font-semibold text-ink-2 hover:bg-bg-2 hover:text-ink"
                    >
                      <ArrowSquareOut size={15} aria-hidden />
                      <span>{momentLabel(s.link)}</span>
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/** The agent's face, its live plush: it thinks while the briefing is being written, talks while it
    plays and rests when paused (a still picture under reduced motion); a ring breathes around it
    while it speaks. */
function Face({ seed, size, speaking, orb }: { seed: string; size: number; speaking: boolean; orb: OrbState }) {
  return (
    <span className={`brf-face relative inline-grid shrink-0 place-items-center ${speaking ? "is-speaking" : ""}`} style={{ width: size + 12, height: size + 12 }} aria-hidden>
      <span className="brf-ring absolute inset-0 rounded-full" />
      <span className="relative block overflow-hidden rounded-full bg-surface shadow-warm-2 ring-2 ring-surface" style={{ width: size, height: size }}>
        <AgentOrb seed={seed} mode="live" state={orb} size={size} />
      </span>
    </span>
  );
}

function Highlighted({ text, word }: { text: string; word: [number, number] | null }) {
  if (!word) return <>{text}</>;
  return (
    <>
      {text.slice(0, word[0])}
      <mark className="brf-word">{text.slice(word[0], word[1])}</mark>
      {text.slice(word[1])}
    </>
  );
}

/** One bead per point, filled as it plays; each is a button that plays from there. */
function Track({
  segments,
  starts,
  index,
  progress,
  onSeek,
}: {
  segments: number;
  starts: readonly { text: string }[];
  index: number;
  progress: number;
  onSeek: (i: number) => void;
}) {
  const total = starts.reduce((s, x) => s + x.text.length + 2, 0) || 1;
  let acc = 0;
  return (
    <div className="brf-track flex h-9 min-w-0 flex-1 items-center gap-[3px]" role="group" aria-label="Points in this briefing">
      {Array.from({ length: segments }, (_, i) => {
        const len = (starts[i]?.text.length ?? 0) + 2;
        const from = acc / total;
        acc += len;
        const to = acc / total;
        const fill = progress >= to ? 1 : progress <= from ? 0 : (progress - from) / (to - from);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSeek(i)}
            aria-label={`Go to point ${i + 1} of ${segments}`}
            aria-current={i === index ? "step" : undefined}
            className="brf-bead group relative h-9 min-w-[10px] rounded-full"
            style={{ flex: `${len} 1 0` }}
          >
            <span className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 overflow-hidden rounded-full bg-bg-3 group-hover:bg-line-2">
              <span className="block h-full rounded-full bg-signal transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${Math.round(fill * 100)}%` }} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function WritingLines() {
  return (
    <div className={`${cardPadX} pb-5`} aria-hidden>
      <div className="space-y-2.5 rounded-ctl bg-bg-2 p-4">
        {[92, 78, 85, 60].map((w, i) => (
          <span key={i} className="brf-bone block h-3 rounded-full bg-bg-3 motion-safe:animate-pulse" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

/** A failed read of the briefing (the page could not reach core-api). */
export function BriefingUnavailable({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const id = useId();
  return (
    <section aria-labelledby={id} className={cardClass({ flush: true })}>
      <H id={id} className={`${cardPadX} pt-[18px] text-[17px] font-semibold text-ink`}>
        Your briefing
      </H>
      <ErrorState variant="inline" title="Your briefing could not be loaded" text="Nothing was lost. Your Myte keeps it; this returns when it can be read." />
    </section>
  );
}
