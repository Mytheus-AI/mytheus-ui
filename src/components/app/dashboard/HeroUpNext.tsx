import type { CSSProperties } from "react";
import { LinkButton } from "@/components/ui/Button";
import {
  Broadcast,
  Clock,
  Sparkle,
  VideoCamera,
} from "@phosphor-icons/react/dist/ssr";
import { CountdownDigits, LocalTime, RelativeStart } from "./LiveTime";
import { Chip, ErrorBlock } from "./parts";
import { formatDuration, minutesBetween } from "./format";
import type { HomeMeeting } from "./types";

const shell =
  "overflow-hidden rounded-[28px] border border-line-2 bg-[image:var(--wash)] text-ink-2 shadow-[0_6px_14px_rgba(60,45,35,0.08)]";

/** Hero: the one thing to look at. Live meeting, else the next scheduled one, else a composed
 *  empty state, else (when the arm failed) an honest error. */
export function HeroUpNext({
  next,
  after,
  calendarFailed,
  nowMs,
  className,
  style,
}: {
  next: HomeMeeting | null;
  /** The meeting following `next`, for the one-line "after this" hint. */
  after: HomeMeeting | null;
  calendarFailed: boolean;
  nowMs: number;
  className?: string;
  style?: CSSProperties;
}) {
  if (calendarFailed) {
    return (
      <section aria-labelledby="hero-title" className={`${shell} pb-2 pt-6 ${className ?? ""}`} style={style}>
        <div className="px-[18px] sm:px-7">
          <Chip tone="glass">
            <Clock size={14} weight="fill" aria-hidden />
            Up next
          </Chip>
          <h2 id="hero-title" className="display mb-1 mt-[18px] text-[clamp(26px,3vw,32px)] text-ink">
            We could not load your calendar
          </h2>
        </div>
        <ErrorBlock
          title="Your next meeting is not available right now"
          text="Your meetings are safe. This is a connection problem on our side, and the rest of this page is unaffected."
        />
      </section>
    );
  }

  if (!next) {
    return (
      <section
        aria-labelledby="hero-title"
        className={`${shell} px-[18px] pb-[22px] pt-5 sm:px-7 sm:pb-7 sm:pt-[26px] ${className ?? ""}`}
        style={style}
      >
        <Chip tone="solid">
          <Sparkle size={14} weight="fill" aria-hidden />
          Get started
        </Chip>
        <h2 id="hero-title" className="display mb-3.5 mt-[18px] max-w-[22ch] text-[clamp(28px,3vw,36px)] text-ink">
          Nothing scheduled yet
        </h2>
        <p className="max-w-[54ch] text-[15px] text-ink-2">
          Each person who joins a meeting brings a personal agent. It listens for decisions, action
          items and conflicts, then asks you to confirm them here.
        </p>
        <div className="mt-[22px]">
          <LinkButton
            href="/meetings"
            variant="secondary"
            size="lg"
            className="min-h-[48px] max-[420px]:w-full active:scale-[0.98]"
          >
            <VideoCamera size={18} weight="bold" aria-hidden />
            Open meetings
          </LinkButton>
        </div>
      </section>
    );
  }

  const live = next.status === "live";
  const length = minutesBetween(next.startTime, next.endTime);

  return (
    <section
      aria-labelledby="hero-title"
      className={`${shell} px-[18px] pb-[22px] pt-5 sm:px-7 sm:pb-7 sm:pt-[26px] ${className ?? ""}`}
      style={style}
    >
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
              Up next{" "}
              <RelativeStart startIso={next.startTime} initialNow={nowMs} />
            </Chip>
          )}
          {next.startTime ? (
            <Chip tone="glass">
              <LocalTime iso={next.startTime} endIso={next.endTime} variant="range" />
            </Chip>
          ) : null}
        </div>
        {!live && next.startTime ? (
          <CountdownDigits startIso={next.startTime} initialNow={nowMs} />
        ) : null}
      </div>

      <h2 id="hero-title" className="display mb-3.5 mt-[18px] max-w-[22ch] text-[clamp(28px,3vw,36px)] text-ink">
        {next.title}
      </h2>

      <p className="text-[13.5px] font-medium text-ink-2">
        {[length ? formatDuration(length) : null, after ? `After this: ${after.title}` : null]
          .filter(Boolean)
          .join(", ") || (live ? "In progress" : "Scheduled")}
      </p>

      <div className="mt-[22px] flex flex-wrap gap-2.5">
        {live ? (
          <>
            <LinkButton
              href={`/meetings/${next.id}/room`}
              variant="secondary"
              size="lg"
              className="min-h-[48px] max-[420px]:w-full active:scale-[0.98]"
            >
              <VideoCamera size={18} weight="bold" aria-hidden />
              Join room
            </LinkButton>
            <LinkButton
              href={`/meetings/${next.id}`}
              variant="outline"
              size="lg"
              className="min-h-[48px] max-[420px]:w-full active:scale-[0.98]"
            >
              Details
            </LinkButton>
          </>
        ) : (
          <LinkButton
            href={`/meetings/${next.id}`}
            variant="secondary"
            size="lg"
            className="min-h-[48px] max-[420px]:w-full active:scale-[0.98]"
          >
            Open meeting
          </LinkButton>
        )}
      </div>
    </section>
  );
}
