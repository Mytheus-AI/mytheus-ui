import { fetchMyStatusRequests } from "@/lib/api/status-requests";
import type { StatusRequestView } from "@/lib/api/personal-types";
import { StatusRequestsCardList } from "./StatusRequestsCardList";

/**
 * The dashboard's status requests card (ADR-0039 Part E): pending requests answered inline. It is
 * a nudge, so it renders nothing when nothing is waiting, and nothing when the read fails (the
 * full list at /status-requests says so properly). Server component; it reads
 * `GET /api/v1/status-requests?state=pending` itself so the dashboard only mounts it.
 */
export async function StatusRequestsCard({ className = "" }: { className?: string }) {
  let pending: StatusRequestView[] = [];
  try {
    pending = await fetchMyStatusRequests("pending");
  } catch {
    return null;
  }
  if (pending.length === 0) return null;
  return <StatusRequestsCardList initial={pending} nowIso={new Date().toISOString()} className={className} />;
}
