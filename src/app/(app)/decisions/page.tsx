import type { Metadata } from "next";
import { DecisionsLog } from "@/components/decisions/DecisionsLog";
import { mockDecisions } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Decisions | Mytheus" };

/* Decision history: everything the org has confirmed, newest first, each carrying its
   FOLLOWS_FROM lineage so you can trace how a decision evolved across meetings. Only confirmed
   decisions exist here, since dismissed detections never reach this record. The log, filters and
   detail panel are one client island (DecisionsLog); the data source is unchanged. */
export default function DecisionsPage() {
  return <DecisionsLog decisions={mockDecisions} />;
}
