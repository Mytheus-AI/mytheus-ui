"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Info } from "@phosphor-icons/react";
import {
  captionsVtt,
  clipLines,
  clipVideoCopy,
  clock,
  currentLineIndex,
  spokenClock,
  type ClipShare,
} from "@/components/recording/recording-model";

/* A shared clip on its public page: the clip's video (when the sharer included it and it is
   ready) with the browser's own accessible controls and captions made from the clip's words, and
   the words themselves beside it. With video, each line's time plays from there and the line
   playing now is highlighted; without it, the page reads as a short transcript. */

export function ClipPlayer({ clip }: { clip: ClipShare }) {
  const ids = useId();
  const video = useRef<HTMLVideoElement>(null);
  const [ms, setMs] = useState<number | null>(null);
  const lines = useMemo(() => clipLines(clip), [clip]);
  const playable = clip.video.status === "ready" && !!clip.video.url;
  const note = clipVideoCopy(clip.video);
  const audio = clip.video.media_type === "audio/ogg";

  const vttUrl = useMemo(() => {
    if (!playable || typeof URL === "undefined" || typeof Blob === "undefined") return null;
    return URL.createObjectURL(new Blob([captionsVtt(lines, { startMs: 0, endMs: clip.duration_ms })], { type: "text/vtt" }));
  }, [playable, lines, clip.duration_ms]);
  useEffect(() => () => (vttUrl ? URL.revokeObjectURL(vttUrl) : undefined), [vttUrl]);

  const current = ms === null ? -1 : currentLineIndex(lines, ms);
  const seek = (at: number) => {
    const el = video.current;
    if (!el) return;
    el.currentTime = at / 1000;
    void el.play().catch(() => undefined);
  };

  return (
    <div className={`sh-clip${playable ? "" : " is-words"}`}>
      {playable ? (
        <div className={`sh-clip-video${audio ? " is-audio" : ""}`}>
          <video
            ref={video}
            src={clip.video.url ?? undefined}
            controls
            preload="metadata"
            playsInline
            onTimeUpdate={(e) => setMs(e.currentTarget.currentTime * 1000)}
            aria-label={`Clip: ${clip.title}`}
          >
            {vttUrl ? <track kind="captions" srcLang="en" label="Captions" src={vttUrl} default /> : null}
          </video>
        </div>
      ) : null}
      <section aria-labelledby={`${ids}-h`}>
        <h2 className="sh-sec-title" id={`${ids}-h`}>
          What was said
        </h2>
        {note ? (
          <p className="sh-clip-note" role="note">
            <Info size={18} aria-hidden="true" />
            {note}
          </p>
        ) : null}
        {lines.length === 0 ? (
          <p className="sh-empty">Nobody spoke in this part of the meeting.</p>
        ) : (
          <ol className="sh-clip-lines">
            {lines.map((l, i) => (
              <li key={l.id} className={`sh-clip-line${i === current ? " is-current" : ""}`} aria-current={i === current ? "true" : undefined}>
                {playable ? (
                  <button
                    type="button"
                    className="sh-clip-time"
                    onClick={() => seek(l.startMs)}
                    aria-label={`Play from ${spokenClock(l.startMs)}, ${l.speaker}`}
                  >
                    {clock(l.startMs)}
                  </button>
                ) : (
                  <span className="sh-clip-time">{clock(l.startMs)}</span>
                )}
                <div>
                  <p className="sh-clip-who">{l.speaker}</p>
                  <p className="sh-clip-text">{l.text}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
