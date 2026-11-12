"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CalendarBlank, ChartLineUp, Handshake, Ticket } from "@phosphor-icons/react";
import { loadWhyMembers } from "@/app/actions/decision-why";
import { Button } from "@/components/ui/Button";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { CharCount, FieldMsg, fieldClass, textareaClass } from "@/components/ui/Form";
import { MemberPicker, type MemberOption } from "@/components/ui/MemberPicker";
import type { AssumptionKind, Comparator, Person } from "@/lib/api/why-blast-types";
import {
  COMPARATOR_LABEL,
  KIND_HELP,
  KIND_LABEL,
  LIMITS,
  checkDraft,
  type AssumptionDraft,
  type DraftField,
} from "@/lib/decision-why";

/* The owner's editor for one reason: what kind it is, what has to stay true, the words it was said
   in and by whom, and what the agent watches it against. Inline in the section (no dialog), with
   the first field focused, Escape to cancel, and every limit said before saving. */

const KIND_OPTIONS: DropdownOption<AssumptionKind>[] = (Object.keys(KIND_LABEL) as AssumptionKind[]).map((k) => ({
  value: k,
  label: KIND_LABEL[k],
  description: KIND_HELP[k],
}));

const CMP_OPTIONS: DropdownOption<Comparator>[] = (Object.keys(COMPARATOR_LABEL) as Comparator[]).map((c) => ({
  value: c,
  label: COMPARATOR_LABEL[c],
}));

/* The workspace's people, read once per page for every form. */
let membersCache: Promise<MemberOption[] | null> | null = null;
function members(): Promise<MemberOption[] | null> {
  if (!membersCache) {
    membersCache = loadWhyMembers()
      .then((r) => (r.ok ? r.data : null))
      .catch(() => null);
    void membersCache.then((m) => {
      if (!m) membersCache = null;
    });
  }
  return membersCache;
}

