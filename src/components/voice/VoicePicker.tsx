"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Play, Sparkle, Stop, Waveform } from "@phosphor-icons/react";
import { loadVoices, saveVoice } from "@/app/actions/voice";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { CardHead, cardClass, cardPadX } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { notifyError, notifySuccess } from "@/lib/toast";
import { failureNote, genderLabel, previewLine, type VoiceCatalog, type VoiceOption } from "@/lib/voice/catalog";
import { SPEED_STEPS, useMyteSpeaker, useVoiceSpeed } from "@/lib/voice/myte-voice";
import { speedName } from "@/lib/voice/speed";

/* The Myte's voice picker (ADR-0050 D2), on Your Myte and in Settings > Briefings: one choice,
   the same stored value in both places. A list of Kokoro voices (name, a short description,
   accent and gender), each with a Preview that says a short line in that voice through the
   shared speaker (the plush on the page follows it: preview keys start with `preview:`), plus
   "Match my Myte's personality" (null). Choosing saves at once (debounced, so arrowing through
   the list saves only where you stop) and rolls back if refused. Speed is kept on this device.

   Native radios carry the keyboard: Tab into the group, arrows move the choice, Tab reaches the
   Preview buttons. When the voice server is off the list still shows and the choice still
   saves; previews are off with a quiet note. */

export const PREVIEW_PREFIX = "preview:";
const MATCH = "__match__";
const SAVE_DELAY_MS = 450;

