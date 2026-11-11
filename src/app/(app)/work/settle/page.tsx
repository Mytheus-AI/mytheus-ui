import type { Metadata } from "next";
import { SettleList } from "@/components/settle/SettleList";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionBar } from "@/components/ui/Page";
import { fetchSettlements } from "@/lib/api/settlements";

export const metadata: Metadata = { title: "To settle | Mytheus" };
export const dynamic = "force-dynamic";

/* My work, To settle (a4 contract 3d): threads where one of your confirmed decisions may clash with
   another team's. Only the two owners see a thread. */
export default async function SettlePage() {
  const res = await fetchSettlements("all");
  return (
    <div>
      <SectionBar context="When one of your decisions may clash with another team's, you settle it here with that decision's owner." />
      {res.ok ? (
        <SettleList items={res.data} />
      ) : (
        <ErrorState title="We could not load the decisions to settle" text="Nothing was lost. This is usually a passing problem reaching the workspace." />
      )}
    </div>
  );
}
