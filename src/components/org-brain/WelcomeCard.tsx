import { Suspense } from "react";
import { LinkButton } from "@/components/ui/Button";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchWelcome } from "@/lib/api/org-brain";
import { isOrgProfileEmpty, welcomeDaysLeft } from "@/lib/api/org-brain-types";
import { fetchMyProfile } from "@/lib/api/profile";

/* "New here? Read the brief" (ADR-0039 Part E): offered on the dashboard for 14 days after
   joining. The join date is the member's own `users.created_at` from `GET /users/me` (shared with
   the app layout through `fetchMyProfile`'s per-request cache): identity-tenant-service creates
   that row when the person first joins the workspace, so it is the day they joined this org.
   Streams in on its own and stays away when the date is unknown, the window has passed, or the
   company has written nothing for the brief to show. */

export function WelcomeCard({ className = "mb-6" }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <Card className={className} />
    </Suspense>
  );
}

async function Card({ className }: { className: string }) {
  const profile = await fetchMyProfile();
  const left = welcomeDaysLeft(profile?.created_at, new Date());
  if (left === null) return null;
  const [welcome, ctx] = await Promise.all([fetchWelcome(), resolveOrgContext()]);
  if (!welcome.ok) return null;
  const w = welcome.data;
  if (isOrgProfileEmpty(w.profile) && !w.goals.length && !w.owners.length && !w.glossary.length) return null;
  const orgName = ctx?.org.name || "the company";
  const bits = [
    w.goals.length ? `${w.goals.length} ${w.goals.length === 1 ? "goal" : "goals"}` : null,
    w.owners.length ? "who to ask" : null,
    w.glossary.length ? "the words you will hear" : null,
  ].filter(Boolean);

  return (
    <section
      aria-labelledby="welcome-card-h"
      className={`flex flex-wrap items-center gap-x-6 gap-y-3 overflow-hidden rounded-card px-[18px] py-4 sm:px-[22px] ${className}`}
      style={{ backgroundImage: "var(--wash-glow), var(--wash)" }}
    >
      <div className="min-w-0 flex-[1_1_18rem]">
        <h2 id="welcome-card-h" className="display text-[21px] text-ink">
          New to {orgName}? Read the two-minute brief
        </h2>
        <p className="mt-1 max-w-[64ch] text-[14.5px] leading-relaxed text-ink-2">
          What the company does{bits.length ? `, ${bits.join(", ")}` : ""}, and your team, on one page.
        </p>
      </div>
      <LinkButton href="/welcome" className="w-full shrink-0 focus-visible:!rounded-ctl sm:w-auto">
        Read the brief
      </LinkButton>
    </section>
  );
}
