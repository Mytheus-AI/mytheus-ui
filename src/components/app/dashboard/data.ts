/* Dashboard-local records that have no server source yet. Kept in one place so the header
   figure, the "Needs you" queue and any later wiring agree on the same list. */

/* Open cross-meeting conflicts flagged by the agents. Not in lib/mock yet - local const until
   /bff/dashboard exposes a conflicts rollup. Mirrors the mockAgentSidebar conflict story
   (pricing rework vs. Q3 launch date). */
export type OpenConflict = {
  id: string;
  summary: string;
  meetingId: string;
  meetingTitle: string;
};

export const openConflicts: readonly OpenConflict[] = [
  {
    id: "conf_1",
    summary: "Pricing rework vs. Q3 launch date",
    meetingId: "mtg_1",
    meetingTitle: "Q3 Roadmap Sync",
  },
];

import { mockActions, mockOrgContext, type ActionItem } from "@/lib/mock/data";

/* `action_items` is a shaped-but-empty arm on the server until the agent and confirmation bands
   (Plan 7-9), so counting real ones would render "0 open" as though it were measured. Tasks
   stay on the mock, and the header figure and the task panel both read it from here so they
   always agree. */
export function myOpenTasks(): { mine: ActionItem[]; teamCount: number } {
  const open = mockActions.filter((a) => a.status === "open");
  const mine = open
    .filter((a) => a.assignee === mockOrgContext.user.name)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return { mine, teamCount: open.length - mine.length };
}
