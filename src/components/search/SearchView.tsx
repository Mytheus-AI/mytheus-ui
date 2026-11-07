"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarBlank,
  CaretDown,
  CheckSquare,
  Funnel,
  MagnifyingGlass,
  Scales,
  Sparkle,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import type { SearchResult } from "@/lib/mock/data";
import { Avatar } from "@/components/ui/Avatar";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/settings/primitives";
import { AskPanel } from "./AskPanel";
import { Highlight } from "./Highlight";
import {
  RECORDS,
  TYPE_LABEL,
  TYPE_PLURAL,
  formatDate,
  haystack,
  score,
  termsOf,
  type SearchRecord,
} from "./records";

type Mode = "search" | "ask";
type Scope = "all" | SearchResult["type"];
type Sort = "match" | "new" | "old";

const TYPE_ICON: Record<SearchResult["type"], Icon> = {
  meeting: VideoCamera,
  decision: Scales,
  action: CheckSquare,
};

const TYPE_TONE: Record<SearchResult["type"], "default" | "success" | "warning"> = {
  meeting: "default",
  decision: "success",
  action: "warning",
};

const SCOPES: Scope[] = ["all", "meeting", "decision", "action"];

const PEOPLE = Array.from(new Set(RECORDS.flatMap((r) => r.people))).sort();
const MEETINGS = Array.from(new Map(RECORDS.map((r) => [r.meetingId, r.meetingTitle]))).map(([id, title]) => ({
  id,
  title,
}));
const ASK_SUGGESTIONS = MEETINGS.slice(0, 4).map((m) => `What happened in ${m.title.replace(/\s[\u2013\u2014]\s/g, ", ")}?`);

const tabBase =
  "inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold leading-none text-ink-3 transition-colors hover:text-ink active:bg-bg-3 aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-sm focus-visible:!rounded-full";

