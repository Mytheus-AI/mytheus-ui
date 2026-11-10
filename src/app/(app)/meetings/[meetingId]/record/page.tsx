import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EyeSlash, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Note } from "@/components/ui/Note";
import { Page, PageGrid, PageHead } from "@/components/ui/Page";
import { ConsentReceiptView } from "@/components/call/ConsentReceipt";
import { resolveCallMeeting } from "@/components/call/resolve-meeting";
import { apiSafe } from "@/lib/api/client";
import { gapLength } from "@/lib/realtime/privacy";
import type { ConsentReceiptRow, OffRecordStateRow } from "@/app/actions/off-record";
import "@/components/room/room-privacy.css";

export const metadata: Metadata = { title: "What is recorded | Mytheus" };

/* What this meeting keeps about you (polish program wave 3, Off the record): your own consent
   receipt (meeting-service `GET /api/meetings/:id/consent-receipt`: whether you agreed, when, to
   which version of the notice and what that version said) and every stretch that was off the
   record (core-api `GET /api/v1/meetings/:id/off-record`). Both reads are the caller's own: a
   receipt is never anyone else's, and the off-the-record history is for the meeting's participants.
   Each card fails on its own; another tenant's meeting is a 404 from either. */

export const dynamic = "force-dynamic";

const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

export default async function RecordPage({ params }: { params: { meetingId: string } }) {
  const meeting = await resolveCallMeeting(params.meetingId);
  const id = encodeURIComponent(meeting.id);
  const [receipt, offRecord] = await Promise.all([
    apiSafe<ConsentReceiptRow>(`/api/meetings/${id}/consent-receipt`),
    apiSafe<OffRecordStateRow>(`/api/v1/meetings/${id}/off-record`),
  ]);
  if (!receipt.ok && receipt.error.status === 404) notFound();

  const segments = offRecord.ok ? offRecord.data.segments : [];

  return (
    <Page>
      <PageHead
        title="What is recorded"
        context={`Your agreement for ${meeting.title}, ${day.format(new Date(meeting.startTime))}, and the stretches that were off the record.`}
        action={
          <LinkButton href={`/meetings/${meeting.id}`} variant="outline">
            Open the meeting
          </LinkButton>
        }
      />
      <PageGrid cols={2}>
        <Card as="section" aria-labelledby="rec-receipt">
          <CardHead id="rec-receipt" title="Your receipt" caption="Only you can see this." divided />
          <CardBody>
            {receipt.ok ? (
              <ConsentReceiptView
                receipt={receipt.data}
                fallback={
                  <p className="receipt-note">
                    The call shows the full notice before you join: the transcript is kept with the meeting, your agent&rsquo;s
                    notes are yours, nothing is decided without someone confirming it, chat is kept, and anyone can ask to go
                    off the record.
                  </p>
                }
              />
            ) : receipt.error.status === 403 ? (
              <Note tone="info">You are not on this meeting&rsquo;s participant list, so there is no receipt for you.</Note>
            ) : (
              <Note tone="error">Your receipt could not be loaded just now. Reload the page to try again.</Note>
            )}
          </CardBody>
        </Card>

        <Card as="section" aria-labelledby="rec-off">
          <CardHead
            id="rec-off"
            title="Off the record"
            caption={
              offRecord.ok && segments.length > 0
                ? `${segments.length === 1 ? "Once" : `${segments.length} times`}, ${gapLength(offRecord.data.total_ms)} in all`
                : undefined
            }
            divided
          />
          <CardBody>
            {!offRecord.ok ? (
              offRecord.error.status === 403 ? (
                <Note tone="info">Only the meeting&rsquo;s participants can see when it was off the record.</Note>
              ) : (
                <Note tone="error">The off-the-record history could not be loaded just now. Reload the page to try again.</Note>
              )
            ) : segments.length === 0 ? (
              <EmptyState
                inCard
                title="Never off the record"
                description="The host or the meeting's creator can take a meeting off the record from the call, and anyone in it can ask them to. While it is, nothing is transcribed or kept and every agent pauses."
              />
            ) : (
              <ol className="grid gap-3">
                {segments.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 rounded-ctl bg-surface-2 px-3.5 py-3">
                    {s.ended_at ? (
                      <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                    ) : (
                      <EyeSlash size={18} weight="bold" className="mt-0.5 shrink-0 text-ink" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-ink">
                        {s.ended_at
                          ? `${time.format(new Date(s.started_at))} to ${time.format(new Date(s.ended_at))}, ${gapLength(s.duration_ms)}`
                          : `Since ${time.format(new Date(s.started_at))}, still off the record`}
                      </p>
                      <p className="text-[14px] text-ink-2">Nothing said in this stretch was transcribed, indexed or seen by any agent.</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </PageGrid>
    </Page>
  );
}
