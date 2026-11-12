"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowsOutSimple,
  CheckSquare,
  Microphone,
  MicrophoneSlash,
  PhoneDisconnect,
  Scales,
  Sparkle,
  VideoCamera,
  VideoCameraSlash,
} from "@phosphor-icons/react";
import type { RoomTile } from "@/components/room/RoomGrid";
import { initials, toneOf } from "@/components/room/tone";
import type { CaptionLine } from "@/lib/realtime/captions";
import type { LiveNote } from "@/lib/realtime/notes";
import type { Decided } from "@/lib/realtime/candidates";
import { BlastChip } from "@/components/blast-radius/BlastChip";
import { useRoomName } from "@/lib/realtime/room-names";

/* The room's Notes mode: the same live meeting as a living document. People stay visible as
   small live tiles on the left with what is being said right now; the main column is your
   agent's notes, the meeting's confirmed decisions and actions, and the transcript as it is
   spoken. Everything here comes from the streams the Call mode already uses (LiveKit tiles, the
   caption socket, My Notes, the shared candidate ledger), so switching modes never reconnects or
   loses anything.

   Notes mode never hides what needs you (polish program, Phase 0): the `rail` on the right keeps
   pinned alerts, the shared agenda and Needs you (cards to confirm) in view. The Decisions and
   Actions sections are live: whatever anyone in the meeting confirms appears here, with who
   confirmed it. */


function words(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Share of words spoken per speaker so far, biggest first. */
function talkTime(finals: CaptionLine[]): { id: string; share: number }[] {
  const by = new Map<string, number>();
  let all = 0;
  for (const l of finals) {
    const n = words(l.text);
    by.set(l.speakerId, (by.get(l.speakerId) ?? 0) + n);
    all += n;
  }
  if (all === 0) return [];
  return Array.from(by.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ id, share: Math.round((n / all) * 100) }));
}

/** A caption's offset as m:ss (or h:mm:ss), the same form the transcript page uses. */
function offset(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/* The line at rest: nothing has been carried forward here yet. */
function EmptyLine() {
  return (
    <svg className="nv-empty-line" viewBox="0 0 120 36" aria-hidden="true">
      <path className="mx-line" d="M4 26 C24 26 30 26 44 26 C62 26 72 4 60 4 C48 4 50 26 70 26 C86 26 96 26 116 26" />
    </svg>
  );
}

function MiniTile({ tile }: { tile: RoomTile }) {
  const speaking = Boolean(tile.speaking) && tile.micOn && tile.kind !== "screen";
  const showMedia = Boolean(tile.media) && tile.camOn;
  return (
    <div
      className={`nv-tile ${toneOf(tile.id.split(":")[0] ?? tile.id)}${showMedia ? " has-media" : ""}${speaking ? " is-speaking" : ""}`}
      role="group"
      aria-label={tile.name}
    >
      {showMedia ? (
        tile.media
      ) : (
        <span className="nv-av" aria-hidden>
          {tile.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tile.imageUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            initials(tile.name)
          )}
        </span>
      )}
      <span className="nv-name">
        {!tile.micOn && tile.kind !== "screen" ? (
          <MicrophoneSlash size={13} weight="fill" className="nv-muted" aria-label="Muted" role="img" />
        ) : null}
        {tile.isLocal ? "You" : tile.name.split(" ")[0]}
      </span>
    </div>
  );
}

