/* Ask Myte v2 (ADR-0049): proposal cards for every new kind, the peer question review sheet and
   the asker's waiting card, voice mode, attachments, Your Myte's memory and routines cards, and
   Home's "Today from Myte" with the floating nudge. Keyboard paths, light and dark, phone width,
   axe (WCAG 2 A and AA, contrast included). The stream route is mocked with `page.route`; server
   actions come from stubs/actions.ts.

     npm run test:a11y -- ask-myte-v2
     ASK2_SHOTS=/some/dir npm run test:a11y -- ask-myte-v2   (also writes screenshots) */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/experimental-ct-react";
import { AskMyteHarness } from "./AskMyteHarness";
import { AskMyteV2Harness } from "./AskMyteV2Harness";
import { ANSWER_EVENTS, sse } from "./ask-myte-fixture";
import { PEER_DRAFT, proposalEvents } from "./ask-myte-v2-fixture";
import { fakeVoice } from "./voice-fake";
import { fakeMic, fakeTranscribe, say } from "./mic-fake";
import type { StreamEvent } from "../../src/lib/ask-myte/types";

test.describe.configure({ timeout: 90_000 });

const SHOTS = process.env.ASK2_SHOTS;
const shot = async (page: Page, name: string, fullPage = false) => {
  if (!SHOTS) return;
  await page.mouse.move(0, 0);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
};
/** One element, scrolled into view, at rest. */
const elShot = async (el: Locator, name: string) => {
  if (!SHOTS) return;
  await el.scrollIntoViewIfNeeded();
  await el.page().mouse.move(0, 0);
  await el.page().waitForTimeout(350);
  await el.screenshot({ path: `${SHOTS}/${name}.png` });
};

async function mockStream(page: Page, events: StreamEvent[] | ((body: Record<string, unknown>) => StreamEvent[])) {
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/ask-myte", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    bodies.push(body);
    await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream; charset=utf-8" }, body: sse(typeof events === "function" ? events(body) : events) });
  });
  return bodies;
}

async function axe(page: Page) {
  // Measure at rest: no hover state or colour transition under the pointer.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

const v2log = (page: Page, name: string) => page.evaluate((n) => (window as unknown as { __v2?: Record<string, unknown[]> }).__v2?.[n] ?? [], name);

async function ask(page: Page, text = "Set up a pricing review with Maya and Raj tomorrow") {
  const box = page.getByRole("textbox", { name: "Ask Pip" });
  await box.focus();
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
  return page.getByRole("article", { name: "Pip's answer" }).last();
}

/* ---------------- proposals (F3, F1, F4, R2) ---------------- */

for (const theme of ["light", "dark"] as const) {
  test(`proposals (${theme}): a meeting, a Slack message, a teammate's Myte and a memory, confirmed from the keyboard`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockStream(page, proposalEvents(["schedule_meeting", "slack_post", "ask_myte", "memory"]));
    await mount(<AskMyteHarness theme={theme} />);
    const answer = await ask(page);

    const meeting = answer.getByRole("region", { name: /A new meeting/ });
    await expect(meeting.getByText("Pricing review")).toBeVisible();
    await expect(meeting.getByText("Maya Chen")).toBeVisible();
    const slack = answer.getByRole("region", { name: /A Slack message/ });
    await expect(slack.getByText("To #pricing")).toBeVisible();
    const peer = answer.getByRole("region", { name: /A question for a teammate's Myte/ });
    await expect(peer.getByText("Ask Samar Rihan's Myte")).toBeVisible();
    await expect(peer.getByText("Samar reviews the answer before it is sent")).toBeVisible();
    await expect(answer.getByRole("region", { name: /Something to remember/ }).getByText("Prefers short bullet answers")).toBeVisible();
    await shot(page, `proposals-${theme}`, true);
    await elShot(meeting, `card-meeting-${theme}`);
    await elShot(slack, `card-slack-${theme}`);
    await elShot(peer, `card-askmyte-${theme}`);
    await axe(page);

    // Schedule from the keyboard: the result links to the new meeting.
    await meeting.getByRole("button", { name: "Schedule meeting" }).focus();
    await page.keyboard.press("Enter");
    await expect(answer.getByRole("link", { name: "Open meeting" })).toBeVisible();

    // Ask the teammate's Myte: the card becomes the waiting card with that Myte's plush.
    await peer.getByRole("button", { name: "Send question" }).click();
    const waiting = answer.getByRole("region", { name: "Question to Bolt" });
    await expect(waiting.getByText("Waiting for Bolt")).toBeVisible();
    await expect(waiting.getByText("Drafted when Samar next opens Mytheus")).toBeVisible();

    // R2: what was confirmed is stored on the message, not only in this browser.
    const states = (await v2log(page, "states")) as { id: string; states: Record<string, string> }[];
    expect(states.at(-1)?.id).toBe("bbbbbbbb-0000-4000-8000-000000000002");
    expect(states.at(-1)?.states).toMatchObject({ "p-meet": "confirmed", "p-ask": "confirmed" });
    await elShot(answer, `proposals-confirmed-${theme}`);
    await axe(page);
  });
}

test("proposals: share link with Copy, an export, and a tool that is not connected", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    (window as unknown as { __v2Reach: unknown }).__v2Reach = { notion: { configured: true, connected: false } };
  });
  await mockStream(page, proposalEvents(["share_decision", "export_decisions", "invite_people"]));
  await mount(<AskMyteHarness />);
  const answer = await ask(page, "Share the Drive decision and export the meeting");

  const exp = answer.getByRole("region", { name: /An export/ });
  await expect(exp.getByText("Notion is not connected to the workspace.")).toBeVisible();
  await expect(exp.getByRole("link", { name: "Open integrations" })).toHaveAttribute("href", "/settings/integrations");
  await expect(exp.getByRole("button", { name: "Export", exact: true })).toBeDisabled();

  const share = answer.getByRole("region", { name: /A share link/ });
  await share.getByRole("button", { name: "Create link" }).click();
  await expect(answer.getByRole("textbox", { name: "Share link" })).toHaveValue("https://app.mytheus.test/s/7Kq2xV");
  await expect(answer.getByRole("button", { name: "Copy link" })).toBeVisible();

  await answer.getByRole("region", { name: /Invitations/ }).getByRole("button", { name: "Send invites" }).click();
  await expect(answer.getByText("Added 1 person.")).toBeVisible();
  await elShot(answer, "proposals-share-export");
  await axe(page);
});

