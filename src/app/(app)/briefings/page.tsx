import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageHead } from "@/components/ui/Page";
import { CardHead, cardClass, cardPadX } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/ErrorState";
import { BriefingPlayer } from "@/components/briefing/BriefingPlayer";
import { LocalStamp } from "@/components/digest/LocalStamp";
import { fetchBriefingList, fetchBriefingSettings, fetchLatestBriefing } from "@/lib/api/briefings";
import { clock, coverLine } from "@/lib/briefing";

export const metadata: Metadata = { title: "Your briefings | Mytheus" };
export const dynamic = "force-dynamic";

/* Your briefings: the newest one in the full player (or Brief me), and the ones before it. Only
   you see these. */
export default async function BriefingsPage() {
  const [latest, list, settings] = await Promise.all([fetchLatestBriefing(), fetchBriefingList(12), fetchBriefingSettings()]);
  const prefs = settings.kind === "live" ? settings.data : null;
  const newest = latest.kind === "live" ? (latest.data.briefing ?? null) : null;
  const earlier = list.kind === "live" ? list.data.items.filter((b) => b.id !== newest?.id && b.status === "ready") : [];
  return (
    <Page>
      <PageHead
        title="Your briefings"
        context="Your Myte tells you what changed for you, who is waiting on you, your promises and what is still open. Only you hear these."
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
        <div className="min-w-0">
          {latest.kind === "live" ? (
            <BriefingPlayer initial={newest} canRequest enabled={latest.data.enabled} preferences={prefs} variant="full" />
          ) : (
            <ErrorState title="Your briefing could not be loaded" text="Nothing was lost. Your Myte keeps your briefings; this page returns when it can be read." />
          )}
        </div>
        <aside aria-label="Earlier briefings" className="min-w-0">
          <section aria-labelledby="brf-earlier" className={cardClass({ flush: true })}>
            <CardHead id="brf-earlier" title="Earlier briefings" divided description={earlier.length ? undefined : "Your earlier briefings will be listed here."} />
            {earlier.length ? (
              <ul className="divide-y divide-line">
                {earlier.map((b) => (
                  <li key={b.id}>
                    <Link href={`/briefings/${b.id}`} className={`flex items-center justify-between gap-3 py-3 hover:bg-surface-2 ${cardPadX}`}>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold text-ink">{coverLine(b)}</span>
                        <span className="block text-[13.5px] text-ink-3">
                          <LocalStamp iso={b.created_at} mode="dayTime" />
                        </span>
                      </span>
                      <Chip tone={b.listened_at ? "outline" : "accent"}>{b.listened_at ? clock(b.duration_s) : "New"}</Chip>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className={`border-t border-line py-3 text-[14px] text-ink-3 ${cardPadX}`}>
              Length, language, voice and auto-play are in{" "}
              <Link href="/settings/briefings" className="font-semibold text-ink-2 underline decoration-line-2 underline-offset-4 hover:text-ink">
                Briefing settings
              </Link>
              .
            </p>
          </section>
        </aside>
      </div>
    </Page>
  );
}
