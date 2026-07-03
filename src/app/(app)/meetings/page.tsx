import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { mockMeetings, type Meeting } from "@/lib/mock/data";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const formatted = dateFormatter.format(new Date(meeting.startTime));
  const visibleParticipants = meeting.participants.slice(0, 3);
  const overflow = meeting.participants.length - visibleParticipants.length;
  const hasBadges = meeting.decisionCount > 0 || meeting.actionCount > 0;

  return (
    <Link href={`/meetings/${meeting.id}`} className="block">
      <Card className="cursor-pointer transition-colors hover:border-line-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-medium text-ink">{meeting.title}</h3>
              {meeting.status === "live" ? <Badge tone="danger">Live</Badge> : null}
            </div>
            <p className="mt-1 text-[13px] text-ink-3">
              {formatted} &middot; {meeting.durationMinutes} min
            </p>
          </div>
          <div className="flex shrink-0 items-center -space-x-2">
            {visibleParticipants.map((name) => (
              <Avatar key={name} name={name} size="sm" className="ring-2 ring-surface" />
            ))}
            {overflow > 0 ? (
              <span className="pl-3 text-[12px] text-ink-3">+{overflow}</span>
            ) : null}
          </div>
        </div>

        {hasBadges ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {meeting.decisionCount > 0 ? (
              <Badge tone="default">
                {meeting.decisionCount} decision{meeting.decisionCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
            {meeting.actionCount > 0 ? (
              <Badge tone="default">
                {meeting.actionCount} action{meeting.actionCount === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </Card>
    </Link>
  );
}

export default function MeetingsPage() {
  const live = mockMeetings.filter((m) => m.status === "live");
  const upcoming = mockMeetings
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const past = mockMeetings
    .filter((m) => m.status === "past")
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const sections: { label: string; meetings: Meeting[] }[] = [
    { label: "Live now", meetings: live },
    { label: "Upcoming", meetings: upcoming },
    { label: "Past", meetings: past },
  ].filter((section) => section.meetings.length > 0);

  return (
    <div>
      <p className="text-[14px] text-ink-3">
        Every meeting your org has run through Mytheus, grouped by what&apos;s happening now, what&apos;s next, and what&apos;s already wrapped.
      </p>

      {sections.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No meetings yet"
          description="Meetings will show up here once your team starts scheduling them through Mytheus."
        />
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.label}>
              <h2 className="kicker">{section.label}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.meetings.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