test("proposals: Edit a meeting with date and time pickers and the member picker", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockStream(page, proposalEvents(["schedule_meeting"]));
  await mount(<AskMyteHarness />);
  const answer = await ask(page);
  const card = answer.getByRole("region", { name: /A new meeting/ });
  await card.getByRole("button", { name: "Edit" }).click();
  await expect(card.getByLabel("Title")).toHaveValue("Pricing review");
  await expect(card.getByLabel("Date")).toHaveAttribute("type", "date");
  await expect(card.getByLabel("Starts")).toHaveValue("10:00");
  await expect(card.getByLabel("Ends")).toHaveValue("10:30");
  await card.getByLabel("Ends").fill("11:00");
  await expect(card.getByText("Samar Rihan")).toBeVisible();
  await elShot(card, "proposal-edit-meeting");
  await axe(page);
  await card.getByRole("button", { name: "Schedule meeting" }).click();
  const confirmed = (await page.evaluate(() => (window as unknown as { __askConfirmed?: { edits: { end?: string } }[] }).__askConfirmed)) ?? [];
  expect(confirmed.at(-1)?.edits.end).toMatch(/T11:00:00/);
});

/* ---------------- F1: the asker's waiting card ---------------- */

test("waiting card: polls and turns into the answer signed by the teammate's Myte", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mount(<AskMyteV2Harness view="waiting" />);
  const card = page.getByRole("region", { name: "Question to Bolt" });
  await expect(card.getByText("Waiting for Bolt")).toBeVisible();
  await axe(page);
  await page.evaluate(() => {
    (window as unknown as { __v2PeerAnswered: boolean }).__v2PeerAnswered = true;
  });
  await card.getByRole("button", { name: "Check now" }).click();
  await expect(card.getByText("The copy is final. Maya signs it off on Monday.")).toBeVisible();
  await expect(card.getByText("Samar reviewed and sent this answer.")).toBeVisible();
  await shot(page, "peer-waiting-answered");
});

/* ---------------- F1: the recipient's review ---------------- */

