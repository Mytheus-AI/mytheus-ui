import type { MeetingView } from "@/lib/api/present";

/** A `bff` meeting as Home consumes it: the shared view model plus the scheduled end, which the
 *  hero and timeline use for the time range and length. Absent when the server has none. */
export type HomeMeeting = MeetingView & { endTime?: string };
