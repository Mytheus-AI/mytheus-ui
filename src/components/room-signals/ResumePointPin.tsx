"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowBendDownRight, ArrowCounterClockwise, BookmarkSimple, CaretDown, Pause, Play, X } from "@phosphor-icons/react";
import { continueResumePoint, dismissResumePoint, loadReplay, loadResumePoint, type ReplayResult } from "@/app/actions/room-signals";
import type { ResumePoint } from "@/lib/api/room-signals-types";
import { clip, replaySpan, resumeHeadline, showResumePin } from "@/lib/room-signals";

/* Pick up where we stopped (a3 room signals), pinned on the room's stage bar.

   When this meeting follows one that ended on an open thread (time ran out, an agenda item left
   unfinished, someone cut off mid-explanation), the bar opens with it: "Raj was halfway through
   explaining the migration risk", the last two positions as short quotes, Replay of the moment
   when the earlier meeting's recording is ready (or the cut-off words when it isn't), and
   "Continue from here". Continuing (anyone) or Set aside (the host) is stored by core-api first,
   then announced through the gateway, so everyone's pin folds within a second; a reload reads the
   same state back. The X hides it on this screen only.

   Read through a Server Action (the room is a client island; `lib/api/client.ts` is server-only).
   No point, or one already picked up: nothing is drawn. */

type Load = { kind: "loading" } | { kind: "error" } | { kind: "ready"; point: ResumePoint | null };

export type ResumeChange = { id: string; status: "continued" | "dismissed"; byUserId: string; at: string };

const HIDE_KEY = "mytheus.resume-hidden";

