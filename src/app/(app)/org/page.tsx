import { redirect } from "next/navigation";
import { legacyHref, type SearchParams } from "@/lib/legacy-routes";

/** Moved in the November 2026 information architecture; old links land on the new home. */
export default function LegacyRedirect({ searchParams }: { searchParams: SearchParams }) {
  redirect(legacyHref("/org", searchParams) ?? "/dashboard");
}
