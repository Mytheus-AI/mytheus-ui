import type { Metadata } from "next";
import { DecisionsLog } from "@/components/decisions/DecisionsLog";
import { fetchDecisionLog } from "@/lib/api/decisions";

export const metadata: Metadata = { title: "Decisions | Mytheus" };

/* Decision history: `GET /api/v1/decisions`, every decision confirmed in a meeting you were in,
   newest first, including the ones a later decision replaced. Dismissed and unconfirmed
   detections never reach this record. A failed read is thrown to `error.tsx`, never replaced
   with sample content. The log, filters and detail panel are one client island. */
export default async function DecisionsPage() {
  const decisions = await fetchDecisionLog();
  return <DecisionsLog decisions={decisions} />;
}
