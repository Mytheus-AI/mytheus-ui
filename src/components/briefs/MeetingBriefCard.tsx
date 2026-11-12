import { CheckSquare, ListChecks, Robot } from "@phosphor-icons/react/dist/ssr";
import { Card, CardHead } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { LinkButton } from "@/components/ui/Button";
import { listMeetings, toCallMeeting, type CallMeeting } from "@/lib/api/meetings";
import { fetchMeetingBrief } from "@/lib/api/meeting-brain";
import type { MeetingBrief } from "@/lib/api/meeting-brain-types";
import { listMembers } from "@/lib/api/members";
import { briefLead } from "./BriefSection";
import { LatestStatus } from "./LatestStatus";
import { zonedFormat } from "@/lib/timezone-server";

/* Your next meeting's brief on the dashboard (mytheus-docs ADR-0039 E): the next meeting you are
   in that starts within 24 hours (or is running now), what is yours to bring, and a link to the
   full brief on its page (#brief). Renders nothing when there is no such meeting, or when the
   meetings cannot be read: the dashboard has its own meetings panel to say that. An async server
   component, so it can stream in a Suspense boundary. */

const DAY_MS = 24 * 60 * 60_000;
const time = () => zonedFormat({ weekday: "short", hour: "numeric", minute: "2-digit" });

function startsIn(start: Date, now: Date): string {
  const mins = Math.round((start.getTime() - now.getTime()) / 60000);
  if (mins <= 0) return "On now";
  if (mins < 60) return `Starts in ${mins} min`;
  const h = Math.round(mins / 60);
  return `Starts in ${h} ${h === 1 ? "hour" : "hours"}`;
}

/** The next meeting you are in within the next 24 hours, or running now. */
export function nextBriefMeeting(meetings: CallMeeting[], youId: string, now: Date): CallMeeting | null {
  const t = now.getTime();
  return (
    meetings
      .filter((m) => m.participantIds.includes(youId) && (m.status === "upcoming" || m.status === "live"))
      .filter((m) => {
        const s = Date.parse(m.startTime);
        const end = s + m.durationMinutes * 60_000;
        return Number.isFinite(s) && s <= t + DAY_MS && end >= t;
      })
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))[0] ?? null
  );
}

export async function MeetingBriefCard({ className = "" }: { className?: string }) {
  const [raw, members] = await Promise.all([listMeetings().catch(() => null), listMembers()]);
  const you = members?.find((m) => m.isYou) ?? null;
  if (!raw || !you) return null;
  const now = new Date();
  const next = nextBriefMeeting(raw.map(toCallMeeting), you.id, now);
  if (!next) return null;

  const brief = await fetchMeetingBrief(next.id);
  const names = new Map((members ?? []).map((m) => [m.id, m.name]));
  const start = new Date(next.startTime);
  const href = `/meetings/${next.id}#brief`;

  return (
    <Card as="section" flush aria-labelledby="brief-card-title" className={className}>
      <CardHead
        id="brief-card-title"
        title="Your brief"
        caption={`${next.title}, ${time().format(start)}`}
        right={<Chip tone="accent">{startsIn(start, now)}</Chip>}
      />
      <div className="border-t border-line px-4 pb-[18px] pt-3.5 sm:px-[22px]">
        {brief.ok ? (
          <BriefPreview b={brief.data} nameOf={(id) => names.get(id) ?? "A teammate"} />
        ) : (
          <p className="text-[14px] leading-relaxed text-ink-3" role="status">
            {brief.reason === "error"
              ? "Your brief couldn't be loaded just now. It is on the meeting page."
              : "There is no brief for you on this one."}
          </p>
        )}
        <LinkButton href={href} size="sm" className="mt-3">
          Read your brief
        </LinkButton>
      </div>
    </Card>
  );
}

function BriefPreview({ b, nameOf }: { b: MeetingBrief; nameOf: (id: string) => string }) {
  const lead = briefLead(b);
  const items = b.my_agenda_items.slice(0, 2);
  const actions = b.my_open_actions.slice(0, 2);
  return (
    <>
      <p className="text-[15px] leading-relaxed text-ink-2">
        {lead ?? "Nothing is waiting on you for this one."}
      </p>
      {items.length + actions.length > 0 ? (
        <ul className="mt-2.5 divide-y divide-line">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-2.5 py-2 text-[14px] text-ink">
              <ListChecks size={16} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
              <span className="min-w-0">
                <span className="sr-only">Your agenda item: </span>
                {it.title}
              </span>
            </li>
          ))}
          {actions.map((a) => (
            <li key={a.id} className="flex items-start gap-2.5 py-2 text-[14px] text-ink">
              <CheckSquare size={16} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span>
                  <span className="sr-only">Your open action: </span>
                  {a.title}
                </span>
                <span className="text-[12.5px] text-ink-3">
                  <LatestStatus status={a.latest_status} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {b.proxies.length > 0 ? (
        <p className="mt-2.5 flex items-center gap-2 text-[14px] text-ink-3">
          <Robot size={15} aria-hidden className="shrink-0" />
          {b.proxies.length === 1
            ? `${nameOf(b.proxies[0].user_id)} is sending their Myte.`
            : `${b.proxies.length} people are sending their Mytes.`}
        </p>
      ) : null}
    </>
  );
}
