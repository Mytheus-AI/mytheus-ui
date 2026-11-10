import type { Metadata } from "next";
import { DownloadSimple, Trash } from "@phosphor-icons/react/ssr";
import { Button, buttonClass } from "@/components/ui/Button";
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
import { loadExportRequests } from "@/lib/api/admin-tenant";
import { safeHttpsUrl } from "@/lib/integrations";

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
   - Erasing one person's data, which has no console route yet, so its button stays off. */

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const fmt = (iso: string) => (Number.isNaN(Date.parse(iso)) ? "" : dateTime.format(new Date(iso)));

export default async function DataExportPage() {
  const [res, settings] = await Promise.all([loadExportRequests(), loadTenantSettings()]);
  const rows = res.kind === "live" ? [...res.data].sort((a, b) => Date.parse(b.requested_at) - Date.parse(a.requested_at)) : [];
  const pending = rows.some((r) => r.status === "pending");

  return (
    <div className="flex flex-col gap-5">
      <SectionBar
        title="Data and privacy"
        context="How long the workspace keeps what is said, what is redacted, how sure agents must be, and the requests that act on all of it. Every change is written to the audit log."
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
        title="Erase a person's data"
        description="Requests that act on everything the workspace holds about one person. Each one is logged to the audit trail."
      >
        <InlineRow
          label="Erase a person's data"
          help="Removes one person's transcripts, notes and agent memory from every store, then confirms when it is done. This cannot be undone."
        >
          <Button variant="danger-outline" size="sm" disabled>
            <Trash size={16} aria-hidden />
            Start erasure
          </Button>
        </InlineRow>
        <div className="px-4 py-4 sm:px-[22px]">
          <Note>Erasing one person&apos;s data is not available from this console yet, so that button stays off rather than pretend to work.</Note>
        </div>
      </SectionCard>
    </div>
  );
}
