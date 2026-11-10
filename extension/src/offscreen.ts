/**
 * The offscreen document: where the audio actually lives. MV3 service workers have no
 * `getUserMedia`, `AudioContext` or long-lived sockets, so this hidden page holds them.
 *
 * - Tab audio: taken with the popup's `chrome.tabCapture` stream id. Capturing a tab silences it
 *   for the user, so it is also played straight back to the speakers; the user hears the call
 *   exactly as before.
 * - Microphone: the user's own voice. Meet, Teams and Zoom never play your own voice back into
 *   the tab, so without the mic the transcript would miss everything you say. Echo
 *   cancellation is on so the call's audio coming out of the speakers is not transcribed twice.
 * - Each source runs through the `pcm-encoder` AudioWorklet (`worklet.ts`): 16 kHz mono s16le in
 *   50 ms frames, and each goes to `/capture/audio` on its own WebSocket (`mic`, `tab`).
 *
 * Wire contract: `mytheus-realtime/services/transcription-service/src/transcription_service/
 * capture_in.py`. Close-code policy: `lib/protocol.ts` `closeAction`.
 */

import {
  backoffMs,
  closeAction,
  describeClose,
  type BackgroundMessage,
  type CaptureSession,
  type Channel,
  type ChannelStatus,
  type OffscreenMessage,
} from "./lib/protocol.ts";

const MAX_BUFFERED_FRAMES = 200; // 10 s of 50 ms frames held while (re)connecting
const STOP_CLOSE_TIMEOUT_MS = 6000;
const TOKEN_MARGIN_SECONDS = 30;

function notify(message: BackgroundMessage): void {
  chrome.runtime.sendMessage(message).catch(() => {
    // The worker is restarting; the next status update carries the state.
  });
}

// ------------------------------------------------------------------ token

let session: CaptureSession | null = null;
let refreshing: Promise<void> | null = null;

async function freshToken(force: boolean): Promise<string> {
  if (!session) throw new Error("no session");
  const expiring = session.expiresAt - TOKEN_MARGIN_SECONDS < Date.now() / 1000;
  if (force || expiring) {
    refreshing ??= (async () => {
      const reply = (await chrome.runtime.sendMessage({ type: "refresh-token" })) as
        | { ok: true; value: { captureToken: string; expiresAt: number } }
        | { ok: false; error: string };
      if (!reply?.ok) throw new Error(reply?.error ?? "could not refresh the capture token");
      if (session) {
        session = { ...session, captureToken: reply.value.captureToken, expiresAt: reply.value.expiresAt };
      }
    })().finally(() => {
      refreshing = null;
    });
    await refreshing;
  }
  return session.captureToken;
}

// ------------------------------------------------------------------ one channel

class CaptureChannel {
  readonly name: Channel;
  private socket: WebSocket | null = null;
  private buffer: ArrayBuffer[] = [];
  private ready = false;
  private stopping = false;
  private attempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private closed: (() => void) | null = null;
  private status: ChannelStatus = "connecting";

  constructor(name: Channel) {
    this.name = name;
  }

  push(frame: ArrayBuffer): void {
    if (this.stopping) return;
    if (this.ready && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(frame);
      return;
    }
    this.buffer.push(frame);
    if (this.buffer.length > MAX_BUFFERED_FRAMES) this.buffer.shift(); // oldest first, like the server
  }

  private setStatus(status: ChannelStatus, detail?: string): void {
    if (this.status === status && !detail) return;
    this.status = status;
    notify({ type: "offscreen-status", channel: this.name, status, detail });
  }

