"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowClockwise, FilmSlate, Scissors, VideoCameraSlash } from "@phosphor-icons/react";
import { loadClips, loadRecording } from "@/app/actions/recording";
import { Chip } from "@/components/meetings/Chip";
import { ClipComposer } from "./ClipComposer";
import { ClipsList } from "./ClipsList";
import { RecordingPlayer, type PlayerHandle } from "./RecordingPlayer";
import { RecordingTranscript } from "./RecordingTranscript";
import {
  RECORDING_POLL_MS,
  clipHasVideo,
  lengthLabel,
  offRecordSpans,
  playableSegments,
  stateView,
  suggestTitle,
  timelineGaps,
  type Clip,
  type ClipList,
  type Line,
  type OffRecordSpan,
  type Read,
  type RecordingState,
  type Span,
} from "./recording-model";

/* The Recording card on an ended meeting's page (polish wave 3): the recording beside its
   transcript, and the meeting's clips.

   - Ready: the player (on the meeting's clock, skipping the stretches that were off the record)
     with the transcript beside it: click a line to play from it, the line playing now is
     highlighted, captions come from the same transcript.
   - Not ready: a calm panel where the player would be ("Recording is off for this workspace",
     "being processed" (checked again every 15 seconds), "could not be saved", "no recording
     because not everyone agreed"). The transcript and clips still work: a clip is a span of the
     meeting, and its share page always shows its words.
   - Clips: select lines (or the scissors on one line, or set start and end at the playhead), name
     it, save; then play, share (words, and the video when there is one) or delete it. */

const MAX_POLL_MS = 30 * 60_000;