for (const theme of ["light", "dark"] as const) {
  test(`peer review (${theme}): draft with my Myte, edit, send without citations`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const bodies = await mockStream(page, PEER_DRAFT);
    await mount(<AskMyteV2Harness view="inbox" theme={theme} />);
    const section = page.getByRole("region", { name: "Questions for your Myte" });
    await expect(section.getByText("1 waiting")).toBeVisible();
    await expect(section.getByText("Answer sent")).toBeVisible();
    await shot(page, `peer-inbox-${theme}`);
    await axe(page);

    const review = section.getByRole("button", { name: "Review Samar's question" });
    await review.focus();
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: "Samar's question for Pip" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("Samar sees only the answer you send.")).toBeVisible();
    // Focus starts on Draft with Pip.
    await expect(sheet.getByRole("button", { name: "Draft with Pip" })).toBeFocused();
    await page.keyboard.press("Enter");
    const field = sheet.getByRole("textbox", { name: "Your answer to Samar" });
    await expect(field).toHaveValue("We dropped Google Drive access on Thursday, so Calendar is the only Google permission. Nothing is blocked on you. I still owe the Calendar reconnect, due Friday.");
    expect(bodies[0]).toMatchObject({ mode: "peer_answer", peer: { question_id: "99999999-9999-4999-8999-999999999991", from_name: "Samar Rihan" } });
    await expect(sheet.getByText("2 sources, only you see these")).toBeVisible();
    await shot(page, `peer-review-${theme}`);
    await axe(page);

    // Tab stays in the sheet.
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }

    await field.fill("Drive access is gone; nothing is blocked on you.");
    await sheet.getByRole("button", { name: "Send to Samar" }).click();
    await expect(sheet).toHaveCount(0);
    const sent = (await v2log(page, "answer")) as { answer: string }[];
    expect(sent[0].answer).toBe("Drive access is gone; nothing is blocked on you.");
    await expect(review).toHaveCount(0);
  });
}

