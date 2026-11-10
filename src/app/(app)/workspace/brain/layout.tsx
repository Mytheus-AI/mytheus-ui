import { BrainNav } from "@/components/org-brain/BrainNav";
import { LinkButton } from "@/components/ui/Button";
import { SectionBar } from "@/components/ui/Page";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchReadiness } from "@/lib/api/org-brain";

/* The company brain (ADR-0039 Part E), one tab of the Workspace console: a line of context with
   the readiness score, then the brain's own sections as a secondary list beside the section
   (above it below lg) with a dot per readiness check. Not tabs within tabs: the console's tabs run
   across the top, the brain's sections down the side. Readiness is read here once per request
   (`fetchReadiness` is per-request cached, so the overview page shares it); every write
   revalidates this layout so the dots follow. */

export default async function BrainLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveOrgContext();
  const isAdmin = ctx?.user.role === "admin";
  const readiness = isAdmin ? await fetchReadiness() : null;
  const done = readiness?.ok ? Object.fromEntries(readiness.data.checks.map((c) => [c.key, c.done])) : null;
  const orgName = ctx?.org.name || "your workspace";

  return (
    <div>
      <SectionBar
        context={`What every agent in ${orgName} knows about the company: what it does, its words, who owns what, what matters now and what is off limits.`}
        action={
          readiness?.ok ? (
            <LinkButton href="/workspace/brain" variant="outline" size="sm" aria-label={`Readiness ${readiness.data.score} of 100`}>
              <span className="text-ink-3">Readiness</span>
              <span className="tabular-nums">{readiness.data.score}</span>
            </LinkButton>
          ) : undefined
        }
      />
      <div className="grid gap-5 lg:grid-cols-[212px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <BrainNav done={done} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
