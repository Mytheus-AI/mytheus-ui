import type { Metadata } from "next";
import Link from "next/link";
import { GearSix } from "@phosphor-icons/react/ssr";
import { SectionTabs } from "@/components/app/SectionTabs";
import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Page, PageHead } from "@/components/ui/Page";
import { ListeningWeekView } from "@/components/listening/ListeningWeek";
import { RulesPanel } from "@/components/listening/RulesPanel";
import { InterruptionList } from "@/components/listening/InterruptionList";
import { EveningDigestBody } from "@/components/listening/EveningDigestView";
import { fetchMeetingTemplates } from "@/lib/api/meeting-brain";
import { fetchEveningDigest, fetchEveningDigests, fetchInterruptions, fetchLatestEveningDigest, fetchListeningWeek } from "@/lib/api/listening";
import { dayLabel, isDay, localDate, summaryLine } from "@/lib/listening";

export const metadata: Metadata = { title: "Listening | Mytheus" };
export const dynamic = "force-dynamic";

/* Listening (Beyond the meeting, "In every meeting at once"). You are invited to more meetings
   than you can attend; your agent listens to the ones you hand it and interrupts you only when
   something needs you. This page is where that is decided and reviewed:

   - the week: every invited meeting with Attend / Agent listens / Skip, and the totals
     ("This week: attend 12, agent listens to 28, saved 19 hours");
   - your rules, which decide whole kinds of meetings at once;
   - the evening digest for a day (`?day=`, the latest by default), one paragraph with links to
     the moments;
   - what your agent raised, delivered or held, with the three answers while a meeting is live.

   Every panel is read on its own (`apiSafe`) and fails on its own. */

export default async function ListeningPage({ searchParams }: { searchParams: { start?: string; day?: string } }) {
  const start = isDay(searchParams.start) ? searchParams.start : null;
  const day = isDay(searchParams.day) ? searchParams.day : null;
  const [week, digest, digests, interruptions, templates] = await Promise.all([
    fetchListeningWeek(start),
    day ? fetchEveningDigest(day) : fetchLatestEveningDigest(),
    fetchEveningDigests(14),
    fetchInterruptions(30),
    fetchMeetingTemplates(),
  ]);
  const nowIso = new Date().toISOString();
  const zone = week.ok ? week.data.time_zone : "UTC";
  const today = localDate(nowIso, zone);
  const context = week.ok
    ? `${summaryLine(week.data.summary)}. Your agent pulls you in only when something needs you.`
    : "Which meetings you attend, which your agent listens to for you, and what it heard.";

  return (
    <Page>
      <PageHead
        title="Listening"
        context={context}
        action={
          <LinkButton href="/settings/listening" variant="outline">
            <GearSix size={16} aria-hidden />
            Interruptions and lines
          </LinkButton>
        }
      />
      <SectionTabs section="meetings" label="Meetings sections" exact={["/meetings"]} className="mb-5" />

      {week.ok ? (
        <ListeningWeekView week={week.data} today={today} />
      ) : (
        <Card flush>
          <ErrorState
            variant="inline"
            className="!pt-[18px]"
            title="Your week did not load"
            text="Your choices and rules are safe, and your agent keeps listening. Try again in a moment."
            action={
              <LinkButton href={start ? `/meetings/listening?start=${start}` : "/meetings/listening"} variant="outline" size="sm">
                Retry
              </LinkButton>
            }
          />
        </Card>
      )}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <Card as="section" flush aria-labelledby="digest-h">
            <CardHead
              id="digest-h"
              title="Evening digest"
              caption="What your agent heard while you were elsewhere"
              divided
            />
            <CardBody className="pt-4">
              {digest.ok ? (
                <EveningDigestBody digest={digest.data} />
              ) : (
                <p className="text-[14px] text-ink-3">
                  {day ? `The digest for ${dayLabel(day)} did not load.` : "Your evening digest did not load."} Try again in a moment.
                </p>
              )}
              {digests.ok && digests.data.items.length > 0 ? (
                <nav aria-label="Earlier digests" className="mt-4 border-t border-line pt-3">
                  <p className="text-[13px] font-semibold text-ink-3">Earlier days</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {digests.data.items.map((d) => {
                      const on = digest.ok && digest.data.day === d.day;
                      return (
                        <li key={d.id}>
                          <Link
                            href={`/meetings/listening?day=${d.day}${start ? `&start=${start}` : ""}`}
                            aria-current={on ? "page" : undefined}
                            className={`inline-flex h-9 items-center rounded-full border px-3 text-[13.5px] font-semibold transition-colors ${
                              on ? "border-pill bg-pill text-pill-on" : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2"
                            }`}
                          >
                            {dayLabel(d.day).split(" ").slice(0, 3).join(" ")}
                            <span className="sr-only">, {d.meeting_count} meetings</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              ) : null}
            </CardBody>
          </Card>

          <InterruptionList items={interruptions.ok ? interruptions.data.items : []} failed={!interruptions.ok} nowIso={nowIso} />
        </div>

        <aside aria-label="Rules" className="min-w-0 space-y-5">
          {week.ok ? (
            <RulesPanel rules={week.data.rules} templates={templates ? templates.map((t) => ({ id: t.id, name: t.name })) : null} />
          ) : null}
          <section aria-labelledby="privacy-h" className="rounded-card bg-bg-2 px-4 py-[18px] sm:px-6">
            <h2 id="privacy-h" className="display text-[20px] text-ink">
              What your agent respects
            </h2>
            <ul className="mt-2 space-y-2 text-[14.5px] leading-relaxed text-ink-2">
              <li>It only listens to meetings you are invited to.</li>
              <li>Never to a confidential meeting, and never to anything said off the record.</li>
              <li>The room sees how many agents are listening, so nobody is listened to without knowing.</li>
              <li>It says only what you wrote or saved beforehand. Everything else waits for you.</li>
            </ul>
          </section>
        </aside>
      </div>
    </Page>
  );
}
