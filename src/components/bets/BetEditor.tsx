"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChartLineUp, Flag } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { CharCount, FieldMsg, fieldClass, textareaClass } from "@/components/ui/Form";
import { loadBetHints } from "@/app/actions/bets";
import type { BetHints, BetUpsert, DecisionBetView } from "@/lib/api/bets-types";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  CRM_METRICS,
  DIRECTION_LABEL,
  EVENT_DIRECTIONS,
  LIMITS,
  METRIC_DIRECTIONS,
  SOURCES,
  SOURCE_LABEL,
  checkDraft,
  draftFrom,
  type BetDraft,
  type DraftField,
} from "@/lib/bets";
import { BetLessons } from "./BetLessons";

/* Add or edit what a decision expects to happen. One form for both kinds of bet: a number that
   should move (or reach a level, or hold) and an event that should or should not happen, each
   with a check date and where the evidence will come from. Saving a suggested bet accepts it.
   While the type and the words settle, lessons from earlier calls of the same type appear
   beside the form ("Calls like this one"). */

const CONFIDENCE = ["", "50", "60", "70", "80", "90"] as const;

export function BetEditor({
  view,
  decisionContent,
  today,
  saving,
  onSave,
  onCancel,
  error,
}: {
  view: DecisionBetView;
  decisionContent: string;
  today: string;
  saving: boolean;
  onSave: (body: BetUpsert) => void;
  onCancel: () => void;
  error: { field?: string; message: string } | null;
}) {
  const id = useId();
  const [d, setD] = useState<BetDraft>(() => draftFrom(view.bet, today, decisionContent));
  const [problem, setProblem] = useState<{ field: DraftField; message: string } | null>(null);
  const [hints, setHints] = useState<BetHints | null>(view.hints);
  const first = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    first.current?.focus();
  }, []);

  // Lessons for this type of call, refreshed when the type or the words settle.
  useEffect(() => {
    const q = `${d.statement} ${d.metric}`.trim() || decisionContent;
    const t = window.setTimeout(async () => {
      const h = await loadBetHints(q, d.category);
      if (h) setHints(h);
    }, 500);
    return () => window.clearTimeout(t);
  }, [d.category, d.statement, d.metric, decisionContent]);

  const set = <K extends keyof BetDraft>(k: K, v: BetDraft[K]) => {
    setD((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "kind") next.direction = v === "event" ? "happen" : "increase";
      if (k === "source" && v !== "crm") next.metric_key = "";
      if (k === "metric_key") {
        const m = CRM_METRICS.find((x) => x.key === v);
        if (m) {
          if (!prev.metric) next.metric = m.label;
          if (!prev.unit) next.unit = m.unit;
        }
      }
      return next;
    });
    if (problem?.field === k) setProblem(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const checked = checkDraft(d, today);
    if (!checked.ok) {
      setProblem({ field: checked.field, message: checked.message });
      document.getElementById(`${id}-${checked.field}`)?.focus();
      return;
    }
    setProblem(null);
    onSave(checked.body);
  };

  const err = (f: DraftField) => (problem?.field === f ? problem.message : error?.field === f ? error.message : null);
  const fid = (f: DraftField) => `${id}-${f}`;
  const metric = d.kind === "metric";
  const label = "block text-[14px] font-semibold text-ink";
  const help = "mt-0.5 block text-[13px] text-ink-3";

  return (
    <form onSubmit={submit} noValidate aria-label="Expected outcome" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid min-w-0 gap-5">
        <div>
          <label htmlFor={fid("statement")} className={label}>
            What should this decision achieve?
          </label>
          <span className={help}>One sentence someone could check later.</span>
          <textarea
            ref={first}
            id={fid("statement")}
            rows={2}
            value={d.statement}
            maxLength={LIMITS.statement}
            onChange={(e) => set("statement", e.target.value)}
            placeholder="Annual billing cuts monthly churn by 3 points by March"
            aria-invalid={!!err("statement")}
            aria-describedby={`${fid("statement")}-msg`}
            className={`${textareaClass} mt-2`}
          />
          <div className="mt-1 flex items-start justify-between gap-3">
            <FieldMsg id={`${fid("statement")}-msg`} error={err("statement")} />
            <CharCount n={d.statement.length} max={LIMITS.statement} />
          </div>
        </div>

        <fieldset>
          <legend className={label}>Kind of bet</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-[420px]">
            {(
              [
                { k: "metric", t: "A number moves", s: "Churn, revenue, sign-ups", Icon: ChartLineUp },
                { k: "event", t: "Something happens", s: "A launch, a migration, a deal", Icon: Flag },
              ] as const
            ).map(({ k, t, s, Icon }) => (
              <label
                key={k}
                className={`flex cursor-pointer items-start gap-2.5 rounded-ctl border p-3 transition-colors has-[:focus-visible]:shadow-[0_0_0_4px_var(--signal-soft)] ${
                  d.kind === k ? "border-signal bg-signal-soft" : "border-line-2 bg-surface hover:bg-surface-2"
                }`}
              >
                <input type="radio" name={`${id}-kind`} value={k} checked={d.kind === k} onChange={() => set("kind", k)} className="sr-only" />
                <Icon size={18} aria-hidden className={d.kind === k ? "text-signal-ink" : "text-ink-3"} />
                <span>
                  <span className="block text-[14px] font-semibold text-ink">{t}</span>
                  <span className="block text-[12.5px] text-ink-3">{s}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={fid("metric")} className={label}>
              {metric ? "What is measured" : "What should happen"}
            </label>
            <input
              id={fid("metric")}
              value={d.metric}
              maxLength={LIMITS.metric}
              onChange={(e) => set("metric", e.target.value)}
              placeholder={metric ? "Monthly churn" : "Platform migration finished"}
              aria-invalid={!!err("metric")}
              aria-describedby={`${fid("metric")}-msg`}
              className={`${fieldClass} mt-2`}
            />
            <FieldMsg id={`${fid("metric")}-msg`} error={err("metric")} />
          </div>
          <div>
            <span id={`${fid("direction")}-label`} className={label}>
              Expected
            </span>
            <div className="mt-2">
              <Dropdown
                id={fid("direction")}
                label="Expected"
                value={d.direction}
                onChange={(v) => set("direction", v)}
                options={(metric ? METRIC_DIRECTIONS : EVENT_DIRECTIONS).map((v) => ({ value: v, label: DIRECTION_LABEL[v] }))}
                size="md"
              />
            </div>
          </div>
        </div>

        {metric ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor={fid("magnitude")} className={label}>
                {d.direction === "reach" ? "Target level" : "By how much"}
              </label>
              <input
                id={fid("magnitude")}
                inputMode="decimal"
                value={d.magnitude}
                onChange={(e) => set("magnitude", e.target.value)}
                placeholder={d.direction === "reach" ? "40" : "3"}
                aria-invalid={!!err("magnitude")}
                aria-describedby={`${fid("magnitude")}-msg`}
                className={`${fieldClass} mt-2`}
              />
              <FieldMsg id={`${fid("magnitude")}-msg`} error={err("magnitude")} hint={d.direction === "reach" ? undefined : "Optional"} />
            </div>
            <div>
              <label htmlFor={fid("unit")} className={label}>
                Unit
              </label>
              <input
                id={fid("unit")}
                value={d.unit}
                maxLength={LIMITS.unit}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="points, %, $, customers"
                aria-describedby={`${fid("unit")}-msg`}
                className={`${fieldClass} mt-2`}
              />
              <FieldMsg id={`${fid("unit")}-msg`} error={err("unit")} />
            </div>
            <div>
              <label htmlFor={fid("baseline")} className={label}>
                Where it is now
              </label>
              <input
                id={fid("baseline")}
                inputMode="decimal"
                value={d.baseline}
                onChange={(e) => set("baseline", e.target.value)}
                placeholder="7.5"
                aria-invalid={!!err("baseline")}
                aria-describedby={`${fid("baseline")}-msg`}
                className={`${fieldClass} mt-2`}
              />
              <FieldMsg id={`${fid("baseline")}-msg`} error={err("baseline")} hint="Optional; a connected CRM fills it in" />
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={fid("check_date")} className={label}>
              Check it on
            </label>
            <input
              id={fid("check_date")}
              type="date"
              min={today}
              value={d.check_date}
              onChange={(e) => set("check_date", e.target.value)}
              aria-invalid={!!err("check_date")}
              aria-describedby={`${fid("check_date")}-msg`}
              className={`${fieldClass} mt-2`}
            />
            <FieldMsg id={`${fid("check_date")}-msg`} error={err("check_date")} hint="The evidence is gathered that morning and you are asked to score it." />
          </div>
          <div>
            <span className={label}>Where the evidence comes from</span>
            <div className="mt-2">
              <Dropdown
                id={fid("source")}
                label="Where the evidence comes from"
                value={d.source}
                onChange={(v) => set("source", v)}
                options={SOURCES.map((v) => ({ value: v, label: SOURCE_LABEL[v] }))}
                size="md"
              />
            </div>
          </div>
        </div>

        {d.source === "crm" ? (
          <div className="sm:max-w-[50%]">
            <span className={label}>The CRM number</span>
            <span className={help}>Read from HubSpot on the check date when it is connected.</span>
            <div className="mt-2">
              <Dropdown
                id={fid("metric_key")}
                label="The CRM number"
                value={d.metric_key || ""}
                onChange={(v) => set("metric_key", v)}
                options={[{ value: "", label: "Not a CRM number" }, ...CRM_METRICS.map((m) => ({ value: m.key, label: m.label }))]}
                size="md"
                invalid={!!err("metric_key")}
              />
            </div>
            <FieldMsg id={`${fid("metric_key")}-msg`} error={err("metric_key")} />
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={label}>Type of decision</span>
            <div className="mt-2">
              <Dropdown
                id={fid("category")}
                label="Type of decision"
                value={d.category}
                onChange={(v) => set("category", v)}
                options={CATEGORIES.map((v) => ({ value: v, label: CATEGORY_LABEL[v] }))}
                size="md"
              />
            </div>
          </div>
          <div>
            <span className={label}>How sure are we</span>
            <div className="mt-2">
              <Dropdown
                id={fid("confidence_pct")}
                label="How sure are we"
                value={d.confidence_pct}
                onChange={(v) => set("confidence_pct", v)}
                options={CONFIDENCE.map((v) => ({
                  value: v,
                  label: v ? `${v}% sure` : "Not said",
                  description: v === "50" ? "A coin toss" : v === "90" ? "Very sure" : undefined,
                }))}
                size="md"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor={fid("assumption")} className={label}>
            What has to be true
          </label>
          <span className={help}>The assumption behind the bet. When a bet misses, this is what the workspace learns from.</span>
          <input
            id={fid("assumption")}
            value={d.assumption}
            maxLength={LIMITS.assumption}
            onChange={(e) => set("assumption", e.target.value)}
            placeholder="Monthly customers take the annual discount"
            aria-invalid={!!err("assumption")}
            aria-describedby={`${fid("assumption")}-msg`}
            className={`${fieldClass} mt-2`}
          />
          <FieldMsg id={`${fid("assumption")}-msg`} error={err("assumption")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={label}>Owner</span>
            <span className={help}>Asked to score it on the check date.</span>
            <div className="mt-2">
              <Dropdown
                id={fid("owner_user_id")}
                label="Owner"
                value={d.owner_user_id}
                onChange={(v) => set("owner_user_id", v)}
                options={[
                  { value: "", label: view.bet?.owner_name ? `Keep ${view.bet.owner_name}` : "Me" },
                  ...(view.owner_candidates ?? []).map((o) => ({ value: o.user_id, label: o.name })),
                ]}
                size="md"
              />
            </div>
          </div>
          <div>
            <span className={label}>Team</span>
            <span className={help}>Counted for the team, never for a person.</span>
            <div className="mt-2">
              <Dropdown
                id={fid("team_id")}
                label="Team"
                value={d.team_id}
                onChange={(v) => set("team_id", v)}
                options={[{ value: "", label: "The owner's team" }, ...(view.teams ?? []).map((t) => ({ value: t.id, label: t.name }))]}
                size="md"
                emptyText="No teams yet"
              />
            </div>
          </div>
        </div>

        {error && !error.field ? (
          <p role="alert" className="rounded-ctl bg-priority-high-soft px-3.5 py-2.5 text-[14px] text-priority-high">
            {error.message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving" : view.bet?.status === "proposed" ? "Keep this expectation" : "Save expected outcome"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
      <aside aria-label="What earlier calls taught" className="min-w-0">
        {hints && (hints.record || (hints.lessons ?? []).length) ? (
          <BetLessons hints={hints} compact />
        ) : (
          <p className="rounded-ctl bg-bg-2 p-3.5 text-[13.5px] leading-relaxed text-ink-3">
            Once bets of this type are scored, what they taught shows up here while you write the next one.
          </p>
        )}
      </aside>
    </form>
  );
}
