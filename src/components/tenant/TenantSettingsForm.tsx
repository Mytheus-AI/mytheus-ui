"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { saveTenantSettings } from "@/app/actions/tenant-admin";
import { FormSubmit } from "@/components/admin/FormSubmit";
import { Toggle } from "@/components/settings/Toggle";
import { InlineRow, SectionCard, SettingsRow, TextInput, fieldClass } from "@/components/settings/primitives";
import { thClass } from "@/components/admin/StatCard";
import {
  CONFIDENCE_AGENTS,
  DEFAULT_SILENT,
  DEFAULT_SURFACE,
  RETENTION_MAX,
  RETENTION_MIN,
  type SettingsFormInput,
} from "@/lib/tenant-admin";

/* Workspace settings over `/admin/tenant/settings`: retention, PII redaction and the agent
   confidence overrides. One form, one Save; the server action validates with the same parser the
   tests cover and the server audits the write. Blank means "use the default". */
export function TenantSettingsForm({ initial }: { initial: SettingsFormInput }) {
  const [state, formAction] = useFormState(saveTenantSettings, null);
  const [pii, setPii] = useState(initial.pii_redaction_enabled);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <SectionCard title="Retention" description="How long transcripts and notes are kept before they are deleted for good. Blank keeps them until someone deletes them.">
        <SettingsRow label="Transcripts" help={`Days, ${RETENTION_MIN} to ${RETENTION_MAX}.`} htmlFor="retention_days_transcripts">
          <TextInput
            id="retention_days_transcripts"
            name="retention_days_transcripts"
            inputMode="numeric"
            placeholder="Keep until deleted"
            defaultValue={initial.retention_days_transcripts}
          />
        </SettingsRow>
        <SettingsRow label="Notes" help={`Agent notes kept in the background log. Days, ${RETENTION_MIN} to ${RETENTION_MAX}.`} htmlFor="retention_days_worklogs">
          <TextInput
            id="retention_days_worklogs"
            name="retention_days_worklogs"
            inputMode="numeric"
            placeholder="Keep until deleted"
            defaultValue={initial.retention_days_worklogs}
          />
        </SettingsRow>
      </SectionCard>

      <SectionCard title="Privacy">
        <InlineRow
          label="Redact personal data"
          labelId="pii-label"
          help="Phone numbers, emails and similar details are removed from transcripts and documents before they are stored or shared with agents."
        >
          <input type="hidden" name="pii_redaction_enabled" value={pii ? "on" : "off"} />
          <Toggle checked={pii} onChange={setPii} labelledBy="pii-label" />
        </InlineRow>
      </SectionCard>

      <SectionCard
        title="Agent confidence"
        description={`Above the show threshold an agent's suggestion appears in the meeting; between the two it is only logged; below the log threshold it is dropped. Defaults are ${DEFAULT_SURFACE} and ${DEFAULT_SILENT}.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="bg-bg">
                <th scope="col" className={thClass}>Agent</th>
                <th scope="col" className={thClass}>Show above</th>
                <th scope="col" className={thClass}>Log from</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {CONFIDENCE_AGENTS.map(({ key, label }) => (
                <tr key={key}>
                  <th scope="row" className="px-5 py-3 font-semibold text-ink">
                    {label}
                  </th>
                  <td className="px-5 py-3">
                    <input
                      name={`surface_${key}`}
                      aria-label={`${label}: show above`}
                      inputMode="decimal"
                      placeholder={String(DEFAULT_SURFACE)}
                      defaultValue={initial.thresholds[key]?.surface ?? ""}
                      className={`${fieldClass} max-w-[120px]`}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <input
                      name={`silent_${key}`}
                      aria-label={`${label}: log from`}
                      inputMode="decimal"
                      placeholder={String(DEFAULT_SILENT)}
                      defaultValue={initial.thresholds[key]?.silent ?? ""}
                      className={`${fieldClass} max-w-[120px]`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3">
        <FormSubmit variant="primary" size="md" pendingLabel="Saving...">
          Save settings
        </FormSubmit>
        {state ? (
          <span role={state.ok ? "status" : "alert"} className={`text-[13px] ${state.ok ? "text-ink-3" : "text-priority-high"}`}>
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
