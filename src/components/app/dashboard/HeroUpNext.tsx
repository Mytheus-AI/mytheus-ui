import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Broadcast, CalendarPlus, Clock, Sparkle, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { NEW_MEETING_HREF } from "@/components/app/nav";
import { CountdownDigits, LocalTime, RelativeStart } from "./LiveTime";
import { Chip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDuration, minutesBetween } from "./format";
import type { HomeMeeting } from "./types";

/* The hero sits on the peach wash: one of only two washed surfaces in the app (the other is the
   agent portrait). */
const shell =
  "overflow-hidden rounded-hero border border-[color-mix(in_srgb,var(--signal-line)_22%,var(--line))] bg-wash text-ink-2 shadow-warm-2";
const pad = "px-[18px] pb-[22px] pt-5 sm:px-7 sm:pb-7 sm:pt-[26px]";
const titleClass = "display mb-3.5 mt-[18px] max-w-[22ch] text-[clamp(26px,3vw,30px)] text-ink";
const btn = "max-[420px]:w-full";

function People({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const shown = names.slice(0, 5);
  const first = names.slice(0, 3).map((n) => n.split(" ")[0]);
  const rest = names.length - first.length;
  const summary =
    rest > 0 ? `${first.join(", ")} and ${rest} ${rest === 1 ? "other" : "others"}` : first.join(", ").replace(/, ([^,]*)$/, " and $1");
  return (
    <div className="mb-1 flex flex-wrap items-center gap-3 text-[14px] font-medium text-ink-2">
      <span className="flex -space-x-2">
        {shown.map((n) => (
          <Avatar key={n} name={n} size="sm" ring />
        ))}
      </span>
      <span>{summary}</span>
    </div>
  );
}

/** Hero: the one thing to look at. Live meeting, else the next scheduled one, else a composed
 *  empty state, else (when the arm failed) an honest error. */
export function HeroUpNext({
  next,
  after,
  calendarFailed,
  nowMs,
}: {
  next: HomeMeeting | null;
  /** The meeting following `next`, for the one-line "after this" hint. */
  after: HomeMeeting | null;
  calendarFailed: boolean;
  nowMs: number;
}) {
  if (calendarFailed) {
    return (
      <section aria-labelledby="hero-title" className={`${shell} pb-2 pt-6`}>
        <div className="px-[18px] sm:px-7">
          <Chip tone="glass">
            <Clock size={14} weight="fill" aria-hidden />
            Up next
          </Chip>
          <h2 id="hero-title" className="display mb-1 mt-[18px] text-[clamp(26px,3vw,30px)] text-ink">
            We could not load your calendar
          </h2>
        </div>
        <ErrorState variant="inline"
          title="Your next meeting is not available right now"
          text="Your meetings are safe. This is a connection problem on our side, and the rest of this page is unaffected."
        />
      </section>
    );
  }

  if (!next) {
    const steps = [
      ["Start a meeting now, or schedule one for later", "1 min"],
      ["Invite a teammate so their agent joins too", "1 min"],
      ["Confirm what your agent heard, right on this page", "After the call"],
    ];
    return (
      <section aria-labelledby="hero-title" className={`${shell} ${pad}`}>
        <Chip tone="solid">
          <Sparkle size={14} weight="fill" aria-hidden />
          Get started
        </Chip>
        <h2 id="hero-title" className={titleClass}>
          Nothing scheduled yet. Start with one meeting.
        </h2>
        <p className="max-w-[54ch] text-[15px] text-ink-2">
          Each person who joins brings a personal agent. It listens for decisions, action items and
          conflicts, then asks you to confirm them here.
        </p>
        <ol className="mt-5">
          {steps.map(([text, time], i) => (
            <li
              key={text}
              className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-t border-[color-mix(in_srgb,var(--ink)_13%,transparent)] py-[11px] text-[14px] font-medium text-ink max-[420px]:grid-cols-[28px_minmax(0,1fr)]"
            >
              <span
                aria-hidden
                className="grid h-6 w-6 place-items-center rounded-full bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] text-[12.5px] font-bold"
              >
                {i + 1}
              </span>
              <span>{text}</span>
              <span className="text-[12.5px] font-semibold text-ink-2 max-[420px]:hidden">{time}</span>
            </li>
          ))}
        </ol>
        <div className="mt-[22px] flex flex-wrap gap-2.5">
          <LinkButton href={NEW_MEETING_HREF} variant="primary" size="lg" className={btn}>
            <VideoCamera size={18} weight="bold" aria-hidden />
            Start a meeting
          </LinkButton>
          <LinkButton href="/meetings" variant="outline" size="lg" className={btn}>
            <CalendarPlus size={18} aria-hidden />
            Open meetings
          </LinkButton>
        </div>
      </section>
    );
  }

  const live = next.status === "live";
  const length = minutesBetween(next.startTime, next.endTime);
  const meta =
    [length ? formatDuration(length) : null, after ? `After this: ${after.title}` : null].filter(Boolean).join(", ") ||
    (live ? "In progress" : "Scheduled");

  return (
    <section aria-labelledby="hero-title" className={`${shell} ${pad}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <Chip tone="high">
              <Broadcast size={14} weight="fill" aria-hidden />
              Live now
            </Chip>
          ) : (
            <Chip tone="solid">
              <Clock size={14} weight="fill" aria-hidden />
              Up next <RelativeStart startIso={next.startTime} initialNow={nowMs} />
            </Chip>
          )}
          {next.startTime ? (
            <Chip tone="glass">
              <LocalTime iso={next.startTime} endIso={next.endTime} variant="range" />
            </Chip>
          ) : null}
        </div>
        {!live && next.startTime ? <CountdownDigits startIso={next.startTime} initialNow={nowMs} /> : null}
      </div>

      <h2 id="hero-title" className={titleClass}>
        {next.title}
      </h2>

      {next.participants && next.participants.length > 0 ? <People names={next.participants} /> : null}
      <p className="text-[14px] font-medium text-ink-2">{meta}</p>

      <div className="mt-[22px] flex flex-wrap gap-2.5">
        {live ? (
          <>
            <LinkButton href={`/meetings/${next.id}/room`} variant="primary" size="lg" className={btn}>
              <VideoCamera size={18} weight="bold" aria-hidden />
              Join the call
            </LinkButton>
            <LinkButton href={`/meetings/${next.id}`} variant="outline" size="lg" className={btn}>
              Meeting details
            </LinkButton>
          </>
        ) : (
          <LinkButton href={`/meetings/${next.id}`} variant="primary" size="lg" className={btn}>
            Open meeting
          </LinkButton>
        )}
      </div>
    </section>
  );
}