  async connect(forceRefresh = false): Promise<void> {
    if (this.stopping || !session) return;
    let token: string;
    try {
      token = await freshToken(forceRefresh);
    } catch {
      this.scheduleRetry(true);
      return;
    }
    const socket = new WebSocket(session.ingestUrl);
    this.socket = socket;
    this.ready = false;
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: "init",
          token,
          channel: this.name,
          sample_rate: 16000,
          encoding: "pcm_s16le",
        }),
      );
    };
    socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      let msg: { type?: string } = {};
      try {
        msg = JSON.parse(event.data) as { type?: string };
      } catch {
        return;
      }
      if (msg.type === "ready") {
        this.ready = true;
        this.attempts = 0;
        for (const frame of this.buffer) socket.send(frame);
        this.buffer = [];
        this.setStatus("live");
      }
    };
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.ready = false;
      const action = closeAction(event.code, this.stopping);
      if (action === "done") {
        this.setStatus("done");
        this.closed?.();
      } else if (action === "fatal") {
        this.setStatus("failed", describeClose(event.code));
      } else {
        this.scheduleRetry(action === "refresh");
      }
    };
  }

  private scheduleRetry(refresh: boolean): void {
    if (this.stopping) return;
    this.setStatus("retrying");
    const delay = refresh && this.attempts === 0 ? 0 : backoffMs(this.attempts);
    this.attempts += 1;
    this.retryTimer = setTimeout(() => void this.connect(refresh), delay);
  }

  /** Sends `stop` so the server flushes its last words, and waits for the close. */
  stop(): Promise<void> {
    this.stopping = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      socket?.close(1000);
      this.setStatus("done");
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        socket.close(1000);
        resolve();
      }, STOP_CLOSE_TIMEOUT_MS);
      this.closed = () => {
        clearTimeout(timer);
        resolve();
      };
      if (this.ready) socket.send(JSON.stringify({ type: "stop" }));
      else socket.close(1000);
    });
  }
}

// ------------------------------------------------------------------ audio

let context: AudioContext | null = null;
let streams: MediaStream[] = [];
const channels: Partial<Record<Channel, CaptureChannel>> = {};

async function encoderFor(stream: MediaStream, channel: CaptureChannel, audible: boolean): Promise<void> {
  if (!context) throw new Error("no audio context");
  const source = context.createMediaStreamSource(stream);
  if (audible) source.connect(context.destination);
  const node = new AudioWorkletNode(context, "pcm-encoder", { numberOfInputs: 1, numberOfOutputs: 1 });
  node.port.onmessage = (event: MessageEvent<ArrayBuffer>) => channel.push(event.data);
  source.connect(node);
  // The node outputs silence; connecting it keeps the graph pulling it on every render quantum.
  node.connect(context.destination);
}

async function capture(streamId: string, useMic: boolean): Promise<void> {
  const tabStream = await navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
    video: false,
  } as unknown as MediaStreamConstraints);
  streams.push(tabStream);
  context = new AudioContext();
  await context.audioWorklet.addModule(chrome.runtime.getURL("worklet.js"));

  channels.tab = new CaptureChannel("tab");
  await encoderFor(tabStream, channels.tab, true);
  for (const track of tabStream.getAudioTracks()) {
    track.addEventListener("ended", () =>
      notify({ type: "offscreen-ended", reason: "The meeting tab stopped sharing its audio." }),
    );
  }

  if (!useMic) {
    notify({ type: "offscreen-mic", ok: false, note: "Your microphone is off, so your own voice is not in the transcript." });
    return;
  }
  try {
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    streams.push(mic);
    channels.mic = new CaptureChannel("mic");
    await encoderFor(mic, channels.mic, false);
    notify({ type: "offscreen-mic", ok: true });
  } catch {
    notify({
      type: "offscreen-mic",
      ok: false,
      note: "Mytheus could not use your microphone, so your own voice is not in the transcript.",
    });
  }
}

async function stopAll(): Promise<void> {
  await Promise.all(Object.values(channels).map((c) => c?.stop()));
  for (const stream of streams) for (const track of stream.getTracks()) track.stop();
  streams = [];
  await context?.close().catch(() => undefined);
  context = null;
  notify({ type: "offscreen-stopped" });
}

// ------------------------------------------------------------------ messages

chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
  const msg = raw as OffscreenMessage;
  if (msg?.target !== "offscreen" || sender.id !== chrome.runtime.id) return false;
  switch (msg.type) {
    case "capture":
      capture(msg.streamId, msg.useMic).then(
        () => sendResponse({ ok: true }),
        (error: unknown) => {
          // The worker turns this into the error the popup shows.
          sendResponse({ ok: false, error: String(error) });
        },
      );
      return true;
    case "connect":
      session = msg.session;
      void channels.tab?.connect();
      void channels.mic?.connect();
      sendResponse({ ok: true });
      return false;
    case "token":
      if (session) session = { ...session, captureToken: msg.captureToken, expiresAt: msg.expiresAt };
      sendResponse({ ok: true });
      return false;
    case "stop":
      sendResponse({ ok: true });
      void stopAll();
      return false;
    default:
      return false;
  }
});
