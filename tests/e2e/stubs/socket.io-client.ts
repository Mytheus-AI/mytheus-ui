/* socket.io-client, at the edge: an in-page stand-in for realtime-gateway. It runs the auth
   callback on connect (so the test can see a fresh token was asked for), acks a join, relays chat
   and room events back as the gateway would, and exposes `window.__gateway` so a test can push
   server events ("agent-candidate", "candidate-resolution", "agent-alert" ...). */

type Handler = (...args: unknown[]) => void;
type Ack = Record<string, unknown>;

declare global {
  interface Window {
    __gateway?: MockSocket;
    __gatewayLog?: Array<{ event: string; payload: unknown }>;
  }
}

class MockSocket {
  private handlers = new Map<string, Handler[]>();
  connected = false;
  active = true;
  id = "mock-socket";
  meetingId: string | null = null;
  tokens: string[] = [];

  constructor(
    readonly url: string,
    private readonly opts: { auth?: unknown },
  ) {
    window.__gateway = this;
    window.__gatewayLog = [];
    window.setTimeout(() => this.connect(), 20);
  }

  on(event: string, fn: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn]);
    return this;
  }
  off(event: string, fn?: Handler) {
    this.handlers.set(event, fn ? (this.handlers.get(event) ?? []).filter((h) => h !== fn) : []);
    return this;
  }
  removeAllListeners() {
    this.handlers.clear();
    return this;
  }

  connect() {
    this.active = true;
    const go = (data: { token?: string }) => {
      if (data?.token) this.tokens.push(data.token);
      this.connected = true;
      this.fire("connect");
    };
    const auth = this.opts.auth;
    if (typeof auth === "function") (auth as (cb: (d: { token?: string }) => void) => void)(go);
    else go((auth as { token?: string }) ?? {});
    return this;
  }

  disconnect() {
    this.connected = false;
    this.active = false;
    this.fire("disconnect", "io client disconnect");
    return this;
  }

  /** Simulate the network dropping: Socket.io would reconnect by itself, with a fresh auth call. */
  drop() {
    this.connected = false;
    this.fire("disconnect", "transport close");
  }

  timeout() {
    return { emitWithAck: (event: string, payload: unknown) => this.serve(event, payload) };
  }

  emit(event: string, payload: unknown, ack?: (res: Ack) => void) {
    void this.serve(event, payload).then((res) => ack?.(res));
    return this;
  }

  /** Push a server event to the client. */
  push(event: string, body: unknown) {
    this.fire(event, body);
  }

  private fire(event: string, ...args: unknown[]) {
    for (const h of this.handlers.get(event) ?? []) h(...args);
  }

  private async serve(event: string, payload: unknown): Promise<Ack> {
    window.__gatewayLog?.push({ event, payload });
    const p = (payload ?? {}) as Record<string, unknown>;
    const meetingId = (p.meetingId as string) ?? this.meetingId;
    await new Promise((r) => window.setTimeout(r, 5));
    switch (event) {
      case "join":
        this.meetingId = meetingId;
        window.setTimeout(() => this.push("room-state", { meetingId, payload: { locks: [], hands: [] } }), 5);
        return { ok: true, presence: ["u-maya", "u-raj"] };
      case "chat":
        this.push("chat", { meetingId, userId: "clerk", senderId: "u-maya", content: String(p.content).trim(), clientMsgId: p.clientMsgId, sentAt: new Date().toISOString() });
        this.push("chat-saved", { meetingId, payload: { clientMsgId: p.clientMsgId, id: `row-${Date.now()}`, createdAt: new Date().toISOString() } });
        return { ok: true, persisted: true };
      case "hand":
        this.push("hand", { meetingId, payload: { userId: "u-maya", raised: p.raised, at: new Date().toISOString() } });
        return { ok: true };
      case "reaction":
        this.push("reaction", { meetingId, payload: { id: `r-${Date.now()}`, userId: "u-maya", reaction: p.reaction, at: new Date().toISOString() } });
        return { ok: true };
      default:
        return { ok: true };
    }
  }
}

export type Socket = MockSocket;

export function io(url: string, opts: { auth?: unknown }) {
  return new MockSocket(url, opts);
}
