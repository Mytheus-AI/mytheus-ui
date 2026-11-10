import type { Metadata } from "next";
import { DownloadSimple } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineRow, Note, PageHeader, SectionCard, focusPill } from "@/components/settings/primitives";
import { theadRowClass, thClass } from "@/components/admin/StatCard";
import { ActionForm } from "@/components/admin/ActionForm";
import { FormSubmit } from "@/components/admin/FormSubmit";
import { startDataExport } from "@/app/actions/tenant-admin";
import { loadExportRequests } from "@/lib/api/admin-tenant";
import { safeHttpsUrl } from "@/lib/integrations";

export const metadata: Metadata = { title: "Data export | Mytheus" };
export const dynamic = "force-dynamic";

/* Data export (Phase P12, plan 3.13 step 2) over `/admin/tenant/data-export`: an owner or admin
   asks for an archive of everything the workspace holds. The request is recorded on
   `admin-events` and audited; it stays "Pending" until the export workflow writes the archive to
   `mytheus-exports`, and then the download link appears here. The link is only shown when it is an
   https URL. */

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const fmt = (iso: string) => (Number.isNaN(Date.parse(iso)) ? "" : dateTime.format(new Date(iso)));

export default async function DataExportPage() {
  const res = await loadExportRequests();
  const rows = res.kind === "live" ? [...res.data].sort((a, b) => Date.parse(b.requested_at) - Date.parse(a.requested_at)) : [];
  const pending = rows.some((r) => r.status === "pending");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data export"
        description="An archive of the workspace's meetings, transcripts, confirmed decisions and action items. Each request is written to the audit log."
      />

      {res.kind === "forbidden" ? (
        <Note tone="error">Only workspace owners and admins can export workspace data.</Note>
      ) : res.kind === "unavailable" ? (
        <Note tone="warning">Data export is not available from the server just now. Try again in a moment.</Note>
      ) : (
        <>
          <SectionCard title="Request an archive" headingLevel={2} headingId="request-heading">
            <InlineRow
              label="Export workspace data"
              help={pending ? "An export is already being prepared. You can request another once it is ready." : "The archive is prepared in the background and expires a few days after it is ready."}
            >
              <ActionForm action={startDataExport} className="flex flex-col items-start gap-2 sm:items-end">
                <FormSubmit variant="primary" pendingLabel="Requesting export" disabled={pending}>
                  <DownloadSimple size={16} aria-hidden />
                  Request export
                </FormSubmit>
              </ActionForm>
            </InlineRow>
          </SectionCard>

          <SectionCard
            title="Requests"
            headingLevel={2}
            headingId="exports-heading"
            description="Newest first. A download link appears once an archive is ready."
          >
            {rows.length === 0 ? (
              <EmptyState
                className="!rounded-none !border-0 !bg-transparent !py-10"
                title="No exports yet"
                description="Requested archives are listed here with their status."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[14.5px]">
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
                          <td className="whitespace-nowrap py-3 pl-[22px] pr-5 tabular-nums text-ink-2">{fmt(r.requested_at)}</td>
                          <td className="px-5 py-3">
                            <Badge tone={r.status === "completed" ? "success" : r.status === "pending" ? "medium" : "default"}>
                              {r.status === "completed" ? "Ready" : r.status === "pending" ? "Pending" : r.status}
                            </Badge>
                          </td>
                          <td className="py-3 pl-5 pr-[22px] text-right">
                            {link ? (
                              <a
                                href={link}
                                rel="noopener noreferrer"
                                aria-label={`Download the export requested ${fmt(r.requested_at)}`}
                                className={`inline-flex h-9 items-center gap-1.5 rounded-ctl border border-line-2 bg-surface px-3 text-[14px] font-semibold text-ink transition-colors duration-150 hover:bg-surface-2 ${focusPill}`}
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
          <Note>Erasing one person&apos;s data is a separate request that is not available from this console yet.</Note>
        </>
      )}
    </div>
  );
}
