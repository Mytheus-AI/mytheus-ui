import type { Metadata } from "next";
import { PlatformConsoleUnavailable } from "@/components/admin/PlatformConsoleUnavailable";

export const metadata: Metadata = { title: "Ops console | Mytheus" };

/* Internal ops console: cross-tenant support, feature flags and model cost. Needs
   `admin-ops-service` (`/admin/ops/*`) and a staff role; neither exists, so it shows no data. */
export default function OpsPage() {
  return (
    <PlatformConsoleUnavailable
      title="Ops console"
      what="Support, feature flags and model cost across every workspace."
    />
  );
}
