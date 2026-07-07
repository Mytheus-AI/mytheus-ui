import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { mockActions, mockOrgContext, type ActionItem } from "@/lib/mock/data";
import { daysFromNow, dueLabel, priorityDotClass } from "./format";

function ActionRow({ action }: { action: ActionItem }) {
  const overdue = daysFromNow(action.dueDate) < 0;
  return (
    <li>
      <Link
        href="/tasks"
        className="flex min-h-[44px] items-start gap-3 px-5 py-3 transition-colors duration-150 hover:bg-bg-2"
      >
        <span
          aria-hidden
          className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${priorityDotClass[action.priority]}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-ink">
            {action.title}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">
            <span className={overdue ? "font-medium text-priority-high" : ""}>
              {dueLabel(action.dueDate)}
            </span>{" "}
            · {action.meetingTitle}
          </span>
        </span>
        <span className="sr-only">{action.priority} priority</span>
      </Link>
    </li>
  );
}

export function ActionItems({ className = "" }: { className?: string }) {
  const open = mockActions.filter((a) => a.status === "open");
  const mine = open
    .filter((a) => a.assignee === mockOrgContext.user.name)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const teamCount = open.length - mine.length;

  return (
    <section
      aria-labelledby="action-items-heading"
      className={`flex min-w-0 flex-col overflow-hidden rounded-card border border-line bg-surface ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 px-5 pt-4">
        <h2
          id="action-items-heading"
          className="text-[17px] font-medium text-ink-display"
        >
          Your action items
        </h2>
        <Link
          href="/tasks"
          className="link-underline flex min-h-[40px] shrink-0 items-center text-[13px] font-medium text-ink-2"
        >
          View all
        </Link>
      </div>

      {mine.length > 0 ? (
        <ul className="mt-3 flex-1 divide-y divide-line border-t border-line">
          {mine.map((action) => (
            <ActionRow key={action.id} action={action} />
          ))}
        </ul>
      ) : (
        <div className="mt-3 flex-1 border-t border-line p-5">
          <EmptyState
            className="py-10"
            title="No open action items"
            description="Action items assigned to you in meetings will show up here until they're done."
          />
        </div>
      )}

      {teamCount > 0 ? (
        <Link
          href="/tasks"
          className="flex min-h-[40px] items-center border-t border-line bg-bg-2 px-5 py-3 text-[12.5px] text-ink-3 transition-colors duration-150 hover:text-ink-2"
        >
          {teamCount} more open across the team
        </Link>
      ) : null}
    </section>
  );
}
