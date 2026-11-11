"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Eye, FilmStrip, LinkSimple, LockSimple, Play, ShareNetwork, Trash } from "@phosphor-icons/react";
import { deleteClip, revokeClipLink, shareClip } from "@/app/actions/recording";
import { Chip } from "@/components/meetings/Chip";
import { MinutesDialog } from "@/components/minutes/MinutesDialog";
import { EXPIRY_CHOICES, expiryLabel, linkState, viewsLabel } from "@/components/minutes/minutes-model";
import { notifyError, notifySuccess } from "@/lib/toast";
import {
  CLIP_FAILURE_COPY,
  clock,
  lengthLabel,
  type Clip,
  type ClipShareLink,
  type Span,
} from "./recording-model";

/* The meeting's clips: play one (or show its lines when there is no video), copy or create its
   share link, delete it. A share link shows the clip's words always and its video only when the
   sharer ticks "Include the video" (offered only when the clip sits inside the recording). A
   confidential meeting's clips are shared only by its host, who confirms it on purpose. */

export function ClipsList({
  meetingId,
  clips,
  isHost,
  confidential,
  hasVideo,
  onPlay,
  onShow,
  onChange,
}: {
  meetingId: string;
  clips: Clip[];
  isHost: boolean;
  confidential: boolean;
  /** whether a clip's span can be played (and its video shared) */
  hasVideo: (span: Span) => boolean;
  onPlay: (span: Span) => void;
  onShow: (span: Span) => void;
  onChange: (next: Clip[]) => void;
}) {
  const opener = useRef<HTMLButtonElement | null>(null);
  const [sharing, setSharing] = useState<Clip | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [days, setDays] = useState<number>(30);
  const [withVideo, setWithVideo] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keepRef = useRef<HTMLButtonElement | null>(null);
  // Asking "Delete this clip?" moves focus to the safe answer.
  useEffect(() => {
    if (confirmDelete) keepRef.current?.focus();
  }, [confirmDelete]);

  const blocked = confidential && !isHost;
  const live = (c: Clip) => (c.share_links ?? []).filter((l) => l.state === "active");

  const replace = (clip: Clip) => onChange(clips.map((c) => (c.id === clip.id ? clip : c)));

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notifySuccess("Link copied");
    } catch {
      notifyError("Could not copy the link", { description: url });
    }
  };

  const open = (clip: Clip, button: HTMLButtonElement) => {
    opener.current = button;
    setSharing(clip);
    setError(null);
    setConfirmed(false);
    setNeedsConfirm(false);
    setWithVideo(false);
  };
  const close = () => {
    setSharing(null);
    opener.current?.focus();
  };

  const create = async () => {
    if (!sharing) return;
    if (confidential && !confirmed) {
      setNeedsConfirm(true);
      setError("Confirm that you want to publish a clip of this confidential meeting.");
      return;
    }
    setBusy("create");
    setError(null);
    const res = await shareClip(meetingId, sharing.id, {
      expiresInDays: days,
      includeVideo: withVideo,
      confirmConfidential: confirmed,
    });
    setBusy(null);
    if (!res.ok) {
      if (res.failure === "confirm") {
        setNeedsConfirm(true);
        setError("Confirm that you want to publish a clip of this confidential meeting.");
      } else {
        setError(CLIP_FAILURE_COPY[res.failure]);
      }
      return;
    }
    const next = { ...sharing, share_links: [res.link, ...(sharing.share_links ?? [])] };
    setSharing(next);
    replace(next);
    try {
      await navigator.clipboard.writeText(res.link.url);
      notifySuccess("Clip link created", { description: "Copied to your clipboard." });
    } catch {
      notifySuccess("Clip link created");
    }
  };

  const revoke = async (clip: Clip, link: ClipShareLink) => {
    setBusy(link.id);
    const res = await revokeClipLink(meetingId, link.id);
    setBusy(null);
    if (!res.ok) {
      notifyError("Could not turn the link off", { retry: () => void revoke(clip, link) });
      return;
    }
    const next = {
      ...clip,
      share_links: (clip.share_links ?? []).map((l) => (l.id === link.id ? { ...l, state: "revoked" as const, can_revoke: false } : l)),
    };
    if (sharing?.id === clip.id) setSharing(next);
    replace(next);
    notifySuccess("Link turned off", { description: "Anyone opening it now sees that it was turned off." });
  };

  const remove = async (clip: Clip) => {
    setBusy(clip.id);
    const res = await deleteClip(meetingId, clip.id);
    setBusy(null);
    setConfirmDelete(null);
    if (!res.ok) {
      notifyError("Could not delete the clip", { retry: () => void remove(clip) });
      return;
    }
    onChange(clips.filter((c) => c.id !== clip.id));
    notifySuccess("Clip deleted", { description: "Its links stopped working too." });
  };

  if (clips.length === 0) {
    return (
      <p className="rec-quiet rec-clips-empty">
        No clips yet. Select lines in the transcript, or use the scissors on a line, to save a moment worth sharing.
      </p>
    );
  }

  const sharingVideo = sharing ? hasVideo({ startMs: sharing.start_ms, endMs: sharing.end_ms }) : false;

  return (
    <>
      <ul className="rec-clips">
        {clips.map((c) => {
          const span = { startMs: c.start_ms, endMs: c.end_ms };
          const video = hasVideo(span);
          const active = live(c);
          return (
            <li key={c.id} className="rec-clip">
              <div className="rec-clip-main">
                <span className="rec-clip-title">{c.title}</span>
                <span className="rec-clip-meta">
                  <span>
                    {clock(c.start_ms)} to {clock(c.end_ms)}, {lengthLabel(c.duration_ms)}
                  </span>
                  {c.created_by_name ? <span>By {c.created_by_name}</span> : null}
                  {active.length > 0 ? (
                    <Chip tone="ok">
                      {active.length} active {active.length === 1 ? "link" : "links"}
                    </Chip>
                  ) : null}
                </span>
              </div>
              {confirmDelete === c.id ? (
                <div className="rec-clip-acts" role="group" aria-label={`Delete ${c.title}?`}>
                  <span className="rec-confirm-q">Delete this clip and its links?</span>
                  <button
                    type="button"
                    className="mx-btn is-sm tap rec-danger-solid"
                    onClick={() => void remove(c)}
                    disabled={busy === c.id}
                    aria-busy={busy === c.id}
                  >
                    {busy === c.id ? "Deleting..." : "Delete"}
                  </button>
                  <button type="button" className="mx-btn is-outline is-sm tap" onClick={() => setConfirmDelete(null)} ref={keepRef}>
                    Keep
                  </button>
                </div>
              ) : (
                <div className="rec-clip-acts">
                  {video ? (
                    <button type="button" className="mx-btn is-outline is-sm tap" onClick={() => onPlay(span)} aria-label={`Play ${c.title}`}>
                      <Play size={16} weight="fill" aria-hidden="true" />
                      Play
                    </button>
                  ) : (
                    <button type="button" className="mx-btn is-outline is-sm tap" onClick={() => onShow(span)} aria-label={`Show the lines of ${c.title}`}>
                      <FilmStrip size={16} aria-hidden="true" />
                      Show lines
                    </button>
                  )}
                  {active[0] ? (
                    <button
                      type="button"
                      className="mx-btn is-outline is-sm tap"
                      onClick={() => void copy(active[0].url)}
                      aria-label={`Copy the link to ${c.title}`}
                    >
                      <Copy size={16} aria-hidden="true" />
                      Copy link
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="mx-btn is-outline is-sm tap"
                    onClick={(e) => open(c, e.currentTarget)}
                    aria-label={`Share ${c.title}`}
                  >
                    <ShareNetwork size={16} aria-hidden="true" />
                    Share
                  </button>
                  {c.can_delete ? (
                    <button
                      type="button"
                      className="rec-btn is-quiet tap rec-danger"
                      onClick={() => setConfirmDelete(c.id)}
                      aria-label={`Delete ${c.title}`}
                    >
                      <Trash size={18} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <MinutesDialog
        open={!!sharing}
        onClose={close}
        title="Share this clip"
        wide
        lead={
          sharing
            ? `"${sharing.title}", ${clock(sharing.start_ms)} to ${clock(sharing.end_ms)}. Anyone with the link sees what was said in it${sharingVideo ? ", and the video if you include it" : ""}. Nothing else from the meeting is on the page.`
            : undefined
        }
        initialFocus={blocked ? ".mn-dialog-x" : "input[name='rec-expiry']:checked"}
        actions={
          <>
            <button type="button" className="mx-btn is-outline tap" onClick={close} disabled={busy === "create"}>
              Done
            </button>
            {!blocked ? (
              <button type="button" className="mx-btn tap" onClick={() => void create()} disabled={busy === "create"} aria-busy={busy === "create"}>
                <LinkSimple size={18} weight="bold" aria-hidden="true" />
                {busy === "create" ? "Creating link..." : "Create link"}
              </button>
            ) : null}
          </>
        }
      >
        {blocked ? (
          <div className="mn-note is-quiet" role="note">
            <LockSimple size={18} aria-hidden="true" />
            <p>
              <strong>This meeting is confidential.</strong> Only its host can share clips from it.
            </p>
          </div>
        ) : (
          <>
            <fieldset className="mn-field">
              <legend>Link works for</legend>
              <div className="mn-seg">
                {EXPIRY_CHOICES.map((c) => (
                  <label key={c.days} className={`mn-seg-opt${days === c.days ? " is-on" : ""}`}>
                    <input type="radio" name="rec-expiry" value={c.days} checked={days === c.days} onChange={() => setDays(c.days)} />
                    {c.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className={`mn-check rec-video-opt${sharingVideo ? "" : " is-off"}`}>
              <input type="checkbox" checked={withVideo && sharingVideo} disabled={!sharingVideo} onChange={(e) => setWithVideo(e.target.checked)} />
              <span>
                Include the video
                <small>
                  {sharingVideo
                    ? "Only this clip is shared, never the rest of the recording. The link to the video itself lasts minutes."
                    : "There is no recording of this span, so the page shows the words only."}
                </small>
              </span>
            </label>
            {confidential ? (
              <div className={`mn-note${needsConfirm ? " is-attn" : ""}`} role="group" aria-label="Confidential meeting">
                <LockSimple size={18} aria-hidden="true" />
                <div>
                  <p>
                    <strong>This meeting is confidential.</strong> Publishing puts this clip on a page anyone with the link can open.
                  </p>
                  <label className="mn-check">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                    <span>I want to publish a clip of this confidential meeting</span>
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
        {sharing ? (
          <section aria-labelledby="rec-links-h" className="mn-links">
            <h3 id="rec-links-h" className="mn-sub">
              Links to this clip
            </h3>
            {(sharing.share_links ?? []).length === 0 ? (
              <p className="mn-quiet">No links yet. Create one above, then send it to anyone who needs this moment.</p>
            ) : (
              <ul className="mn-link-list">
                {(sharing.share_links ?? []).map((l) => {
                  const st = linkState(l);
                  const on = l.state === "active";
                  return (
                    <li key={l.id} className={on ? "" : "is-off"}>
                      <div className="mn-link-main">
                        <span className="mn-link-url" title={l.url}>
                          {l.url.replace(/^https?:\/\//, "")}
                        </span>
                        <span className="mn-link-meta">
                          <Chip tone={st.tone}>{st.label}</Chip>
                          {l.include_video ? <Chip tone="low">With video</Chip> : <Chip>Words only</Chip>}
                          {on ? <span>{expiryLabel(l.expires_at)}</span> : null}
                          <span>
                            <Eye size={14} aria-hidden="true" /> {viewsLabel(l.view_count)}
                          </span>
                        </span>
                      </div>
                      <div className="mn-link-acts">
                        {on ? (
                          <button type="button" className="mx-btn is-outline is-sm tap" onClick={() => void copy(l.url)} aria-label={`Copy link ${l.url}`}>
                            <Copy size={16} aria-hidden="true" />
                            Copy
                          </button>
                        ) : null}
                        {on && l.can_revoke ? (
                          <button
                            type="button"
                            className="mx-btn is-outline is-sm tap mn-danger"
                            onClick={() => void revoke(sharing, l)}
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
        ) : null}
      </MinutesDialog>
    </>
  );
}
