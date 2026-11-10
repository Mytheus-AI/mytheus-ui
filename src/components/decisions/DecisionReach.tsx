"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookOpenText, LinkSimple, NotionLogo, SlackLogo } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { createDecisionShare, exportDecision, revokeDecisionShare } from "@/app/actions/decision-reach";
import { Button } from "@/components/ui/Button";
import { CardHead, cardClass } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { FieldMsg, fieldClass } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { notifyError, notifySuccess } from "@/lib/toast";
import {
  EXPORT_NAME,
  EXPORT_PROVIDERS,
  exportAvailability,
  reusableLink,
  slackChannel,
  type DestinationsLoad,
  type ExportProvider,
  type ShareLinkView,
} from "@/lib/decision-reach";

/* Share this decision: copy a public link to its record, or export the record to Notion,
   Confluence or Slack. Every route carries the lineage (what it follows from and what replaced
   it), which is what makes a decision record worth more than a copied sentence.

   - Copy share link reuses your newest active link, or creates one, and copies it. A link made by
     this press can be taken back from the toast (Undo turns it off); a reused one cannot, since
     someone may already have it.
   - Each export button is off, with the reason under it, when its tool is not available on the
     server, not connected to the workspace, or has nowhere to put the record (ADR-0037 D3). An
     export cannot be undone from here: the page lives in the other tool. Exporting again
     replaces the earlier page. */

const ICON: Record<ExportProvider, Icon> = { notion: NotionLogo, confluence: BookOpenText, slack: SlackLogo };
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmt = (iso: string | null | undefined) => (iso && !Number.isNaN(Date.parse(iso)) ? date.format(new Date(iso)) : "");

export type ExportedTo = { provider: ExportProvider; external_url?: string | null; exported_at: string };