export function AssumptionForm({
  initial,
  statedBy,
  saveLabel,
  onSave,
  onCancel,
}: {
  initial: AssumptionDraft;
  /** who said it, as the server named them (shown even before the member list loads) */
  statedBy: Person | null;
  saveLabel: string;
  onSave: (d: AssumptionDraft) => Promise<string | null>;
  onCancel: () => void;
}) {
  const uid = useId();
  const [d, setD] = useState<AssumptionDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field: DraftField | "form"; message: string } | null>(null);
  const [people, setPeople] = useState<MemberOption[] | null | "loading">("loading");
  const first = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    first.current?.focus();
    let live = true;
    void members().then((m) => {
      if (!live) return;
      // Keep the person the server named selectable even if they are not a member any more.
      if (m && statedBy && !m.some((x) => x.id === statedBy.user_id)) {
        m = [...m, { id: statedBy.user_id, name: statedBy.name, email: "", imageUrl: null, isYou: false }];
      }
      setPeople(m);
    });
    return () => {
      live = false;
    };
  }, [statedBy]);

  const set = <K extends keyof AssumptionDraft>(k: K, v: AssumptionDraft[K]) => {
    setD((p) => ({ ...p, [k]: v }));
    if (err) setErr(null);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    const check = checkDraft(d);
    if (!check.ok) {
      setErr({ field: check.field, message: check.message });
      document.getElementById(`${uid}-${check.field}`)?.focus();
      return;
    }
    setBusy(true);
    const message = await onSave(d);
    setBusy(false);
    if (message) setErr({ field: "form", message });
  };

  const onKey = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Escape" && !e.defaultPrevented && !busy) {
      e.preventDefault();
      onCancel();
    }
  };

  const fieldErr = (f: DraftField) => (err?.field === f ? err.message : null);
  const describe = (f: DraftField) => `${uid}-${f}-msg`;

  return (
    <form onSubmit={submit} onKeyDown={onKey} noValidate className="space-y-5" aria-label={saveLabel}>
      <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
        <div>
          <label htmlFor={`${uid}-kind`} className="block text-[14px] font-semibold text-ink">
            Kind
          </label>
          <Dropdown
            id={`${uid}-kind`}
            label="Kind of reason"
            value={d.kind}
            onChange={(v) => set("kind", v)}
            options={KIND_OPTIONS}
            size="lg"
            className="mt-2"
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${uid}-statement`} className="text-[14px] font-semibold text-ink">
              What has to stay true
            </label>
            <CharCount n={d.statement.trim().length} max={LIMITS.statement} />
          </div>
          <textarea
            ref={first}
            id={`${uid}-statement`}
            rows={2}
            value={d.statement}
            onChange={(e) => set("statement", e.target.value)}
            placeholder="Acme's quote stays under $40,000 a year"
            aria-invalid={Boolean(fieldErr("statement"))}
            aria-describedby={describe("statement")}
            className={`${textareaClass} mt-2`}
          />
          <FieldMsg id={describe("statement")} error={fieldErr("statement")} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <label htmlFor={`${uid}-quote`} className="block text-[14px] font-semibold text-ink">
            In their words <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <textarea
            id={`${uid}-quote`}
            rows={2}
            value={d.quote}
            onChange={(e) => set("quote", e.target.value)}
            placeholder="If they hold the price at forty, we sign this quarter."
            aria-invalid={Boolean(fieldErr("quote"))}
            aria-describedby={describe("quote")}
            className={`${textareaClass} mt-2 font-display `}
          />
          <FieldMsg id={describe("quote")} error={fieldErr("quote")} />
        </div>
        <div>
          <p id={`${uid}-who-l`} className="text-[14px] font-semibold text-ink">
            Said by <span className="font-normal text-ink-3">(optional)</span>
          </p>
          <div className="mt-2">
            {people === null ? (
              <p className="text-[14px] leading-snug text-ink-3">
                {statedBy ? `${statedBy.name}. ` : ""}We couldn&rsquo;t load your workspace&rsquo;s people just now.
              </p>
            ) : (
              <MemberPicker
                members={people === "loading" ? [] : people}
                value={d.statedBy}
                onChange={(id) => set("statedBy", id)}
                label="Who said it"
                allowNone
                noneLabel="Nobody in particular"
                placeholder={people === "loading" ? "Loading people" : "Pick a person"}
                disabled={people === "loading"}
              />
            )}
          </div>
        </div>
      </div>

      <fieldset className="rounded-card border border-line px-4 pb-4 pt-3 sm:px-5">
        <legend className="px-1 text-[14px] font-semibold text-ink">Watch it against</legend>
        <p className="text-[14px] leading-relaxed text-ink-3">
          Your Myte reads every later meeting for anything that contradicts this. Add a date, a number, a Jira ticket or a
          HubSpot deal and it checks those too, every 6 hours.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor={`${uid}-date`} className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
              <CalendarBlank size={15} aria-hidden />
              Date
            </label>
            <input
              id={`${uid}-date`}
              type="date"
              value={d.date}
              onChange={(e) => set("date", e.target.value)}
              aria-invalid={Boolean(fieldErr("date"))}
              aria-describedby={describe("date")}
              className={`${fieldClass} mt-2`}
            />
            <FieldMsg id={describe("date")} error={fieldErr("date")} />
          </div>
          <div className="sm:col-span-2 xl:col-span-1">
            <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
              <ChartLineUp size={15} aria-hidden />
              Value
            </p>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.8fr)] gap-2">
              <Dropdown
                label="Compared how"
                value={d.comparator || null}
                onChange={(v) => set("comparator", v)}
                options={CMP_OPTIONS}
                placeholder="Compare"
                size="lg"
                panelMinWidth={140}
              />
              <input
                id={`${uid}-value`}
                inputMode="decimal"
                value={d.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder="40000"
                aria-label="Value"
                aria-invalid={Boolean(fieldErr("value"))}
                aria-describedby={describe("value")}
                className={fieldClass}
              />
              <input
                id={`${uid}-unit`}
                value={d.unit}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="USD"
                aria-label="Unit"
                aria-invalid={Boolean(fieldErr("unit"))}
                aria-describedby={describe("value")}
                className={fieldClass}
              />
            </div>
            <FieldMsg id={describe("value")} error={fieldErr("value") ?? fieldErr("unit")} />
          </div>
          <div>
            <label htmlFor={`${uid}-jiraKey`} className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
              <Ticket size={15} aria-hidden />
              Jira key
            </label>
            <input
              id={`${uid}-jiraKey`}
              value={d.jiraKey}
              onChange={(e) => set("jiraKey", e.target.value)}
              placeholder="SSO-142"
              autoCapitalize="characters"
              aria-invalid={Boolean(fieldErr("jiraKey"))}
              aria-describedby={describe("jiraKey")}
              className={`${fieldClass} mt-2`}
            />
            <FieldMsg id={describe("jiraKey")} error={fieldErr("jiraKey")} />
          </div>
          <div>
            <label htmlFor={`${uid}-dealId`} className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
              <Handshake size={15} aria-hidden />
              HubSpot deal id
            </label>
            <input
              id={`${uid}-dealId`}
              value={d.dealId}
              onChange={(e) => set("dealId", e.target.value)}
              placeholder="18234519"
              aria-invalid={Boolean(fieldErr("dealId"))}
              aria-describedby={describe("dealId")}
              className={`${fieldClass} mt-2`}
            />
            <FieldMsg id={describe("dealId")} error={fieldErr("dealId")} />
          </div>
        </div>
      </fieldset>

      {err?.field === "form" ? (
        <p role="alert" className="text-[14px] text-priority-high">
          {err.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={busy} aria-busy={busy}>
          {busy ? "Saving" : saveLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
