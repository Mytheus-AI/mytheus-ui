"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretLeft, CaretRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { fieldClass } from "@/components/ui/Form";
import { Bone, CardSkeleton } from "@/components/ui/Page";
import { loadDiff, loadSnapshot, loadTimeline, type Loaded } from "@/app/actions/time-machine";
import type { Diff, Snapshot, Timeline } from "@/lib/api/bets-types";
import {
  MODES,
  addDays,
  addMonths,
  clampDay,
  daysBetween,
  longDate,
  monthTicks,
  presets,
  scrubRange,
  shortDate,
  topicSuggestions,
  writeState,
  type Mode,
  type TimeMachineState,
} from "@/lib/time-machine";
import { DiffView, SnapshotView, TimelineView } from "./TimeMachineViews";
import styles from "./scrubber.module.css";

/* The company time machine: pick any date and see the decision graph as it stood then, compare
   two dates, or follow one topic. The date scrubber is a native range (arrow keys move a day,
   Page Up and Page Down a bigger step) with a date field beside it for an exact day, presets and
   a week back or forward. Reads go through server actions and are debounced while scrubbing; the
   previous answer stays on screen, dimmed, until the next one arrives. The state lives in the URL
   so a view can be shared. Only meetings the viewer took part in are ever shown. */

export type TimeMachineData =
  | { mode: "as-of"; result: Loaded<Snapshot> }
  | { mode: "compare"; result: Loaded<Diff> }
  | { mode: "topic"; result: Loaded<Timeline> | null };

