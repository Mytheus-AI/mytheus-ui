import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Note, PageHeader, SectionCard, SettingsRow, TextInput } from "@/components/settings/primitives";
import { theadRowClass, thClass } from "@/components/admin/StatCard";
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
    <div className="flex flex-col gap-6">
      <PageHeader title="Feature flags" description="Turn features on for every tenant or for one. A tenant flag overrides the global one for that tenant." />

      {res.kind === "forbidden" ? (
        <Note tone="error">This account is not on the Mytheus staff list.</Note>
      ) : res.kind === "unavailable" ? (
        <Note tone="warning">Feature flags could not be loaded just now. Try again in a moment.</Note>
      ) : (
        <>
          <SectionCard
            title="Flags"
            headingLevel={2}
            headingId="flags-heading"
            description="A tenant row overrides the global row with the same key."
            aside={flags.length ? <span className="text-[14px] font-medium text-ink-3">{flags.length} in total</span> : undefined}
          >
            {flags.length === 0 ? (
              <EmptyState
                className="!rounded-none !border-0 !bg-transparent !py-10"
                title="No flags yet"
                description="Every feature runs on its default. Create a flag below to change that."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-[14.5px]">
                  <caption className="sr-only">Feature flags</caption>
                  <thead>
                    <tr className={theadRowClass}>
                      <th scope="col" className={`${thClass} !pl-[22px]`}>Key</th>
                      <th scope="col" className={thClass}>Applies to</th>
                      <th scope="col" className={thClass}>Updated</th>
                      <th scope="col" className={`${thClass} text-right !pr-[22px]`}>Enabled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {flags.map((f) => (
                      <tr key={f.id} className="transition-colors duration-150 hover:bg-surface-2">
                        <td className="py-3 pl-[22px] pr-5 font-mono text-[14px] font-semibold text-ink">{f.key}</td>
                        <td className="px-5 py-3">
                          {f.org_id === null ? (
                            <Badge>All tenants</Badge>
                          ) : (
                            <span className="text-ink-2">{names.get(f.org_id) ?? f.org_id}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-3">
                          {Number.isNaN(Date.parse(f.updated_at)) ? "" : dateTime.format(new Date(f.updated_at))}
                        </td>
                        <td className="py-3 pl-5 pr-[22px]">
                          <FlagControls id={f.id} flagKey={f.key} enabled={f.enabled} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="New flag"
            headingLevel={2}
            headingId="new-flag-heading"
            description="Create it off, check the scope, then turn it on from the list."
          >
            <ActionForm action={createFeatureFlag} className="flex flex-col" messageClassName="px-4 pb-4 sm:px-[22px]">
              <SettingsRow label="Key" help="Lowercase letters, digits, dot, dash and underscore." htmlFor="flag-key">
                <TextInput id="flag-key" name="key" required autoComplete="off" spellCheck={false} placeholder="live_notes.v2" />
              </SettingsRow>
              <SettingsRow label="Applies to">
                <FormSelect name="org_id" defaultValue="global" options={scopeOptions} label="Applies to" size="md" />
              </SettingsRow>
              <SettingsRow label="Start enabled" htmlFor="flag-enabled" help="Leave off to check the scope first.">
                <input
                  id="flag-enabled"
                  type="checkbox"
                  name="enabled"
                  className="h-5 w-5 cursor-pointer accent-[var(--signal)]"
                />
              </SettingsRow>
              <div className="border-t border-line bg-surface-2 px-4 py-3.5 sm:px-[22px]">
                <FormSubmit variant="primary" size="md" pendingLabel="Creating flag">
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