function readHidden(): Set<string> {
  try {
    const raw = sessionStorage.getItem(HIDE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function writeHidden(ids: Set<string>) {
  try {
    sessionStorage.setItem(HIDE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // private window: hidden for this visit only
  }
}

export function ResumePointPin({
  meetingId,
  steers,
  nameOf,
  change,
  onAnnounce,
  toast,
}: {
  meetingId: string;
  /** You host or created this meeting: you may set it aside for everyone. */
  steers: boolean;
  nameOf: (id: string) => string;
  /** The latest room-wide `resume-point` broadcast. */
  change: ResumeChange | null;
  /** Tell the room (gateway `resume-point`) after core-api stored it. */
  onAnnounce: (id: string) => Promise<{ ok: boolean }>;
  toast: (text: string, tone?: "success" | "error" | "info") => void;
}) {
  const uid = useId();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"continue" | "dismiss" | null>(null);
  const [replay, setReplay] = useState<ReplayResult | null>(null);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => setHidden(readHidden()), []);

  useEffect(() => {
    let live = true;
    setLoad({ kind: "loading" });
    void loadResumePoint(meetingId)
      .then((res) => {
        if (!live) return;
        if (res.ok) setLoad({ kind: "ready", point: res.data.incoming });
        else setLoad(res.reason === "none" ? { kind: "ready", point: null } : { kind: "error" });
      })
      .catch(() => live && setLoad({ kind: "error" }));
    return () => {
      live = false;
    };
  }, [meetingId, attempt]);

  const point = load.kind === "ready" ? load.point : null;

  // The room heard that someone picked it up (or the host set it aside): fold it.
  useEffect(() => {
    if (!change || !point || change.id !== point.id || point.status !== "open") return;
    setLoad({ kind: "ready", point: { ...point, status: change.status } });
    if (change.status === "continued") toast(`${nameOf(change.byUserId)} picked up where you stopped`, "info");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per broadcast
  }, [change]);

  // Is there a recording of the moment? Asked once the point is known.
  const span = point ? replaySpan(point) : null;
  useEffect(() => {
    if (!point || point.status !== "open" || !span) return;
    let live = true;
    void loadReplay(point.meeting_id, span.startMs, span.endMs)
      .then((r) => live && setReplay(r))
      .catch(() => live && setReplay({ ok: false, reason: "error" }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per point
  }, [point?.id]);

  if (load.kind === "loading") {
    return (
      <div className="sb-catchup is-loading" aria-busy="true">
        <span className="sb-skel is-short" aria-hidden />
        <span className="sr-only">Checking for where the last meeting stopped</span>
      </div>
    );
  }
  if (load.kind === "error") {
    return (
      <div className="sb-catchup is-error" role="status">
        <p>Couldn&rsquo;t check where the last meeting stopped.</p>
        <button type="button" className="sb-link tap" onClick={() => setAttempt((n) => n + 1)}>
          <ArrowCounterClockwise size={14} aria-hidden />
          Retry
        </button>
        <button type="button" className="sb-x tap" aria-label="Close this line" onClick={() => setLoad({ kind: "ready", point: null })}>
          <X size={14} aria-hidden />
        </button>
      </div>
    );
  }
  if (!showResumePin(point, hidden)) return null;
  const p = point;

  const hideHere = () => {
    const next = new Set(hidden).add(p.id);
    setHidden(next);
    writeHidden(next);
  };

  const settle = async (verb: "continue" | "dismiss") => {
    setBusy(verb);
    const res = verb === "continue" ? await continueResumePoint(p.id, meetingId) : await dismissResumePoint(p.id, meetingId);
    setBusy(null);
    if (!res.ok) {
      if (res.gone) setLoad({ kind: "ready", point: null });
      toast(res.message, "error");
      return;
    }
    setLoad({ kind: "ready", point: res.point });
    toast(verb === "continue" ? "Picked up where you stopped" : "Set aside for everyone", "success");
    void onAnnounce(p.id);
  };

  const togglePlay = () => {
    const el = audio.current;
    if (!el || !replay?.ok) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    if (el.currentTime < replay.fromSec || el.currentTime >= replay.toSec) el.currentTime = replay.fromSec;
    void el.play().catch(() => toast("The recording couldn't play here", "error"));
  };

  const canReplay = replay?.ok === true;
  const cutQuote = p.cut_off?.quote ? clip(p.cut_off.quote, 160) : null;

  return (
    <div className="sb-catchup" role="region" aria-labelledby={`${uid}-h`}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <BookmarkSimple size={17} className="mt-0.5 shrink-0 text-signal" weight="fill" aria-hidden />
        <div className="min-w-0 flex-[1_1_220px]">
          <p className="text-[12.5px] font-semibold text-ink-3">Where you stopped last time, in {p.meeting_title}</p>
          <h3 id={`${uid}-h`} className="font-display text-[16px] leading-snug text-ink">
            {resumeHeadline(p)}
          </h3>
          {!canReplay && cutQuote ? (
            <p className="mt-1 font-display text-[14.5px]  leading-snug text-ink-2">
              <span className="sr-only">Their last words: </span>&ldquo;{cutQuote}&rdquo;
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {canReplay ? (
            <button type="button" className="sb-btn tap" onClick={togglePlay} aria-pressed={playing}>
              {playing ? <Pause size={14} weight="fill" aria-hidden /> : <Play size={14} weight="fill" aria-hidden />}
              {playing ? "Pause" : "Replay"}
            </button>
          ) : null}
          <button type="button" className="sb-btn is-primary tap" onClick={() => void settle("continue")} disabled={busy !== null}>
            <ArrowBendDownRight size={15} weight="bold" aria-hidden />
            {busy === "continue" ? "Picking up" : "Continue from here"}
          </button>
          {steers ? (
            <button type="button" className="sb-btn tap" onClick={() => void settle("dismiss")} disabled={busy !== null}>
              {busy === "dismiss" ? "Setting aside" : "Set aside"}
            </button>
          ) : null}
          <button type="button" className="sb-x tap" aria-label="Hide this on your screen" onClick={hideHere}>
            <X size={14} aria-hidden />
          </button>
        </div>
      </div>

      {p.positions.length > 0 ? (
        <>
          <button
            type="button"
            className="sb-link tap mt-1"
            aria-expanded={open}
            aria-controls={`${uid}-pos`}
            onClick={() => setOpen((v) => !v)}
          >
            <CaretDown size={13} className={open ? "is-flipped" : ""} aria-hidden />
            {open ? "Hide where it stood" : "Where it stood"}
          </button>
          <ul id={`${uid}-pos`} hidden={!open} className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {p.positions.map((pos, i) => (
              <li key={i} className="rounded-ctl bg-surface-2 px-3 py-2 text-[13.5px] leading-snug text-ink-2">
                <span className="font-semibold text-ink">{pos.name ?? "Someone"}</span>
                <span className="mt-0.5 block font-display ">&ldquo;{clip(pos.quote, 140)}&rdquo;</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {canReplay && replay.ok ? (
        <audio
          ref={audio}
          src={replay.url}
          preload="metadata"
          className="hidden"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime >= replay.toSec) e.currentTarget.pause();
          }}
        >
          <track kind="captions" />
        </audio>
      ) : null}
    </div>
  );
}
