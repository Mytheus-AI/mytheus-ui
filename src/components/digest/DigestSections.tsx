import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Handshake, Scales, Swap, UserCirclePlus } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Card, CardHead } from "@/components/ui/Card";
import { Chip, Count } from "@/components/ui/Chip";
import type { DigestAction, WeeklyDigest } from "@/lib/api/only-mytheus-types";
import {
  dayMonth,
  decisionPageHref,
  digestSections,
  meetingHref,
  promiseDue,
  promiseHref,
  taskHref,
  type DigestSection,
} from "@/lib/digest";
import { LocalStamp } from "./LocalStamp";

/* The digest's five sections as cards, two columns from lg (one below), each item linking to its
   meeting, decision or task. A section with nothing in it says so in one quiet line rather than
   disappearing, so the shape of the week reads the same every Monday. */

const ICON: Record<DigestSection["key"], Icon> = {
  decisions: Scales,
  decision_changes: Swap,
  actions_assigned: UserCirclePlus,
  actions_closed: CheckCircle,
  promises_due: Handshake,
};

const rowClass = "px-4 py-3.5 sm:px-[22px]";
const titleLink =
  "rounded-ctl text-[15px] font-semibold leading-snug text-ink underline-offset-4 decoration-line-2 hover:underline";

function MeetingMeta({ id, title, children }: { id: string | null; title: string | null; children?: ReactNode }) {
  const href = meetingHref(id);
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3">
      {href ? (
        <Link href={href} className="rounded-ctl underline-offset-4 hover:text-ink hover:underline">
          {title || "A meeting"}
        </Link>
      ) : title ? (
        <span>{title}</span>
      ) : null}
      {children}
    </p>
  );
}

function Topics({ topics }: { topics: string[] }) {
  if (topics.length === 0) return null;
  return (
    <>
      {topics.slice(0, 3).map((t) => (
        <Chip key={t} tone="accent">
          {t}
        </Chip>
      ))}
    </>
  );
}

function ActionRow({ a, done }: { a: DigestAction; done?: boolean }) {
  return (
    <li className={rowClass}>
      <Link href={taskHref(a.id)} className={titleLink}>
        {a.content}
      </Link>
      <MeetingMeta id={a.meeting_id} title={a.meeting_title}>
        {a.due_date && !done ? <Chip tone="outline">Due {dayMonth(a.due_date)}</Chip> : null}
        {done && a.changed_at ? (
          <span>
            Closed <LocalStamp iso={a.changed_at} mode="day" />
          </span>
        ) : null}
      </MeetingMeta>
    </li>
  );
}

function SectionItems({ s }: { s: DigestSection }) {
  switch (s.key) {
    case "decisions":
      return (
        <>
          {s.items.map((d) => (
            <li key={d.id} className={rowClass}>
              <Link href={decisionPageHref(d.meeting_id, d.id)} className={titleLink}>
                {d.content}
              </Link>
              <MeetingMeta id={d.meeting_id} title={d.meeting_title}>
                <LocalStamp iso={d.decided_at} mode="day" />
                <Topics topics={d.matched_topics} />
              </MeetingMeta>
            </li>
          ))}
        </>
      );
    case "decision_changes":
      return (
        <>
          {s.items.map((c) => (
            <li key={`${c.old_decision_id}-${c.new_decision_id}`} className={rowClass}>
              <div className="grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3">
                <div className="min-w-0">
                  <Chip>Was</Chip>
                  <Link
                    href={decisionPageHref(c.meeting_id, c.old_decision_id)}
                    className="mt-1 block rounded-ctl text-[15px] leading-snug text-ink-3 underline-offset-4 hover:underline"
                  >
                    {c.old_content}
                  </Link>
                </div>
                <ArrowRight size={16} weight="bold" aria-hidden className="mt-1 hidden text-ink-4 sm:block" />
                <div className="min-w-0">
                  <Chip tone="accent">Now</Chip>
                  <Link href={decisionPageHref(c.meeting_id, c.new_decision_id)} className={`mt-1 block ${titleLink}`}>
                    {c.new_content}
                  </Link>
                </div>
              </div>
              <MeetingMeta id={c.meeting_id} title={c.meeting_title}>
                <span>
                  Changed <LocalStamp iso={c.changed_at} mode="day" />
                </span>
                <Topics topics={c.matched_topics} />
              </MeetingMeta>
            </li>
          ))}
        </>
      );
    case "actions_assigned":
      return (
        <>
          {s.items.map((a) => (
            <ActionRow key={a.id} a={a} />
          ))}
        </>
      );
    case "actions_closed":
      return (
        <>
          {s.items.map((a) => (
            <ActionRow key={a.id} a={a} done />
          ))}
        </>
      );
    case "promises_due":
      return (
        <>
          {s.items.map((p) => {
            const due = promiseDue(p);
            return (
              <li key={`${p.kind}-${p.id}`} className={rowClass}>
                <Link href={promiseHref(p)} className={titleLink}>
                  {p.content}
                </Link>
                <MeetingMeta id={p.meeting_id} title={p.meeting_title}>
                  {due ? <Chip tone="medium">{due}</Chip> : null}
                  <span>{p.kind === "action" ? "Task" : "Promise you made"}</span>
                </MeetingMeta>
              </li>
            );
          })}
        </>
      );
  }
}

export function DigestSections({ digest }: { digest: WeeklyDigest }) {
  const sections = digestSections(digest);
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      {sections.map((s) => {
        const SectionIcon = ICON[s.key];
        const wide = s.key === "promises_due";
        const twoUp = wide && s.items.length > 1;
        return (
          <Card key={s.key} as="section" flush aria-labelledby={`digest-${s.key}`} className={wide ? "lg:col-span-2" : ""}>
            <CardHead
              id={`digest-${s.key}`}
              title={
                <span className="inline-flex items-center gap-2">
                  <SectionIcon size={18} aria-hidden className="text-ink-3" />
                  {s.title}
                </span>
              }
              right={<Count n={s.items.length} label={s.items.length === 1 ? "item" : "items"} />}
              divided={s.items.length > 0}
            />
            {s.items.length > 0 ? (
              <ul className={`divide-y divide-line ${twoUp ? "md:grid md:grid-cols-2 md:divide-y-0 md:[&>li]:border-b md:[&>li]:border-line md:[&>li:nth-child(odd)]:border-r md:[&>li:nth-last-child(-n+2)]:border-b-0 md:[&>li:last-child:nth-child(odd)]:border-r-0" : ""}`}>
                <SectionItems s={s} />
              </ul>
            ) : (
              <p className="px-4 pb-[18px] font-display text-[15px] italic text-ink-3 sm:px-[22px]">{s.empty}</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
