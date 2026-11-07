import type { MeetingStatus } from "@/lib/mock/data";

export type { MeetingStatus };

/** What the meetings hub needs per meeting. Built by the page from the same mock sources it read
 *  before; counts are real counts of what those sources hold, never invented. */
export interface HubMeeting {
  id: string;
  title: string;
  /** ISO string. */
  startTime: string;
  durationMinutes: number;
  status: MeetingStatus;
  participants: string[];
  decisionCount: number;
  actionCount: number;
  /** Number of agenda items on record. */
  agendaCount: number;
  /** True when transcript lines exist for this meeting. */
  hasTranscript: boolean;
}
