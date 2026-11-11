import type { Page } from "@playwright/test";

/* A fake Web Speech API for the briefing tests: two English voices, utterances that "speak" one
   word every `__wordMs` ms (word boundary events, then end), and cancel that interrupts. The
   spoken texts are kept on `window.__spoken`. */
export async function fakeSpeech(page: Page, wordMs = 120) {
  // Component tests mount without navigating, so the fake goes in now (and on any reload).
  await page.addInitScript(install, wordMs);
  await page.evaluate(install, wordMs);
}

function install(ms: number) {
  {
    const w = window as unknown as Record<string, unknown>;
    w.__wordMs = ms;
    w.__spoken = [];
    const voices = [
      { name: "Google US English", lang: "en-US", localService: false, default: true, voiceURI: "google-us" },
      { name: "Samantha", lang: "en-US", localService: true, default: false, voiceURI: "samantha" },
    ];
    type U = { text: string; onstart?: (e: unknown) => void; onboundary?: (e: unknown) => void; onend?: (e: unknown) => void; onerror?: (e: unknown) => void };
    class FakeUtterance {
      text: string;
      voice: unknown = null;
      lang = "";
      rate = 1;
      pitch = 1;
      constructor(text: string) {
        this.text = text;
      }
    }
    let current: U | null = null;
    let timers: number[] = [];
    const synth = {
      speaking: false,
      getVoices: () => voices,
      addEventListener() {},
      removeEventListener() {},
      cancel() {
        timers.forEach((t) => clearTimeout(t));
        timers = [];
        const c = current;
        current = null;
        c?.onerror?.({ error: "interrupted" });
      },
      speak(u: U) {
        current = u;
        (w.__spoken as string[]).push(u.text);
        const words = [...u.text.matchAll(/\S+/g)];
        let i = 0;
        const step = () => {
          if (current !== u) return;
          if (i < words.length) {
            u.onboundary?.({ name: "word", charIndex: words[i]!.index });
            i += 1;
            timers.push(window.setTimeout(step, w.__wordMs as number));
          } else {
            current = null;
            u.onend?.({});
          }
        };
        timers.push(
          window.setTimeout(() => {
            u.onstart?.({});
            step();
          }, 10),
        );
      },
      pause() {},
      resume() {},
    };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
  }
}
