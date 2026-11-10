import type { Metadata } from "next";
import { StatusRequestsView } from "@/components/status/StatusRequestsView";
import { fetchMyStatusRequests } from "@/lib/api/status-requests";

export const metadata: Metadata = { title: "Status requests | Mytheus" };

/* Status requests (ADR-0039 B7, Part E): the caller's pending requests from
   `GET /api/v1/status-requests?state=pending`, answered inline, with answered ones below. A failed
   pending read is thrown to `error.tsx`; a failed answered read only quiets that list. */
export default async function StatusRequestsPage() {
  const [pending, answered] = await Promise.all([
    fetchMyStatusRequests("pending"),
    fetchMyStatusRequests("answered").catch(() => null),
  ]);
  const sortedAnswered = (answered ?? []).sort((a, b) =>
    (b.answered_at ?? "") < (a.answered_at ?? "") ? -1 : (b.answered_at ?? "") > (a.answered_at ?? "") ? 1 : 0,
  );
  const sortedPending = pending.sort((a, b) =>
    (a.meetingStart ?? "~") < (b.meetingStart ?? "~") ? -1 : (a.meetingStart ?? "~") > (b.meetingStart ?? "~") ? 1 : 0,
  );
  return (
    <StatusRequestsView
      pending={sortedPending}
      answered={sortedAnswered}
      answeredFailed={answered === null}
      nowIso={new Date().toISOString()}
    />
  );
}