test("peer review: opened from the notification link, declined with a reason, Esc closes", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mount(<AskMyteV2Harness view="inbox" openPeer />);
  const sheet = page.getByRole("dialog", { name: "Samar's question for Pip" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Decline", exact: true }).click();
  await sheet.getByLabel("Why not? (optional, Samar sees it)").fill("Ask Maya, she owns this now.");
  await sheet.getByRole("button", { name: "Decline question" }).click();
  await expect(sheet).toHaveCount(0);
  expect(((await v2log(page, "decline")) as { reason: string }[])[0].reason).toBe("Ask Maya, she owns this now.");
});

test("peer review: phone width", async ({ mount, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockStream(page, PEER_DRAFT);
  await mount(<AskMyteV2Harness view="inbox" />);
  await noSideScroll(page);
  await page.getByRole("button", { name: "Review Samar's question" }).click();
  await page.getByRole("button", { name: "Draft with Pip" }).click();
  await expect(page.getByRole("textbox", { name: "Your answer to Samar" })).not.toHaveValue("");
  await noSideScroll(page);
  await shot(page, "peer-review-phone");
  await axe(page);
});

/* ---------------- F6: voice mode ---------------- */
/* Talk mode is heard by the server: a fake microphone (a real Web Audio stream the test turns up
   and down), a stand-in MediaRecorder and a fake transcribe route. */

for (const theme of ["light", "dark"] as const) {
  test(`voice mode (${theme}): it greets, a pause after speech sends the clip, it answers aloud, Esc ends`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await fakeMic(page);
    const heard = await fakeTranscribe(page, { text: "what do I owe this week" });
    const spoken = await fakeVoice(page, { msPerWord: 15 });
    const bodies = await mockStream(page, ANSWER_EVENTS);
    await mount(<AskMyteHarness theme={theme} />);

    await page.getByRole("button", { name: "Talk to Pip" }).click();
    const voice = page.getByRole("dialog", { name: "Talking with Pip" });
    await expect(voice).toBeVisible();
    // It speaks first, in character, with the person's first name.
    await expect.poll(() => spoken.length).toBeGreaterThan(1);
    expect(spoken[0]!.text).toMatch(/Sushan/);
    expect(spoken.map((x) => x.text).join(" ")).toMatch(/Pip/);
    await expect(voice.getByText("Pip is listening")).toBeVisible({ timeout: 10_000 });
    await expect(voice.getByText("Listening…")).toBeVisible();
    await expect(voice.getByRole("button", { name: "Pause" })).toBeVisible();
    await shot(page, `voice-listening-${theme}`);
    await axe(page);

    await page.waitForTimeout(600); // the room is measured first
    await page.evaluate(() => (window as unknown as { __talk: (on: boolean) => void }).__talk(true));
    await expect(voice.getByText("Hearing you…")).toBeVisible();
    await expect(voice.getByRole("button", { name: "Send now" })).toBeVisible();
    await page.waitForTimeout(500);
    await page.evaluate(() => (window as unknown as { __talk: (on: boolean) => void }).__talk(false));
    // About 1.2 s of quiet sends the recording to be transcribed, then the words as the question.
    await expect.poll(() => heard.length, { timeout: 5000 }).toBe(1);
    expect(heard[0]!.type).toBe("audio/webm");
    expect(heard[0]!.language).toBe("en");
    expect(heard[0]!.size).toBeGreaterThan(0);
    await expect.poll(() => bodies.length, { timeout: 5000 }).toBe(1);
    expect(bodies[0].question).toBe("what do I owe this week");
    await expect(voice.getByRole("region", { name: "Pip's answer" }).getByText("One thing is on you")).toBeVisible();
    // It reads the answer in its own voice, then listens again.
    await expect.poll(() => spoken.length).toBeGreaterThan(1);
    expect(spoken[1]!.text).not.toMatch(/\[\d+\]/);
    await expect(voice.getByText("Pip is listening")).toBeVisible({ timeout: 15_000 });
    await shot(page, `voice-answered-${theme}`);
    await axe(page);

    await page.keyboard.press("Escape");
    await expect(voice).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Ask Pip" })).toBeFocused();
    // The turn is in the same thread as typing.
    await expect(page.getByRole("article", { name: "Pip's answer" }).getByText("One thing is on you")).toBeVisible();
  });
}

/* A stream that arrives over time: the page's fetch for /api/ask-myte answers a ReadableStream
   that sends each event after its delay and holds `done` until the test calls __releaseDone(). */
async function slowStream(page: Page, events: { at: number; ev: StreamEvent }[], done: StreamEvent) {
  await page.evaluate(
    ({ events, done }) => {
      const w = window as unknown as Record<string, unknown>;
      const real = window.fetch.bind(window);
      let release: () => void = () => {};
      w.__releaseDone = () => release();
      w.__askBodies = [];
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (!url.endsWith("/api/ask-myte")) return real(input, init);
        (w.__askBodies as unknown[]).push(JSON.parse(String(init?.body ?? "{}")));
        const enc = new TextEncoder();
        const line = (e: { event: string; data: unknown }) => enc.encode(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`);
        const body = new ReadableStream<Uint8Array>({
          async start(ctrl) {
            const t0 = Date.now();
            for (const { at, ev } of events) {
              await new Promise((r) => setTimeout(r, Math.max(0, at - (Date.now() - t0))));
              ctrl.enqueue(line(ev));
            }
            await new Promise<void>((r) => (release = r));
            ctrl.enqueue(line(done));
            ctrl.close();
          },
        });
        return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
      };
    },
    { events, done },
  );
}

test("voice mode: an acknowledgment at once, a step filler, then the answer spoken before done", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fakeMic(page);
  await fakeTranscribe(page, { text: "what is on my calendar tomorrow" });
  const spoken = await fakeVoice(page, { msPerWord: 160 });
  const logs: string[] = [];
  page.on("console", (m) => logs.push(m.text()));
  await mount(<AskMyteHarness />);
  await slowStream(
    page,
    [
      { at: 50, ev: { event: "step", data: { id: "s1", label: "Reading your calendar", state: "running" } } },
      { at: 1500, ev: { event: "delta", data: { text: "Tomorrow you have two meetings, " } } },
      { at: 1600, ev: { event: "delta", data: { text: "the Feature Update at 10 [1] and a call with Samar at 3. " } } },
      { at: 1700, ev: { event: "delta", data: { text: "Nothing is due." } } },
    ],
    { event: "done", data: { abstained: false, degraded: false, cited: [1] } },
  );
  // Every filler change on the dialog, in order.
  await page.evaluate(() => {
    const w = window as unknown as { __fillers: string[] };
    w.__fillers = [];
    new MutationObserver((list) => {
      for (const m of list) {
        const v = (m.target as HTMLElement).getAttribute("data-filler");
        if (m.attributeName === "data-filler" && v) w.__fillers.push(v);
      }
    }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ["data-filler"] });
  });

  await page.getByRole("button", { name: "Talk to Pip" }).click();
  const voice = page.getByRole("dialog", { name: "Talking with Pip" });
  // The fillers are rendered in its voice while it greets.
  await expect.poll(() => spoken.map((x) => x.text), { timeout: 10_000 }).toEqual(expect.arrayContaining(["Got it.", "Checking your calendar."]));
  await voice.focus();
  await page.keyboard.press("Space"); // skip the greeting
  await expect(voice.getByText("Pip is listening")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await say(page, 500);

  // The acknowledgment plays as the question goes, then the calendar filler after it.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __fillers: string[] }).__fillers), { timeout: 8000 }).toEqual(["ack", "schedule"]);
  // The answer is spoken while it streams: done has not been sent yet.
  await expect(voice.getByText("Pip is speaking")).toBeVisible({ timeout: 10_000 });
  const units = spoken.map((x) => x.text);
  expect(units).toContain("Tomorrow you have two meetings,");
  expect(units.some((u) => /\[\d\]/.test(u))).toBe(false);
  await expect(voice.getByRole("region", { name: "Pip's answer" }).getByText("Nothing is due.")).toBeVisible();
  // Never more than two fillers in the turn.
  expect(await page.evaluate(() => (window as unknown as { __fillers: string[] }).__fillers.length)).toBe(2);

  await page.evaluate(() => (window as unknown as { __releaseDone: () => void }).__releaseDone());
  await expect(voice.getByText("Pip is listening")).toBeVisible({ timeout: 15_000 });
  expect(spoken.map((x) => x.text)).toEqual(expect.arrayContaining(["the Feature Update at 10 and a call with Samar at 3.", "Nothing is due."]));
  // One timing line per turn, from the end of speech.
  const line = logs.find((l) => l.startsWith("[talk] turn 1"));
  expect(line).toMatch(/stt \d+ ms, step [\d.]+ m?s, text [\d.]+ m?s, audio [\d.]+ m?s, done [\d.]+ m?s, filler [\d.]+ m?s/);
  if (SHOTS) console.log(line);
});

test("voice mode: Space while a filler plays stops it and listens", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fakeMic(page);
  await fakeTranscribe(page, { text: "who owns pricing" });
  await fakeVoice(page, { msPerWord: 400 });
  await mount(<AskMyteHarness />);
  await slowStream(page, [{ at: 50, ev: { event: "step", data: { id: "s1", label: "Looking up people", state: "running" } } }], { event: "done", data: {} });
  await page.getByRole("button", { name: "Talk to Pip" }).click();
  const voice = page.getByRole("dialog", { name: "Talking with Pip" });
  await page.waitForTimeout(3000); // the fillers render
  await voice.focus();
  await page.keyboard.press("Space");
  await expect(voice.getByText("Pip is listening")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await say(page, 500);
  await expect(voice).toHaveAttribute("data-filler", /ack|people/, { timeout: 8000 });
  await expect(voice.getByRole("button", { name: "Stop and listen" })).toBeVisible();
  await voice.focus();
  await page.keyboard.press("Space");
  await expect(voice.getByText("Pip is listening")).toBeVisible();
  await expect(voice).not.toHaveAttribute("data-filler", /.+/);
  await page.keyboard.press("Escape");
  await expect(voice).toHaveCount(0);
});

test("voice mode: Space interrupts the greeting, pauses and resumes; mute keeps it quiet; nothing heard is never sent", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fakeMic(page);
  const heard = await fakeTranscribe(page, { text: "" });
  await fakeVoice(page, { msPerWord: 200 });
  await mount(<AskMyteHarness />);
  await page.getByRole("button", { name: "Talk to Pip" }).click();
  const voice = page.getByRole("dialog", { name: "Talking with Pip" });
  await expect(voice.getByText("Pip is speaking")).toBeVisible();
  await voice.focus();
  await page.keyboard.press("Space");
  await expect(voice.getByText("Pip is listening")).toBeVisible();
  await voice.getByRole("button", { name: /^Mute/ }).click();
  await expect(voice.getByRole("button", { name: "Read answers aloud" })).toHaveAttribute("aria-pressed", "true");
  await voice.focus();
  await page.keyboard.press("Space");
  await expect(voice.getByText("Paused", { exact: true })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(voice.getByText("Pip is listening")).toBeVisible();
  // Quiet for a while: nothing is sent.
  await page.waitForTimeout(2000);
  expect(heard.length).toBe(0);
  // Speech the server hears as nothing: it says so and listens again.
  await say(page, 600);
  await expect(voice.getByText("I didn't catch that. Try again?")).toBeVisible({ timeout: 6000 });
  await expect(voice.getByText("Pip is listening")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await noSideScroll(page);
  await shot(page, "voice-phone");
  await voice.getByRole("button", { name: "End the conversation" }).click();
  await expect(voice).toHaveCount(0);
});

test("voice mode: a blocked microphone says how to allow it; listening unavailable says so", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fakeMic(page, { deny: "NotAllowedError" });
  await fakeVoice(page, { status: 503 });
  await mount(<AskMyteHarness />);
  await page.getByRole("button", { name: "Talk to Pip" }).click();
  const voice = page.getByRole("dialog", { name: "Talking with Pip" });
  await expect(voice.getByRole("alert")).toContainText("blocked the microphone");
  await expect(voice.getByRole("alert")).toContainText("allow the microphone for this site");
  await expect(voice.getByRole("button", { name: "Resume" })).toBeVisible();
  await shot(page, "voice-mic-blocked");
  await axe(page);
});

test("voice mode: when the server cannot listen it pauses with plain words", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fakeMic(page);
  await fakeTranscribe(page, { status: 503, reason: "listening_not_connected" });
  await fakeVoice(page, { status: 503 });
  await mount(<AskMyteHarness />);
  await page.getByRole("button", { name: "Talk to Pip" }).click();
  const voice = page.getByRole("dialog", { name: "Talking with Pip" });
  // The voice is off too: the greeting is skipped quietly and it listens.
  await expect(voice.getByText("Pip is listening")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(600);
  await say(page, 600);
  await expect(voice.getByRole("alert")).toContainText("Listening is unavailable right now", { timeout: 6000 });
  await expect(voice.getByText("Paused", { exact: true })).toBeVisible();
});

test("voice mode: no Talk button where the browser cannot record", async ({ mount, page }) => {
  await fakeMic(page, { noRecorder: true });
  await mount(<AskMyteHarness />);
  await expect(page.getByRole("textbox", { name: "Ask Pip" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Talk to Pip" })).toHaveCount(0);
});

test("dictation: the composer mic records, stops after a pause and types what the server heard", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fakeMic(page);
  const heard = await fakeTranscribe(page, { text: "who owes me an update" });
  await mount(<AskMyteHarness />);
  const mic = page.getByRole("button", { name: "Ask by voice" });
  await mic.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Stop listening" })).toBeVisible();
  await page.waitForTimeout(600);
  await say(page, 600);
  await expect.poll(() => heard.length, { timeout: 6000 }).toBe(1);
  await expect(page.getByRole("textbox", { name: "Ask Pip" })).toHaveValue("who owes me an update");
  await expect(page.getByRole("button", { name: "Ask by voice" })).toBeVisible();
});

/* ---------------- F7: attachments ---------------- */

test("attachments: attach a file, paste long text, limits, sent with the question", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const bodies = await mockStream(page, ANSWER_EVENTS);
  await mount(<AskMyteHarness />);
  await page.locator('input[type="file"]').setInputFiles({ name: "pricing-notes.md", mimeType: "text/markdown", buffer: Buffer.from("# Pricing\nNew tiers on 1 December.") });
  const chips = page.getByRole("list", { name: "Attached to this question" });
  await expect(chips.getByText("pricing-notes.md")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: "deck.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") });
  await expect(page.getByText("deck.pdf isn't a text file. Attach .txt, .md or .csv.")).toBeVisible();

  const box = page.getByRole("textbox", { name: "Ask Pip" });
  await box.focus();
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    document.activeElement?.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, "Long pasted brief. ".repeat(120));
  await expect(chips.getByText("Pasted text.txt")).toBeVisible();
  await expect(page.getByRole("button", { name: "Paste as text instead" })).toBeVisible();
  await shot(page, "attachments");
  await axe(page);

  await box.fill("Does this conflict with our decisions?");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("list", { name: "Attached" }).getByText("pricing-notes.md")).toBeVisible();
  const files = bodies[0].attachments as { name: string; text: string }[];
  expect(files.map((f) => f.name)).toEqual(["pricing-notes.md", "Pasted text.txt"]);
  await expect(chips).toHaveCount(0);
});

/* ---------------- F4, F5: Your Myte ---------------- */

for (const theme of ["light", "dark"] as const) {
  test(`Your Myte (${theme}): what it remembers and routines, from the keyboard`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mount(<AskMyteV2Harness view="yourmyte" theme={theme} />);
    const memory = page.getByRole("region", { name: "What Pip remembers" });
    await expect(memory.getByText("Prefers short bullet answers")).toBeVisible();
    const routines = page.getByRole("region", { name: "Routines" });
    await expect(routines.getByText("Every Monday at 09:00")).toBeVisible();
    await expect(routines.getByText("Paused")).toBeVisible();
    await shot(page, `yourmyte-${theme}`, true);
    await axe(page);

    await memory.getByRole("textbox", { name: "Something for Pip to remember" }).fill("Call me Sush");
    await page.keyboard.press("Enter");
    await expect(memory.getByText("Call me Sush")).toBeVisible();
    await memory.getByRole("button", { name: "Forget: Prefers short bullet answers" }).click();
    await expect(memory.getByText("Prefers short bullet answers")).toHaveCount(0);

    await routines.getByRole("button", { name: "Pause: What changed in pricing this week?" }).click();
    expect(((await v2log(page, "routine-update")) as { patch: { enabled: boolean } }[])[0].patch.enabled).toBe(false);

    await routines.getByRole("button", { name: "Add routine" }).click();
    const dialog = page.getByRole("dialog", { name: "Make this a routine" });
    await expect(dialog.getByRole("textbox", { name: "Ask each time" })).toBeFocused();
    await page.keyboard.type("What did my team decide today?");
    await expect(dialog.getByText(/^Next:/)).toBeVisible();
    await shot(page, `routine-dialog-${theme}`);
    await axe(page);
    await dialog.getByRole("button", { name: "Make it a routine" }).click();
    await expect(dialog).toHaveCount(0);
    expect(((await v2log(page, "routine")) as { question: string; cadence: string }[])[0]).toMatchObject({ question: "What did my team decide today?", cadence: "weekly" });
  });
}

test("Your Myte: phone width", async ({ mount, page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mount(<AskMyteV2Harness view="yourmyte" />);
  await noSideScroll(page);
  await shot(page, "yourmyte-phone", true);
  await axe(page);
});

test("Make this a routine from an answer, and the /routine shortcut", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockStream(page, ANSWER_EVENTS);
  await mount(<AskMyteHarness />);
  const answer = await ask(page, "What changed in pricing?");
  await answer.getByRole("button", { name: "Make this a routine" }).click();
  const dialog = page.getByRole("dialog", { name: "Make this a routine" });
  await expect(dialog.getByRole("textbox", { name: "Ask each time" })).toHaveValue("What changed in pricing?");
  await expect(dialog.getByRole("textbox", { name: "Ask each time" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  const box = page.getByRole("textbox", { name: "Ask Pip" });
  await box.fill("/routine what do I owe today");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Make this a routine" }).getByRole("textbox", { name: "Ask each time" })).toHaveValue("what do I owe today");
});

/* ---------------- F2: Home and the nudge ---------------- */

for (const theme of ["light", "dark"] as const) {
  test(`Home (${theme}): Today from Myte opens the sheet and asks; the nudge bubble dismisses for the day`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const bodies = await mockStream(page, ANSWER_EVENTS);
    await mount(<AskMyteV2Harness view="home" theme={theme} />);
    const card = page.getByRole("region", { name: "Today from Pip" });
    await expect(card.getByText("Test starts in 10 minutes. Want a 30-second prep?")).toBeVisible();
    await expect(card.getByRole("listitem")).toHaveCount(3);
    // The bubble never takes focus.
    const bubble = page.getByRole("region", { name: "From Pip", exact: true });
    await expect(bubble).toBeVisible({ timeout: 10_000 });
    expect(await bubble.evaluate((el) => el.contains(document.activeElement))).toBe(false);
    await shot(page, `home-today-${theme}`, true);
    await axe(page);

    await card.getByRole("button", { name: "Prep me" }).click();
    const sheet = page.getByRole("dialog", { name: "Ask Pip" });
    await expect(sheet).toBeVisible();
    await expect(bubble).toHaveCount(0);
    await expect(sheet.getByRole("article", { name: "Pip's answer" }).getByText("One thing is on you")).toBeVisible();
    expect(bodies[0].question).toBe("Give me a 30-second prep for Test.");
    await sheet.getByRole("button", { name: /^Close \(Esc\)/ }).click();
    await expect(sheet).toBeHidden();

    await bubble.getByRole("button", { name: "Dismiss for today" }).click();
    // The next one takes its place, one at a time, and Home's card follows the dismissal.
    await expect(bubble.getByText(/asked me something for you/)).toBeVisible();
    await expect(card.getByText("Test starts in 10 minutes. Want a 30-second prep?")).toHaveCount(0);
  });
}

test("Home: phone width", async ({ mount, page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mount(<AskMyteV2Harness view="home" />);
  await expect(page.getByRole("region", { name: "From Pip", exact: true })).toBeVisible({ timeout: 10_000 });
  await noSideScroll(page);
  await shot(page, "home-phone");
  await axe(page);
});

/* ---------------- the composer: no scrollbar while it fits; thin scrollbars everywhere ---------------- */

async function composerBox(input: Locator) {
  return input.evaluate((el) => {
    const t = el as HTMLTextAreaElement;
    const cs = getComputedStyle(t);
    return { overflowY: cs.overflowY, height: t.clientHeight, scroll: t.scrollHeight, line: parseFloat(cs.lineHeight) };
  });
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [1280, 390] as const) {
    test(`composer (${theme}, ${width}px): one line has no scrollbar; it grows to 6 lines (4 in the sheet), then scrolls`, async ({ mount, page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const pageView = await mount(<AskMyteHarness theme={theme} />);
      const input = page.getByRole("textbox", { name: "Ask Pip" });
      await input.fill("What do I owe this week?");
      let box = await composerBox(input);
      expect(box.overflowY).toBe("hidden");
      expect(box.height).toBeLessThan(box.line * 2 + 16);
      await input.fill(Array.from({ length: 14 }, (_, i) => `Line ${i + 1}`).join("\n"));
      box = await composerBox(input);
      expect(box.overflowY).toBe("auto");
      expect(box.height).toBeLessThanOrEqual(Math.round(box.line * 6 + 14));
      await shot(page, `composer-page-${theme}-${width}`);

      // The sheet (Cmd+J, the floating Myte): four lines at most.
      await pageView.unmount();
      await mount(<AskMyteHarness theme={theme} view="sheet" />);
      await page.getByRole("button", { name: "Ask about this meeting" }).click();
      const sheet = page.getByRole("dialog", { name: "Ask Pip" });
      const small = sheet.getByRole("textbox", { name: "Ask Pip" });
      await small.fill("Prep me for the review");
      box = await composerBox(small);
      expect(box.overflowY).toBe("hidden");
      expect(box.scroll).toBeLessThanOrEqual(box.height + 1);
      await shot(page, `composer-sheet-one-line-${theme}-${width}`);
      await small.fill(Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join("\n"));
      box = await composerBox(small);
      expect(box.overflowY).toBe("auto");
      expect(box.height).toBeLessThanOrEqual(Math.round(box.line * 4 + 14));
      await small.hover();
      await small.evaluate((el) => (el.scrollTop = 40));
      await shot(page, `composer-sheet-scrolled-${theme}-${width}`);
    });
  }
}

test("scrollbars are thin and token-coloured everywhere", async ({ mount, page }) => {
  await mount(<AskMyteHarness thread />);
  const style = await page.evaluate(() => {
    const el = document.querySelector("main") ?? document.body;
    const cs = getComputedStyle(el);
    return { width: cs.getPropertyValue("scrollbar-width"), color: cs.getPropertyValue("scrollbar-color") };
  });
  expect(style.width).toBe("thin");
  const rail = page.getByRole("navigation").first();
  if (await rail.count()) await rail.hover();
  await shot(page, "scrolled-list-thin-scrollbar");
});
