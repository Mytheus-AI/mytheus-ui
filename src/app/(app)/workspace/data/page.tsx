import type { Metadata } from "next";
import { DownloadSimple } from "@phosphor-icons/react/ssr";
import { buttonClass } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { InlineRow } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { SectionBar } from "@/components/ui/Page";
import { TenantSettingsForm } from "@/components/tenant/TenantSettingsForm";
import { loadTenantSettings } from "@/lib/api/admin-tenant";
import { settingsToForm } from "@/lib/tenant-admin";
import { theadRowClass, thClass } from "@/components/admin/StatCard";
import { ActionForm } from "@/components/admin/ActionForm";
import { FormSubmit } from "@/components/admin/FormSubmit";
import { startDataExport } from "@/app/actions/tenant-admin";
import { loadErasures, loadExportRequests } from "@/lib/api/admin-tenant";
import { listMembers } from "@/lib/api/members";
import { listMeetings } from "@/lib/api/meetings";
import { ErasureFlow, type ErasableMeeting } from "@/components/tenant/ErasureFlow";
import { anyInProgress, erasureSummary } from "@/lib/erasure";
import { ErasureStores } from "@/components/tenant/ErasureStores";
import { RefreshWhile } from "@/components/tenant/RefreshWhile";
import { safeHttpsUrl } from "@/lib/integrations";
import { zonedFormat } from "@/lib/timezone-server";

export const metadata: Metadata = { title: "Data and privacy | Mytheus" };
export const dynamic = "force-dynamic";

/* Data and privacy, one tab of the Workspace console. Three parts:
   - The workspace settings (Phase P12, plan 3.13 step 2): `tenant_settings` retention, PII
     redaction and `agent_confidence_overrides`, over admin-ops-service's `/admin/tenant/settings`.
     A failed read shows no form at all, so nobody saves defaults over settings they could not see.
   - Data export over `/admin/tenant/data-export`: an owner or admin
   asks for an archive of everything the workspace holds. The request is recorded on
   `admin-events` and audited; it stays "Pending" until the export workflow writes the archive to
   `mytheus-exports`, and then the download link appears here. The link is only shown when it is an
   https URL.
   - Erasing one person's or one meeting's data over `/admin/tenant/erasures`: a dialog picks the
     target, says what goes and what stays, and only turns Erase on once the admin types the
     person's email or the meeting's title (the server checks it again). Erasures are listed from
     the audit log, each with a per-store checklist: core-api's records finish with the request,
     transcripts, the AI search index, keyword search and the knowledge graph report back as their
     services run. While any store is waiting, the page re-reads itself every 10 seconds. */

