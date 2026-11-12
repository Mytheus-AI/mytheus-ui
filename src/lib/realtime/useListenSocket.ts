"use client";

/**
 * The app-wide link to `realtime-gateway` for "In every meeting at once": one Socket.io
 * connection per tab, outside any meeting room, subscribed to the person's own channel
 * (`listen`). It carries two events:
 *
 *   - `agent-interrupt` {payload: Interruption}: your Myte, listening to a live meeting you are
 *     not in, says something there needs you;
 *   - `view-status` {payload: MeetingView}: the host shared (or set aside) a view you sent.
 *
 * Same discipline as the room's socket (`useMeetingSocket`): a fresh Clerk token on every
 * (re)connect through the `auth` callback, `listen` re-sent on every connect (a reconnect is a
 * new socket), backoff that gives up quietly after `MAX_RECONNECT_ATTEMPTS`. Nothing durable
 * rides it: every interruption is also in the Inbox and on the Listening page, so a missed event
 * is never lost. Without `NEXT_PUBLIC_REALTIME_WS_URL` it opens nothing.
 */

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { MAX_RECONNECT_ATTEMPTS, backoffMs } from "./connection";

export type ListenStatus = "disabled" | "connecting" | "listening" | "unavailable";

export function useListenSocket(options: {
  getToken: () => Promise<string | null>;
  onInterrupt: (payload: unknown) => void;
  onViewStatus: (payload: unknown) => void;
  enabled?: boolean;
}): ListenStatus {
  const url = process.env.NEXT_PUBLIC_REALTIME_WS_URL;
  const enabled = options.enabled !== false && Boolean(url);
  const [status, setStatus] = useState<ListenStatus>(enabled ? "connecting" : "disabled");
  const handlers = useRef(options);
  handlers.current = options;

  useEffect(() => {
    if (!enabled || !url) return;
    let cancelled = false;
    let attempts = 0;
    let retry: number | undefined;
    const socket = io(`${url.replace(/\/+$/, "")}/v1`, {
      auth: (cb) => {
        handlers.current
          .getToken()
          .then((token) => cb({ token: token ?? "" }))
          .catch(() => cb({ token: "" }));
      },
      transports: ["websocket"],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 60_000,
      randomizationFactor: 0.5,
    });

    const giveUpOrRetry = () => {
      window.clearTimeout(retry);
      if (attempts >= MAX_RECONNECT_ATTEMPTS) {
        socket.disconnect();
        setStatus("unavailable");
        return;
      }
      retry = window.setTimeout(() => {
        if (!cancelled) socket.connect();
      }, backoffMs(attempts));
      attempts += 1;
    };

    socket.on("connect", () => {
      void socket
        .timeout(8000)
        .emitWithAck("listen", {})
        .then((ack: { ok?: boolean } | undefined) => {
          if (cancelled) return;
          if (ack?.ok) {
            attempts = 0;
            setStatus("listening");
          } else setStatus("unavailable");
        })
        .catch(() => {
          if (!cancelled) setStatus("unavailable");
        });
    });
    socket.on("disconnect", (reason) => {
      if (cancelled) return;
      setStatus("connecting");
      if (reason === "io server disconnect") giveUpOrRetry();
    });
    socket.on("connect_error", () => {
      if (cancelled) return;
      if (!socket.active) giveUpOrRetry();
      else if (++attempts >= MAX_RECONNECT_ATTEMPTS) {
        socket.disconnect();
        setStatus("unavailable");
      }
    });
    socket.on("agent-interrupt", (event: { payload?: unknown }) => {
      if (!cancelled && event?.payload) handlers.current.onInterrupt(event.payload);
    });
    socket.on("view-status", (event: { payload?: unknown }) => {
      if (!cancelled && event?.payload) handlers.current.onViewStatus(event.payload);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled, url]);

  return status;
}
