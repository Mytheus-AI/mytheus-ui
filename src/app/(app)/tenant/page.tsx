import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, DownloadSimple, PlugsConnected, CreditCard, Trash, UserPlus } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InlineRow, Note, PageHeader, SectionCard } from "@/components/settings/primitives";
import { StatCard, thClass } from "@/components/admin/StatCard";
import { resolveOrgContext } from "@/lib/api/org-context";
import { mockBilling, mockIntegrations, mockWorkspaceMembers, personSlug, type WorkspaceMember } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Workspace admin | Mytheus" };

/* Tenant admin console, overview: members, plan, integrations, and the data-rights requests
   (export, erasure). Reads `/admin/tenant/*` once `admin-ops-service` serves it; mock until
   then. Nothing here pretends to act: the request buttons stay disabled until the service
   behind them exists. */

const tierTone: Record<WorkspaceMember["tier"], "default" | "medium" | "low"> = {
  owner: "medium",
  admin: "low",
  member: "default",
};
const planLabel = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" } as const;
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default async function TenantAdminPage() {
  const ctx = await resolveOrgContext();
  const members = mockWorkspaceMembers;
  const active = members.filter((m) => m.status === "active");
  const invited = members.filter((m) => m.status === "invited");
  const connected = mockIntegrations.filter((i) => i.status === "connected");

  return (
    <div className="flex flex-col gap-8 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader
        title="Workspace admin"
        description={`Who is in ${ctx?.org.name ?? "this workspace"}, what it runs on, and the requests only an admin can make.`}
        actions={
          <Button variant="primary" disabled title="Invites open once the members API is live">
            <UserPlus size={17} weight="bold" aria-hidden />
            Invite people
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active members" value={active.length} />
        <StatCard label="Pending invites" value={invited.length} />
        <StatCard label="Seats" value={`${mockBilling.seatsUsed} / ${mockBilling.seatsTotal}`} />
        <StatCard label="Integrations" value={connected.length} />
      </div>

      <section aria-labelledby="members-heading" className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-4 sm:px-[22px] sm:pt-[18px]">
          <div>
            <h2 id="members-heading" className="text-[16px] font-semibold text-ink">
              Members
            </h2>
            <p className="mt-0.5 text-[13.5px] text-ink-3">Owners and admins can manage the workspace. Members use it.</p>
          </div>
        </div>

        <table className="hidden w-full border-collapse border-t border-line text-left text-[14px] md:table">
          <thead>
            <tr className="bg-bg">
              <th scope="col" className={thClass}>Person</th>
              <th scope="col" className={thClass}>Team</th>
              <th scope="col" className={thClass}>Access</th>
              <th scope="col" className={thClass}>Status</th>
              <th scope="col" className={thClass}>Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {members.map((m) => (
              <tr key={m.email} className="transition-colors hover:bg-bg">
                <td className="max-w-[320px] px-5 py-3">
                  <Link href={`/people/${personSlug(m.name)}`} className="group flex min-w-0 items-center gap-3">
                    <Avatar name={m.name} size="md" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink group-hover:underline group-hover:underline-offset-[3px]">{m.name}</span>
                      <span className="block truncate text-[12.5px] text-ink-3">{m.email}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-3 text-ink-2">{m.team}</td>
                <td className="px-5 py-3">
                  <Badge tone={tierTone[m.tier]} className="capitalize">
                    {m.tier}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone={m.status === "active" ? "success" : "default"} className="capitalize">
                    {m.status}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-ink-2">{m.lastActive ? date.format(new Date(m.lastActive)) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="divide-y divide-line border-t border-line md:hidden">
          {members.map((m) => (
            <li key={m.email}>
              <Link href={`/people/${personSlug(m.name)}`} className="flex items-center gap-3 px-4 py-3.5">
                <Avatar name={m.name} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{m.name}</span>
                  <span className="block truncate text-[12.5px] text-ink-3">
                    {m.team} &middot; {m.status === "invited" ? "Invited" : `Active ${m.lastActive ? date.format(new Date(m.lastActive)) : ""}`}
                  </span>
                </span>
                <Badge tone={tierTone[m.tier]} className="shrink-0 capitalize">
                  {m.tier}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/billing"
          className="group flex items-start gap-4 rounded-card border border-line bg-surface p-5 shadow-sm transition-colors hover:border-line-2"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bg-2 text-ink-2">
            <CreditCard size={20} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">{planLabel[mockBilling.plan]} plan</span>
            <span className="mt-0.5 block text-[13.5px] text-ink-3">
              {mockBilling.seatsUsed} of {mockBilling.seatsTotal} seats used &middot; ${mockBilling.pricePerSeat} per seat, billed{" "}
              {mockBilling.billingCycle}
            </span>
          </span>
          <ArrowRight size={16} className="mt-1 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <Link
          href="/settings/integrations"
          className="group flex items-start gap-4 rounded-card border border-line bg-surface p-5 shadow-sm transition-colors hover:border-line-2"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-bg-2 text-ink-2">
            <PlugsConnected size={20} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">Integrations</span>
            <span className="mt-0.5 block text-[13.5px] text-ink-3">
              {connected.length ? `${connected.map((i) => i.name).join(", ")} connected` : "Nothing connected yet"}
            </span>
          </span>
          <ArrowRight size={16} className="mt-1 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>

      <SectionCard title="Data and privacy" description="Requests that act on everything the workspace holds. Each one is logged to the audit trail.">
        <InlineRow
          label="Export workspace data"
          help="Meetings, transcripts, confirmed decisions and action items, as a downloadable archive."
        >
          <Button variant="outline" size="sm" disabled>
            <DownloadSimple size={16} aria-hidden />
            Request export
          </Button>
        </InlineRow>
        <InlineRow
          label="Erase a person's data"
          help="Removes one person's transcripts, notes and agent memory from every store, then confirms when it is done."
        >
          <Button variant="outline" size="sm" disabled>
            <Trash size={16} aria-hidden />
            Start erasure
          </Button>
        </InlineRow>
      </SectionCard>

      <Note>Sample members and settings. This console reads your workspace once the admin service is live; until then its request buttons stay off rather than pretend to work.</Note>
    </div>
  );
}
