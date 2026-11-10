"use client";

import { useRef, useState } from "react";
import { Copy, Eye, LinkSimple, LockSimple, ShareNetwork } from "@phosphor-icons/react";
import { createRecapLink, loadShareLinks, revokeShareLink } from "@/app/actions/minutes";
import { Chip } from "@/components/meetings/Chip";
import { notifyError, notifySuccess } from "@/lib/toast";
import type { Read } from "@/lib/api/minutes";
import { MinutesDialog } from "./MinutesDialog";
import {
  EXPIRY_CHOICES,
  SHARE_FAILURE_COPY,
  expiryLabel,
  linkState,
  viewsLabel,
  type ShareLink,
} from "./minutes-model";

/* "Share recap": a public, read-only page of the meeting's recap (the shared minutes and what
   was confirmed; never anyone's personal minutes or promises). Anyone who was in the meeting can
   create one; a confidential meeting only by its host, after confirming it on purpose. Links
   expire, show how often they were opened, and can be turned off at once. */

export function ShareRecap({
  meetingId,
  initialLinks,
  isHost,
  confidential,
}: {
  meetingId: string;
  initialLinks: Read<ShareLink[]>;
  isHost: boolean;
  confidential: boolean;
}) {
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<Read<ShareLink[]>>(initialLinks);
  const [days, setDays] = useState<number>(30);
  const [confirmed, setConfirmed] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const blocked = confidential && !isHost;
  const mustConfirm = confidential && isHost;
  const active = links.ok ? links.data.filter((l) => l.state === "active") : [];

  const close = () => {
    if (busy) return;
    setOpen(false);
    opener.current?.focus();
  };

  const refresh = async () => {
    const next = await loadShareLinks(meetingId);
    if (next.ok || !links.ok) setLinks(next);
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notifySuccess("Link copied");
    } catch {
      notifyError("Could not copy the link", { description: url });
    }
  };

  const create = async () => {
    if (mustConfirm && !confirmed) {
      setNeedsConfirm(true);
      setError("Confirm that you want to publish this confidential meeting's recap.");
      return;
    }
    setBusy("create");
    setError(null);
    const res = await createRecapLink(meetingId, { expiresInDays: days, confirmConfidential: mustConfirm && confirmed });
    setBusy(null);
    if (!res.ok) {
      if (res.failure === "confirm") {
        setNeedsConfirm(true);
        setError("This meeting is confidential. Confirm below to publish its recap.");
        return;
      }
      setError(SHARE_FAILURE_COPY[res.failure]);
      return;
    }
    setLinks((prev) => ({ ok: true, data: [res.link, ...(prev.ok ? prev.data : [])] }));
    setConfirmed(false);
    try {
      await navigator.clipboard.writeText(res.link.url);
      notifySuccess("Recap link created", { description: "Copied to your clipboard." });
    } catch {
      notifySuccess("Recap link created");
    }
  };

  const revoke = async (link: ShareLink) => {
    setBusy(link.id);
    const res = await revokeShareLink(meetingId, link.id);
    setBusy(null);
    if (!res.ok) {
      notifyError("Could not turn the link off", { retry: () => void revoke(link) });
      return;
    }
    setLinks((prev) =>
      prev.ok ? { ok: true, data: prev.data.map((l) => (l.id === link.id ? { ...l, state: "revoked", can_revoke: false } : l)) } : prev,
    );
    notifySuccess("Link turned off", { description: "Anyone opening it now sees that it was turned off." });
  };

  return (
    <>
      <button
        ref={opener}
        type="button"
        className="mx-btn is-outline tap"
        onClick={() => {
          setError(null);
          setNeedsConfirm(false);
          setConfirmed(false);
          setOpen(true);
          void refresh();
        }}
      >
        <ShareNetwork size={18} weight="bold" aria-hidden="true" />
        Share recap
        {active.length > 0 ? (
          <>
            <span className="mn-count" aria-hidden="true">
              {active.length}
            </span>
            <span className="sr-only">
              , {active.length} active {active.length === 1 ? "link" : "links"}
            </span>
          </>
        ) : null}
      </button>

      <MinutesDialog
        open={open}
        onClose={close}
        title="Share the recap"
        wide
        lead="Anyone with the link can read the shared minutes and what was confirmed. Personal minutes, promises, notes and the transcript are never on it."
        initialFocus={blocked ? ".mn-dialog-x" : "input[name='mn-expiry']:checked"}
        actions={
          <>
            <button type="button" className="mx-btn is-outline tap" onClick={close} disabled={!!busy}>
              Done
            </button>
            {!blocked ? (
              <button type="button" className="mx-btn tap" onClick={create} disabled={!!busy} aria-busy={busy === "create"}>
                <LinkSimple size={18} weight="bold" aria-hidden="true" />
                {busy === "create" ? "Creating link..." : mustConfirm ? "Publish recap link" : "Create link"}
              </button>
            ) : null}
          </>
        }
      >
        {blocked ? (
          <div className="mn-note is-quiet" role="note">
            <LockSimple size={18} aria-hidden="true" />
            <p>
              <strong>This meeting is confidential.</strong> Only its host can publish a recap. Ask them if people outside the
              meeting need it.
            </p>
          </div>
        ) : (
          <>
            <fieldset className="mn-field">
              <legend>Link works for</legend>
              <div className="mn-seg">
                {EXPIRY_CHOICES.map((c) => (
                  <label key={c.days} className={`mn-seg-opt${days === c.days ? " is-on" : ""}`}>
                    <input
                      type="radio"
                      name="mn-expiry"
                      value={c.days}
                      checked={days === c.days}
                      onChange={() => setDays(c.days)}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </fieldset>
            {mustConfirm ? (
              <div className={`mn-note${needsConfirm ? " is-attn" : ""}`} role="group" aria-label="Confidential meeting">
                <LockSimple size={18} aria-hidden="true" />
                <div>
                  <p>
                    <strong>This meeting is confidential.</strong> Publishing puts its shared minutes and confirmed outcome on a
                    page anyone with the link can open.
                  </p>
                  <label className="mn-check">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                    <span>I want to publish this confidential meeting&rsquo;s recap</span>
                  </label>
                </div>
              </div>
            ) : null}
          </>
        )}
        {error ? (
          <p className="mh-new-error" role="alert">
            {error}
          </p>
        ) : null}

        <section aria-labelledby="mn-links-h" className="mn-links">
          <h3 id="mn-links-h" className="mn-sub">
            Links for this meeting
          </h3>
          {!links.ok ? (
            <p className="mn-quiet">
              {links.reason === "error" ? "The links could not be loaded right now." : "No links you can see yet."}
            </p>
          ) : links.data.length === 0 ? (
            <p className="mn-quiet">No links yet. Create one above, then send it to anyone who needs the recap.</p>
          ) : (
            <ul className="mn-link-list">
              {links.data.map((l) => {
                const st = linkState(l);
                const live = l.state === "active";
                return (
                  <li key={l.id} className={live ? "" : "is-off"}>
                    <div className="mn-link-main">
                      <span className="mn-link-url" title={l.url}>
                        {l.url.replace(/^https?:\/\//, "")}
                      </span>
                      <span className="mn-link-meta">
                        <Chip tone={st.tone}>{st.label}</Chip>
                        {live ? <span>{expiryLabel(l.expires_at)}</span> : null}
                        <span>
                          <Eye size={14} aria-hidden="true" /> {viewsLabel(l.view_count)}
                        </span>
                        {l.created_by_name ? <span>By {l.created_by_name}</span> : null}
                      </span>
                    </div>
                    <div className="mn-link-acts">
                      {live ? (
                        <button
                          type="button"
                          className="mx-btn is-outline is-sm tap"
                          onClick={() => void copy(l.url)}
                          aria-label={`Copy link ${l.url}`}
                        >
                          <Copy size={16} aria-hidden="true" />
                          Copy
                        </button>
                      ) : null}
                      {live && l.can_revoke ? (
                        <button
                          type="button"
                          className="mx-btn is-outline is-sm tap mn-danger"
                          onClick={() => void revoke(l)}
                          disabled={busy === l.id}
                          aria-busy={busy === l.id}
                        >
                          {busy === l.id ? "Turning off..." : "Turn off"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </MinutesDialog>
    </>
  );
}
