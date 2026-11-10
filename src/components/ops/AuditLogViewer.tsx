"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Note } from "@/components/settings/primitives";
import { thClass } from "@/components/admin/StatCard";
import { searchAuditLog } from "@/app/actions/ops";
import type { AuditEntry } from "@/lib/ops";

/* Read-only `audit_logs` across tenants, filtered by one tenant or none, newest first, a page of
   50 at a time (cursor). Each read is itself written to the ops audit log by the server. The
   tenant filter rides in the request body, never a URL, so no tenant id ends up in history or
   referrers. Metadata is shown as compact JSON text, never rendered as markup. */

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });

function metaText(m: unknown): string {
  if (m === null || m === undefined) return "";
  if (typeof m === "object" && Object.keys(m as object).length === 0) return "";
  try {
    const s = JSON.stringify(m);
    return s.length > 160 ? `${s.slice(0, 157)}...` : s;
  } catch {
    return "";
  }
}

export function AuditLogViewer({
  tenants,
  initial,
}: {
  tenants: { org_id: string; name: string }[];
  initial: { items: AuditEntry[]; next_cursor: string | null } | { error: string };
}) {
  const [org, setOrg] = useState<string>("all");
  const [items, setItems] = useState<AuditEntry[]>("items" in initial ? initial.items : []);
  const [cursor, setCursor] = useState<string | null>("items" in initial ? initial.next_cursor : null);
  const [error, setError] = useState<string | null>("error" in initial ? initial.error : null);
  const [pending, startTransition] = useTransition();
  const names = new Map(tenants.map((t) => [t.org_id, t.name]));

  const fetchPage = (nextOrg: string, after: string | null) => {
    setError(null);
    startTransition(async () => {
      const res = await searchAuditLog(nextOrg === "all" ? null : nextOrg, after);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setItems((prev) => (after ? [...prev, ...res.page.items] : res.page.items));
      setCursor(res.page.next_cursor);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span aria-hidden="true" className="text-[13px] font-semibold text-ink-3">
          Tenant
        </span>
        <Select
          value={org}
          onChange={(v) => {
            setOrg(v);
            fetchPage(v, null);
          }}
          options={[{ value: "all", label: "All tenants" }, ...tenants.map((t) => ({ value: t.org_id, label: t.name }))]}
          label="Filter by tenant"
          className="w-[260px]"
        />
        {pending ? (
          <span role="status" className="text-[13px] text-ink-3">
            Loading...
          </span>
        ) : null}
      </div>

      {error ? <Note tone="error">{error}</Note> : null}

      <section aria-label="Audit log" className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
        {items.length === 0 ? (
          <p className="px-4 py-4 text-[13.5px] text-ink-3 sm:px-[22px]">{error ? "Nothing to show." : "No audit entries for this filter."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13.5px]">
              <thead>
                <tr className="bg-bg">
                  <th scope="col" className={thClass}>When</th>
                  <th scope="col" className={thClass}>Tenant</th>
                  <th scope="col" className={thClass}>Actor</th>
                  <th scope="col" className={thClass}>Action</th>
                  <th scope="col" className={thClass}>Target</th>
                  <th scope="col" className={thClass}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-3">
                      {Number.isNaN(Date.parse(e.occurred_at)) ? "" : dateTime.format(new Date(e.occurred_at))}
                    </td>
                    <td className="max-w-[180px] truncate px-5 py-3 text-ink-2">{names.get(e.org_id) ?? e.org_id}</td>
                    <td className="max-w-[200px] px-5 py-3 text-ink-2">
                      <span className="block capitalize">{e.actor_type}</span>
                      {e.actor_id ? <span className="block truncate font-mono text-[11.5px] text-ink-3">{e.actor_id}</span> : null}
                    </td>
                    <td className="px-5 py-3 font-mono text-[12.5px] text-ink">{e.action}</td>
                    <td className="max-w-[200px] px-5 py-3 text-ink-2">
                      {e.target_type ? <span className="block">{e.target_type}</span> : null}
                      {e.target_id ? <span className="block truncate font-mono text-[11.5px] text-ink-3">{e.target_id}</span> : null}
                    </td>
                    <td className="max-w-[320px] break-words px-5 py-3 font-mono text-[11.5px] text-ink-3">{metaText(e.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {cursor ? (
        <div>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => fetchPage(org, cursor)}>
            {pending ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
