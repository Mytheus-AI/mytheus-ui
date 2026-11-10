"use client";

import { useReducer, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Note, fieldClass } from "@/components/settings/primitives";
import { thClass } from "@/components/admin/StatCard";
import { setTenantSuspended } from "@/app/actions/ops";
import { REASON_MIN, canSubmitSuspend, suspendReducer, type OpsTenant } from "@/lib/ops";

/* The tenant directory with suspend and reinstate. Suspending stops every member's access, so it
   always goes through a confirm dialog with a written reason (the reason is stored with the
   `admin-events` record); reinstating confirms too. The status flip itself happens in
   identity-tenant-service, so the row updates on the refresh after the call returns. */

const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function TenantDirectory({ tenants }: { tenants: OpsTenant[] }) {
  const [state, dispatch] = useReducer(suspendReducer, { step: "idle" });
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();
  const router = useRouter();

  const q = query.trim().toLowerCase();
  const rows = q ? tenants.filter((t) => t.name.toLowerCase().includes(q) || t.org_id.includes(q)) : tenants;
  const dialogOpen = state.step === "confirming" || state.step === "submitting" || state.step === "error";

  const submit = () => {
    if (state.step !== "confirming" && state.step !== "error") return;
    if (!canSubmitSuspend(state)) return;
    const { orgId, verb, reason, name } = state;
    dispatch({ type: "submit" });
    startTransition(async () => {
      const res = await setTenantSuspended(orgId, verb, reason);
      if (res.ok) {
        dispatch({ type: "succeeded", message: `${name} is ${verb === "suspend" ? "suspended" : "reinstated"}.` });
        router.refresh();
      } else {
        dispatch({ type: "failed", message: res.message });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {state.step === "done" ? (
        <Note>
          <span role="status">{state.message}</span>
        </Note>
      ) : null}

      <label className="relative block max-w-sm">
        <span className="sr-only">Filter tenants</span>
        <MagnifyingGlass size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name or id"
          className={`${fieldClass} pl-9`}
        />
      </label>

      <section aria-label="Tenants" className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
        {rows.length === 0 ? (
          <p className="px-4 py-4 text-[13.5px] text-ink-3 sm:px-[22px]">{tenants.length === 0 ? "No tenants yet." : "No tenant matches that filter."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[14px]">
              <thead>
                <tr className="bg-bg">
                  <th scope="col" className={thClass}>Tenant</th>
                  <th scope="col" className={thClass}>Plan</th>
                  <th scope="col" className={thClass}>Members</th>
                  <th scope="col" className={thClass}>Created</th>
                  <th scope="col" className={thClass}>Status</th>
                  <th scope="col" className={thClass}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((t) => {
                  const suspended = t.status === "suspended";
                  return (
                    <tr key={t.org_id}>
                      <td className="max-w-[300px] px-5 py-3">
                        <span className="block truncate font-semibold text-ink">{t.name}</span>
                        <span className="block truncate font-mono text-[11.5px] text-ink-3">{t.org_id}</span>
                      </td>
                      <td className="px-5 py-3 capitalize text-ink-2">{t.plan ?? "None"}</td>
                      <td className="px-5 py-3 tabular-nums text-ink-2">{t.member_count}</td>
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-3">
                        {Number.isNaN(Date.parse(t.created_at)) ? "" : date.format(new Date(t.created_at))}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={suspended ? "danger" : "success"} className="capitalize">
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant={suspended ? "outline" : "ghost"}
                          size="sm"
                          disabled={state.step === "submitting"}
                          onClick={() => dispatch({ type: "ask", orgId: t.org_id, name: t.name, verb: suspended ? "reinstate" : "suspend" })}
                        >
                          {suspended ? "Reinstate" : "Suspend"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={dialogOpen}
        onClose={() => dispatch({ type: "cancel" })}
        title={dialogOpen ? `${state.verb === "suspend" ? "Suspend" : "Reinstate"} ${state.name}?` : undefined}
      >
        {dialogOpen ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <p className="text-[13.5px] text-ink-2">
              {state.verb === "suspend"
                ? "Every member loses access until the tenant is reinstated. Their data is kept. This is recorded in the ops audit log."
                : "Members get their access back. This is recorded in the ops audit log."}
            </p>
            {state.verb === "suspend" ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-ink">Reason</span>
                <textarea
                  required
                  minLength={REASON_MIN}
                  maxLength={500}
                  rows={3}
                  value={state.reason}
                  onChange={(e) => dispatch({ type: "reason", reason: e.target.value })}
                  className="w-full rounded-[14px] border border-line-2 bg-surface px-3.5 py-2.5 text-[14px] text-ink focus-visible:border-signal"
                  placeholder="Why this tenant is being suspended"
                />
              </label>
            ) : null}
            {state.step === "error" ? <Note tone="error">{state.message}</Note> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => dispatch({ type: "cancel" })} disabled={state.step === "submitting"}>
                Cancel
              </Button>
              <Button type="submit" variant={state.verb === "suspend" ? "danger" : "primary"} size="sm" disabled={!canSubmitSuspend(state)}>
                {state.step === "submitting" ? "Working..." : state.verb === "suspend" ? "Suspend tenant" : "Reinstate tenant"}
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
