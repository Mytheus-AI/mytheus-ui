import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, LockSimple } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/ui/Avatar";
import { LinkButton } from "@/components/ui/Button";
import { ReadinessMeter } from "@/components/org-brain/ReadinessMeter";
import { ReadOnlyNote } from "@/components/org-brain/parts";
import { memberMap } from "@/components/org-brain/types";
import {
  fetchGlossary,
  fetchGoals,
  fetchGroundRules,
  fetchMeetingTemplates,
  fetchMemberOptions,
  fetchOrgProfile,
  fetchReadiness,
  fetchTopicOwners,
} from "@/lib/api/org-brain";
import { KIND_LABEL, isOrgProfileEmpty } from "@/lib/api/org-brain-types";
import { resolveOrgContext } from "@/lib/api/org-context";

export const metadata: Metadata = { title: "Company brain | Mytheus" };

/* The brain's overview: the readiness meter, then one tile per section showing what is there,
   each opening its page. Every read degrades its own tile. */

function Tile({ href, title, meta, children }: { href: string; title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex min-h-[188px] flex-col rounded-card border border-line bg-surface p-5 shadow-warm-1 transition-colors duration-150 hover:border-line-2 hover:bg-surface-2 focus-visible:!rounded-card"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="display text-[21px] text-ink">{title}</span>
        {meta ? <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-3">{meta}</span> : null}
      </span>
      <span className="mt-3 block min-w-0 flex-1 text-[14.5px] leading-relaxed text-ink-2">{children}</span>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink">
        Open
        <ArrowRight size={14} aria-hidden className="transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </span>
    </Link>
  );
}

const quiet = (text: string) => <span className="text-ink-4">{text}</span>;
const failed = quiet("Could not be loaded just now.");

export default async function BrainOverviewPage() {
  const [ctx, readiness, profile, glossary, owners, goals, rules, templates, members] = await Promise.all([
    resolveOrgContext(),
    fetchReadiness(),
    fetchOrgProfile(),
    fetchGlossary(),
    fetchTopicOwners(),
    fetchGoals(),
    fetchGroundRules(),
    fetchMeetingTemplates(),
    fetchMemberOptions(),
  ]);
  const canEdit = ctx?.user.role === "admin";
  const people = memberMap(members ?? []);
  const fresh = profile.ok && isOrgProfileEmpty(profile.data) && glossary.ok && glossary.data.length === 0;
  const active = goals.ok ? goals.data.filter((g) => g.status === "active") : [];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="sr-only">Overview</h2>
      {!canEdit ? <ReadOnlyNote /> : null}

      {canEdit && fresh ? (
        <section
          aria-labelledby="setup-h"
          className="relative overflow-hidden rounded-hero px-6 py-7 sm:px-8"
          style={{ backgroundImage: "var(--wash-glow), var(--wash)" }}
        >
          <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <h3 id="setup-h" className="display text-[clamp(1.6rem,3vw,2.1rem)] text-ink">
                Teach the agents your company in five minutes
              </h3>
              <p className="mt-2 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-2">
                A guided pass through the basics: what you do, a few words, who owns what and one goal. You can skip any step.
              </p>
            </div>
            <LinkButton href="/onboarding/workspace" size="lg" className="focus-visible:!rounded-ctl">
              Start the guided setup
            </LinkButton>
          </div>
        </section>
      ) : null}

      {canEdit ? <ReadinessMeter readiness={readiness.ok ? readiness.data : null} headingLevel={3} /> : null}

      <section aria-labelledby="sections-h">
        <h3 id="sections-h" className="sr-only">
          Sections
        </h3>
        <div className="grid gap-4 md:grid-cols-2 min-[1700px]:grid-cols-3">
          <Tile href="/workspace/brain/about" title="About" meta={profile.ok && profile.data.industry ? profile.data.industry : undefined}>
            {!profile.ok ? (
              failed
            ) : profile.data.description.trim() ? (
              <span className="line-clamp-4">{profile.data.description}</span>
            ) : (
              quiet("Not written yet. A few sentences on what the company does and for whom.")
            )}
          </Tile>

          <Tile href="/workspace/brain/vocabulary" title="Vocabulary" meta={glossary.ok ? `${glossary.data.length} terms` : undefined}>
            {!glossary.ok ? (
              failed
            ) : glossary.data.length ? (
              <span className="flex flex-wrap gap-1.5">
                {glossary.data.slice(0, 10).map((t) => (
                  <span key={t.id} title={KIND_LABEL[t.kind]} className="rounded-full bg-bg-2 px-2.5 py-[3px] text-[13px] font-medium text-ink-2">
                    {t.term}
                  </span>
                ))}
                {glossary.data.length > 10 ? <span className="px-1 py-[3px] text-[13px] text-ink-3">and {glossary.data.length - 10} more</span> : null}
              </span>
            ) : (
              quiet("No terms yet. Product names, codenames, acronyms, customers.")
            )}
          </Tile>

          <Tile href="/workspace/brain/owners" title="Who owns what" meta={owners.ok ? `${owners.data.length} topics` : undefined}>
            {!owners.ok ? (
              failed
            ) : owners.data.length ? (
              <span className="grid gap-1.5">
                {owners.data.slice(0, 4).map((o) => {
                  const m = people.get(o.owner_user_id);
                  return (
                    <span key={o.id} className="flex min-w-0 items-center gap-2">
                      <Avatar name={m?.name ?? "Former member"} id={m?.email ?? o.owner_user_id} src={m?.imageUrl} size="xs" />
                      <span className="min-w-0 truncate">
                        <span className="font-semibold text-ink">{o.topic}</span>
                        <span className="text-ink-3"> {m ? m.name : "someone who left"}</span>
                      </span>
                    </span>
                  );
                })}
              </span>
            ) : (
              quiet("Nobody named yet. Who to ask about pricing, hiring, the app.")
            )}
          </Tile>

          <Tile href="/workspace/brain/goals" title="Goals" meta={goals.ok ? `${active.length} active` : undefined}>
            {!goals.ok ? (
              failed
            ) : active.length ? (
              <span className="grid gap-1.5">
                {active.slice(0, 3).map((g, i) => (
                  <span key={g.id} className="flex min-w-0 items-baseline gap-2.5">
                    <span className="display w-4 shrink-0 text-right text-[17px] tabular-nums text-signal-ink">{i + 1}</span>
                    <span className="line-clamp-2 min-w-0">{g.title}</span>
                  </span>
                ))}
              </span>
            ) : (
              quiet("No active goal. One is enough to start.")
            )}
          </Tile>

          <Tile href="/workspace/brain/meeting-types" title="Meeting types" meta={templates.ok ? `${templates.data.length} types` : undefined}>
            {!templates.ok ? (
              failed
            ) : templates.data.length ? (
              <span className="grid gap-1">
                {templates.data.slice(0, 4).map((t) => (
                  <span key={t.id} className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium text-ink">{t.name}</span>
                    <span className="shrink-0 text-[13px] text-ink-3">{t.default_duration_minutes} min</span>
                    {t.confidential ? <LockSimple size={13} className="shrink-0 text-ink-3" aria-label="Confidential" /> : null}
                  </span>
                ))}
              </span>
            ) : (
              quiet("None saved. Weekly sync, customer call, planning.")
            )}
          </Tile>

          <Tile
            href="/workspace/brain/ground-rules"
            title="Ground rules"
            meta={rules.ok && rules.data.never_record_topics.length ? `${rules.data.never_record_topics.length} topics` : undefined}
          >
            {!rules.ok ? (
              failed
            ) : rules.data.never_record_topics.length ? (
              <span className="flex flex-wrap gap-1.5">
                {rules.data.never_record_topics.slice(0, 8).map((t) => (
                  <span key={t} className="rounded-full border border-dashed border-line-2 px-2.5 py-[2px] text-[13px] font-medium text-ink-2">
                    {t}
                  </span>
                ))}
              </span>
            ) : (
              quiet("No topics off limits. Salaries, layoffs, health are common choices.")
            )}
          </Tile>
        </div>
      </section>
    </div>
  );
}
