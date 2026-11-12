"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card, CardHead } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Dropdown } from "@/components/ui/Dropdown";
import { FieldMsg, TextInput } from "@/components/ui/Form";
import { Toggle } from "@/components/settings/Toggle";
import { notifyError, notifySuccess } from "@/lib/toast";
import { deleteAttendanceRule, saveAttendanceRule } from "@/app/actions/listening";
import type { AttendanceChoice, AttendanceRule } from "@/lib/api/listening-types";
import { ruleSummary } from "@/lib/listening";
import { ChoiceControl } from "./ChoiceControl";

/* Standing rules: "let my Myte listen to every recurring status meeting". The first rule that
   matches a meeting decides it; a choice you make by hand on one meeting always wins over a rule.
   A rule never sends your Myte into a confidential meeting, and leaves meetings you host alone
   unless you say so. Saving applies it to the next three weeks at once and says how many
   meetings now follow it. */

export type TemplateOption = { id: string; name: string };

type Draft = { choice: AttendanceChoice; title: string; templateId: string; recurring: boolean; hosted: boolean };

const EMPTY: Draft = { choice: "agent_listens", title: "", templateId: "", recurring: true, hosted: false };

function draftOf(r: AttendanceRule): Draft {
  return {
    choice: r.choice,
    title: r.title_contains ?? "",
    templateId: r.template_id ?? "",
    recurring: r.recurring_only,
    hosted: r.include_hosted,
  };
}

export function RulesPanel({ rules, templates }: { rules: AttendanceRule[]; templates: TemplateOption[] | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const remove = async (r: AttendanceRule) => {
    setRemoving(r.id);
    const res = await deleteAttendanceRule(r.id);
    setRemoving(null);
    if (!res.ok) return notifyError(res.message);
    notifySuccess("Rule removed", { description: "Meetings it decided go back to your other rules." });
    router.refresh();
  };

  return (
    <Card as="section" flush aria-labelledby="rules-h">
      <CardHead
        id="rules-h"
        title="Your rules"
        description="Decide whole kinds of meetings at once. A choice you make on one meeting always wins."
        right={
          <Button size="sm" variant="outline" onClick={() => setEditing({ id: null, draft: EMPTY })}>
            <Plus size={15} weight="bold" aria-hidden />
            New rule
          </Button>
        }
        divided
      />
      {rules.length === 0 ? (
        <div className="px-4 py-6 sm:px-[22px]">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <ListChecks size={18} className="text-ink-3" aria-hidden />
            No rules yet
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-3">
            Try &ldquo;Let my Myte listen to every recurring status meeting&rdquo;. It covers new invitations as they arrive.
          </p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => setEditing({ id: null, draft: { ...EMPTY, title: "status" } })}
          >
            Add that rule
          </Button>
        </div>
      ) : (
        <ol className="divide-y divide-line">
          {rules.map((r, i) => (
            <li key={r.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-[22px]">
              <span aria-hidden className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-bg-2 text-[12.5px] font-semibold tabular-nums text-ink-3">
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 text-[14.5px] leading-relaxed text-ink-2">{ruleSummary(r)}</p>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" icon aria-label={`Edit rule ${i + 1}`} onClick={() => setEditing({ id: r.id, draft: draftOf(r) })}>
                  <PencilSimple size={15} aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon
                  aria-label={`Remove rule ${i + 1}`}
                  disabled={removing === r.id}
                  onClick={() => void remove(r)}
                >
                  <Trash size={15} aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {editing ? (
        <RuleDialog
          ruleId={editing.id}
          initial={editing.draft}
          templates={templates}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </Card>
  );
}

function RuleDialog({
  ruleId,
  initial,
  templates,
  onClose,
  onSaved,
}: {
  ruleId: string | null;
  initial: Draft;
  templates: TemplateOption[] | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const uid = useId();
  const [d, setD] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Draft>) => {
    setError(null);
    setD((x) => ({ ...x, ...patch }));
  };
  const template = templates?.find((t) => t.id === d.templateId) ?? null;
  const preview = ruleSummary({
    choice: d.choice,
    title_contains: d.title.trim() || null,
    template_id: d.templateId || null,
    template_name: template?.name ?? null,
    recurring_only: d.recurring,
    include_hosted: d.hosted,
  });

  const submit = async () => {
    if (!d.title.trim() && !d.templateId && !d.recurring) return setError("Say which meetings: a title, a meeting type, or recurring meetings.");
    setBusy(true);
    const res = await saveAttendanceRule(ruleId, {
      choice: d.choice,
      title_contains: d.title.trim() || null,
      template_id: d.templateId || null,
      recurring_only: d.recurring,
      include_hosted: d.hosted,
    });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    const n = res.data.applied;
    notifySuccess(ruleId ? "Rule saved" : "Rule added", {
      description: n === 0 ? "No upcoming meetings match it yet. New invitations will." : `Applied to ${n} upcoming meeting${n === 1 ? "" : "s"}.`,
    });
    onSaved();
  };

  return (
    <Dialog open onClose={onClose} busy={busy} title={ruleId ? "Edit rule" : "New rule"} description="The first rule that matches a meeting decides it.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-5"
      >
        <div>
          <p id={`${uid}-what`} className="text-[15px] font-semibold text-ink">
            What happens
          </p>
          <div className="mt-2">
            <ChoiceControl name="rule" value={d.choice} onChange={(c) => set({ choice: c })} label="What happens" />
          </div>
        </div>
        <div>
          <label htmlFor={`${uid}-title`} className="text-[15px] font-semibold text-ink">
            Title contains
          </label>
          <TextInput
            id={`${uid}-title`}
            className="mt-2"
            value={d.title}
            maxLength={80}
            placeholder="status"
            onChange={(e) => set({ title: e.target.value })}
            aria-describedby={`${uid}-title-help`}
          />
          <FieldMsg id={`${uid}-title-help`} hint="Optional. Matches anywhere in the title, ignoring case." />
        </div>
        {templates && templates.length > 0 ? (
          <div>
            <label htmlFor={`${uid}-type`} className="text-[15px] font-semibold text-ink">
              Meeting type
            </label>
            <div className="mt-2">
              <Dropdown
                id={`${uid}-type`}
                label="Meeting type"
                value={d.templateId}
                onChange={(v) => set({ templateId: v })}
                options={[{ value: "", label: "Any type" }, ...templates.map((t) => ({ value: t.id, label: t.name }))]}
                size="lg"
              />
            </div>
          </div>
        ) : null}
        <div className="divide-y divide-line rounded-ctl border border-line">
          <div className="flex items-center justify-between gap-4 px-3.5 py-3">
            <span id={`${uid}-rec`} className="text-[15px] text-ink">
              Only recurring meetings
            </span>
            <Toggle checked={d.recurring} onChange={(v) => set({ recurring: v })} labelledBy={`${uid}-rec`} />
          </div>
          <div className="flex items-center justify-between gap-4 px-3.5 py-3">
            <span id={`${uid}-host`} className="text-[15px] text-ink">
              Include meetings I host
            </span>
            <Toggle checked={d.hosted} onChange={(v) => set({ hosted: v })} labelledBy={`${uid}-host`} />
          </div>
        </div>
        <p className="rounded-ctl bg-bg-2 px-3.5 py-3 font-display text-[15px] italic leading-snug text-ink-2" aria-live="polite">
          {preview}
        </p>
        <FieldMsg id={`${uid}-msg`} error={error} />
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy} aria-busy={busy || undefined}>
            {busy ? "Saving" : ruleId ? "Save rule" : "Add rule"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