export function VoicePicker({
  initial,
  myteName,
  seed,
  headingLevel = "h2",
  title = "Voice",
  description,
  className = "",
}: {
  initial: VoiceCatalog | null;
  myteName: string;
  /** the Myte's face, drawn beside the title: it speaks along with a preview */
  seed?: string;
  headingLevel?: "h2" | "h3";
  title?: string;
  description?: string;
  className?: string;
}) {
  const ids = useId();
  const [catalog, setCatalog] = useState<VoiceCatalog | null>(initial);
  const [value, setValue] = useState<string>(initial?.chosen ?? MATCH);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [speed, setSpeed] = useVoiceSpeed();
  const { snapshot, speak, stop, level } = useMyteSpeaker();
  const timer = useRef<number | null>(null);
  const saved = useRef<string>(initial?.chosen ?? MATCH);

  useEffect(() => {
    setCatalog(initial);
    setValue(initial?.chosen ?? MATCH);
    saved.current = initial?.chosen ?? MATCH;
  }, [initial]);

  // Leaving the page stops a preview; a pending choice still saves.
  useEffect(() => () => stop(), [stop]);

  const retry = async () => {
    setLoading(true);
    const res = await loadVoices();
    setLoading(false);
    if (res.ok) {
      setCatalog(res.catalog);
      setValue(res.catalog.chosen ?? MATCH);
      saved.current = res.catalog.chosen ?? MATCH;
    } else notifyError(res.message);
  };

  const commit = async (next: string) => {
    if (next === saved.current) return;
    setSaving(true);
    const res = await saveVoice(next === MATCH ? null : next);
    setSaving(false);
    if (res.ok) {
      saved.current = res.catalog.chosen ?? MATCH;
      setCatalog(res.catalog);
      setValue(saved.current);
      const picked = res.catalog.voices.find((v) => v.id === res.catalog.chosen);
      notifySuccess(picked ? `Voice saved: ${picked.name}` : "Voice saved: matched to your Myte");
    } else {
      setValue(saved.current);
      notifyError(res.message);
    }
  };

  const choose = (next: string) => {
    setValue(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void commit(next), SAVE_DELAY_MS);
  };

  if (!catalog) {
    return (
      <section aria-labelledby={`${ids}-h`} className={cardClass({ flush: true, className })}>
        <CardHead id={`${ids}-h`} as={headingLevel} title={title} divided />
        <div className={`py-4 ${cardPadX}`}>
          <ErrorState variant="inline" title="The voices could not be loaded" text="Your Myte keeps its voice; this list returns when it can be read." onRetry={loading ? undefined : () => void retry()} />
        </div>
      </section>
    );
  }

  const selected = catalog.voices.find((v) => v.id === catalog.selected) ?? null;
  const previewKey = (id: string) => `${PREVIEW_PREFIX}${id}`;
  const activeKey = snapshot.key;
  const busy = snapshot.status === "loading" || snapshot.status === "speaking" || snapshot.status === "paused";
  const previewing = snapshot.status === "speaking" && Boolean(activeKey?.startsWith(PREVIEW_PREFIX));
  const errorFor = snapshot.status === "error" && activeKey?.startsWith(PREVIEW_PREFIX) ? activeKey.slice(PREVIEW_PREFIX.length) : null;

  const preview = (voice: VoiceOption | null) => {
    const key = previewKey(voice?.id ?? MATCH);
    if (busy && activeKey === key) {
      stop(key);
      return;
    }
    void speak({ key, text: previewLine(myteName), voice: voice?.id ?? catalog.selected ?? undefined, speed });
  };

  const previewButton = (voice: VoiceOption | null, label: string) => {
    const key = previewKey(voice?.id ?? MATCH);
    const on = busy && activeKey === key;
    return (
      <button
        type="button"
        onClick={() => preview(voice)}
        disabled={!catalog.connected}
        aria-label={on ? `Stop the ${label} preview` : `Preview ${label}`}
        aria-pressed={on}
        className={`relative z-[1] inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-full text-[14px] sm:w-auto sm:px-3 font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 ${
          on ? "bg-pill text-pill-on hover:bg-pill-2" : "bg-surface text-ink-2 ring-1 ring-inset ring-line-2 hover:bg-surface-2"
        }`}
      >
        {on ? <Stop size={15} weight="fill" aria-hidden /> : <Play size={15} weight="fill" aria-hidden />}
        <span className="hidden sm:inline">{on ? (snapshot.status === "loading" ? "Starting" : "Stop") : "Preview"}</span>
      </button>
    );
  };

  const optionCard = (opt: { id: string; voice: VoiceOption | null; name: string; description: string; label: string }) => {
    const on = value === opt.id;
    const current = opt.voice ? catalog.chosen === opt.voice.id : catalog.chosen === null;
    const inputId = `${ids}-${opt.id}`;
    return (
      <li
        key={opt.id}
        className={`relative flex flex-col gap-2 rounded-card border px-4 py-3.5 transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-signal has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface ${
          on ? "border-signal bg-signal-soft" : "border-line-2 bg-surface hover:bg-surface-2"
        }`}
      >
        <input
          id={inputId}
          type="radio"
          name={`${ids}-voice`}
          value={opt.id}
          checked={on}
          onChange={() => choose(opt.id)}
          aria-describedby={`${inputId}-d`}
          className="peer sr-only"
        />
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className={`grid h-5 w-5 shrink-0 self-start mt-1 place-items-center rounded-full border-2 transition-colors ${on ? "border-signal bg-signal text-pill-on" : "border-line-2 bg-surface"}`}
          >
            {on ? <Check size={11} weight="bold" /> : null}
          </span>
          <span className="min-w-0 flex-1">
            {/* The label holds the name only; its overlay makes the whole card the click target. */}
            <label
              htmlFor={inputId}
              className={`block cursor-pointer font-display text-[19px] leading-tight after:absolute after:inset-0 after:rounded-card after:content-[''] ${on ? "text-signal-ink" : "text-ink"}`}
            >
              {opt.name}
            </label>
            <span id={`${inputId}-d`} className={`mt-1 block text-[14px] leading-snug ${on ? "text-signal-ink" : "text-ink-3"}`}>
              {opt.description}
              {opt.voice ? <span className="sr-only">. {opt.voice.accent}, {genderLabel(opt.voice.gender).toLowerCase()}.</span> : null}
              {current ? <span className="sr-only"> Current voice.</span> : null}
            </span>
            {/* Said in the description for screen readers; drawn here as tags. */}
            <span className="mt-2.5 flex flex-wrap items-center gap-1.5" aria-hidden>
              {opt.voice ? (
                <>
                  <Chip tone={on ? "glass" : "neutral"}>{opt.voice.accent}</Chip>
                  <Chip tone={on ? "glass" : "neutral"}>{genderLabel(opt.voice.gender)}</Chip>
                </>
              ) : (
                <Chip tone={on ? "glass" : "neutral"} icon={<Sparkle size={13} aria-hidden />}>
                  Personality
                </Chip>
              )}
              {current ? (
                <Chip tone="solid" icon={<Check size={12} weight="bold" aria-hidden />}>
                  Current
                </Chip>
              ) : null}
            </span>
          </span>
          {previewButton(opt.voice, opt.label)}
        </div>
        {errorFor === (opt.voice?.id ?? MATCH) && snapshot.error ? (
          <p className="pl-8 text-[13.5px] text-ink-3" role="status">
            {failureNote(snapshot.error)}
          </p>
        ) : null}
      </li>
    );
  };

  const H = headingLevel;
  return (
    <section aria-labelledby={`${ids}-h`} className={cardClass({ flush: true, className })}>
      <CardHead
        id={`${ids}-h`}
        as={H}
        title={title}
        description={description ?? `How ${myteName} sounds everywhere it speaks: answers read aloud, voice mode and your briefings. The same voice on every device.`}
        right={
          <span className="flex items-center gap-3">
            {saving ? (
              <span className="text-[13.5px] font-semibold text-ink-3" role="status">
                Saving
              </span>
            ) : null}
            {seed ? (
              <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface shadow-warm-1 ring-2 ring-surface" aria-hidden>
                <AgentOrb
                  seed={seed}
                  mode="live"
                  size={48}
                  state={previewing ? "speaking" : "idle"}
                  level={previewing ? level : undefined}
                />
              </span>
            ) : null}
          </span>
        }
        divided
      />
      <div className={`grid gap-5 py-5 ${cardPadX}`}>
        {!catalog.connected ? (
          <Note tone="info">Voice is unavailable right now, so previews are off. Your choice is kept and used as soon as it is back.</Note>
        ) : null}

        <fieldset className="min-w-0">
          <legend className="sr-only">{myteName}&apos;s voice</legend>
          <ul className="grid gap-3 sm:grid-cols-2" role="list">
            {optionCard({
              id: MATCH,
              voice: null,
              name: "Match my Myte's personality",
              description: selected && catalog.chosen === null ? `Picked from its personality. Right now that is ${selected.name}.` : "Picked from its personality, and changes with it.",
              label: "the personality match",
            })}
            {catalog.voices.map((v) => optionCard({ id: v.id, voice: v, name: v.name, description: v.description, label: v.name }))}
          </ul>
        </fieldset>

        <fieldset className="min-w-0 border-t border-line pt-4">
          <legend className="float-left mb-2 flex w-full items-baseline justify-between gap-3">
            <span className="text-[15px] font-semibold text-ink">Speed</span>
            <span className="text-[13.5px] text-ink-3">Kept on this device</span>
          </legend>
          <div className="clear-both grid grid-cols-5 gap-1 rounded-full bg-bg-2 p-1">
            {SPEED_STEPS.map((s) => {
              const on = speed === s;
              const sid = `${ids}-speed-${s}`;
              return (
                <span key={s} className="relative">
                  <input id={sid} type="radio" name={`${ids}-speed`} value={s} checked={on} onChange={() => setSpeed(s)} className="peer sr-only" />
                  <label
                    htmlFor={sid}
                    title={speedName(s)}
                    className={`flex h-10 cursor-pointer items-center justify-center rounded-full text-[14px] font-semibold tabular-nums transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-signal ${
                      on ? "bg-surface text-ink shadow-warm-1" : "text-ink-3 hover:text-ink"
                    }`}
                  >
                    {s}x<span className="sr-only">, {speedName(s)}</span>
                  </label>
                </span>
              );
            })}
          </div>
        </fieldset>

        <p className="flex items-center gap-2 text-[13.5px] text-ink-3">
          <Waveform size={16} aria-hidden className="shrink-0 text-ink-4" />
          Spoken by Mytheus&apos;s own voice server. What your Myte says never leaves it.
        </p>
      </div>
    </section>
  );
}
