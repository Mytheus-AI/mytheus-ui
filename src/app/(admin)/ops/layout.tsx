import { notFound } from "next/navigation";
import { OpsShell } from "@/components/ops/OpsShell";
import { PlatformConsoleUnavailable } from "@/components/admin/PlatformConsoleUnavailable";
import { checkOpsGate } from "@/lib/api/admin-ops";

export const dynamic = "force-dynamic";

/* The internal-ops console (Phase P12, plan 3.13 step 3), for Mytheus staff only. Deny by default:
   it renders only when admin-ops-service's `GET /admin/ops/whoami` says `{staff: true}`. Anyone
   else gets a 404, so the console's existence is not advertised. If the service cannot be reached,
   staff see an honest "unavailable" panel in the frame without its sections, and no data. This
   gate decides what the page shows; admin-ops-service enforces the staff list on every
   `/admin/ops/*` call regardless. Each section page carries its own title (the one h1). */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const gate = await checkOpsGate();
  if (gate === "denied") notFound();
  if (gate === "unavailable") {
    return (
      <OpsShell nav={false}>
        <PlatformConsoleUnavailable
          title="Ops console"
          what="Tenants, feature flags, cost and lag, and the audit log across every workspace."
          reason="The ops service could not confirm your staff access just now, so no workspace data is shown. Try again in a moment."
        />
      </OpsShell>
    );
  }
  return <OpsShell>{children}</OpsShell>;
}
