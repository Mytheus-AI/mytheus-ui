import { redirect } from "next/navigation";
import { legacyHref, type SearchParams } from "@/lib/legacy-routes";

/** Settings opens on Profile; the old Workspace tab moved to the Workspace console. */
export default function SettingsIndex({ searchParams }: { searchParams: SearchParams }) {
  redirect(legacyHref("/settings", searchParams) ?? "/settings/profile");
}