export function DecisionReach({
  decisionId,
  meetingId,
  destinations,
  exports,
  links,
  shareable,
  isAdmin,
}: {
  decisionId: string;
  meetingId: string;
  destinations: Record<ExportProvider, DestinationsLoad>;
  exports: ExportedTo[];
  links: ShareLinkView[] | null;
  shareable: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const uid = useId();
  const [sharing, setSharing] = useState(false);
  const [exporting, setExporting] = useState<ExportProvider | null>(null);
  const activeLinks = (links ?? []).filter((l) => l.state === "active");

  const copyLink = async () => {
    if (sharing) return;
    setSharing(true);
    const existing = links ? reusableLink(links) : null;
    let url = existing?.url ?? null;
    let createdId: string | null = null;
    if (!url) {
      const res = await createDecisionShare(decisionId, meetingId);
      if (!res.ok) {
        setSharing(false);
        notifyError(res.message);
        return;
      }
      url = res.url;
      createdId = res.id;
    }
    try {
      await navigator.clipboard.writeText(url);
      notifySuccess(
        "Share link copied",
        createdId
          ? {
              description: "Anyone with the link can read this decision and its lineage for 30 days.",
              undo: () => void undoLink(createdId as string),
            }
          : { description: "Your existing link. Anyone with it can read this decision and its lineage." },
      );
    } catch {
      notifySuccess(createdId ? "Share link created" : "Share link ready", { description: url });
    }
    setSharing(false);
    if (createdId) router.refresh();
  };

  const undoLink = async (id: string) => {
    const res = await revokeDecisionShare(id, decisionId, meetingId);
    if (res.ok) {
      notifySuccess("Share link turned off");
      router.refresh();
    } else notifyError(res.message);
  };

  const turnOff = async (link: ShareLinkView) => {
    const res = await revokeDecisionShare(link.id, decisionId, meetingId);
    if (res.ok) {
      notifySuccess("Share link turned off", { description: "It stops working at once." });
      router.refresh();
    } else notifyError(res.message);
  };

  return (
    <section aria-labelledby={`${uid}-h`} className={cardClass({ flush: true })}>
      <CardHead id={`${uid}-h`} as="h2" title="Share this decision" description="Its record includes what it follows from and what replaced it." />

      <div className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:px-[22px]">
        {shareable ? (
          <Button variant="primary" onClick={() => void copyLink()} disabled={sharing || links === null} aria-busy={sharing} className="w-full">
            <LinkSimple size={16} weight="bold" aria-hidden />
            {sharing ? "Copying share link" : "Copy share link"}
          </Button>
        ) : (
          <Note>This meeting is confidential or you were not in it, so you cannot share its decisions. Its host can.</Note>
        )}
        {links === null && shareable ? <p className="text-[12.5px] text-ink-3">Share links could not be loaded just now.</p> : null}
      </div>

      <div className="border-t border-line px-4 py-4 sm:px-[22px]">
        <h3 className="kicker">Export the record</h3>
        <ul className="mt-2.5 flex flex-col gap-2.5">
          {EXPORT_PROVIDERS.map((p) => {
            const avail = exportAvailability(p, destinations[p], isAdmin);
            const Glyph = ICON[p];
            const reasonId = `${uid}-${p}-why`;
            return (
              <li key={p}>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={!avail.enabled || !shareable}
                  aria-describedby={!avail.enabled ? reasonId : undefined}
                  onClick={() => setExporting(p)}
                >
                  <Glyph size={16} aria-hidden />
                  Export to {EXPORT_NAME[p]}
                </Button>
                {!avail.enabled ? (
                  <p id={reasonId} className="mt-1 text-[12.5px] leading-snug text-ink-3">
                    {avail.message}
                    {avail.reason === "not_connected" && isAdmin ? (
                      <>
                        {" "}
                        <Link href="/settings/integrations" className="font-semibold text-signal-ink underline-offset-4 hover:underline">
                          Open integrations
                        </Link>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
        {exports.length > 0 ? (
          <ul className="mt-3.5 flex flex-col gap-1.5 border-t border-line pt-3" aria-label="Where this decision has been exported">
            {exports.map((e) => (
              <li key={e.provider} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[14px]">
                <span className="text-ink-2">
                  In {EXPORT_NAME[e.provider]} <span className="text-ink-3">since {fmt(e.exported_at)}</span>
                </span>
                {e.external_url ? (
                  <a
                    href={e.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-signal-ink underline-offset-4 hover:underline"
                  >
                    Open
                    <ArrowUpRight size={13} weight="bold" aria-hidden />
                    <span className="sr-only">in {EXPORT_NAME[e.provider]} (opens in a new tab)</span>
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {activeLinks.length > 0 ? (
        <div className="border-t border-line px-4 py-4 sm:px-[22px]">
          <h3 className="kicker">Active share links</h3>
          <ul className="mt-2 flex flex-col gap-2.5">
            {activeLinks.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <span className="min-w-0 text-[14px] text-ink-2">
                  {l.created_by_name ?? "Someone"}, until {fmt(l.expires_at)}
                  <span className="block text-[12.5px] text-ink-3">
                    {l.view_count === 1 ? "Opened once" : l.view_count > 1 ? `Opened ${l.view_count} times` : "Not opened yet"}
                  </span>
                </span>
                {l.can_revoke ? (
                  <Button variant="ghost" size="sm" onClick={() => void turnOff(l)} aria-label={`Turn off the link shared by ${l.created_by_name ?? "someone"}`}>
                    Turn off
                  </Button>
                ) : (
                  <Chip tone="outline">Not yours</Chip>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ExportDialog
        provider={exporting}
        load={exporting ? destinations[exporting] : null}
        decisionId={decisionId}
        meetingId={meetingId}
        onClose={() => setExporting(null)}
        onDone={() => router.refresh()}
      />
    </section>
  );
}

function ExportDialog({
  provider,
  load,
  decisionId,
  meetingId,
  onClose,
  onDone,
}: {
  provider: ExportProvider | null;
  load: DestinationsLoad | null;
  decisionId: string;
  meetingId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const uid = useId();
  const [target, setTarget] = useState("");
  const [channel, setChannel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ url: string | null; replaced: boolean } | null>(null);
  const [lastProvider, setLastProvider] = useState<ExportProvider | null>(null);

  // Reset the form whenever a different export is opened.
  if (provider !== lastProvider) {
    setLastProvider(provider);
    setTarget("");
    setChannel("");
    setError(null);
    setDone(null);
  }

  if (!provider || !load || load.kind !== "live") return null;
  const name = EXPORT_NAME[provider];
  const options = load.destinations.filter((d) => d.kind !== "dm");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    let destination = target;
    if (provider === "slack") {
      const c = slackChannel(channel);
      if (!c.ok) {
        setError(c.message);
        return;
      }
      destination = c.channel ?? "dm";
    } else if (!destination) {
      setError(provider === "notion" ? "Pick the Notion page to put it under." : "Pick the Confluence space to put it in.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await exportDecision({ decisionId, meetingId, provider, destination });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setDone({ url: res.url, replaced: res.replaced });
    notifySuccess(`Exported to ${name}`, { description: res.replaced ? "The earlier export was replaced." : undefined });
    onDone();
  };

  return (
    <Dialog open onClose={onClose} busy={busy} title={`Export to ${name}`} description="The record goes with its lineage and a link back to the meeting, as you can see it.">
      {done ? (
        <div className="flex flex-col gap-4">
          <Note tone="success">
            {done.replaced ? `The decision record replaced its earlier export in ${name}.` : `The decision record is in ${name}.`}
          </Note>
          <div className="flex flex-wrap justify-end gap-2">
            {done.url ? (
              <a
                href={done.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-ctl border border-line-2 bg-surface px-[18px] text-[15px] font-semibold text-ink hover:bg-surface-2"
              >
                Open in {name}
                <ArrowUpRight size={14} weight="bold" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : null}
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {provider === "slack" ? (
            <div>
              <label htmlFor={`${uid}-channel`} className="mb-1.5 block text-[14px] font-semibold text-ink">
                Channel id <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <input
                id={`${uid}-channel`}
                value={channel}
                onChange={(e) => {
                  setChannel(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Leave empty for a direct message to you"
                autoComplete="off"
                spellCheck={false}
                aria-describedby={`${uid}-msg ${uid}-note`}
                aria-invalid={error ? true : undefined}
                className={`${fieldClass} font-mono`}
              />
            </div>
          ) : (
            <div>
              <label htmlFor={`${uid}-target`} className="mb-1.5 block text-[14px] font-semibold text-ink">
                {provider === "notion" ? "Put it under" : "Space"}
              </label>
              <select
                id={`${uid}-target`}
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  if (error) setError(null);
                }}
                aria-describedby={`${uid}-msg ${uid}-note`}
                aria-invalid={error ? true : undefined}
                className={fieldClass}
              >
                <option value="">{provider === "notion" ? "Pick a page" : "Pick a space"}</option>
                {options.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {load.note ? (
            <p id={`${uid}-note`} className="text-[14px] leading-relaxed text-ink-3">
              {load.note}
            </p>
          ) : (
            <span id={`${uid}-note`} hidden />
          )}
          <FieldMsg id={`${uid}-msg`} error={error} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy} aria-busy={busy}>
              {busy ? `Exporting to ${name}` : `Export to ${name}`}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
