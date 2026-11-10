import type { Metadata } from "next";
import { PromisesView } from "@/components/promises/PromisesView";
import { fetchMyPromises } from "@/lib/api/commitments";

export const metadata: Metadata = { title: "Promises | Mytheus" };

/* Promises (ADR-0039 B6, Part E): the caller's own `commitments`, open and done, from
   `GET /api/v1/commitments`. Dismissed ones are not shown. A failed read is thrown to
   `error.tsx`, never shown as an empty list. */
export default async function PromisesPage() {
  const items = await fetchMyPromises();
  return <PromisesView initial={items} nowIso={new Date().toISOString()} />;
}
