"use client";

/**
 * The real participant video grid, rendered from live LiveKit tracks.
 *
 * Deliberately mirrors the visual contract the mock grid in `MeetingRoom.tsx` already
 * established - same tile radius and background, same bottom-left name tag with the mic state
 * in `--priority-high` when muted, same `ring-signal` speaking ring - so that swapping from
 * mock composition to live media is not also a visual redesign. The mock defined the layout,
 * color and interaction contract on purpose; this renders into it.
 *
 * `<VideoTrack>` and `useTracks` come from `@livekit/components-react` rather than being
 * hand-rolled over `livekit-client`: attaching a `MediaStreamTrack` to a `<video>` element
 * correctly (autoplay policies, cleanup on unsubscribe, re-attach on track republish) is
 * exactly the kind of thing worth taking from the vendor's own React bindings.
 */

import { VideoTrack, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import type { Room } from "livekit-client";
import { Avatar } from "@/components/ui/Avatar";

export function LiveVideoGrid({ room }: { room: Room }) {
  // `onlySubscribed: false` keeps a participant in the grid while their camera is off or their
  // track has not been subscribed yet, so people do not blink out of the room the moment they
  // mute. Placeholders are what make the grid stable.
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false, room },
  );

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
      {tracks.map((reference) => {
        const participant = reference.participant;
        const publication = reference.publication;
        const camOn = publication !== undefined && !publication.isMuted;
        const micOn = participant.isMicrophoneEnabled;
        const speaking = participant.isSpeaking;
        const name = participant.name || participant.identity;

        return (
          <div
            key={`${participant.identity}:${reference.source}`}
            className={`relative flex min-h-[140px] items-center justify-center overflow-hidden rounded-card bg-pill ${
              speaking ? "ring-2 ring-signal" : ""
            }`}
          >
            {camOn && publication ? (
              <VideoTrack
                trackRef={reference}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <Avatar name={name} size="lg" className="bg-white/10 text-white" />
            )}

            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 rounded-full bg-black/35 py-1 pl-2 pr-3 backdrop-blur-sm">
              <span className={micOn ? "text-white/85" : "text-priority-high"}>
                {micOn ? <MicGlyph /> : <MicOffGlyph />}
              </span>
              <span className="max-w-[160px] truncate text-[12px] font-medium text-white">
                {name}
              </span>
              {participant.isLocal && (
                <span className="hidden text-[10.5px] text-white/55 sm:inline">You</span>
              )}
            </div>

            {speaking && (
              <span
                className="absolute right-2.5 top-2.5 flex items-end gap-[2px]"
                aria-label="Speaking"
              >
                {[0.5, 1, 0.7].map((h, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-signal"
                    style={{ height: `${8 + h * 8}px` }}
                  />
                ))}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Local copies of the two glyphs the mock grid uses. `MeetingRoom.tsx` keeps its icon set
   module-private, and exporting them from a 456-line component to share two paths would couple
   this file to that one's internals for no benefit. */
function MicGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zM19 11a7 7 0 01-14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicOffGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M9 9v3a3 3 0 004.6 2.5M15 12V6a3 3 0 00-5.9-.7M19 11a7 7 0 01-1.2 3.9M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
