import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettleThread } from "@/components/settle/SettleThread";
import { ErrorState } from "@/components/ui/ErrorState";
import { fetchSettlement } from "@/lib/api/settlements";
import { isUuid } from "@/lib/decision-why";

export const metadata: Metadata = { title: "Settle a clash | Mytheus" };
export const dynamic = "force-dynamic";

/* One settle thread (a4 contract 3d). Only the two owners can read it: core-api answers 404 to
   anyone else and across tenants, and so does this page. */
export default async function SettleThreadPage({ params }: { params: { settlementId: string } }) {
  if (!isUuid(params.settlementId)) notFound();
  const res = await fetchSettlement(params.settlementId);
  if (!res.ok) {
    if (res.reason === "none" || res.reason === "forbidden") notFound();
    return <ErrorState title="We could not load this thread" text="Nothing was lost. This is usually a passing problem reaching the workspace." />;
  }
  return <SettleThread initial={res.data} />;
}
