import Link from "next/link";
import type { UserProfile } from "@/lib/api/profile-types";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { LinkButton } from "@/components/ui/Button";
import { inlineLinkClass } from "@/components/ui/TextLink";

/* What the agent listens for, as it reads it: the person's role and what they work on, then the
   three topic lists it scores every stretch of a meeting against. Read-only here; the profile
   is edited in Settings so there is one form for it. Without a role the agent stays silent, so
   that case is the card's whole message. */

function Topics({ title, items, tone, empty }: { title: string; items: string[]; tone: "plain" | "listen" | "ignore"; empty: string }) {
  const chipTone: ChipTone = tone === "listen" ? "accent" : tone === "ignore" ? "outline" : "neutral";
  return (
    <div>
      <h3 className="text-[12.5px] font-semibold text-ink-3">{title}</h3>
      {items.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((t) => (
            <li key={t}>
              <Chip tone={chipTone} className={tone === "ignore" ? "line-through decoration-ink-4" : ""}>
                {t}
              </Chip>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[14px] text-ink-3">{empty}</p>
      )}
    </div>
  );
}

export function ListeningCard({ profile }: { profile: UserProfile | null }) {
  const role = profile?.role?.trim() ?? "";
  return (
    <Card as="section" flush aria-labelledby="listening-h">
      <CardHead
        id="listening-h"
        title="What it listens for"
        right={
          <Link href="/settings/profile" className={`${inlineLinkClass} text-[14px]`}>
            Edit
          </Link>
        }
      />
      <CardBody>
      {!profile ? (
        <p className="text-[15px] text-ink-3">Your profile could not be loaded right now. Try again in a moment.</p>
      ) : !role ? (
        <div className="rounded-ctl bg-signal-soft px-4 py-3.5">
          <p className="text-[15px] font-semibold text-signal-ink">Your agent is not listening yet.</p>
          <p className="mt-1 text-[14px] text-ink-2">It needs your role to know what matters to you.</p>
          <LinkButton href="/onboarding/profile" size="sm" className="mt-3">
            Tell it what you do
          </LinkButton>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-[17px] font-semibold text-ink">{role}</p>
            {profile.bio ? <p className="mt-1 line-clamp-4 text-[15px] leading-relaxed text-ink-2">{profile.bio}</p> : null}
          </div>
          <Topics title="Focus areas" items={profile.skills} tone="plain" empty="None yet." />
          <Topics title="Listens especially for" items={profile.listen_for} tone="listen" empty="Nothing extra: it goes by your role." />
          <Topics title="Tunes out" items={profile.ignore_topics} tone="ignore" empty="Nothing tuned out." />
        </div>
      )}
      </CardBody>
    </Card>
  );
}