function Tabs<T extends string>({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string; icon?: Icon; count?: number }[];
}) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = items.findIndex((t) => t.id === value);
    const next = items[(i + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length];
    onChange(next.id);
    requestAnimationFrame(() => {
      (e.currentTarget.querySelector('[aria-selected="true"]') as HTMLElement | null)?.focus();
    });
  };
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="inline-flex w-max items-center gap-0.5 rounded-full bg-bg-2 p-1">
      {items.map((t) => {
        const selected = t.id === value;
        const Glyph = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={tabBase}
          >
            {Glyph ? <Glyph size={16} weight={t.id === "ask" ? "fill" : "regular"} aria-hidden="true" /> : null}
            {t.label}
            {t.count !== undefined ? (
              <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-bg-3 px-1.5 text-[11px] font-semibold tabular-nums leading-none text-ink-2">
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    // min-w-0: a fieldset defaults to min-inline-size: min-content, so a long meeting name widened it
    // past the 248px column and pushed the count off the card instead of truncating.
    <fieldset className="min-w-0 border-t border-line px-[18px] py-4 first:border-t-0">
      <legend className="mb-2.5 float-left w-full text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
        {title}
      </legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function CheckOption({
  checked,
  onChange,
  children,
  count,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  count: number;
  /** Full text, shown on hover when the label is truncated. */
  title?: string;
}) {
  return (
    <label title={title} className="-mx-2 flex min-h-[34px] cursor-pointer items-center gap-2.5 rounded-[10px] px-2 py-1 text-[14px] font-medium text-ink-2 transition-colors hover:bg-bg active:bg-bg-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-signal-deep"
      />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <span className="shrink-0 text-[12px] font-semibold tabular-nums text-ink-3">{count}</span>
    </label>
  );
}

export function SearchView() {
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("all");
  const [sort, setSort] = useState<Sort>("match");
  const [people, setPeople] = useState<string[]>([]);
  const [meetings, setMeetings] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" jumps to the field from anywhere on the page, as in the design
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? "";
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(tag) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const terms = useMemo(() => termsOf(query), [query]);
  const askMode = mode === "ask";

  /* matches for the query and the people / meeting filters, ignoring the type scope */
  const base = useMemo(
    () =>
      RECORDS.filter((r) => {
        const hay = haystack(r);
        if (!terms.every((t) => hay.includes(t))) return false;
        if (people.length && !r.people.some((p) => people.includes(p))) return false;
        if (meetings.length && !meetings.includes(r.meetingId)) return false;
        return true;
      }),
    [terms, people, meetings],
  );

  const counts = useMemo(
    () => ({
      all: base.length,
      meeting: base.filter((r) => r.type === "meeting").length,
      decision: base.filter((r) => r.type === "decision").length,
      action: base.filter((r) => r.type === "action").length,
    }),
    [base],
  );

  const results = useMemo(() => {
    const list = base.filter((r) => scope === "all" || r.type === scope);
    const time = (r: SearchRecord) => (r.startTime ? new Date(r.startTime).getTime() : 0);
    const sorted = [...list];
    if (sort === "new") sorted.sort((a, b) => time(b) - time(a));
    else if (sort === "old") sorted.sort((a, b) => time(a) - time(b));
    else if (terms.length) sorted.sort((a, b) => score(b, terms) - score(a, terms));
    return sorted;
  }, [base, scope, sort, terms]);

  /* option counts for the filter lists: what each option would show given the current query */
  const matchesQuery = useMemo(
    () => RECORDS.filter((r) => terms.every((t) => haystack(r).includes(t))),
    [terms],
  );
  const filterCount = people.length + meetings.length;

  const toggle = (list: string[], set: (v: string[]) => void, value: string, on: boolean) =>
    set(on ? [...list, value] : list.filter((v) => v !== value));
  const resetFilters = () => {
    setPeople([]);
    setMeetings([]);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    if (next === "search") setAsked(null);
  };

  const submitAsk = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setAsked(trimmed);
  };

  const hasFilters = filterCount > 0;

  return (
    <div className="mx-auto max-w-6xl motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader
        title="Search"
        description={`Find what was said, decided or assigned across ${RECORDS.length} records from your meetings, or ask a question and get an answer with sources.`}
      />

      {/* Search / Ask field */}
      <section
        aria-label="Search"
        className={`mt-6 border p-4 shadow-sm sm:p-5 ${
          askMode
            ? "rounded-[28px] border-[color-mix(in_srgb,var(--signal)_22%,var(--line))] bg-surface [background-image:var(--wash)]"
            : "rounded-card border-line bg-surface"
        }`}
      >
        <Tabs<Mode>
          label="Mode"
          value={mode}
          onChange={(m) => {
            switchMode(m);
            inputRef.current?.focus();
          }}
          items={[
            { id: "search", label: "Search", icon: MagnifyingGlass },
            { id: "ask", label: "Ask Mytheus", icon: Sparkle },
          ]}
        />
        <form
          role="search"
          autoComplete="off"
          className="mt-3.5 flex gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (askMode) submitAsk(query);
          }}
        >
          <div className="relative min-w-0 flex-1">
            {askMode ? (
              <Sparkle size={21} weight="fill" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-signal-deep" aria-hidden="true" />
            ) : (
              <MagnifyingGlass size={21} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            )}
            <input
              ref={inputRef}
              id="search-query"
              name="search-query"
              type="text"
              enterKeyHint="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={askMode ? "Ask Mytheus a question" : "Search meetings, decisions, actions"}
              placeholder={
                askMode
                  ? "Ask a question, like “What did we decide about Deepgram?”"
                  : "Search meetings, decisions, actions"
              }
              className="h-14 w-full rounded-pill border border-line-2 bg-surface pl-[50px] pr-12 text-[16px] font-medium text-ink placeholder:font-normal placeholder:text-ink-3 transition-colors hover:border-ink-3 focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--signal-soft)] focus-visible:outline-none focus-visible:!rounded-pill sm:text-[17px]"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear"
                onClick={() => {
                  setQuery("");
                  setAsked(null);
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[10px] text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink active:bg-bg-3 focus-visible:!rounded-[10px]"
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-line-2 bg-bg px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-3 sm:block">
                /
              </kbd>
            )}
          </div>
          {askMode ? (
            <Button
              type="submit"
              variant="secondary"
              disabled={!query.trim()}
              aria-label="Ask"
              className="h-14 shrink-0 px-5 text-[15px] active:opacity-80 focus-visible:!rounded-pill"
            >
              <ArrowRight size={18} weight="bold" aria-hidden="true" />
              <span className="hidden sm:inline">Ask</span>
            </Button>
          ) : null}
        </form>
        <p className="mt-3 text-[13px] text-ink-3">
          {askMode
            ? "Answers come from the decisions, actions and meetings in your index, and every claim links to its source."
            : "Matches titles, spoken points, decisions and actions."}
        </p>
      </section>

      <div
        className={`mt-6 grid gap-4 ${askMode ? "" : "lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start lg:gap-6"}`}
      >
        {askMode ? (
          <AskPanel
            question={asked}
            suggestions={ASK_SUGGESTIONS}
            onAsk={submitAsk}
            onSearchInstead={(q) => {
              setQuery(q);
              setAsked(null);
              setMode("search");
            }}
          />
        ) : (
          <>
            {/* Filters */}
            <aside aria-label="Filters" className="lg:sticky lg:top-2">
              <button
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="filter-panel"
                onClick={() => setFiltersOpen((o) => !o)}
                className="flex h-11 w-full items-center justify-between rounded-pill border border-line-2 bg-surface px-4 text-[14px] font-semibold text-ink transition-colors hover:border-ink-3 active:bg-bg lg:hidden focus-visible:!rounded-pill"
              >
                <span className="inline-flex items-center gap-2">
                  <Funnel size={17} aria-hidden="true" />
                  Filters
                  {hasFilters ? (
                    <span className="rounded-full bg-signal-soft px-2 py-px text-[11.5px] font-bold text-signal-deep">
                      {filterCount}
                    </span>
                  ) : null}
                </span>
                <CaretDown
                  size={16}
                  aria-hidden="true"
                  className={`transition-transform duration-200 motion-reduce:transition-none ${filtersOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                id="filter-panel"
                className={`mt-2 overflow-hidden rounded-card border border-line bg-surface shadow-sm lg:mt-0 lg:block ${
                  filtersOpen ? "block" : "hidden"
                }`}
              >
                <div className="flex items-center justify-between px-[18px] pt-4">
                  <h2 className="text-[15px] font-semibold text-ink">Filters</h2>
                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-md text-[13px] font-semibold text-signal-deep hover:underline hover:underline-offset-4 active:opacity-70"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
                <FilterGroup title="People">
                  {PEOPLE.map((p) => (
                    <CheckOption
                      key={p}
                      checked={people.includes(p)}
                      onChange={(on) => toggle(people, setPeople, p, on)}
                      count={matchesQuery.filter((r) => r.people.includes(p)).length}
                      title={p}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar name={p} size="sm" />
                        <span className="truncate">{p}</span>
                      </span>
                    </CheckOption>
                  ))}
                </FilterGroup>
                <FilterGroup title="Meeting">
                  {MEETINGS.map((m) => (
                    <CheckOption
                      key={m.id}
                      checked={meetings.includes(m.id)}
                      onChange={(on) => toggle(meetings, setMeetings, m.id, on)}
                      count={matchesQuery.filter((r) => r.meetingId === m.id).length}
                      title={m.title}
                    >
                      {m.title}
                    </CheckOption>
                  ))}
                </FilterGroup>
              </div>
            </aside>

            {/* Results */}
            <section aria-label="Results" className="min-w-0">
              <div className="mb-3 max-w-full overflow-x-auto py-0.5">
                <Tabs<Scope>
                  label="Result type"
                  value={scope}
                  onChange={setScope}
                  items={SCOPES.map((s) => ({
                    id: s,
                    label: s === "all" ? "All" : TYPE_PLURAL[s],
                    count: counts[s],
                  }))}
                />
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13.5px] text-ink-3">
                <p role="status">
                  <b className="font-semibold text-ink">{results.length}</b>{" "}
                  {results.length === 1 ? "result" : "results"}
                  {query.trim() ? <> for &ldquo;{query.trim()}&rdquo;</> : null}
                </p>
                {people.map((p) => (
                  <FilterChip key={p} label={p} onRemove={() => toggle(people, setPeople, p, false)} />
                ))}
                {meetings.map((id) => (
                  <FilterChip
                    key={id}
                    label={MEETINGS.find((m) => m.id === id)?.title ?? id}
                    onRemove={() => toggle(meetings, setMeetings, id, false)}
                  />
                ))}
                <div className="ml-auto flex items-center gap-2.5 font-semibold">
                  <span aria-hidden>Sort</span>
                  <Select<Sort>
                    label="Sort results"
                    size="sm"
                    align="right"
                    value={sort}
                    onChange={setSort}
                    className="w-[150px]"
                    options={[
                      { value: "match", label: "Best match" },
                      { value: "new", label: "Newest first" },
                      { value: "old", label: "Oldest first" },
                    ]}
                  />
                </div>
              </div>

              {results.length === 0 ? (
                <div className="rounded-card border border-line bg-surface px-6 py-14 text-center shadow-sm">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] bg-bg-2 text-ink-3">
                    <MagnifyingGlass size={26} aria-hidden="true" />
                  </span>
                  <h2 className="display mt-4 text-[24px] text-ink-display">
                    {query.trim() ? <>Nothing found for &ldquo;{query.trim()}&rdquo;</> : "Nothing to show"}
                  </h2>
                  <p className="mx-auto mt-1.5 max-w-[46ch] text-[14px] text-ink-3">
                    {hasFilters
                      ? "Your people or meeting filters may be hiding matches. Clear them or try a broader word."
                      : scope !== "all" && counts.all > 0
                        ? `There are matches in other result types, but none in ${TYPE_PLURAL[scope as SearchResult["type"]].toLowerCase()}.`
                        : "Check the spelling, try a single word, or ask the question in plain language."}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                    {hasFilters ? (
                      <Button variant="outline" size="sm" onClick={resetFilters} className="active:opacity-80 focus-visible:!rounded-pill">
                        Clear filters
                      </Button>
                    ) : null}
                    {scope !== "all" ? (
                      <Button variant="outline" size="sm" onClick={() => setScope("all")} className="active:opacity-80 focus-visible:!rounded-pill">
                        Show all types
                      </Button>
                    ) : null}
                    {query.trim() ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="active:opacity-80 focus-visible:!rounded-pill"
                        onClick={() => {
                          setMode("ask");
                          submitAsk(query);
                        }}
                      >
                        <Sparkle size={15} weight="fill" aria-hidden="true" />
                        Ask Mytheus instead
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface shadow-sm">
                  {results.map((r) => (
                    <ResultRow key={r.id} record={r} terms={terms} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex h-[26px] items-center gap-1 rounded-full border border-line-2 bg-surface pl-2.5 pr-1.5 text-[12.5px] font-semibold text-ink-2 transition-colors hover:border-ink-3 active:bg-bg-2 focus-visible:!rounded-full"
    >
      {label}
      <X size={12} aria-hidden="true" />
      <span className="sr-only">Remove filter</span>
    </button>
  );
}

function ResultRow({ record: r, terms }: { record: SearchRecord; terms: string[] }) {
  const Glyph = TYPE_ICON[r.type];
  const date = formatDate(r.startTime);
  return (
    <li className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 px-4 py-3.5 transition-colors hover:bg-bg focus-within:bg-bg sm:grid-cols-[40px_minmax(0,1fr)] sm:gap-3.5 sm:px-5 sm:py-4">
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-bg-2 text-ink-3 sm:h-10 sm:w-10 sm:rounded-xl" aria-hidden="true">
        <Glyph size={20} />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Link
            href={`/meetings/${r.meetingId}/room`}
            className="rounded-md text-[15.5px] font-semibold text-ink transition-colors after:absolute after:inset-0 after:content-[''] hover:text-signal-deep hover:underline hover:underline-offset-4"
          >
            <Highlight text={r.title} terms={terms} />
          </Link>
          <Badge tone={TYPE_TONE[r.type]}>{TYPE_LABEL[r.type]}</Badge>
        </div>
        <p className="mt-1 text-[14px] leading-[1.55] text-ink-2">
          <Highlight text={r.snippet} terms={terms} />
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-3">
          {r.type !== "meeting" ? (
            <span className="inline-flex items-center gap-1.5">
              <VideoCamera size={15} aria-hidden="true" />
              <Highlight text={r.meetingTitle} terms={terms} />
            </span>
          ) : null}
          {date ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarBlank size={15} aria-hidden="true" />
              {date}
            </span>
          ) : null}
          {r.people[0] ? (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={r.people[0]} size="sm" />
              {r.people[0]}
              {r.people.length > 1 ? ` and ${r.people.length - 1} more` : ""}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
