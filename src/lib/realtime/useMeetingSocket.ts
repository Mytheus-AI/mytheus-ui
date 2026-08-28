"use client";

/**
 * One Socket.io connection to `realtime-gateway`, joined to one meeting room, reduced into
 * caption state. Plan 3-4 §3.8 step 1, over the contract in §3.4 step 3.
 *
 * ONE SOCKET, EVER. This repo's CLAUDE.md is explicit ("Never open a second socket"), and the
 * gateway scales on anchor A6 = 100k concurrent connections, so a stray second connection per
 * client is not a tidiness issue but a doubling of the tier's headline cost driver. The socket
 * is created inside the effect and torn down by its cleanup, so a remount cannot leak one.
 *
 * DEGRADES BY DESIGN, exactly as `useLiveKitRoom` does and for the same reason:
 * `NEXT_PUBLIC_REALTIME_WS_URL` is unset in every environment that exists today, so this
 * reports `disabled`, opens nothing, and the caller keeps rendering its mock captions. That
 * keeps the room working today and makes this code reviewable now rather than after the
 * gateway is deployed somewhere reachable.
 *
 * RE-HYDRATES ON EVERY (RE)CONNECT. The gateway replays nothing to a reconnecting client, by
 * design - finals are durable and are meant to be re-read from `core-api`'s REST read model -
 * so without this a socket drop silently loses every caption spoken during it. On each
 * `connect`, and therefore on every automatic reconnect too, this re-reads the durable finals
 * through `/api/meeting-transcript` and merges them in. `applyCaption` is idempotent on
 * `chunkId`, so a final that arrives from both the hydrate and the socket renders once.
 *
 * Merged rather than replacing state: a naive `setCaptions(hydrate(...))` would discard any
 * caption that arrived between the fetch starting and finishing, which on a busy meeting is a
 * real window. Folding the fetched finals into whatever is current keeps both.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  applyCaption,
  emptyCaptionState,
  type CaptionPayload,
  type CaptionState,
} from "./captions";

export type SocketStatus =
  | "disabled" // no NEXT_PUBLIC_REALTIME_WS_URL: caller falls back to mock captions
  | "connecting"
  | "joined"
  | "forbidden" // the participant check denied this user for this meeting
  | "error";

export interface MeetingSocketState {
  status: SocketStatus;
  captions: CaptionState;
  /** Internal `users.id` UUIDs currently in the room, per the gateway's presence contract. */
  presence: string[];
}

interface JoinAck {
  ok: boolean;
  presence?: string[];
  error?: "FORBIDDEN" | "INVALID_PAYLOAD";
}

export function useMeetingSocket(meetingId: string, token: string | null): MeetingSocketState {
  const url = process.env.NEXT_PUBLIC_REALTIME_WS_URL;
  const [status, setStatus] = useState<SocketStatus>(url ? "connecting" : "disabled");
  const [captions, setCaptions] = useState<CaptionState>(emptyCaptionState);
  const [presence, setPresence] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // No token means Clerk has not resolved a session yet. Connecting anonymously would just
    // be denied by the handshake, so wait rather than burn a connection attempt.
    if (!url || !token) return;

    let cancelled = false;
    // Namespace `/v1`, per the gateway's contract. The token rides `auth`, which is where
    // `server.ts` reads it from (`socket.handshake.auth.token`) - not a header, which the
    // WebSocket upgrade cannot carry portably anyway.
    const socket = io(`${url.replace(/\/+$/, "")}/v1`, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    const rehydrate = async () => {
      try {
        const response = await fetch(
          `/api/meeting-transcript?meeting_id=${encodeURIComponent(meetingId)}`,
        );
        if (!response.ok) return;
        const body = (await response.json()) as { items?: CaptionPayload[] };
        if (cancelled || !body.items?.length) return;
        setCaptions((prev) =>
          body.items!.reduce((state, payload) => applyCaption(state, payload), prev),
        );
      } catch {
        // A failed re-hydrate must not break the live stream. The socket keeps delivering new
        // captions either way; the cost of failing here is only the gap during the disconnect,
        // which is exactly the state we were already in.
      }
    };

    const join = () => {
      void rehydrate();
      socket.emit("join", { meetingId }, (ack: JoinAck) => {
        if (cancelled) return;
        if (ack?.ok) {
          setStatus("joined");
          setPresence(ack.presence ?? []);
        } else {
          // The gateway always acks rather than throwing, so a denial is a value to render,
          // not an exception. Deny-by-default is the server's call and the UI states it.
          setStatus(ack?.error === "FORBIDDEN" ? "forbidden" : "error");
        }
      });
    };

    // Re-join on every (re)connect: Socket.io reconnects with a NEW socket id, and room
    // membership does not survive it.
    socket.on("connect", join);
    socket.on("connect_error", () => {
      if (!cancelled) setStatus("error");
    });

    socket.on("caption", (event: { meetingId: string; payload: CaptionPayload }) => {
      if (cancelled) return;
      // The gateway fans out per room, but a client that joined several meetings would receive
      // several streams on one socket; filtering by meetingId keeps this hook honest about
      // which meeting it represents.
      if (event?.meetingId !== meetingId || !event.payload) return;
      setCaptions((prev) => applyCaption(prev, event.payload));
    });

    socket.on("presence", (members: string[]) => {
      if (!cancelled) setPresence(Array.isArray(members) ? members : []);
    });

    return () => {
      cancelled = true;
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [url, token, meetingId]);

  return useMemo(
    () => ({ status, captions, presence }),
    [status, captions, presence],
  );
}
