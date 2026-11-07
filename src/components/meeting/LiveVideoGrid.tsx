"use client";

/**
 * The real participant video grid, rendered from live LiveKit tracks.
 *
 * Deliberately renders through the same `RoomGrid` as the mock composition in `MeetingRoom.tsx`
 * - same tiles, name tags, muted badge and speaking ring - so that swapping from mock to live
 * media is not also a visual redesign. This file only turns LiveKit tracks into `RoomTile`s and
 * supplies the <VideoTrack> as each tile's media.
 *
 * `<VideoTrack>` and `useTracks` come from `@livekit/components-react` rather than being
 * hand-rolled over `livekit-client`: attaching a `MediaStreamTrack` to a `<video>` element
 * correctly (autoplay policies, cleanup on unsubscribe, re-attach on track republish) is
 * exactly the kind of thing worth taking from the vendor's own React bindings.
 */

import { VideoTrack, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import type { Room } from "livekit-client";
import { RoomGrid, type RoomLayout, type RoomTile } from "@/components/room/RoomGrid";

export function LiveVideoGrid({
  room,
  layout = "grid",
  spotlightId = null,
  onSpotlight,
}: {
  room: Room;
  layout?: RoomLayout;
  spotlightId?: string | null;
  onSpotlight?: (id: string) => void;
}) {
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
    const name = participant.name || participant.identity;

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

  return <RoomGrid tiles={tiles} layout={layout} spotlightId={spotlightId} onSpotlight={onSpotlight} />;
}
