import { notFound, redirect } from "next/navigation";
import { legacyHref, type SearchParams } from "@/lib/legacy-routes";

/** The workspace admin console moved to /workspace; every old /tenant link lands on its new tab. */
export default function LegacyTenant({ params, searchParams }: { params: { path?: string[] }; searchParams: SearchParams }) {
  const target = legacyHref(`/tenant${params.path?.length ? `/${params.path.join("/")}` : ""}`, searchParams);
  if (!target) notFound();
  redirect(target);
}
