"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { Note, focusPill } from "@/components/settings/primitives";
import { theadRowClass, thClass } from "@/components/admin/StatCard";
import { searchAuditLog } from "@/app/actions/ops";
import type { AuditEntry } from "@/lib/ops";

/* Read-only `audit_logs` for one tenant at a time (admin-ops-service requires the tenant), newest
   first, a page of 50 at a time (cursor). Nothing is read until a tenant is picked, and each read
   is itself written to the ops audit log by the server. The tenant rides in the request body,
   never a URL, so no tenant id ends up in history or referrers. Metadata is shown as compact JSON
   text, never rendered as markup. */

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

const NONE = "none";

export function AuditLogViewer({ tenants }: { tenants: { org_id: string; name: string }[] }) {
  const [org, setOrg] = useState<string>(NONE);
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fetchPage = (nextOrg: string, after: string | null) => {
    setError(null);
    if (nextOrg === NONE) {
      setItems([]);
      setCursor(null);
      return;
    }
    if (!after) {
      setItems([]);
      setCursor(null);
    }
    startTransition(async () => {
      const res = await searchAuditLog(nextOrg, after);
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
        <span aria-hidden="true" className="text-[14px] font-semibold text-ink">
          Tenant
        </span>
        <Select
          value={org}
          onChange={(v) => {
            setOrg(v);
            fetchPage(v, null);
          }}
          options={[{ value: NONE, label: "Pick a tenant" }, ...tenants.map((t) => ({ value: t.org_id, label: t.name }))]}
          label="Filter by tenant"
          className="w-full max-w-[300px] sm:w-[280px]"
        />
        <span role="status" className="text-[14px] text-ink-3">
          {pending ? "Loading entries..." : ""}
        </span>
      </div>

      {error ? <Note tone="error">{error}</Note> : null}

      <section aria-label="Audit log" aria-busy={pending} className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
        {items.length === 0 ? (
          org !== NONE && pending ? (
            <div className="divide-y divide-line motion-safe:animate-pulse" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-6 px-4 py-4 sm:px-[22px]">
                  <div className="h-3.5 w-24 rounded-full bg-bg-2" />
                  <div className="h-3.5 w-32 rounded-full bg-bg-2" />
                  <div className="hidden h-3.5 flex-1 rounded-full bg-bg-2 sm:block" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              className="!rounded-none !border-0 !bg-transparent !py-10"
              title={
                org === NONE
                  ? tenants.length === 0
                    ? "No tenants yet"
                    : "Pick a tenant"
                  : error
                    ? "Nothing to show"
                    : "No audit entries"
              }
              description={
                org === NONE
                  ? tenants.length === 0
                    ? "There are no tenants to show an audit log for."
                    : "Nothing is read until you pick one, and each search is recorded."
                  : error
                    ? "The entries could not be read. Pick the tenant again to retry."
                    : "This tenant has no audit entries yet."
              }
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
              <caption className="sr-only">Audit log entries, newest first</caption>
              <thead>
                <tr className={theadRowClass}>
                  <th scope="col" className={`${thClass} !pl-[22px]`}>When</th>
                  <th scope="col" className={thClass}>Actor</th>
                  <th scope="col" className={thClass}>Action</th>
                  <th scope="col" className={thClass}>Target</th>
                  <th scope="col" className={`${thClass} !pr-[22px]`}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((e) => (
                  <tr key={e.id} className="align-top transition-colors duration-150 hover:bg-surface-2">
                    <td className="whitespace-nowrap py-3 pl-[22px] pr-5 tabular-nums text-ink-3">
                      {Number.isNaN(Date.parse(e.occurred_at)) ? "" : dateTime.format(new Date(e.occurred_at))}
                    </td>
                    <td className="max-w-[200px] px-5 py-3 text-ink-2">
                      <span className="block capitalize">{e.actor_type}</span>
                      {e.actor_id ? (
                        <span className="block truncate font-mono text-[12.5px] text-ink-3" title={e.actor_id}>
                          {e.actor_id}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 font-mono text-[12.5px] text-ink">{e.action}</td>
                    <td className="max-w-[200px] px-5 py-3 text-ink-2">
                      {e.target_type ? <span className="block">{e.target_type}</span> : null}
                      {e.target_id ? (
                        <span className="block truncate font-mono text-[12.5px] text-ink-3" title={e.target_id}>
                          {e.target_id}
                        </span>
                      ) : null}
                    </td>
                    <td className="max-w-[320px] break-words py-3 pl-5 pr-[22px] font-mono text-[12.5px] text-ink-3">{metaText(e.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {cursor ? (
        <div>
          <Button variant="outline" size="sm" className={focusPill} disabled={pending} onClick={() => fetchPage(org, cursor)}>
            {pending ? "Loading more" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