export function NotesView({
  title,
  when,
  tiles,
  notes,
  lines,
  speakerLabel,
  micOn,
  camOn,
  onMic,
  onCam,
  onBackToCall,
  leaveHref,
  chat,
  rail,
  decided,
}: {
  title: string;
  /** A short date line, e.g. "Sun, Nov 9, 3 in call". */
  when: string;
  tiles: RoomTile[];
  notes: LiveNote[];
  /** Caption lines, interims included; finals make the transcript. */
  lines: CaptionLine[];
  speakerLabel: (speakerId: string) => string;
  micOn: boolean;
  camOn: boolean;
  onMic: () => void;
  onCam: () => void;
  onBackToCall: () => void;
  leaveHref: string;
  /** The live call chat, given the left column's remaining height. */
  chat?: ReactNode;
  /** Pinned alerts, the agenda and Needs you, kept in view beside the document. */
  rail?: ReactNode;
  /** The meeting's confirmed decisions and actions, from the shared ledger. */
  decided: { decisions: Decided[]; actions: Decided[] };
}) {
  const nameOf = useRoomName();
  const finals = lines.filter((l) => l.isFinal);
  const talk = talkTime(finals);
  const last = lines[lines.length - 1];
  // Newest first, so new speech appears at the top of the section without the page jumping.
  const transcript = [...finals].reverse();

  return (
    <div className={`nv${rail ? " has-rail" : ""}`}>
      <aside className="nv-side" aria-label="People in the call">
        <span className="nv-label">In the call</span>
        <div className="nv-tiles">
          {tiles.map((t) => (
            <MiniTile key={t.id} tile={t} />
          ))}
        </div>

        <span className="nv-label">Speaking now</span>
        <div className="nv-now" aria-live="polite">
          {last ? (
            <>
              <b>{speakerLabel(last.speakerId)}</b>
              {last.text}
              {!last.isFinal ? <span className="stream-caret" aria-hidden="true" /> : null}
            </>
          ) : (
            <span className="nv-quiet">Captions appear here once someone speaks.</span>
          )}
        </div>

        {/* What the space under "Speaking now" is for: who has had the floor, and the chat. */}
        {talk.length > 0 ? (
          <>
            <span className="nv-label">Talk time</span>
            <ul className="nv-talk">
              {talk.map((t) => (
                <li key={t.id}>
                  <span className="nv-talk-name">{speakerLabel(t.id)}</span>
                  <span className="nv-talk-bar" aria-hidden="true">
                    <i style={{ width: `${t.share}%` }} />
                  </span>
                  <span className="nv-talk-pct">{t.share}%</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {chat ? (
          <>
            <span className="nv-label nv-chat-label">Chat</span>
            <div className="nv-chat">{chat}</div>
          </>
        ) : (
          <div className="nv-fill" />
        )}

        <div className="controls nv-ctls" role="toolbar" aria-label="Call controls">
          <button
            type="button"
            className={`ctl tap${micOn ? "" : " is-off"}`}
            onClick={onMic}
            aria-pressed={micOn}
            aria-label="Microphone"
            data-tip={micOn ? "Mute" : "Unmute"}
          >
            {micOn ? <Microphone size={20} aria-hidden /> : <MicrophoneSlash size={20} aria-hidden />}
          </button>
          <button
            type="button"
            className={`ctl tap${camOn ? "" : " is-off"}`}
            onClick={onCam}
            aria-pressed={camOn}
            aria-label="Camera"
            data-tip={camOn ? "Turn camera off" : "Turn camera on"}
          >
            {camOn ? <VideoCamera size={20} aria-hidden /> : <VideoCameraSlash size={20} aria-hidden />}
          </button>
          <button type="button" className="ctl tap" onClick={onBackToCall} aria-label="Back to the call view" data-tip="Back to the call">
            <ArrowsOutSimple size={20} aria-hidden />
          </button>
          <span className="ctl-sep" aria-hidden="true"></span>
          <Link href={leaveHref} className="ctl-leave tap" aria-label="Leave meeting">
            <PhoneDisconnect size={19} weight="fill" aria-hidden />
            <span className="ctl-leave-label">Leave</span>
          </Link>
        </div>
      </aside>

      <div className="nv-doc">
        <h2 className="nv-title">{title}</h2>
        <p className="nv-sub">
          {when}
          <span className="mx-chip is-accent">
            <Sparkle size={14} weight="fill" aria-hidden />
            Your Myte is taking notes
          </span>
        </p>

        <section className="nv-card" aria-labelledby="nv-notes-h">
          <h3 id="nv-notes-h">
            <Sparkle size={14} aria-hidden />
            My notes <span className="mx-count">{notes.length}</span>
            <small>Only you can see these</small>
          </h3>
          {notes.length === 0 ? (
            <p className="nv-empty">Your Myte writes notes here every 30 seconds or so, for the parts that matter to you.</p>
          ) : (
            <ul className="nv-notes">
              {notes.map((n) => (
                <li key={n.windowId} className={n.final ? "" : "is-draft"}>
                  {n.text || "Writing..."}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="nv-two">
          <section className="nv-card" aria-labelledby="nv-dec-h">
            <h3 id="nv-dec-h">
              <Scales size={14} aria-hidden />
              Decisions <span className="mx-count">{decided.decisions.length}</span>
            </h3>
            {decided.decisions.length === 0 ? (
              <>
                <EmptyLine />
                <p className="nv-empty">
                  When anyone confirms a decision a Myte heard, it appears here for everyone.
                </p>
              </>
            ) : (
              <ul className="nv-decided" aria-live="polite">
                {decided.decisions.map((d) => (
                  <li key={d.id}>
                    <p>{d.content}</p>
                    {d.rationale ? <p className="nv-decided-why">{d.rationale}</p> : null}
                    {d.confirmedBy ? <small>Confirmed by {nameOf(d.confirmedBy, "a participant")}</small> : null}
                    <BlastChip decisionId={d.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="nv-card" aria-labelledby="nv-act-h">
            <h3 id="nv-act-h">
              <CheckSquare size={14} aria-hidden />
              Action items <span className="mx-count">{decided.actions.length}</span>
            </h3>
            {decided.actions.length === 0 ? (
              <>
                <EmptyLine />
                <p className="nv-empty">
                  Confirmed tasks appear here with their owner and due date.
                </p>
              </>
            ) : (
              <ul className="nv-decided" aria-live="polite">
                {decided.actions.map((a) => (
                  <li key={a.id}>
                    <p>{a.content}</p>
                    <small>
                      {[
                        a.assigneeId ? `Owner: ${nameOf(a.assigneeId, "someone")}` : "No owner yet",
                        a.dueDate ? `due ${a.dueDate}` : null,
                        a.confirmedBy ? `confirmed by ${nameOf(a.confirmedBy, "a participant")}` : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <p className="nv-label nv-tx-label">
          Transcript <span className="mx-count">{finals.length}</span>
        </p>
        {transcript.length === 0 ? (
          <p className="nv-empty">The transcript fills in as people speak.</p>
        ) : (
          <ol className="nv-tx">
            {transcript.map((l) => (
              <li key={l.chunkId}>
                <time>{offset(l.startMs)}</time>
                <b>{speakerLabel(l.speakerId)}</b>
                <p>{l.text}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {rail ? (
        <aside className="nv-rail" aria-label="Needs you and the agenda">
          {rail}
        </aside>
      ) : null}
    </div>
  );
}