function Scrubber({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min: string;
  max: string;
  onChange: (d: string) => void;
}) {
  const id = useId();
  const span = Math.max(1, daysBetween(min, max));
  const at = clampDay(value, min, max);
  const ticks = useMemo(() => monthTicks(min, max), [min, max]);
  const pos = daysBetween(min, at) / span;
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label htmlFor={`${id}-range`} className="text-[13px] font-semibold text-ink-3">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon
            aria-label={`${label}: a week earlier`}
            onClick={() => onChange(clampDay(addDays(at, -7), min, max))}
            disabled={at <= min}
          >
            <CaretLeft size={16} aria-hidden />
          </Button>
          <input
            type="date"
            aria-label={`${label}, exact day`}
            min={min}
            max={max}
            value={at}
            onChange={(e) => e.target.value && onChange(clampDay(e.target.value, min, max))}
            className={`${fieldClass} !h-9 w-[150px] !px-2.5 text-[14px]`}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon
            aria-label={`${label}: a week later`}
            onClick={() => onChange(clampDay(addDays(at, 7), min, max))}
            disabled={at >= max}
          >
            <CaretRight size={16} aria-hidden />
          </Button>
        </div>
      </div>
      <div className="relative mt-3 pb-6">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[9px] h-[3px] rounded-full bg-bg-3">
          <div className="h-full rounded-full bg-[var(--signal-line)]" style={{ width: `${pos * 100}%` }} />
        </div>
        <input
          id={`${id}-range`}
          type="range"
          min={0}
          max={span}
          step={1}
          value={daysBetween(min, at)}
          onChange={(e) => onChange(addDays(min, Number(e.target.value)))}
          aria-valuetext={longDate(at)}
          className={`${styles.range} relative z-[1] block h-[21px] w-full cursor-pointer`}
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-7 h-4 text-[11.5px] text-ink-3">
          {ticks.map((t) => (
            <span
              key={`${t.at}-${t.label}`}
              className={`absolute whitespace-nowrap max-sm:[&:nth-child(even)]:hidden ${t.at < 0.07 ? "" : t.at > 0.93 ? "-translate-x-full" : "-translate-x-1/2"}`}
              style={{ left: `${t.at * 100}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid gap-5" aria-hidden>
      <Bone className="h-[132px] w-full rounded-card" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <CardSkeleton rows={4} />
        <CardSkeleton rows={3} />
      </div>
    </div>
  );
}

export function TimeMachine({
  initial,
  initialData,
  today,
  earliest,
}: {
  initial: TimeMachineState;
  initialData: TimeMachineData;
  today: string;
  earliest: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<TimeMachineState>(initial);
  const [data, setData] = useState<TimeMachineData>(initialData);
  const [loading, setLoading] = useState(false);
  const [topicDraft, setTopicDraft] = useState(initial.topic);
  const [known, setKnown] = useState<string | null>(earliest);
  const seq = useRef(0);
  const first = useRef(true);
  const range = scrubRange(known, today);

  const load = useCallback(async (s: TimeMachineState) => {
    const n = ++seq.current;
    setLoading(true);
    let next: TimeMachineData;
    if (s.mode === "as-of") next = { mode: "as-of", result: await loadSnapshot(s.asOf, s.topic) };
    else if (s.mode === "compare") next = { mode: "compare", result: await loadDiff(s.from, s.to, s.topic) };
    else next = { mode: "topic", result: s.topic ? await loadTimeline(s.topic, undefined, undefined) : null };
    if (n !== seq.current) return; // a newer request superseded this one
    if (next.mode === "as-of" && next.result.ok && next.result.data.earliest) setKnown(next.result.data.earliest);
    setData(next);
    setLoading(false);
  }, []);

  // Debounced reads and the URL, whenever the state changes (not on the first render: the server
  // already answered for it).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      void load(state);
      router.replace(`/decisions/time-machine${writeState(state, today)}`, { scroll: false });
    }, 280);
    return () => window.clearTimeout(t);
  }, [state, load, router, today]);

  const patch = (p: Partial<TimeMachineState>) => setState((s) => ({ ...s, ...p }));
  const setMode = (mode: Mode) => patch({ mode });
  const applyTopic = (t: string) => {
    const clean = t.replace(/\s+/g, " ").trim().slice(0, 120);
    setTopicDraft(clean);
    patch({ topic: clean });
  };

  const suggestions = useMemo(() => {
    if (data.mode === "as-of" && data.result.ok) return topicSuggestions(data.result.data.decisions.map((d) => `${d.content} ${d.rationale ?? ""}`));
    if (data.mode === "compare" && data.result.ok) return topicSuggestions(data.result.data.new_decisions.map((d) => d.content));
    return [];
  }, [data]);
  const [fallbackSuggestions, setFallbackSuggestions] = useState<string[]>([]);
  useEffect(() => {
    if (suggestions.length) setFallbackSuggestions(suggestions);
  }, [suggestions]);
  const shownSuggestions = suggestions.length ? suggestions : fallbackSuggestions;

  const result = data.result;
  const retry = () => void load(state);

  return (
    <div className="grid gap-5">
      <Card as="section" aria-label="Choose what to look at" clip={false} className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="What to look at" className="inline-flex flex-wrap items-center gap-0.5 rounded-ctl bg-bg-2 p-1 max-sm:grid max-sm:w-full max-sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                aria-pressed={state.mode === m.key}
                onClick={() => setMode(m.key)}
                className={`inline-flex h-9 items-center justify-center rounded-ctl px-3.5 text-[14px] font-semibold transition-colors duration-150 max-sm:px-2 max-sm:text-[13px] ${
                  state.mode === m.key ? "bg-surface text-ink shadow-warm-1" : "text-ink-3 hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              applyTopic(topicDraft);
            }}
            className="relative min-w-0 flex-[1_1_280px] sm:max-w-[420px]"
          >
            <MagnifyingGlass size={17} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              value={topicDraft}
              onChange={(e) => setTopicDraft(e.target.value)}
              onBlur={() => topicDraft.trim() !== state.topic && applyTopic(topicDraft)}
              placeholder={state.mode === "topic" ? "Follow a topic, like pricing" : "Only one topic (optional)"}
              aria-label="Topic"
              maxLength={120}
              className={`${fieldClass} pl-10 pr-10`}
            />
            {state.topic ? (
              <button
                type="button"
                onClick={() => applyTopic("")}
                aria-label="Clear the topic"
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-ctl text-ink-3 hover:bg-bg-2 hover:text-ink"
              >
                <X size={15} aria-hidden />
              </button>
            ) : null}
          </form>
        </div>

        {state.mode === "as-of" ? (
          <div className="grid gap-4">
            <p className="display text-[clamp(24px,3vw,30px)] leading-tight text-ink-display" aria-live="polite">
              As of {longDate(state.asOf)}
            </p>
            <Scrubber label="Date" value={state.asOf} min={range.min} max={range.max} onChange={(asOf) => patch({ asOf })} />
            <div className="flex flex-wrap gap-2" aria-label="Jump to">
              {presets(today).map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  variant={state.asOf === p.date ? "primary" : "outline"}
                  aria-pressed={state.asOf === p.date}
                  onClick={() => patch({ asOf: clampDay(p.date, range.min, range.max) })}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {state.mode === "compare" ? (
          <div className="grid gap-4">
            <p className="display text-[clamp(22px,2.6vw,28px)] leading-tight text-ink-display" aria-live="polite">
              {shortDate(state.from)} to {shortDate(state.to)}
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              <Scrubber
                label="From"
                value={state.from}
                min={range.min}
                max={range.max}
                onChange={(from) => patch(from > state.to ? { from: state.to, to: from } : { from })}
              />
              <Scrubber
                label="To"
                value={state.to}
                min={range.min}
                max={range.max}
                onChange={(to) => patch(to < state.from ? { from: to, to: state.from } : { to })}
              />
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Compare">
              {[
                { label: "Last month", from: addMonths(today, -1) },
                { label: "Last quarter", from: addMonths(today, -3) },
                { label: "Last six months", from: addMonths(today, -6) },
                { label: "Last year", from: addMonths(today, -12) },
              ].map((p) => (
                <Button key={p.label} type="button" size="sm" variant="outline" onClick={() => patch({ from: clampDay(p.from, range.min, today), to: today })}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {state.mode !== "topic" && shownSuggestions.length ? (
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
            <span>Topics that come up:</span>
            {shownSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applyTopic(s)}
                aria-pressed={state.topic === s}
                className={`rounded-full px-2.5 py-1 text-[13px] font-semibold transition-colors ${
                  state.topic === s ? "bg-pill text-pill-on" : "bg-bg-2 text-ink-2 hover:bg-bg-3"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </Card>

      <div aria-live="polite" aria-busy={loading} className="sr-only">
        {loading ? "Loading" : ""}
      </div>

      <div className={`transition-opacity duration-200 ${loading ? "opacity-55" : "opacity-100"}`}>
        {data.mode === "topic" && !state.topic ? (
          <Card className="grid gap-3">
            <h2 className="display text-[22px] text-ink-display">Follow one topic through time</h2>
            <p className="max-w-[60ch] text-[15px] text-ink-3">
              Name a topic, such as pricing or hiring, to see how its decisions changed step by step, each with the meeting and the words that decided it.
            </p>
            {shownSuggestions.length ? (
              <div className="flex flex-wrap gap-2">
                {shownSuggestions.map((s) => (
                  <Button key={s} variant="outline" size="sm" onClick={() => applyTopic(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            ) : null}
          </Card>
        ) : !result ? (
          <Loading />
        ) : !result.ok ? (
          <ErrorState title="The time machine could not load that" text={result.message} onRetry={retry} />
        ) : data.mode === "as-of" && result.ok ? (
          <SnapshotView s={(result as { ok: true; data: Snapshot }).data} onJump={(asOf) => patch({ asOf })} />
        ) : data.mode === "compare" ? (
          <DiffView d={(result as { ok: true; data: Diff }).data} />
        ) : (
          <TimelineView t={(result as { ok: true; data: Timeline }).data} suggestions={shownSuggestions} onTopic={applyTopic} />
        )}
      </div>
    </div>
  );
}
