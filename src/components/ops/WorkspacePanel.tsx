"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowSquareOut, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dropdown } from "@/components/ui/Dropdown";
import { textareaClass } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { ColumnChart, Meter } from "@/components/ops/charts";
import { RegionMap } from "@/components/ops/map/RegionMap";
import { REGION_PLACES, regionLabel, weekPoints } from "@/lib/ops-charts";
import { notifySuccess } from "@/lib/toast";
import {
  beginSupportSession,
  cancelTenantMove,
  finishSupportSession,
  listSupportMembers,
  loadTenantDetail,
  requestTenantMove,
} from "@/app/actions/ops";
import { REASON_MIN, REGIONS, SESSION_MINUTES, actionLabel, type SupportMember, type TenantDetail } from "@/lib/ops";

/* One workspace, opened from the directory (ADR-0046 D3). A side panel rather than a page: the
   workspace id never goes in a URL, and the detail is read through a POST. Everything here is
   control-plane data: placement, counts, flags, support grants, support sessions, move requests
   and the ops actions taken on this workspace. Acting as a member needs the workspace's own
   `impersonate` grant; the panel says so instead of hiding the section. */

const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmtDay = (iso: string | null | undefined) => (iso && !Number.isNaN(Date.parse(iso)) ? day.format(new Date(iso)) : "");
const fmtWhen = (iso: string | null | undefined) => (iso && !Number.isNaN(Date.parse(iso)) ? when.format(new Date(iso)) : "");

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; detail: TenantDetail };

export function WorkspacePanel({ orgId, name, onClose }: { orgId: string; name: string; onClose: () => void }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;

  const refresh = useCallback(async () => {
    const res = await loadTenantDetail(orgId);
    setLoad(res.ok ? { state: "ready", detail: res.data } : { state: "error", message: res.message });
  }, [orgId]);

  useEffect(() => {
    opener.current = document.activeElement;
    closeRef.current?.focus();
    void refresh();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) closeFn.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [refresh]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close the workspace panel" onClick={onClose} className="absolute inset-0 bg-[rgba(28,26,21,0.35)] backdrop-blur-[2px]" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-panel-title"
        className="relative flex h-full w-full max-w-[600px] flex-col border-l border-line bg-bg shadow-warm-3"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="workspace-panel-title" className="display truncate text-[24px] text-ink-display">
              {load.state === "ready" ? load.detail.name : name}
            </h2>
            <p className="mt-0.5 truncate font-mono text-[12.5px] text-ink-3" title={orgId}>
              {orgId}
            </p>
          </div>
          <Button ref={closeRef} variant="ghost" size="sm" icon onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {load.state === "loading" ? (
            <p className="text-[15px] text-ink-3" role="status">
              Loading the workspace…
            </p>
          ) : load.state === "error" ? (
            <div className="flex flex-col gap-3">
              <Note tone="error">{load.message}</Note>
              <div>
                <Button variant="outline" size="sm" onClick={() => void refresh()}>
                  Try again
                </Button>
              </div>
            </div>
          ) : (
            <Detail detail={load.detail} refresh={refresh} />
          )}
        </div>
      </aside>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface px-4 py-4 sm:px-5">
      <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-0.5 text-[13.5px] leading-snug text-ink-3">{description}</p> : null}
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12.5px] font-semibold text-ink-3">{label}</dt>
      <dd className="m-0 mt-0.5 truncate text-[15px] text-ink">{value}</dd>
    </div>
  );
}

