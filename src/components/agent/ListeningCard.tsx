import Link from "next/link";
import type { UserProfile } from "@/lib/api/profile-types";

/* What the agent listens for, as it reads it: the person's role and what they work on, then the
   three topic lists it scores every stretch of a meeting against. Read-only here; the profile
   is edited in Settings so there is one form for it. Without a role the agent stays silent, so
   that case is the card's whole message. */

function Topics({ title, items, tone, empty }: { title: string; items: string[]; tone: "plain" | "listen" | "ignore"; empty: string }) {
  const chip =
    tone === "listen"
      ? "bg-signal-soft text-signal-ink"
      : tone === "ignore"
        ? "border border-dashed border-line-2 text-ink-3 line-through decoration-ink-4"
        : "bg-surface-2 text-ink-2";
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-ink-3">{title}</h3>
      {items.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((t) => (
            <li key={t} className={`rounded-full px-2.5 py-1 text-[13px] font-medium ${chip}`}>
              {t}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[14px] text-ink-4">{empty}</p>
      )}
    </div>
  );
}

export function ListeningCard({ profile }: { profile: UserProfile | null }) {
  const role = profile?.role?.trim() ?? "";
  return (
    <section aria-labelledby="listening-h" className="rounded-card border border-line bg-surface p-5 shadow-warm-1 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="listening-h" className="display text-[22px] text-ink">
          What it listens for
        </h2>
        <Link
          href="/settings/profile"
          className="shrink-0 rounded-ctl text-[14px] font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[5px] hover:decoration-signal"
        >
          Edit
        </Link>
      </div>

      {!profile ? (
        <p className="mt-3 text-[15px] text-ink-3">Your profile could not be loaded right now. Try again in a moment.</p>
      ) : !role ? (
        <div className="mt-3 rounded-ctl bg-signal-soft px-4 py-3.5">
          <p className="text-[15px] font-semibold text-signal-ink">Your agent is not listening yet.</p>
          <p className="mt-1 text-[14px] text-ink-2">It needs your role to know what matters to you.</p>
          <Link
            href="/onboarding/profile"
            className="mt-3 inline-flex h-10 items-center rounded-ctl bg-pill px-4 text-[14px] font-semibold text-pill-on hover:bg-pill-2"
          >
            Tell it what you do
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          <div>
            <p className="text-[16px] font-semibold text-ink">{role}</p>
            {profile.bio ? <p className="mt-1 line-clamp-4 text-[15px] leading-relaxed text-ink-2">{profile.bio}</p> : null}
          </div>
          <Topics title="Focus areas" items={profile.skills} tone="plain" empty="None yet." />
          <Topics title="Listens especially for" items={profile.listen_for} tone="listen" empty="Nothing extra: it goes by your role." />
          <Topics title="Tunes out" items={profile.ignore_topics} tone="ignore" empty="Nothing tuned out." />
        </div>
      )}
    </section>
  );
}
