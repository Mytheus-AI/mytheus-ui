import type { CallMeeting } from "@/lib/api/meetings";

/** What the meetings hub needs per meeting: the real meeting, as core-api returns it. */
export type HubMeeting = CallMeeting;
