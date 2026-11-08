"use client";

/**
 * The real participant video grid, rendered from live LiveKit tracks.
 *
 * Deliberately renders through the same stage as the pre-connect tile in `MeetingRoom.tsx`
 * - same frame, thumbnails, name pills, muted badge and speaking ring - so that connecting is
 * not also a visual redesign. This file only turns LiveKit tracks into `RoomTile`s, supplies the
 * <VideoTrack> as each tile's media, and hands the tiles to `children`, which draws the stage
 * (with the room's overlays).
 *
 * `<VideoTrack>` and `useTracks` come from `@livekit/components-react` rather than being
 * hand-rolled over `livekit-client`: attaching a `MediaStreamTrack` to a `<video>` element
 * correctly (autoplay policies, cleanup on unsubscribe, re-attach on track republish) is
 * exactly the kind of thing worth taking from the vendor's own React bindings.
 */

import { VideoTrack, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import type { Room } from "livekit-client";
import type { ReactNode } from "react";
import type { RoomTile } from "@/components/room/RoomGrid";
import { useOrgContext } from "@/lib/org-context";

export function LiveVideoGrid({
  room,
  children,
}: {
  room: Room;
  /** Draws the stage from the live tiles. */
  children: (tiles: RoomTile[]) => ReactNode;
}) {
  const { user } = useOrgContext();
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

  const tiles: RoomTile[] = tracks.map((reference) => {
    const participant = reference.participant;
    const publication = reference.publication;
    const screen = reference.source === Track.Source.ScreenShare;
    const camOn = publication !== undefined && !publication.isMuted;
    // LiveKit identities are internal user ids, so never show one: your own tile uses your name,
    // anyone the token did not name shows as Guest.
    const name = participant.name || (participant.isLocal ? user.name : "Guest");

    return {
      id: `${participant.identity}:${reference.source}`,
      name: screen ? `${name}'s screen` : name,
      isLocal: participant.isLocal && !screen,
      micOn: screen ? true : participant.isMicrophoneEnabled,
      camOn,
      speaking: !screen && participant.isSpeaking,
      kind: screen ? "screen" : "camera",
      media:
        camOn && publication ? (
          <VideoTrack
            trackRef={reference}
            className={`absolute inset-0 h-full w-full ${screen ? "object-contain" : "object-cover"}`}
          />
        ) : undefined,
    };
  });

  return <>{children(tiles)}</>;
}
