import type { Page } from "@playwright/test";

/* A fake microphone and recorder for the component tests (Talk mode and dictation, which are
   heard by the server): `getUserMedia` answers a real MediaStream from a Web Audio oscillator
   whose gain the test turns up and down (`window.__talk(true|false)`), so the analyser, the
   level and voice-activity detection all run for real; `MediaRecorder` is a stand-in that hands
   back a small `audio/webm` blob on stop. `deny` makes the microphone refuse with that error
   name. `POST /api/voice/transcribe` is answered by `fakeTranscribe`. */

export async function fakeMic(page: Page, opts: { deny?: string; noRecorder?: boolean } = {}) {
  const install = ({ deny, noRecorder }: { deny?: string; noRecorder?: boolean }) => {
    const w = window as unknown as Record<string, unknown>;
    let gain: GainNode | null = null;
    w.__talk = (on: boolean) => {
      if (gain) gain.gain.value = on ? 0.6 : 0;
    };
    const getUserMedia = async () => {
      if (deny) throw Object.assign(new Error(deny), { name: deny });
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.frequency.value = 220;
      gain = ctx.createGain();
      gain.gain.value = 0;
      const dest = ctx.createMediaStreamDestination();
      osc.connect(gain).connect(dest);
      osc.start();
      void ctx.resume();
      return dest.stream;
    };
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
    if (noRecorder) {
      delete w.MediaRecorder;
      return;
    }
    class FakeRecorder {
      static isTypeSupported(t: string) {
        return t.startsWith("audio/webm");
      }
      state: "inactive" | "recording" = "inactive";
      mimeType: string;
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      private began = 0;
      constructor(_stream: MediaStream, o?: { mimeType?: string }) {
        this.mimeType = o?.mimeType || "audio/webm";
      }
      start() {
        this.state = "recording";
        this.began = Date.now();
        (w.__recorders as number | undefined) ?? (w.__recorders = 0);
        w.__recorders = (w.__recorders as number) + 1;
      }
      stop() {
        if (this.state === "inactive") return;
        this.state = "inactive";
        const ms = Date.now() - this.began;
        setTimeout(() => {
          this.ondataavailable?.({ data: new Blob([`fake-opus-${ms}ms`], { type: this.mimeType }) });
          this.onstop?.();
        }, 5);
      }
    }
    w.MediaRecorder = FakeRecorder;
  };
  await page.addInitScript(install, opts);
  await page.evaluate(install, opts);
}

/** Turn the fake voice on for `ms`, then quiet. */
export async function say(page: Page, ms = 700) {
  await page.evaluate(() => (window as unknown as { __talk: (on: boolean) => void }).__talk(true));
  await page.waitForTimeout(ms);
  await page.evaluate(() => (window as unknown as { __talk: (on: boolean) => void }).__talk(false));
}

export async function fakeTranscribe(page: Page, answer: { text?: string; status?: number; reason?: string } | (() => { text?: string; status?: number; reason?: string })) {
  const calls: { type: string | null; language: string | null; size: number }[] = [];
  await page.route("**/api/voice/transcribe**", async (route) => {
    const req = route.request();
    calls.push({ type: req.headers()["content-type"] ?? null, language: new URL(req.url()).searchParams.get("language"), size: req.postDataBuffer()?.length ?? 0 });
    const a = typeof answer === "function" ? answer() : answer;
    if (a.status && a.status >= 300) {
      await route.fulfill({ status: a.status, contentType: "application/json", body: JSON.stringify({ reason: a.reason ?? "listening_failed" }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ text: a.text ?? "" }) });
  });
  return calls;
}
