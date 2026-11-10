import Link from "next/link";
import { BrainNav } from "@/components/org-brain/BrainNav";
import { PageHeader } from "@/components/settings/primitives";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchReadiness } from "@/lib/api/org-brain";

/* The company brain (ADR-0039 Part E), inside Workspace admin: a title row, the section list
   beside the page (above it below lg) with a bead per readiness check, and the section itself.
   Readiness is read here once per request (`fetchReadiness` is per-request cached, so the
   overview page shares it); every write revalidates this layout so the beads follow. */

export default async function BrainLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveOrgContext();
  const isAdmin = ctx?.user.role === "admin";
  const readiness = isAdmin ? await fetchReadiness() : null;
  const done = readiness?.ok ? Object.fromEntries(readiness.data.checks.map((c) => [c.key, c.done])) : null;
  const orgName = ctx?.org.name || "your workspace";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Company brain"
        description={`What every agent in ${orgName} knows about the company: what it does, its words, who owns what, what matters now and what is off limits.`}
        actions={
          readiness?.ok ? (
            <Link
              href="/tenant/brain"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[14px] font-semibold text-ink shadow-warm-1 transition-colors hover:bg-surface-2 focus-visible:!rounded-full"
            >
              <span className="text-ink-3">Readiness</span>
              <span className="tabular-nums">{readiness.data.score}</span>
              <span className="sr-only">of 100</span>
            </Link>
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