const dateTime = () => zonedFormat({ month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const shortDate = () => zonedFormat({ month: "short", day: "numeric", year: "numeric" });
const fmt = (iso: string) => (Number.isNaN(Date.parse(iso)) ? "" : dateTime().format(new Date(iso)));

export default async function DataExportPage() {
  const [res, settings, erasures, members, meetings] = await Promise.all([
    loadExportRequests(),
    loadTenantSettings(),
    loadErasures(),
    listMembers(),
    listMeetings().catch(() => null),
  ]);
  const memberOptions = members?.map((m) => ({ id: m.id, name: m.name, email: m.email, imageUrl: m.imageUrl, isYou: m.isYou })) ?? null;
  const meetingOptions: ErasableMeeting[] | null =
    meetings?.map((m) => ({
      id: m.id,
      title: m.title ?? null,
      when: m.scheduled_start ? shortDate().format(new Date(m.scheduled_start)) : m.created_at ? shortDate().format(new Date(m.created_at)) : null,
      live: m.status === "live",
    })) ?? null;
  const erasureRows = erasures.kind === "live" ? erasures.data : [];
  const rows = res.kind === "live" ? [...res.data].sort((a, b) => Date.parse(b.requested_at) - Date.parse(a.requested_at)) : [];
  const pending = rows.some((r) => r.status === "pending");

  return (
    <div className="flex flex-col gap-5">
      <SectionBar
        title="Data and privacy"
        context="How long the workspace keeps what is said, what is redacted, how sure Mytes must be, and the requests that act on all of it. Every change is written to the audit log."
      />

      {settings.kind === "live" ? (
        <TenantSettingsForm initial={settingsToForm(settings.data)} />
      ) : settings.kind === "forbidden" ? (
        <Note tone="error">Only workspace owners and admins can see and change these settings.</Note>
      ) : (
        <ErrorState title="The workspace settings could not be loaded" text="Nothing has changed. The form appears once the settings can be read." />
      )}

      {res.kind === "forbidden" ? (
        <Note tone="error">Only workspace owners and admins can export workspace data.</Note>
      ) : res.kind === "unavailable" ? (
        <ErrorState title="Data export could not be loaded" />
      ) : (
        <>
          <SectionCard
            title="Export workspace data"
            headingId="request-heading"
            description="An archive of the workspace's meetings, transcripts, confirmed decisions and action items."
          >
            <InlineRow
              label="Export workspace data"
              help={pending ? "An export is already being prepared. You can request another once it is ready." : "The archive is prepared in the background and expires a few days after it is ready."}
            >
              <ActionForm action={startDataExport} success="Export requested" className="flex flex-col items-start gap-2 sm:items-end">
                <FormSubmit variant="primary" pendingLabel="Requesting export" disabled={pending}>
                  <DownloadSimple size={16} aria-hidden />
                  Request export
                </FormSubmit>
              </ActionForm>
            </InlineRow>
          </SectionCard>

          <SectionCard title="Export requests" headingId="exports-heading" description="Newest first. A download link appears once an archive is ready.">
            {rows.length === 0 ? (
              <EmptyState
                inCard
                art="notes"
                title="No exports yet"
                description="Requested archives are listed here with their status."
              />
            ) : (
              <div>
                <table className="mx-table w-full border-collapse text-left text-[14px]">
                  <caption className="sr-only">Data export requests</caption>
                  <thead>
                    <tr className={theadRowClass}>
                      <th scope="col" className={`${thClass} !pl-[22px]`}>Requested</th>
                      <th scope="col" className={thClass}>Status</th>
                      <th scope="col" className={`${thClass} !pr-[22px]`}>
                        <span className="sr-only">Download</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r) => {
                      const link = r.status === "completed" ? safeHttpsUrl(r.manifest_url) : null;
                      return (
                        <tr key={r.id} className="transition-colors duration-150 hover:bg-surface-2">
                          <td data-label="Requested" className="whitespace-nowrap py-3 pl-[22px] pr-5 tabular-nums text-ink-2">
                            {fmt(r.requested_at)}
                          </td>
                          <td data-label="Status" className="px-5 py-3">
                            <Chip tone={r.status === "completed" ? "ok" : r.status === "pending" ? "medium" : "neutral"}>
                              {r.status === "completed" ? "Ready" : r.status === "pending" ? "Pending" : r.status}
                            </Chip>
                          </td>
                          <td className="py-3 pl-5 pr-[22px] text-right">
                            {link ? (
                              <a
                                href={link}
                                rel="noopener noreferrer"
                                aria-label={`Download the export requested ${fmt(r.requested_at)}`}
                                className={buttonClass({ variant: "outline", size: "sm" })}
                              >
                                <DownloadSimple size={16} aria-hidden />
                                Download
                              </a>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </>
      )}

      <SectionCard
        tone="danger"
        headingId="erasure-heading"
        title="Erase data"
        description="Erase everything the workspace holds about one person, or everything said in one meeting. Each request is written to the audit log."
      >
        <InlineRow
          label="Erase a person's or a meeting's data"
          help="Confirmed decisions and tasks stay as the workspace's record, with the person's name removed. This cannot be undone."
        >
          {erasures.kind === "forbidden" ? (
            <Chip tone="outline">Owners and admins only</Chip>
          ) : (
            <ErasureFlow members={memberOptions} meetings={meetingOptions} />
          )}
        </InlineRow>
        {erasures.kind === "unavailable" ? (
          <div className="px-4 py-4 sm:px-[22px]">
            <ErrorState variant="inline" title="Past erasures could not be loaded" text="Starting a new one still works. The list returns when it can be read." />
          </div>
        ) : erasures.kind === "live" ? (
          erasureRows.length === 0 ? (
            <EmptyState inCard compact art="done" title="No erasures yet" description="Erasures are listed here, newest first, with what was removed and each store's progress." />
          ) : (
            <div>
              <RefreshWhile active={anyInProgress(erasureRows)} />
              <table className="mx-table w-full border-collapse text-left text-[14px]">
                <caption className="sr-only">Erasures and their progress in each store</caption>
                <thead>
                  <tr className={theadRowClass}>
                    <th scope="col" className={`${thClass} !pl-[22px]`}>Erased</th>
                    <th scope="col" className={thClass}>What</th>
                    <th scope="col" className={thClass}>Removed</th>
                    <th scope="col" className={`${thClass} !pr-[22px]`}>Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {erasureRows.map((r) => (
                    <tr key={r.id}>
                      <td data-label="Erased" className="whitespace-nowrap py-3 pl-[22px] pr-5 tabular-nums text-ink-2">
                        {fmt(r.requested_at)}
                      </td>
                      <td data-label="What" className="px-5 py-3">
                        <span className="flex flex-wrap items-center gap-2">
                          <Chip tone="outline">{r.kind === "person" ? "Person" : "Meeting"}</Chip>
                          <span className="min-w-0 break-words text-ink">{r.label ?? (r.kind === "person" ? "A former member" : "A meeting")}</span>
                        </span>
                      </td>
                      <td data-label="Removed" className="px-5 py-3 text-ink-3">
                        {erasureSummary(r)}
                      </td>
                      <td data-label="Progress" className="py-3 pl-5 pr-[22px] align-top">
                        <ErasureStores id={`erasure-${r.id}`} progress={r.progress} stores={r.stores} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </SectionCard>
    </div>
  );
}