function Detail({ detail: d, refresh }: { detail: TenantDetail; refresh: () => Promise<void> }) {
  const res = d.residency;
  const impersonate = d.grants.find((g) => g.active && g.scope === "impersonate");
  return (
    <div className="flex flex-col gap-4">
      <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-3.5 rounded-card border border-line bg-surface px-4 py-4 sm:grid-cols-3 sm:px-5">
        <Fact label="Status" value={<Chip tone={d.status === "suspended" ? "high" : "ok"} className="capitalize">{d.status}</Chip>} />
        <Fact label="Plan" value={<span className="capitalize">{d.plan ?? "None"}</span>} />
        <Fact label="Created" value={fmtDay(d.created_at)} />
        <Fact label="Members" value={d.members} />
        <Fact label="Meetings" value={d.meetings_total} />
        <Fact label="Region" value={res ? `${res.region.toUpperCase()}, ${res.db_cell}` : "Not recorded"} />
      </dl>

      <Section title="Meetings per week" description="Last 12 weeks. Counts only; no meeting content is read.">
        <ColumnChart points={weekPoints(d.meetings_by_week)} caption={`Meetings per week in ${d.name}`} unit={["meeting", "meetings"]} height={104} />
      </Section>

      <Section title="Agent tokens this period" description={`Billing period ${d.period}.`}>
        <Meter value={d.tokens_period} max={d.token_quota} label={`${d.name} agent tokens used`} />
      </Section>

      <SupportSection detail={d} grantExpires={impersonate?.expires_at ?? null} refresh={refresh} />
      <MoveSection detail={d} refresh={refresh} />

      <Section title="Feature flags" description="Flags set for this workspace, and the global ones that apply to it.">
        {d.flags.length === 0 ? (
          <p className="text-[14px] text-ink-3">No flags.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {d.flags.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate font-mono text-[13.5px] text-ink">{f.key}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <Chip tone="neutral">{f.org_id ? "This workspace" : "Global"}</Chip>
                  <Chip tone={f.enabled ? "ok" : "outline"}>{f.enabled ? "On" : "Off"}</Chip>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Recent ops actions" description="The last 20 ops console calls about this workspace.">
        {d.recent_ops.length === 0 ? (
          <p className="text-[14px] text-ink-3">None yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {d.recent_ops.map((a) => (
              <li key={a.id} className="flex items-baseline justify-between gap-3 py-2 text-[14px]">
                <span className="min-w-0 truncate text-ink">
                  {actionLabel(a.action)}
                  {typeof a.details?.outcome === "string" ? <span className="ml-1.5 text-ink-3">({String(a.details.outcome).replace(/_/g, " ")})</span> : null}
                </span>
                <span className="shrink-0 tabular-nums text-ink-3">{fmtWhen(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/* ---- support access ------------------------------------------------------------------------- */

function SupportSection({ detail: d, grantExpires, refresh }: { detail: TenantDetail; grantExpires: string | null; refresh: () => Promise<void> }) {
  const [members, setMembers] = useState<SupportMember[] | null>(null);
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; who: string; expires: string } | null>(null);
  const [pending, start] = useTransition();
  const open = d.sessions.filter((s) => s.open);

  const loadMembers = () =>
    start(async () => {
      setError(null);
      const res = await listSupportMembers(d.org_id);
      if (res.ok) setMembers(res.data.items.filter((m) => !m.is_staff));
      else setError(res.message);
    });

  const begin = () =>
    start(async () => {
      setError(null);
      const res = await beginSupportSession(d.org_id, userId, reason, minutes);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      const m = members?.find((x) => x.user_id === userId);
      setLink({ url: res.data.sign_in_url, who: m?.name || m?.email || "the member", expires: res.data.session.expires_at });
      setReason("");
      notifySuccess("Support session started", { description: `Ends ${fmtWhen(res.data.session.expires_at)}` });
      await refresh();
    });

  const end = (sessionId: string) =>
    start(async () => {
      const res = await finishSupportSession(d.org_id, sessionId);
      if (!res.ok) setError(res.message);
      else {
        setLink(null);
        notifySuccess("Support session ended");
        await refresh();
      }
    });

  return (
    <Section
      title="Support access"
      description="Acting as a member needs this workspace's consent: an impersonate grant from an owner or admin, at most 30 days. Every session is time-boxed and written to the workspace's own audit log."
    >
      <div className="flex flex-col gap-3.5">
        {d.grants.length === 0 ? (
          <p className="text-[14px] text-ink-3">This workspace has not granted support access.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[14px]">
            {d.grants.slice(0, 5).map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-2">
                <Chip tone={g.active ? "ok" : "outline"}>{g.active ? "Active" : g.revoked_at ? "Revoked" : "Expired"}</Chip>
                <span className="text-ink-2">{g.scope === "impersonate" ? "Impersonate" : "Read only"}</span>
                <span className="text-ink-3">until {fmtWhen(g.expires_at)}</span>
              </li>
            ))}
          </ul>
        )}

        {open.length > 0 ? (
          <div className="flex flex-col gap-2">
            {open.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-ctl border border-line bg-surface-2 px-3.5 py-2.5">
                <p className="min-w-0 text-[14px] text-ink-2">
                  <span className="font-semibold text-ink">Open session</span> as {s.user_email ?? "a member"}, ends {fmtWhen(s.expires_at)}
                </p>
                <Button variant="danger-outline" size="sm" disabled={pending} onClick={() => end(s.id)}>
                  End session
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {link ? (
          <Note tone="info">
            <span className="block">
              Open this link in a private window. It signs that window in as {link.who} until {fmtWhen(link.expires)}; your own session stays as it is. The link works once.
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <a href={link.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 font-semibold text-ink underline decoration-line-2 underline-offset-2">
                Open the session <ArrowSquareOut size={15} aria-hidden />
              </a>
              <CopyButton value={link.url} label="Copy link" />
            </span>
          </Note>
        ) : null}

        {!grantExpires ? null : members === null ? (
          <div>
            <Button variant="outline" size="sm" disabled={pending} onClick={loadMembers}>
              {pending ? "Loading members" : "Act as a member"}
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3 border-t border-line pt-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              begin();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-[14px] font-semibold text-ink" aria-hidden>
                Member
              </span>
              <Dropdown
                label="Member"
                value={userId}
                onChange={setUserId}
                placeholder="Pick a member"
                emptyText="No members to act as"
                options={members.map((m) => ({
                  value: m.user_id,
                  label: m.name || m.email,
                  description: [m.name ? m.email : null, m.tier].filter(Boolean).join(", ") || undefined,
                }))}
                size="md"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[14px] font-semibold text-ink" aria-hidden>
                Length
              </span>
              <Dropdown
                label="Length"
                value={String(minutes)}
                onChange={(v) => setMinutes(Number(v))}
                options={SESSION_MINUTES.map((m) => ({ value: String(m), label: `${m} minutes` }))}
                size="md"
              />
              <span className="text-[13px] text-ink-3">Never past the grant, which ends {fmtWhen(grantExpires)}.</span>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-semibold text-ink">Reason</span>
              <textarea
                required
                minLength={REASON_MIN}
                maxLength={500}
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={textareaClass}
                placeholder="What you are checking, e.g. the ticket number"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={pending || !userId || reason.trim().length < REASON_MIN}>
                {pending ? "Starting" : "Start support session"}
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setMembers(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {!grantExpires && d.grants.length > 0 ? (
          <p className="text-[13.5px] text-ink-3">No active impersonate grant, so acting as a member is not available.</p>
        ) : null}
        {error ? <Note tone="error">{error}</Note> : null}

        {d.sessions.length > 0 ? (
          <details className="text-[14px]">
            <summary className="cursor-pointer font-semibold text-ink-2">Past sessions ({d.sessions.length})</summary>
            <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
              {d.sessions.map((s) => (
                <li key={s.id} className="text-ink-2">
                  {fmtWhen(s.started_at)} as {s.user_email ?? "a member"}: <span className="text-ink-3">{s.reason}</span>
                  {s.open ? <Chip tone="ok" className="ml-2">Open</Chip> : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </Section>
  );
}

/* ---- move requests -------------------------------------------------------------------------- */

function MoveSection({ detail: d, refresh }: { detail: TenantDetail; refresh: () => Promise<void> }) {
  const [region, setRegion] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const openMove = d.migrations.find((m) => m.status === "requested");
  const here = d.residency?.region ?? "us";

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await requestTenantMove(d.org_id, region, reason);
      if (!res.ok) setError(res.message);
      else {
        setRegion("");
        setReason("");
        notifySuccess("Move requested", { description: `${d.name} to ${res.data.to_cell}` });
        await refresh();
      }
    });

  const cancel = (id: string) =>
    start(async () => {
      const res = await cancelTenantMove(d.org_id, id);
      if (!res.ok) setError(res.message);
      else await refresh();
    });

  return (
    <Section
      title="Region and move requests"
      description="Mytheus runs one database cell today (pool-us-1), so a move is recorded here for the ops team and carried out by hand. Nothing moves automatically."
    >
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-ctl border border-line bg-surface-2 px-2 py-3">
          <RegionMap
            compact
            caption={
              openMove
                ? `Map: data lives in ${regionLabel(here)}, with a requested move to ${regionLabel(openMove.to_region)}`
                : `Map: data lives in ${regionLabel(here)}`
            }
            hubs={[
              { region: here, count: 1, detail: [d.residency ? `cell ${d.residency.db_cell}` : "default placement"] },
              ...(openMove && openMove.to_region !== here ? [{ region: openMove.to_region, count: 0, detail: [`requested, cell ${openMove.to_cell}`] }] : []),
            ]
              .filter((h) => REGION_PLACES[h.region])
              .map((h) => ({ ...h, key: h.region, label: regionLabel(h.region), short: REGION_PLACES[h.region].short, lon: REGION_PLACES[h.region].lon, lat: REGION_PLACES[h.region].lat }))}
            route={openMove && openMove.to_region !== here ? { from: here, to: openMove.to_region } : null}
          />
        </div>
        {d.residency ? (
          <p className="text-[14px] text-ink-2">
            Data lives in <span className="font-semibold text-ink">{d.residency.region.toUpperCase()}</span>, cell{" "}
            <span className="font-mono text-[13px]">{d.residency.db_cell}</span>, vectors {d.residency.qdrant_region.toUpperCase()}, files{" "}
            {d.residency.object_bucket_region.toUpperCase()}.{d.residency.locked_at ? ` Locked since ${fmtDay(d.residency.locked_at)}.` : ""}
          </p>
        ) : (
          <p className="text-[14px] text-ink-3">No placement recorded; the default is US, pool-us-1.</p>
        )}

        {openMove ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-ctl border border-line bg-surface-2 px-3.5 py-2.5">
            <p className="min-w-0 text-[14px] text-ink-2">
              <span className="font-semibold text-ink">Requested</span> {openMove.from_cell} to {openMove.to_cell} on {fmtDay(openMove.created_at)}:{" "}
              <span className="text-ink-3">{openMove.reason}</span>
            </p>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => cancel(openMove.id)}>
              Cancel request
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-[14px] font-semibold text-ink" aria-hidden>
                Move to
              </span>
              <Dropdown
                label="Move to"
                value={region}
                onChange={setRegion}
                placeholder="Pick a region"
                options={REGIONS.filter((r) => r.value !== here).map((r) => ({ value: r.value, label: r.label }))}
                size="md"
              />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-semibold text-ink">Reason</span>
              <textarea
                required
                minLength={REASON_MIN}
                maxLength={500}
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={textareaClass}
                placeholder="Why, e.g. the customer needs EU data residency"
              />
            </label>
            <div>
              <Button type="submit" variant="outline" size="sm" disabled={pending || !region || reason.trim().length < REASON_MIN}>
                {pending ? "Requesting" : "Request a move"}
              </Button>
            </div>
          </form>
        )}
        {error ? <Note tone="error">{error}</Note> : null}
        {d.migrations.filter((m) => m.status !== "requested").length > 0 ? (
          <details className="text-[14px]">
            <summary className="cursor-pointer font-semibold text-ink-2">Earlier requests</summary>
            <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
              {d.migrations
                .filter((m) => m.status !== "requested")
                .map((m) => (
                  <li key={m.id} className="text-ink-2">
                    {fmtDay(m.created_at)}, {m.from_cell} to {m.to_cell}: <span className="capitalize text-ink-3">{m.status}</span>
                  </li>
                ))}
            </ul>
          </details>
        ) : null}
      </div>
    </Section>
  );
}
