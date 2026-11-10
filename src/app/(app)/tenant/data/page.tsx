import type { Metadata } from "next";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/Badge";
import { InlineRow, Note, PageHeader, SectionCard } from "@/components/settings/primitives";
import { thClass } from "@/components/admin/StatCard";
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
    <div className="flex flex-col gap-6 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
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
          <SectionCard>
            <InlineRow
              label="Export workspace data"
              help={pending ? "An export is already being prepared. You can request another once it is ready." : "The archive is prepared in the background and expires a few days after it is ready."}
            >
              <ActionForm action={startDataExport} className="flex flex-col items-end gap-1.5">
                <FormSubmit variant="outline" pendingLabel="Requesting..." disabled={pending}>
                  <DownloadSimple size={16} aria-hidden />
                  Request export
                </FormSubmit>
              </ActionForm>
            </InlineRow>
          </SectionCard>

          <section aria-labelledby="exports-heading" className="overflow-hidden rounded-card border border-line bg-surface shadow-sm">
            <div className="px-4 pb-3 pt-4 sm:px-[22px] sm:pt-[18px]">
              <h2 id="exports-heading" className="text-[16px] font-semibold text-ink">
                Requests
              </h2>
            </div>
            {rows.length === 0 ? (
              <p className="border-t border-line px-4 py-4 text-[13.5px] text-ink-3 sm:px-[22px]">No exports requested yet.</p>
            ) : (
              <div className="overflow-x-auto border-t border-line">
                <table className="w-full border-collapse text-left text-[14px]">
                  <thead>
                    <tr className="bg-bg">
                      <th scope="col" className={thClass}>Requested</th>
                      <th scope="col" className={thClass}>Status</th>
                      <th scope="col" className={thClass}>
                        <span className="sr-only">Download</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r) => {
                      const link = r.status === "completed" ? safeHttpsUrl(r.manifest_url) : null;
                      return (
                        <tr key={r.id}>
                          <td className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-2">{fmt(r.requested_at)}</td>
                          <td className="px-5 py-3">
                            <Badge tone={r.status === "completed" ? "success" : "default"}>
                              {r.status === "completed" ? "Ready" : r.status === "pending" ? "Pending" : r.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {link ? (
                              <a href={link} rel="noopener noreferrer" className="text-[13.5px] font-semibold text-signal-deep hover:underline">
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
          </section>
          <p className="max-w-[70ch] text-[13px] text-ink-3">
            Erasing one person&apos;s data is a separate request that is not available from this console yet.
          </p>
        </>
      )}
    </div>
  );
}