export function RecordingSection({
  meetingId,
  meetingTitle,
  initial,
  initialClips,
  lines,
  offRecord: rawOffRecord,
  isHost,
  confidential,
}: {
  meetingId: string;
  meetingTitle: string;
  initial: Read<RecordingState>;
  initialClips: Read<ClipList>;
  lines: Line[];
  offRecord: OffRecordSpan[];
  isHost: boolean;
  confidential: boolean;
}) {
  const ids = useId();
  const player = useRef<PlayerHandle>(null);
  const started = useRef(Date.now());
  const [read, setRead] = useState<Read<RecordingState>>(initial);
  const [clipsRead, setClipsRead] = useState<Read<ClipList>>(initialClips);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ span: Span; title: string } | null>(null);
  const [draftSpan, setDraftSpan] = useState<Span | null>(null);
  const [shown, setShown] = useState<Span | null>(null);
  const [checking, setChecking] = useState(false);

  const state = read.ok ? read.data : null;
  const view = state ? stateView(state) : null;
  const segments = useMemo(() => (state ? playableSegments(state) : []), [state]);
  const lastMs = Math.max(lines[lines.length - 1]?.endMs ?? 0, segments[segments.length - 1]?.endMs ?? 0);
  const offRecord = useMemo(() => offRecordSpans(rawOffRecord, lastMs), [rawOffRecord, lastMs]);
  const gaps = useMemo(() => timelineGaps(segments, offRecord), [segments, offRecord]);
  const canPlay = view?.kind === "player" && segments.length > 0;
  const urlsExpireAt = state?.url_expires_at ? new Date(state.url_expires_at).getTime() : null;

  // The playhead starts where the recording does, so "Set to playhead" works before playing.
  const firstMs = segments[0]?.startMs ?? null;
  useEffect(() => {
    if (canPlay && firstMs !== null) setPlayhead((p) => (p === null ? firstMs : p));
  }, [canPlay, firstMs]);

  const refresh = useCallback(async () => {
    setChecking(true);
    const next = await loadRecording(meetingId);
    setChecking(false);
    setRead((prev) => (next.ok || !prev.ok ? next : prev));
    return next;
  }, [meetingId]);

  useEffect(() => {
    if (!view?.poll || Date.now() - started.current > MAX_POLL_MS) return;
    const t = window.setTimeout(() => void refresh(), RECORDING_POLL_MS);
    return () => window.clearTimeout(t);
  }, [view?.poll, read, refresh]);

  const freshSegments = useCallback(async () => {
    const next = await refresh();
    return next.ok ? playableSegments(next.data) : null;
  }, [refresh]);

  const seek = (ms: number) => {
    setShown(null);
    if (canPlay) player.current?.seek(ms, { play: true });
    else setPlayhead(ms);
  };

  const startClip = (span: Span, fromIndex: number) => {
    setDraft({ span, title: suggestTitle(lines[fromIndex]?.text ?? "") || "Clip" });
  };

  const newClipFromPlayhead = () => {
    const at = playhead ?? lines[0]?.startMs ?? 0;
    const firstLine = lines.findIndex((l) => l.endMs > at);
    setDraft({ span: { startMs: at, endMs: at + 30_000 }, title: suggestTitle(lines[Math.max(0, firstLine)]?.text ?? "") || "Clip" });
  };

  const clips = clipsRead.ok ? clipsRead.data.items : [];
  const setClips = (items: Clip[]) =>
    setClipsRead((prev) => (prev.ok ? { ok: true, data: { ...prev.data, items } } : { ok: true, data: { items, max_duration_ms: 600_000 } }));

  const highlight = draftSpan ?? shown;
  const totalReady = state?.duration_ms ?? 0;

  return (
    <section className="mx-card rec" aria-labelledby={`${ids}-h`}>
      <header className="rec-head">
        <div className="rec-head-text">
          <h2 className="rec-title" id={`${ids}-h`}>
            Recording
          </h2>
          <p className="rec-lead">
            {canPlay
              ? "Watch the call with its transcript beside it, and save the moments worth sharing as clips."
              : "The call's transcript, and clips of the moments worth sharing."}
          </p>
        </div>
        <div className="rec-head-meta">
          {canPlay && totalReady > 0 ? <Chip>{lengthLabel(totalReady)}</Chip> : null}
          {gaps.some((g) => g.kind === "off_record") ? <Chip tone="low">Off the record parts skipped</Chip> : null}
          {lines.length > 0 ? (
            <button type="button" className="mx-btn is-outline tap" onClick={newClipFromPlayhead}>
              <Scissors size={18} aria-hidden="true" />
              New clip
            </button>
          ) : null}
        </div>
      </header>

      <div className={`rec-body${canPlay ? "" : " is-quiet"}`}>
        <div className="rec-main">
          {!read.ok ? (
            <div className="rec-panel" role="alert">
              <VideoCameraSlash size={26} aria-hidden="true" />
              <div>
                <p className="rec-panel-title">The recording could not be loaded</p>
                <p className="rec-panel-body">Nothing is wrong with it. This is usually a passing problem reaching the workspace.</p>
                <button type="button" className="mx-btn is-outline is-sm tap" onClick={() => void refresh()} disabled={checking} aria-busy={checking}>
                  <ArrowClockwise size={16} aria-hidden="true" />
                  {checking ? "Checking..." : "Try again"}
                </button>
              </div>
            </div>
          ) : canPlay ? (
            <RecordingPlayer
              ref={player}
              segments={segments}
              gaps={gaps}
              lines={lines}
              title={meetingTitle}
              onTime={setPlayhead}
              onRefresh={freshSegments}
              urlsExpireAt={urlsExpireAt}
            />
          ) : view ? (
            <div className={`rec-panel is-${view.kind}`} role={view.kind === "working" ? "status" : undefined}>
              {view.kind === "working" ? (
                <svg className="rec-panel-line" viewBox="0 0 72 24" aria-hidden="true">
                  <path d="M2 18 C 14 4, 26 4, 36 12 S 58 22, 70 6" pathLength={1} />
                </svg>
              ) : state?.status === "not_enabled" || state?.status === "none" ? (
                <FilmSlate size={26} aria-hidden="true" />
              ) : (
                <VideoCameraSlash size={26} aria-hidden="true" />
              )}
              <div>
                <p className="rec-panel-title">{view.title}</p>
                <p className="rec-panel-body">{view.body}</p>
                {view.poll ? (
                  <button type="button" className="mx-btn is-outline is-sm tap" onClick={() => void refresh()} disabled={checking} aria-busy={checking}>
                    <ArrowClockwise size={16} aria-hidden="true" />
                    {checking ? "Checking..." : "Check now"}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className="rec-side">
          <RecordingTranscript
            lines={lines}
            offRecord={offRecord}
            playheadMs={playhead}
            canPlay={canPlay}
            highlight={highlight}
            onSeek={seek}
            onClipSpan={startClip}
          />
        </div>
      </div>

      <div className="rec-clips-wrap">
        <div className="rec-clips-col">
          <h3 className="rec-sub">
            Clips
            {clips.length > 0 ? <span className="rec-count">{clips.length}</span> : null}
          </h3>
          {!clipsRead.ok && clipsRead.reason === "error" ? (
            <div className="rec-inline-err" role="alert">
              <p>The clips could not be loaded right now.</p>
              <button
                type="button"
                className="mx-btn is-outline is-sm tap"
                onClick={async () => {
                  const next = await loadClips(meetingId);
                  setClipsRead(next);
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <ClipsList
              meetingId={meetingId}
              clips={clips}
              isHost={isHost}
              confidential={confidential}
              hasVideo={(span) => canPlay && clipHasVideo(segments, span)}
              onPlay={(span) => {
                setShown(span);
                player.current?.playSpan(span);
              }}
              onShow={(span) => {
                setShown(span);
                setPlayhead(span.startMs);
              }}
              onChange={setClips}
            />
          )}
        </div>
        {draft ? (
          <div className="rec-compose-col">
            <ClipComposer
              meetingId={meetingId}
              initial={draft}
              offRecord={offRecord}
              playheadMs={playhead}
              canPlay={canPlay}
              onPreview={(span) => player.current?.playSpan(span)}
              onSpan={setDraftSpan}
              onSaved={(clip) => {
                setClips([...clips, { ...clip, share_links: clip.share_links ?? [] }].sort((a, b) => a.start_ms - b.start_ms));
                setDraft(null);
                setDraftSpan(null);
              }}
              onCancel={() => {
                setDraft(null);
                setDraftSpan(null);
                player.current?.stopSpan();
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
