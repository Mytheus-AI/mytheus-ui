import type { AgendaItem, AgendaStatus } from "@/lib/api/meeting-agenda-types";
import type { ChipTone } from "./Chip";

/* How an agenda item's status reads, on the meeting page and in the room alike. Covered is done
   (ok), in progress is the one live thing (accent), pending and skipped stay neutral. */

export const STATUS_LABEL: Record<AgendaStatus, string> = {
  pending: "Not started",
  in_progress: "In progress",
  covered: "Covered",
  skipped: "Skipped",
};

export const STATUS_TONE: Record<AgendaStatus, ChipTone> = {
  pending: "neutral",
  in_progress: "accent",
  covered: "ok",
  skipped: "neutral",
};

/** Who set the status, said quietly; null while nobody has. */
export function statusSourceText(item: Pick<AgendaItem, "status_source" | "status">): string | null {
  if (item.status === "pending" && !item.status_source) return null;
  if (item.status_source === "agent") return "Marked by the meeting agent";
  if (item.status_source === "host") return "Marked by the host";
  return null;
}

/** "Maya, 15 min" style meta for an item, or "" when it has neither. */
export function itemMeta(item: Pick<AgendaItem, "owner_user_id" | "duration_minutes">, nameOf: (id: string) => string): string {
  const parts: string[] = [];
  if (item.owner_user_id) parts.push(nameOf(item.owner_user_id));
  if (item.duration_minutes) parts.push(`${item.duration_minutes} min`);
  return parts.join(", ");
}
