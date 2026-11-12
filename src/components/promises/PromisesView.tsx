"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarBlank, CheckCircle, LockSimple, VideoCamera, X } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardHead, Explainer } from "@/components/ui/Card";
import { Chip, Count } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { PageColumns, SectionBar } from "@/components/ui/Page";
import { inlineLinkClass } from "@/components/ui/TextLink";
import { groupPromises, relativeDay, type PromiseView } from "@/lib/api/personal-types";
import { PromiseCheck } from "./PromiseCheck";
import { usePromises } from "./usePromises";

/* My work, Promises tab (ADR-0039 B6, Part E): everything you said you would do in a meeting, written down by
   your Myte and seen by nobody else. Open promises are grouped by the meeting they were said in,
   newest meeting first; done ones sit in the side column. Mark done, move back, or dismiss one
   your Myte got wrong, each answered by a toast with Undo. All changes are optimistic with rollback. */

const DONE_SHOWN = 8;
const WEEK_MS = 7 * 86_400_000;

export function PromisesView({ initial, nowIso }: { initial: PromiseView[]; nowIso: string }) {
  const { items, pending, change } = usePromises(initial);
  const [showAllDone, setShowAllDone] = useState(false);
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const { open, done } = useMemo(() => groupPromises(items), [items]);
  const openCount = open.reduce((n, g) => n + g.items.length, 0);
  const keptThisWeek = done.filter((p) => {
    const at = Date.parse(p.done_at ?? p.updated_at);
    return Number.isFinite(at) && now.getTime() - at < WEEK_MS;
  }).length;
  const nothingAtAll = openCount === 0 && done.length === 0;
  const shownDone = showAllDone ? done : done.slice(0, DONE_SHOWN);

  const aside = (
    <>
      <Card flush className="grid grid-cols-2 divide-x divide-line">
        <div className="px-5 py-4">
          <p className="display text-[30px] leading-none text-ink">{openCount}</p>
          <p className="mt-1.5 text-[14px] text-ink-3">Open</p>
        </div>
        <div className="px-5 py-4">
          <p className="display text-[30px] leading-none text-ink">{keptThisWeek}</p>
          <p className="mt-1.5 text-[14px] text-ink-3">Kept in the last 7 days</p>
        </div>
      </Card>

      <Card as="section" flush aria-labelledby="done-h">
        <CardHead
          id="done-h"
          title="Done"
          right={done.length ? <Count n={done.length} label="done" /> : undefined}
        />
        {done.length === 0 ? (
          <p className="px-4 pb-5 text-[14px] text-ink-3 sm:px-[22px]">Promises you mark done land here.</p>
        ) : (
          <>
            <ul id="done-list" className="divide-y divide-line border-t border-line">
              {shownDone.map((p) => (
                <li
                  key={p.id}
                  aria-busy={pending[p.id] ? true : undefined}
                  className="flex items-start gap-3 px-4 py-3 sm:px-[22px]"
                >
                  <PromiseCheck content={p.content} done busy={!!pending[p.id]} onToggle={() => change(p.id, "open")} />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[14px] leading-snug text-ink-3 line-through decoration-ink-4">{p.content}</p>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
                      Done {relativeDay(p.done_at ?? p.updated_at, now)}, from {p.meetingTitle}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {done.length > DONE_SHOWN ? (
              <div className="border-t border-line px-4 py-1.5 sm:px-[22px]">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={showAllDone}
                  aria-controls="done-list"
                  onClick={() => setShowAllDone((v) => !v)}
                >
                  {showAllDone ? "Show fewer" : `Show all ${done.length}`}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Explainer id="where-h" title="Where these come from">
        <p>When you say you will do something in a meeting, your Myte writes it down here, privately.</p>
        <p className="flex gap-2">
          <LockSimple size={16} aria-hidden className="mt-1 shrink-0 text-ink-3" />
          <span>
            Nobody else sees this list and nothing here is assigned to anyone. Shared action items stay in{" "}
            <Link href="/work/tasks" className={inlineLinkClass}>
              Tasks
            </Link>
            .
          </span>
        </p>
        <p>Dismiss one your Myte got wrong and it leaves the list.</p>
      </Explainer>
    </>
  );

  return (
    <div>
      <SectionBar
        liveContext
        context={
          nothingAtAll
            ? "What you said you would do in meetings, kept by your Myte. Only you can see this list."
            : `${openCount === 0 ? "Nothing open" : `${openCount} open`}, ${done.length} done. Only you can see this list.`
        }
      />

      {nothingAtAll ? (
        <EmptyState
          art="promises"
          title="No promises yet"
          description="When you say you will do something in a meeting, your Myte writes it down here, privately."
          className="py-20"
        />
      ) : (
        <PageColumns aside={aside} asideLabel="Your tally and done promises">
          {/* open, grouped by meeting */}
          <section aria-labelledby="open-h" className="min-w-0 space-y-4">
            <h2 id="open-h" className="sr-only">
              Open promises
            </h2>
            {open.length === 0 ? (
              <Card className="flex items-center gap-4">
                <CheckCircle size={28} weight="fill" aria-hidden className="shrink-0 text-ok" />
                <div>
                  <p className="display text-[22px] text-ink">Nothing open</p>
                  <p className="mt-0.5 text-[14px] text-ink-3">Every promise you made has been kept or put aside.</p>
                </div>
              </Card>
            ) : (
              open.map((g) => (
                <Card as="section" flush key={g.meetingId} aria-labelledby={`m-${g.meetingId}`}>
                  <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-surface-2 px-4 py-3 sm:px-5">
                    <VideoCamera size={16} aria-hidden className="shrink-0 text-ink-3" />
                    <h3 id={`m-${g.meetingId}`} className="min-w-0 flex-1 text-[15px] font-semibold text-ink">
                      <Link
                        href={`/meetings/${g.meetingId}`}
                        className="rounded-ctl underline-offset-4 transition-colors hover:text-signal-ink hover:underline"
                      >
                        {g.meetingTitle}
                      </Link>
                    </h3>
                    <span className="text-[12.5px] text-ink-3">Said {relativeDay(g.latestAt, now)}</span>
                    <Count n={g.items.length} label={g.items.length === 1 ? "promise" : "promises"} />
                  </header>
                  <ul className="divide-y divide-line">
                    {g.items.map((p) => (
                      <li
                        key={p.id}
                        aria-busy={pending[p.id] ? true : undefined}
                        className="flex min-h-[60px] flex-wrap items-start gap-x-3.5 gap-y-2 px-4 py-3.5 sm:flex-nowrap sm:items-center sm:px-5"
                      >
                        <PromiseCheck content={p.content} done={false} busy={!!pending[p.id]} onToggle={() => change(p.id, "done")} />
                        <div className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] sm:basis-0">
                          <p className="text-[15px] font-medium leading-snug text-ink">{p.content}</p>
                          <p className="mt-0.5 text-[12.5px] text-ink-3">Said {relativeDay(p.created_at, now)}</p>
                        </div>
                        <div className="flex basis-full items-center justify-between gap-2 pl-[2.6rem] sm:basis-auto sm:justify-end sm:pl-0">
                          {p.due_hint ? (
                            <Chip icon={<CalendarBlank size={13} />} className="max-w-[220px]">
                              <span className="truncate">{p.due_hint}</span>
                            </Chip>
                          ) : (
                            <span />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!!pending[p.id]}
                            onClick={() => change(p.id, "dismissed")}
                            aria-label={`Dismiss: ${p.content}`}
                          >
                            <X size={14} weight="bold" aria-hidden />
                            Dismiss
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))
            )}
          </section>
        </PageColumns>
      )}
    </div>
  );
}
