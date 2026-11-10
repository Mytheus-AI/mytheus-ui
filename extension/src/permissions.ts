/**
 * Asks once for microphone access for the extension. An offscreen document cannot show
 * Chrome's permission prompt, so the popup opens this page in a tab; once allowed, the
 * offscreen document can use the microphone for every later capture.
 */

export {};

const statusEl = document.getElementById("status") as HTMLElement;
const button = document.getElementById("allow") as HTMLButtonElement;

async function ask(): Promise<void> {
  button.disabled = true;
  statusEl.textContent = "Waiting for you to allow the microphone in Chrome's prompt.";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    for (const track of stream.getTracks()) track.stop();
    statusEl.textContent = "Microphone allowed. You can close this tab and start transcribing.";
    button.hidden = true;
    setTimeout(() => window.close(), 2500);
  } catch {
    statusEl.textContent =
      "The microphone was not allowed. To change that, open Chrome's site settings for Mytheus Capture and allow Microphone.";
    button.disabled = false;
  }
}

button.addEventListener("click", () => void ask());
void ask();
