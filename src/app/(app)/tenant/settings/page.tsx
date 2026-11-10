import type { Metadata } from "next";
import { Note, PageHeader } from "@/components/settings/primitives";
import { TenantSettingsForm } from "@/components/tenant/TenantSettingsForm";
import { loadTenantSettings } from "@/lib/api/admin-tenant";
import { settingsToForm } from "@/lib/tenant-admin";

export const metadata: Metadata = { title: "Workspace settings | Mytheus" };
export const dynamic = "force-dynamic";

/* Workspace settings (Phase P12, plan 3.13 step 2): `tenant_settings` retention, PII redaction and
   `agent_confidence_overrides`, over admin-ops-service's `/admin/tenant/settings`. A failed read
   shows no form at all, so nobody saves defaults over settings they could not see. */
export default async function TenantSettingsPage() {
  const res = await loadTenantSettings();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workspace settings"
        description="Data retention, privacy and how sure an agent must be before it speaks up. Every change is written to the audit log."
      />
      {res.kind === "live" ? (
        <TenantSettingsForm initial={settingsToForm(res.data)} />
      ) : res.kind === "forbidden" ? (
        <Note tone="error">Only workspace owners and admins can see and change these settings.</Note>
      ) : (
        <Note tone="warning">Workspace settings could not be loaded from the server just now. Try again in a moment.</Note>
      )}
    </div>
  );
}
