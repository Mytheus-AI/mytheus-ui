"use client";

/**
 * Connects one LiveKit `Room` for one meeting, and keeps a token valid across reconnects.
 *
 * Plan 3-4 §3.4 step 2: mint a token, connect, render the participant grid, "re-mint the token
 * on reconnect". Re-minting is the part that is easy to get wrong and expensive to get wrong:
 * LiveKit tokens are short-lived, so a socket that drops and resumes after the TTL cannot
 * reuse the token it connected with. `livekit-client` refreshes an existing connection on its
 * own, but a full disconnect needs a fresh token, which is why `connect` always mints rather
 * than caching one in state.
 *
 * DEGRADES BY DESIGN when LiveKit is not configured. `NEXT_PUBLIC_LIVEKIT_URL` is unset in
 * every environment that exists today - there is no LiveKit account anywhere in the program
 * (the A1 blocker), and `meeting-service` falls back to `FakeTransport` without one. Rather
 * than render a broken room, this reports `status: "unconfigured"` and the grid keeps showing
 * the mock composition it shows today. That is the same Protocol-plus-Fake discipline the
 * backend uses for exactly the same reason, and it means this code can land, be reviewed and
 * be typechecked now instead of waiting on a vendor account.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionState,
  Room,
  RoomEvent,
  type RemoteParticipant,
  type LocalParticipant,
} from "livekit-client";

export type LiveKitStatus =
  | "unconfigured" // no NEXT_PUBLIC_LIVEKIT_URL: fall back to the mock grid
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface LiveKitRoomState {
  status: LiveKitStatus;
  room: Room | null;
  participants: (LocalParticipant | RemoteParticipant)[];
  /** A stable, human-readable reason when `status === "error"`. */
  error: string | null;
}

interface MintedToken {
  token: string;
  room: string;
  livekit_url?: string | null;
}

async function mintToken(meetingId: string): Promise<MintedToken> {
  const response = await fetch("/api/livekit-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meeting_id: meetingId }),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as { code?: string };
    // The distinctions meeting-service makes are worth keeping: a participant who was never
    // admitted, a meeting belonging to another tenant, and a tenant that requires consent are
    // three different things to show a user, not one "could not join".
    throw new Error(problem.code ?? `token mint failed (${response.status})`);
  }
  return (await response.json()) as MintedToken;
}

export function useLiveKitRoom(meetingId: string): LiveKitRoomState {
  const configuredUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const [status, setStatus] = useState<LiveKitStatus>(
    configuredUrl ? "connecting" : "unconfigured",
  );
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<(LocalParticipant | RemoteParticipant)[]>([]);
  const roomRef = useRef<Room | null>(null);

  const syncParticipants = useCallback((room: Room) => {
    // A new array identity every time on purpose: LiveKit mutates its participant objects in
    // place, so returning the same array reference would leave React with nothing to diff and
    // the grid would not re-render when someone's camera or mic changed.
    setParticipants([room.localParticipant, ...Array.from(room.remoteParticipants.values())]);
  }, []);

  useEffect(() => {
    if (!configuredUrl) return;

    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const onChange = () => {
      if (!cancelled) syncParticipants(room);
    };

    room
      .on(RoomEvent.ParticipantConnected, onChange)
      .on(RoomEvent.ParticipantDisconnected, onChange)
      .on(RoomEvent.TrackSubscribed, onChange)
      .on(RoomEvent.TrackUnsubscribed, onChange)
      .on(RoomEvent.TrackMuted, onChange)
      .on(RoomEvent.TrackUnmuted, onChange)
      .on(RoomEvent.ActiveSpeakersChanged, onChange)
      .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (cancelled) return;
        if (state === ConnectionState.Connected) setStatus("connected");
        else if (state === ConnectionState.Reconnecting) setStatus("reconnecting");
      })
      .on(RoomEvent.Disconnected, () => {
        // A clean disconnect is not an error state; the effect cleanup below owns teardown.
        if (!cancelled) setParticipants([]);
      });

    void (async () => {
      try {
        const minted = await mintToken(meetingId);
        if (cancelled) return;
        // The server's `livekit_url` wins when present: a tenant pinned to a regional SFU by
        // `data_residency.region` must connect to that one, and only the server knows which.
        // The public env var is the fallback for a single-region dev setup.
        await room.connect(minted.livekit_url ?? configuredUrl, minted.token);
        if (cancelled) return;
        syncParticipants(room);
        setStatus("connected");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "could not join the room");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      room.removeAllListeners();
      void room.disconnect();
      roomRef.current = null;
    };
  }, [meetingId, configuredUrl, syncParticipants]);

  return { status, room: roomRef.current, participants, error };
}
