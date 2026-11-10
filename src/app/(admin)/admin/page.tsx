import type { Metadata } from "next";
import { PlatformConsoleUnavailable } from "@/components/admin/PlatformConsoleUnavailable";

export const metadata: Metadata = {
  title: "Mytheus | Tenant ops",
};

/* Platform tenant overview: every workspace, its plan, seats and status. Cross-tenant, so it
   needs `admin-ops-service` and a staff role; neither exists, so it shows no data. */
export default function AdminOverviewPage() {
  return (
    <PlatformConsoleUnavailable
      title="Tenants"
      what="Every workspace on the platform, with its plan, members and status."
    />
  );
}
