import type { Page } from "@playwright/test";
export { VOICES } from "./voice-fixture";

/* A fake Kokoro voice for the component tests (ADR-0050): `POST /api/voice/speech` answers a
   short WAV tone (decodeAudioData reads WAV as well as MP3), about `msPerWord` per word, so the
   speaker really decodes, plays and measures a level. `status` makes every call fail instead
   (503 `voice_not_connected`, 429 `rate_limited`). Each request body is kept in `spoken`. */

function wav(ms: number): Buffer {
  const rate = 8000;
  const n = Math.max(1, Math.round((rate * ms) / 1000));
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 12000), 44 + i * 2);
  return buf;
}

export async function fakeVoice(page: Page, opts: { msPerWord?: number; status?: 503 | 429 } = {}) {
  const spoken: { text: string; voice?: string; speed?: number }[] = [];
  await page.route("**/api/voice/speech", async (route) => {
    const body = route.request().postDataJSON() as { text: string; voice?: string; speed?: number };
    spoken.push(body);
    if (opts.status) {
      await route.fulfill({ status: opts.status, contentType: "application/json", body: JSON.stringify({ reason: opts.status === 503 ? "voice_not_connected" : "rate_limited" }) });
      return;
    }
    const words = body.text.split(/\s+/).filter(Boolean).length;
    await route.fulfill({ status: 200, contentType: "audio/wav", headers: { "X-Myte-Voice": body.voice ?? "af_heart" }, body: wav(words * (opts.msPerWord ?? 90)) });
  });
  return spoken;
}
