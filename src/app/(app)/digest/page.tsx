import type { Metadata } from "next";
import { Eye, Gear } from "@phosphor-icons/react/ssr";
import { LinkButton } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { Page, PageHead } from "@/components/ui/Page";
import { TextLink } from "@/components/ui/TextLink";
import { DigestSections } from "@/components/digest/DigestSections";
import { LocalStamp } from "@/components/digest/LocalStamp";
import { WeekPicker, type WeekOption } from "@/components/digest/WeekPicker";
import { fetchDigest, fetchDigestList, fetchDigestPreview, fetchLatestDigest } from "@/lib/api/digests";
import type { DigestSummary, WeeklyDigest } from "@/lib/api/only-mytheus-types";
import { DIGEST_LIST_LIMIT, digestSummary, isQuietWeek, weekOf, weekRange } from "@/lib/digest";
import { isUuid } from "@/lib/reversals";

export const metadata: Metadata = { title: "Weekly digest | Mytheus" };
export const dynamic = "force-dynamic";

/* Your weekly digest (only-Mytheus wave, contract section 5): what changed for you last week,
   filtered by the topics your Myte listens for. Built every Monday morning for the week before.

   - The latest week by default; `?week={id}` a past one; `?preview=1` this week so far (not saved).
   - No digest yet: says when the first arrives and offers the preview.
   - A quiet week: said plainly, not five empty boxes.
   Server-rendered; the week picker is the only client island. */

type Mode = { kind: "latest" } | { kind: "week"; id: string } | { kind: "preview" };

function modeOf(params: Record<string, string | string[] | undefined>): Mode {
  if (params.preview === "1") return { kind: "preview" };
  const week = typeof params.week === "string" ? params.week : null;
  return week && isUuid(week) ? { kind: "week", id: week } : { kind: "latest" };
}

function weekOptions(list: DigestSummary[], current: WeeklyDigest | null): WeekOption[] {
  const out: WeekOption[] = [{ value: "preview", label: "This week so far", href: "/digest?preview=1" }];
  list.forEach((d, i) => {
    out.push({
      value: d.id,
      label: `${weekOf(d.week_start)}${i === 0 ? ", latest" : ""}`,
      href: i === 0 ? "/digest" : `/digest?week=${d.id}`,
    });
  });
  // A week reached by link that the short list no longer holds.
  if (current?.id && !list.some((d) => d.id === current.id)) {
    out.push({ value: current.id, label: weekOf(current.week_start), href: `/digest?week=${current.id}` });
  }
  return out;
}

export default async function DigestPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const mode = modeOf(searchParams);
  const [latest, list, chosen] = await Promise.all([
    fetchLatestDigest().catch(() => null),
    fetchDigestList(DIGEST_LIST_LIMIT)
      .then((l) => (Array.isArray(l?.items) ? l.items : []))
      .catch(() => [] as DigestSummary[]),
    mode.kind === "preview"
      ? fetchDigestPreview().catch(() => null)
      : mode.kind === "week"
        ? fetchDigest(mode.id).catch(() => null)
        : Promise.resolve(undefined),
  ]);

  const digest: WeeklyDigest | null = mode.kind === "latest" ? (latest?.digest ?? null) : (chosen ?? null);
  const nextRun = latest?.next_run_at ?? null;
  const failed = mode.kind === "latest" ? latest === null : chosen === null;
  const options = weekOptions(list, digest);
  const value = mode.kind === "preview" ? "preview" : (digest?.id ?? list[0]?.id ?? "preview");
  const picker = options.length > 1 || mode.kind === "preview" ? <WeekPicker options={options} value={value} /> : null;

  const context = digest
    ? mode.kind === "preview"
      ? `This week so far, ${weekRange(digest.week_start, digest.week_end)}. ${digestSummary(digest)}`
      : `${weekRange(digest.week_start, digest.week_end)}. ${digestSummary(digest)}`
    : "Every Monday morning, what changed for you the week before.";

  return (
    <Page>
      <PageHead
        title="What changed for you"
        context={context}
        action={
          <>
            {picker}
            <LinkButton href="/settings/notifications" variant="ghost" icon aria-label="Digest settings">
              <Gear size={18} aria-hidden />
            </LinkButton>
          </>
        }
      >
        {nextRun && digest && mode.kind === "latest" ? (
          <p className="mt-1 text-[14px] text-ink-3">
            The next one arrives <LocalStamp iso={nextRun} mode="dayTime" />.
          </p>
        ) : null}
      </PageHead>

      {failed ? (
        <ErrorState
          title={mode.kind === "week" ? "That week did not load" : "Your digest did not load"}
          text="Nothing was lost. Your decisions, tasks and promises are all still where they were."
          action={mode.kind === "week" ? <LinkButton href="/digest" variant="outline" size="sm">Go to the latest week</LinkButton> : undefined}
        />
      ) : !digest ? (
        <EmptyState
          art="calendar"
          title="Your first digest is on its way"
          description={
            <>
              Every Monday morning your Myte gathers what changed for you the week before: decisions on your topics, decisions
              that were replaced, tasks assigned and closed, and promises coming due.
              {nextRun ? (
                <>
                  {" "}
                  The first one arrives <LocalStamp iso={nextRun} mode="dayTime" />.
                </>
              ) : null}
            </>
          }
          action={
            <LinkButton href="/digest?preview=1">
              <Eye size={18} aria-hidden />
              Preview this week so far
            </LinkButton>
          }
        />
      ) : (
        <>
          {mode.kind === "preview" ? (
            <Note className="mb-5">
              A preview, gathered just now and not saved. Your digest for the whole week arrives on Monday
              {nextRun ? (
                <>
                  {" "}
                  (<LocalStamp iso={nextRun} mode="day" />)
                </>
              ) : null}
              .
            </Note>
          ) : null}

          <div className="mb-6 flex flex-wrap items-center gap-2">
            {digest.topics.length > 0 ? (
              <>
                <span className="text-[14px] font-semibold text-ink-3">Your topics</span>
                {digest.topics.map((t) => (
                  <Chip key={t} tone="accent">
                    {t}
                  </Chip>
                ))}
                <TextLink href="/agent">Change topics</TextLink>
              </>
            ) : (
              <p className="text-[14px] text-ink-3">
                Your Myte isn&rsquo;t listening for any topics yet, so this covers everything you took part in.{" "}
                <TextLink href="/agent">Add topics</TextLink>
              </p>
            )}
          </div>

          {isQuietWeek(digest) ? (
            <EmptyState
              art="done"
              title="A quiet week"
              description={`Nothing on your topics changed between ${weekRange(digest.week_start, digest.week_end).replace(" to ", " and ")}. No decisions were replaced, and nothing new landed on you.`}
              action={
                mode.kind === "preview" ? undefined : (
                  <LinkButton href="/digest?preview=1" variant="outline">
                    <Eye size={18} aria-hidden />
                    Preview this week so far
                  </LinkButton>
                )
              }
            />
          ) : (
            <DigestSections digest={digest} />
          )}
        </>
      )}
    </Page>
  );
}
