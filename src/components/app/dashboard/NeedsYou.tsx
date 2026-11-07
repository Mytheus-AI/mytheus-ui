import type { CSSProperties } from "react";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SealCheck, Warning } from "@phosphor-icons/react/dist/ssr";
import { openConflicts } from "./data";
import { Chip, EmptyBlock, TextLink } from "./parts";

/** The "Needs you" queue. Read-only on purpose: Home has no confirm, edit or dismiss behaviour
 *  yet (those need Server Actions that are not built), so each item links to the meeting where
 *  the agent surfaced it and where it is actually resolved. */
export function NeedsYou({ className, style }: { className?: string; style?: CSSProperties }) {
  const items = openConflicts;

  return (
    <section aria-labelledby="needs-you-title" className={className} style={style}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="needs-you-title"
          className="display flex items-center gap-2.5 text-[24px] text-ink-display"
        >
          Needs you
          <Chip tone="accent" className="font-semibold">
            {items.length}
          </Chip>
        </h2>
        <p className="text-[13.5px] text-ink-3">
          Detected by your agent. Nothing is final until you confirm.
        </p>
      </div>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="p-0 transition-shadow duration-150 hover:shadow-[0_6px_14px_rgba(60,45,35,0.08)]">
                <article className="px-4 py-4 sm:px-[22px] sm:py-[18px]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Chip tone="high">
                      <Warning size={14} weight="fill" aria-hidden />
                      Conflict
                    </Chip>
                    <span className="text-[12.5px] text-ink-3">{item.meetingTitle}</span>
                  </div>
                  <h3 className="mb-1 mt-2.5 text-[16.5px] font-semibold leading-snug text-ink">
                    {item.summary}
                  </h3>
                  <p className="max-w-[64ch] text-[14px] text-ink-3">
                    Your agent flagged this across meetings. Open {item.meetingTitle} to review it
                    and confirm or dismiss.
                  </p>
                  <div className="mt-4">
                    <LinkButton
                      href={`/meetings/${item.meetingId}`}
                      variant="outline"
                      size="sm"
                      className="min-h-[40px] active:scale-[0.98]"
                    >
                      Review in meeting
                    </LinkButton>
                  </div>
                </article>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="p-0">
          <EmptyBlock
            icon={<SealCheck size={24} aria-hidden />}
            title="You are all caught up"
            text="Everything your agent detected has been handled. New items show up here as your meetings happen."
            action={<TextLink href="/decisions">Review the decision log</TextLink>}
          />
        </Card>
      )}
    </section>
  );
}
