"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowClockwise,
  CalendarPlus,
  Check,
  Copy,
  DownloadSimple,
  EnvelopeSimple,
  GoogleLogo,
  LinkSimple,
  MicrosoftOutlookLogo,
  PaperPlaneTilt,
  WarningCircle,
} from "@phosphor-icons/react";
import { loadInvitations, sendInvitations } from "@/app/actions/invitations";
import { Avatar } from "@/components/ui/Avatar";
import { notifyError, notifySuccess } from "@/lib/toast";
import type { InvitationsRead } from "@/lib/api/invitations";
import {
  INVITE_LIMITS,
  failureText,
  sentSummary,
  statusLabel,
  type Invitation,
  type InvitationList,
} from "@/lib/api/invitations-types";
import { Chip, type ChipTone } from "./Chip";
import { MemberPicker, type PickableMember } from "./MemberPicker";

/* "Invite and share" on a meeting's page (ADR-0043), in the people rail before the call.

   Everyone who can see the meeting gets the share half: the join link with Copy, and Add to
   calendar (Google, Outlook, or the .ics file). The host, whoever created the meeting and a
   workspace admin also get the invite half: pick people from the workspace, add a short note and
   send them the invitation by email; then the list of who was invited and how each email went,
   with Retry on a failed one, Resend on a sent one, and Resend to everyone.

   States: the read failed (an error with Retry), reloading (row bones), nobody invited yet, email
   not set up for this workspace (said plainly; the link and the calendar file still work), and no
   time yet (no calendar buttons). Guests outside the workspace cannot join a call, so only members
   can be picked. */

const relTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function ago(iso: string | null, now: number): string | null {
  if (!iso) return null;
  const mins = Math.round((new Date(iso).getTime() - now) / 60000);
  if (Math.abs(mins) < 1) return "just now";
  if (Math.abs(mins) < 60) return relTime.format(mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return relTime.format(hours, "hour");
  return relTime.format(Math.round(hours / 24), "day");
}

function tone(inv: Invitation): ChipTone {
  if (inv.status === "sent") return "ok";
  if (inv.status === "failed") return "medium";
  if (inv.status === "not_configured") return "neutral";
  return "low";
}

export function InviteShareCard({
  meetingId,
  initial,
  members,
}: {
  meetingId: string;
  initial: InvitationsRead;
  /** Workspace members other than you; null when the list could not be loaded. */
  members: PickableMember[] | null;
}) {
  const router = useRouter();
  const ids = useId();
  const [read, setRead] = useState<InvitationsRead>(initial);
  const [reloading, setReloading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [announce, setAnnounce] = useState("");
  const linkRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  // Focus returns to "Invite by email" once the form has closed and the button is back.
  const refocus = useRef(false);
  useEffect(() => {
    if (!composing && refocus.current) {
      refocus.current = false;
      openerRef.current?.focus();
    }
  });
  const now = Date.now();

  const data: InvitationList | null = read.ok ? read.data : null;
  const invitedIds = useMemo(() => new Set((data?.items ?? []).map((i) => i.user_id).filter(Boolean) as string[]), [data]);
  const pickable = useMemo(() => (members ? members.filter((m) => !invitedIds.has(m.id)) : null), [members, invitedIds]);

  const reload = async () => {
    setReloading(true);
    const next = await loadInvitations(meetingId);
    setReloading(false);
    setRead(next);
    if (!next.ok) setAnnounce("Invitations still couldn't be loaded.");
  };

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.join_url);
    } catch {
      linkRef.current?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    setAnnounce("Join link copied.");
    window.setTimeout(() => setCopied(false), 2000);
  };

  const send = async (userIds: string[], key: string, withNote: boolean) => {
    if (userIds.length === 0) return setFormError("Pick at least one person.");
    setBusy(key);
    setFormError(null);
    const res = await sendInvitations(meetingId, userIds, withNote ? note : null);
    setBusy(null);
    if (!res.ok) {
      if (key === "form") setFormError(res.message);
      else notifyError(res.message);
      return;
    }
    const r = res.result;
    if (!r.email_configured) {
      notifySuccess(r.participants_added > 0 ? "Added to the meeting" : "Saved", {
        description: "Email isn't set up for this workspace yet, so nobody was emailed. Share the link instead.",
      });
    } else if (r.failed > 0 && r.sent === 0) {
      notifyError(r.failed === 1 ? "The invitation couldn't be sent" : `${r.failed} invitations couldn't be sent`, {
        description: "Use Retry in the list to try again.",
      });
    } else {
      notifySuccess(r.sent === 1 && key !== "form" ? "Invitation sent" : "Invitations sent", {
        description: `${sentSummary(r)}${r.failed > 0 ? ` ${r.failed} couldn't be sent; use Retry.` : ""}`,
      });
    }
    setAnnounce(sentSummary(r) || "Invitations updated.");
    if (key === "form") {
      setPicked([]);
      setNote("");
      refocus.current = true;
      setComposing(false);
    }
    await reload();
    router.refresh();
  };

  if (!read.ok && reloading) return <CardFrame ids={ids}>{bones()}</CardFrame>;
  if (!read.ok) {
    return (
      <CardFrame ids={ids}>
        <div className="iv-error" role="alert">
          <WarningCircle size={18} weight="fill" aria-hidden="true" />
          <p>
            {read.status === 403
              ? "You aren't in this meeting, so its invitations aren't shown."
              : "Invitations and calendar links couldn't be loaded."}
          </p>
        </div>
        {read.status !== 403 ? (
          <button type="button" className="mx-btn is-outline is-sm tap" onClick={() => void reload()}>
            <ArrowClockwise size={16} aria-hidden="true" />
            Retry
          </button>
        ) : null}
        <span className="sr-only" role="status" aria-live="polite">
          {announce}
        </span>
      </CardFrame>
    );
  }

  const d = read.data;
  const notConfigured = d.can_invite && d.email_configured === false;
  const resendable = d.items.filter((i) => i.user_id && i.status !== "not_configured");
  const cal = d.calendar;

  return (
    <CardFrame ids={ids}>
      {/* Share: everyone who can see the meeting. */}
      <div className="iv-block">
        <label htmlFor={`${ids}-link`} className="iv-label">
          <LinkSimple size={16} aria-hidden="true" />
          Join link
        </label>
        <div className="iv-link">
          <input
            ref={linkRef}
            id={`${ids}-link`}
            className="nm-input iv-link-input"
            value={d.join_url}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
          />
          <button type="button" className="mx-btn is-outline is-sm tap iv-copy" onClick={() => void copy()} aria-label="Copy join link">
            {copied ? <Check size={16} weight="bold" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="iv-hint">People in this workspace sign in and land on the join screen.</p>
      </div>

      <div className="iv-block">
        <span className="iv-label" id={`${ids}-cal`}>
          <CalendarPlus size={16} aria-hidden="true" />
          Add to calendar
        </span>
        {cal ? (
          <div className="iv-cal" role="group" aria-labelledby={`${ids}-cal`}>
            <a className="mx-btn is-outline is-sm tap" href={cal.google_url} target="_blank" rel="noopener noreferrer">
              <GoogleLogo size={16} aria-hidden="true" />
              Google
              <span className="sr-only"> Calendar (opens in a new tab)</span>
            </a>
            <a className="mx-btn is-outline is-sm tap" href={cal.outlook_url} target="_blank" rel="noopener noreferrer">
              <MicrosoftOutlookLogo size={16} aria-hidden="true" />
              Outlook
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a className="mx-btn is-outline is-sm tap" href={`/api/meetings/${meetingId}/calendar`} download>
              <DownloadSimple size={16} aria-hidden="true" />
              Download .ics
            </a>
          </div>
        ) : (
          <p className="iv-hint">This meeting has no time yet. Once it has one, it can go on any calendar.</p>
        )}
      </div>

      {/* Invite: the host, the creator, or an admin. */}
      {!d.can_invite ? (
        <p className="iv-note">
          <EnvelopeSimple size={16} aria-hidden="true" />
          Only the host can email invitations. Share the link above with anyone in this workspace.
        </p>
      ) : (
        <div className="iv-block iv-invite">
          <div className="iv-row">
            <h3 className="iv-sub" id={`${ids}-inv`}>
              Invitations
            </h3>
            {resendable.length > 1 && !notConfigured ? (
              <button
                type="button"
                className="mx-btn is-ghost is-sm tap"
                disabled={busy !== null}
                aria-busy={busy === "all" || undefined}
                onClick={() => void send(resendable.map((i) => i.user_id as string), "all", false)}
              >
                <ArrowClockwise size={16} aria-hidden="true" />
                {busy === "all" ? "Resending..." : "Resend to everyone"}
              </button>
            ) : null}
          </div>

          {notConfigured ? (
            <div className="iv-warn" role="note">
              <WarningCircle size={18} weight="fill" aria-hidden="true" />
              <p>
                <strong>Email isn&rsquo;t set up for this workspace yet.</strong> Copy the link or download the calendar file
                to share it. A workspace admin can connect email for the server.
              </p>
            </div>
          ) : d.email_configured === null ? (
            <p className="iv-hint">We couldn&rsquo;t check the email service just now. You can still try to send.</p>
          ) : null}

          {reloading ? (
            bones()
          ) : d.items.length === 0 ? (
            <p className="iv-empty">No one has been emailed yet. Invite people and they get the time, the agenda and a Join button.</p>
          ) : (
            <ul className="iv-list" aria-labelledby={`${ids}-inv`}>
              {d.items.map((inv) => {
                const when = ago(inv.sent_at ?? inv.updated_at, now);
                const name = inv.name ?? inv.email;
                return (
                  <li key={inv.id} className="iv-item">
                    <Avatar name={name} id={inv.email} size="sm" />
                    <span className="iv-who">
                      <strong>{name}</strong>
                      <small>
                        {inv.status === "failed" ? failureText(inv.last_error) : inv.email}
                        {inv.status === "sent" && when ? `, ${when}` : ""}
                      </small>
                    </span>
                    <Chip tone={tone(inv)}>{statusLabel(inv)}</Chip>
                    {inv.user_id && !notConfigured ? (
                      <button
                        type="button"
                        className="mx-btn is-ghost is-sm tap iv-act"
                        disabled={busy !== null}
                        aria-busy={busy === inv.id || undefined}
                        aria-label={`${inv.status === "failed" ? "Retry" : "Resend"} invitation to ${name}`}
                        onClick={() => void send([inv.user_id as string], inv.id, false)}
                      >
                        {busy === inv.id ? "Sending..." : inv.status === "failed" ? "Retry" : "Resend"}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {composing ? (
            <div className="iv-compose" role="group" aria-labelledby={`${ids}-compose`}>
              <h4 id={`${ids}-compose`} className="sr-only">
                Invite people by email
              </h4>
              <MemberPicker
                members={pickable}
                selected={picked}
                onChange={(next) => {
                  setPicked(next.slice(0, INVITE_LIMITS.maxRecipients));
                  setFormError(null);
                }}
                emptyHint="Everyone in this workspace has been invited."
                disabled={busy !== null}
              />
              <label htmlFor={`${ids}-note`} className="iv-label">
                Note <small className="iv-optional">Optional</small>
              </label>
              <textarea
                id={`${ids}-note`}
                className="nm-input iv-note-input"
                rows={3}
                maxLength={INVITE_LIMITS.messageMax}
                value={note}
                placeholder="Bring the Q1 numbers, we'll decide on pricing."
                aria-describedby={`${ids}-note-count`}
                disabled={busy !== null}
                onChange={(e) => setNote(e.target.value)}
              />
              <small id={`${ids}-note-count`} className="iv-count">
                {note.length} of {INVITE_LIMITS.messageMax}
              </small>
              {formError ? (
                <p className="iv-form-error" role="alert">
                  <WarningCircle size={16} weight="fill" aria-hidden="true" />
                  {formError}
                </p>
              ) : null}
              <div className="iv-compose-acts">
                <button
                  type="button"
                  className="mx-btn is-ghost is-sm tap"
                  disabled={busy !== null}
                  onClick={() => {
                    refocus.current = true;
                    setComposing(false);
                    setFormError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="mx-btn is-sm tap"
                  disabled={busy !== null || picked.length === 0}
                  aria-busy={busy === "form" || undefined}
                  onClick={() => void send(picked, "form", true)}
                >
                  <PaperPlaneTilt size={16} weight="fill" aria-hidden="true" />
                  {busy === "form"
                    ? "Sending..."
                    : notConfigured
                      ? picked.length > 1
                        ? `Add ${picked.length} people`
                        : "Add to meeting"
                      : picked.length > 1
                        ? `Send ${picked.length} invites`
                        : "Send invite"}
                </button>
              </div>
            </div>
          ) : (
            <button
              ref={openerRef}
              type="button"
              className="mx-btn is-outline is-sm tap iv-open"
              onClick={() => {
                setComposing(true);
                setPicked([]);
                setFormError(null);
              }}
            >
              <EnvelopeSimple size={16} aria-hidden="true" />
              {notConfigured ? "Add people" : "Invite by email"}
            </button>
          )}
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </CardFrame>
  );
}

function CardFrame({ ids, children }: { ids: string; children: React.ReactNode }) {
  return (
    <section className="mx-card mx-card-pad iv-card" aria-labelledby={`${ids}-h`}>
      <div className="mx-card-head">
        <h2 className="mx-card-title" id={`${ids}-h`}>
          Invite and share
        </h2>
      </div>
      {children}
    </section>
  );
}

function bones() {
  return (
    <ul className="iv-list" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="iv-item">
          <span className="iv-bone iv-bone-av" />
          <span className="iv-who">
            <span className="iv-bone" style={{ width: i % 2 ? "58%" : "72%" }} />
            <span className="iv-bone is-thin" style={{ width: "44%" }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
