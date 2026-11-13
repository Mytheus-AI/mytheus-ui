import type { Metadata } from "next";
import { StatCard, theadRowClass, thClass } from "@/components/admin/StatCard";
import { ColumnChart, dayPoints } from "@/components/ops/charts";
import { SectionCard, cardPad } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import { SectionBar } from "@/components/ui/Page";
import { loadStaff } from "@/lib/api/admin-ops";
import { actionLabel } from "@/lib/ops";

export const metadata: Metadata = { title: "Staff | Ops console | Mytheus" };
export const dynamic = "force-dynamic";

/* The staff themselves (ADR-0046 D1 and D3): who is on the allowlist, what each person did, and
   how someone is added. Staff access is a deployment change on purpose, so this page explains it
   instead of offering a button. */

const whole = new Intl.NumberFormat("en-US");
const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmtWhen = (iso: string | null) => (iso && !Number.isNaN(Date.parse(iso)) ? when.format(new Date(iso)) : "");

export default async function OpsStaffPage() {
  const res = await loadStaff();
  if (res.kind !== "live") {
    return (
      <div className="flex flex-col gap-5">
        <SectionBar title="Staff" context="The Mytheus staff who can open this console." />
        {res.kind === "forbidden" ? (
          <Note tone="error">This account is not on the Mytheus staff list.</Note>
        ) : (
          <ErrorState title="The staff list could not be loaded" />
        )}
      </div>
    );
  }

  const r = res.data;
  const byId = new Map(r.staff.map((s) => [s.user_id, s]));
  const who = (id: string | null) => {
    if (!id) return "Unknown";
    const s = byId.get(id);
    return s?.name || s?.email || `${id.slice(0, 8)}…`;
  };
  const active30 = r.staff.filter((s) => s.actions_30d > 0).length;

  return (
    <div className="flex flex-col gap-5">
      <SectionBar title="Staff" context="The Mytheus staff who can open this console, and everything they did in it." />

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
        <StatCard label="On the staff list" value={r.staff.length} hint="From MYTHEUS_STAFF_USER_IDS" />
        <StatCard label="Active in 30 days" value={active30} hint={active30 === r.staff.length ? "Everyone" : `${r.staff.length - active30} quiet`} />
        <StatCard label="Calls in 14 days" value={whole.format(r.activity_by_day.reduce((s, d) => s + d.count, 0))} hint="Reads included" />
      </div>

      <SectionCard title="Staff list" headingId="staff-heading" description="Names come from each person's own workspace, found the first time they open the console.">
        <table className="mx-table w-full border-collapse text-left text-[14px]">
          <caption className="sr-only">Staff with workspace, last activity and actions in the last 30 days</caption>
          <thead>
            <tr className={theadRowClass}>
              <th scope="col" className={`${thClass} !pl-[22px]`}>Person</th>
              <th scope="col" className={thClass}>Workspace</th>
              <th scope="col" className={thClass}>Last seen</th>
              <th scope="col" className={`${thClass} text-right !pr-[22px]`}>Actions, 30 days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {r.staff.map((s) => (
              <tr key={s.user_id}>
                <th scope="row" className="max-w-[320px] py-3 pl-[22px] pr-5 text-left font-normal">
                  {s.email ? (
                    <>
                      <span className="block truncate font-semibold text-ink">{s.name || s.email}</span>
                      {s.name ? <span className="block truncate text-[12.5px] text-ink-3">{s.email}</span> : null}
                    </>
                  ) : (
                    <Chip tone="neutral">Not seen yet</Chip>
                  )}
                  <span className="block truncate font-mono text-[12.5px] text-ink-3" title={s.user_id}>
                    {s.user_id}
                  </span>
                </th>
                <td data-label="Workspace" className="px-5 py-3 text-ink-2">
                  {s.org_name ?? ""}
                </td>
                <td data-label="Last seen" className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-3">
                  {fmtWhen(s.last_seen_at) || "Never"}
                </td>
                <td data-label="Actions, 30 days" className="py-3 pl-5 pr-[22px] text-right tabular-nums text-ink-2">
                  {whole.format(s.actions_30d)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard title="Activity" headingId="activity-heading" description="Console calls per day, last 14 days. Today in coral." clip={false}>
          <div className={cardPad}>
            <ColumnChart points={dayPoints(r.activity_by_day)} caption="Ops console calls per day, last 14 days" unit={["call", "calls"]} />
          </div>
        </SectionCard>
        <SectionCard title="How someone becomes staff" headingId="how-heading">
          <ol className={`${cardPad} m-0 flex list-decimal flex-col gap-2.5 pl-9 text-[14px] leading-relaxed text-ink-2 sm:pl-10`}>
            <li>They sign up and sign in to Mytheus once, so their account exists.</li>
            <li>
              In <span className="font-mono text-[13px]">mytheus-backend</span>, run{" "}
              <span className="font-mono text-[13px]">uv run python -m scripts.staff_lookup their@email</span> to get their id.
            </li>
            <li>
              Add the id to <span className="font-mono text-[13px]">MYTHEUS_STAFF_USER_IDS</span> in the admin-ops-service environment and restart that service.
            </li>
            <li>They open /ops. Removing someone is the same edit in reverse.</li>
          </ol>
        </SectionCard>
      </div>

      <SectionCard title="Recent actions" headingId="recent-heading" description="The last 50 calls to the ops console, every staff member, newest first.">
        {r.recent.length === 0 ? (
          <p className={`${cardPad} text-[14px] text-ink-3`}>Nothing yet.</p>
        ) : (
          <table className="mx-table w-full border-collapse text-left text-[14px]">
            <caption className="sr-only">Recent ops console actions</caption>
            <thead>
              <tr className={theadRowClass}>
                <th scope="col" className={`${thClass} !pl-[22px]`}>When</th>
                <th scope="col" className={thClass}>Who</th>
                <th scope="col" className={thClass}>What</th>
                <th scope="col" className={`${thClass} !pr-[22px]`}>Workspace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {r.recent.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap py-2.5 pl-[22px] pr-5 tabular-nums text-ink-3">{fmtWhen(a.created_at)}</td>
                  <td data-label="Who" className="max-w-[220px] truncate px-5 py-2.5 text-ink-2">
                    {who(a.staff_user_id)}
                  </td>
                  <td data-label="What" className="px-5 py-2.5 text-ink">
                    {actionLabel(a.action)}
                    {typeof a.details?.outcome === "string" ? <span className="ml-1.5 text-ink-3">({String(a.details.outcome).replace(/_/g, " ")})</span> : null}
                  </td>
                  <td data-label="Workspace" className="py-2.5 pl-5 pr-[22px] font-mono text-[12.5px] text-ink-3">
                    {a.target_org_id ? `${a.target_org_id.slice(0, 8)}…` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}
