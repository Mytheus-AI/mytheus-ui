import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Note, PageHeader, SectionCard, SettingsRow, TextInput } from "@/components/settings/primitives";
import { thClass } from "@/components/admin/StatCard";
import { ActionForm } from "@/components/admin/ActionForm";
import { FormSelect } from "@/components/admin/FormSelect";
import { FormSubmit } from "@/components/admin/FormSubmit";
import { FlagControls } from "@/components/ops/FlagRow";
import { createFeatureFlag } from "@/app/actions/ops";
import { loadFlags, loadOpsTenants } from "@/lib/api/admin-ops";

export const metadata: Metadata = { title: "Feature flags | Mytheus" };
export const dynamic = "force-dynamic";

/* Feature flags (`feature_flags`, plan 3.13 step 3): a flag is global (no tenant) or set for one
   tenant, which overrides the global value for it. Every change emits `admin-events` flag_changed
   and is written to the ops audit log. */

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function OpsFlagsPage() {
  const [res, tenants] = await Promise.all([loadFlags(), loadOpsTenants()]);
  const names = new Map(tenants.kind === "live" ? tenants.data.tenants.map((t) => [t.org_id, t.name]) : []);
  const flags = res.kind === "live" ? [...res.data].sort((a, b) => a.key.localeCompare(b.key) || Number(a.org_id !== null) - Number(b.org_id !== null)) : [];
  const scopeOptions = [
    { value: "global", label: "All tenants" },
    ...(tenants.kind === "live" ? tenants.data.tenants.map((t) => ({ value: t.org_id, label: t.name })) : []),
  ];

  return (
    <div className="flex flex-col gap-6 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader title="Feature flags" description="Turn features on for every tenant or for one. A tenant flag overrides the global one for that tenant." />

      {res.kind === "forbidden" ? (
        <Note tone="error">This account is not on the Mytheus staff list.</Note>
      ) : res.kind === "unavailable" ? (
        <Note tone="warning">Feature flags could not be loaded just now. Try again in a moment.</Note>
      ) : (
        <>
          <section aria-labelledby="flags-heading" className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
            <div className="px-4 pb-3 pt-4 sm:px-[22px] sm:pt-[18px]">
              <h2 id="flags-heading" className="text-[16px] font-semibold text-ink">
                Flags
              </h2>
            </div>
            {flags.length === 0 ? (
              <p className="border-t border-line px-4 py-4 text-[13.5px] text-ink-3 sm:px-[22px]">No flags yet. Every feature runs on its default.</p>
            ) : (
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full border-collapse text-left text-[14px]">
                  <thead>
                    <tr className="bg-bg">
                      <th scope="col" className={thClass}>Key</th>
                      <th scope="col" className={thClass}>Applies to</th>
                      <th scope="col" className={thClass}>Updated</th>
                      <th scope="col" className={`${thClass} text-right`}>Enabled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {flags.map((f) => (
                      <tr key={f.id}>
                        <td className="px-5 py-3 font-mono text-[13px] text-ink">{f.key}</td>
                        <td className="px-5 py-3">
                          {f.org_id === null ? <Badge tone="low">All tenants</Badge> : <span className="text-ink-2">{names.get(f.org_id) ?? f.org_id}</span>}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-3">
                          {Number.isNaN(Date.parse(f.updated_at)) ? "" : dateTime.format(new Date(f.updated_at))}
                        </td>
                        <td className="px-5 py-3">
                          <FlagControls id={f.id} flagKey={f.key} enabled={f.enabled} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <SectionCard title="New flag" description="Create it off, check the scope, then turn it on from the list.">
            <ActionForm action={createFeatureFlag} className="flex flex-col" messageClassName="px-4 pb-4 sm:px-[22px]">
              <SettingsRow label="Key" help="Lowercase letters, digits, dot, dash and underscore." htmlFor="flag-key">
                <TextInput id="flag-key" name="key" required autoComplete="off" spellCheck={false} placeholder="live_notes.v2" />
              </SettingsRow>
              <SettingsRow label="Applies to">
                <FormSelect name="org_id" defaultValue="global" options={scopeOptions} label="Applies to" size="md" />
              </SettingsRow>
              <SettingsRow label="Start enabled" htmlFor="flag-enabled">
                <input id="flag-enabled" type="checkbox" name="enabled" className="h-4 w-4 accent-[var(--signal)]" />
              </SettingsRow>
              <div className="px-4 pb-4 pt-1 sm:px-[22px]">
                <FormSubmit variant="primary" pendingLabel="Creating...">
                  Create flag
                </FormSubmit>
              </div>
            </ActionForm>
          </SectionCard>
        </>
      )}
    </div>
  );
}
