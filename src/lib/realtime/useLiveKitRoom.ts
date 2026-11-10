"use client";

/**
 * Connects one LiveKit `Room` for one meeting, and keeps it connected.
 *
 * Plan 3-4 §3.4 step 2: mint a token, connect, render the participant grid, "re-mint the token on
 * reconnect". `livekit-client` resumes a dropped connection by itself (`Reconnecting` then
 * `Reconnected`), but when that fails the room goes fully `Disconnected` and never comes back on
 * its own; this used to leave the call dead with nothing on screen saying so. Now a disconnect the
 * user did not ask for (anything but leaving, the host ending the meeting, or being removed)
 * re-mints a fresh token and reconnects, with exponential backoff and jitter, and after
 * `MAX_RECONNECT_ATTEMPTS` reports `error` with "Try again" (polish program, Phase 0).
 *
 * CONSENT (ADR-0018, polish program "Consent that is real"): a 428 `CONSENT_REQUIRED` from the
 * mint is not an error loop back to the pre-join any more. It becomes `status: "consent"`; the
 * room asks right there, and `acceptConsent(version)` re-mints WITH the acknowledgment, which
 * meeting-service records on the participant row before it mints.
 *
 * DEGRADES BY DESIGN when LiveKit is not configured (`NEXT_PUBLIC_LIVEKIT_URL` unset):
 * `status: "unconfigured"`, no network work at all.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionState, DisconnectReason, Room, RoomEvent, type LocalParticipant, type RemoteParticipant } from "livekit-client";
import { MAX_RECONNECT_ATTEMPTS, backoffMs, type CallLink } from "./connection";

export type LiveKitStatus = CallLink;

export interface LiveKitRoomState {
  status: LiveKitStatus;
  room: Room | null;
  participants: (LocalParticipant | RemoteParticipant)[];
  /** A stable code when `status === "error"` (the server's problem code, or a local one). */
  error: string | null;
  /** When the meeting's call first opened (server-side), from the latest token mint. */
  startedAt: string | null;
  /** Start over after an error. */
  retry: () => void;
  /** Re-mint with the consent acknowledgment, after `status === "consent"`. */
  acceptConsent: (version: string) => void;
}

interface MintedToken {
  token: string;
  room: string;
  livekit_url?: string | null;
  started_at?: string | null;
}

class MintError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

async function mintToken(meetingId: string, consentVersion: string | null): Promise<MintedToken> {
  const response = await fetch("/api/livekit-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      consentVersion ? { meeting_id: meetingId, consent: { version: consentVersion } } : { meeting_id: meetingId },
    ),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as { code?: string };
    // A participant never admitted, another tenant's meeting, consent not given, an ended
    // meeting: four different things to show a person, not one "could not join".
    throw new MintError(problem.code ?? `HTTP_${response.status}`, response.status);
  }
  return (await response.json()) as MintedToken;
}

/** Failures that another attempt cannot fix: stop and say why. */
function isFinal(code: string): boolean {
  return ["NOT_A_PARTICIPANT", "NOT_FOUND", "VERSION_CONFLICT", "CONSENT_REQUIRED", "VALIDATION_FAILED", "EXTERNAL_MEETING"].includes(code);
}

/** A disconnect the user (or the meeting) chose: never reconnect after these. */
function intended(reason: DisconnectReason | undefined): boolean {
  return (
    reason === DisconnectReason.CLIENT_INITIATED ||
    reason === DisconnectReason.ROOM_DELETED ||
    reason === DisconnectReason.PARTICIPANT_REMOVED ||
    reason === DisconnectReason.DUPLICATE_IDENTITY
  );
}

export function useLiveKitRoom(meetingId: string): LiveKitRoomState {
  const configuredUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  const [status, setStatus] = useState<LiveKitStatus>(configuredUrl ? "connecting" : "unconfigured");
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<(LocalParticipant | RemoteParticipant)[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  // Bumping this restarts the whole connect cycle (Try again, or consent given).
  const [generation, setGeneration] = useState(0);
  const consentRef = useRef<string | null>(null);

  const syncParticipants = useCallback((r: Room) => {
    // A new array identity every time on purpose: LiveKit mutates its participant objects in
    // place, so the same array reference would leave React with nothing to diff.
    setParticipants([r.localParticipant, ...Array.from(r.remoteParticipants.values())]);
  }, []);

  useEffect(() => {
    if (!configuredUrl) return;

    let cancelled = false;
    let attempt = 0;
    let timer: number | undefined;
    const r = new Room({ adaptiveStream: true, dynacast: true });
    setRoom(r);
    setStatus("connecting");
    setError(null);

    const onChange = () => {
      if (!cancelled) syncParticipants(r);
    };

    const connect = async (): Promise<void> => {
      try {
        // Always a fresh token: a full disconnect cannot reuse the one it connected with.
        const minted = await mintToken(meetingId, consentRef.current);
        if (cancelled) return;
        if (minted.started_at) setStartedAt(minted.started_at);
        // The server's `livekit_url` wins: a tenant pinned to a regional SFU must use that one.
        await r.connect(minted.livekit_url || configuredUrl, minted.token);
        if (cancelled) return;
        attempt = 0;
        syncParticipants(r);
        setError(null);
        setStatus("connected");
      } catch (err) {
        if (cancelled) return;
        const code = err instanceof MintError ? err.code : "CONNECT_FAILED";
        if (code === "CONSENT_REQUIRED") {
          setStatus("consent");
          return;
        }
        if (isFinal(code) || attempt >= MAX_RECONNECT_ATTEMPTS) {
          setError(code);
          setStatus("error");
          return;
        }
        // A flaky network or a deploy: try again after a while, with a new token.
        setStatus(attempt === 0 && r.state !== ConnectionState.Disconnected ? "connecting" : "reconnecting");
        timer = window.setTimeout(() => void connect(), backoffMs(attempt));
        attempt += 1;
      }
    };

    r.on(RoomEvent.ParticipantConnected, onChange)
      .on(RoomEvent.ParticipantDisconnected, onChange)
      .on(RoomEvent.TrackSubscribed, onChange)
      .on(RoomEvent.TrackUnsubscribed, onChange)
      .on(RoomEvent.TrackMuted, onChange)
      .on(RoomEvent.TrackUnmuted, onChange)
      .on(RoomEvent.ActiveSpeakersChanged, onChange)
      .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (cancelled) return;
        if (state === ConnectionState.Connected) setStatus("connected");
        else if (state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting) {
          setStatus("reconnecting");
        }
      })
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        if (cancelled) return;
        setParticipants([]);
        if (intended(reason)) return;
        // LiveKit gave up resuming. Start again from a fresh token, with backoff.
        setStatus("reconnecting");
        window.clearTimeout(timer);
        timer = window.setTimeout(() => void connect(), backoffMs(attempt));
        attempt += 1;
      });

    void connect();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      r.removeAllListeners();
      void r.disconnect();
      setRoom(null);
    };
  }, [meetingId, configuredUrl, syncParticipants, generation]);

  const retry = useCallback(() => setGeneration((g) => g + 1), []);
  const acceptConsent = useCallback((version: string) => {
    consentRef.current = version;
    setGeneration((g) => g + 1);
  }, []);

  return { status, room, participants, error, startedAt, retry, acceptConsent };
}
