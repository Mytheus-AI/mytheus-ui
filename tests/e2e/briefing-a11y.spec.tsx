/* Accessibility and behaviour gate for "A briefing from your agent": the after page's player,
   Home's compact player, every state, and Settings > Briefings. axe (WCAG 2.0/2.1 A and AA,
   contrast included) in light and dark; play, the transcript highlighting in sync, skip, speed,
   the keyboard; Brief me through writing to ready; 360 and 1600 px with no horizontal scroll;
   reduced motion. The voice is a fake Kokoro speech route (voice-fake.ts): no device voice exists.
   Run: npm run test:a11y -- briefing */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { BriefingHarness } from "./BriefingHarness";
import { BRIEFING } from "./briefing-fixture";
import { fakeVoice, wav } from "./voice-fake";

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(".mx-app").analyze();
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

let spoken: { text: string }[] = [];
test.beforeEach(async ({ page }) => {
  spoken = await fakeVoice(page, { msPerWord: 70 });
});

for (const theme of ["light", "dark"] as const) {
  test(`the after page player has no axe violations (${theme})`, async ({ mount, page }) => {
    await mount(<BriefingHarness theme={theme} view="after" />);
    await expect(page.getByRole("heading", { name: "A briefing from Juniper" })).toBeVisible();
    const items = page.getByRole("list", { name: "Transcript" }).getByRole("listitem");
    await expect(items).toHaveCount(6);
    expect(await axe(page)).toEqual([]);
    await page.getByRole("button", { name: "Play briefing" }).click();
    await expect(page.locator("mark.brf-word").first()).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test(`Home's compact player and the states have no axe violations (${theme})`, async ({ mount, page }) => {
    await mount(<BriefingHarness theme={theme} view="home" />);
    await expect(page.getByRole("button", { name: "Read the transcript" })).toBeVisible();
    expect(await axe(page)).toEqual([]);
    await page.getByRole("button", { name: "Read the transcript" }).click();
    await expect(page.getByRole("list", { name: "Transcript" })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test(`every state reads clearly (${theme})`, async ({ mount, page }) => {
    await mount(<BriefingHarness theme={theme} view="states" />);
    await expect(page.getByRole("heading", { name: "A briefing from your Myte" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Juniper is writing your briefing" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nothing needs you right now" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your briefing could not be written" })).toBeVisible();
    await expect(page.getByText(/used its agent budget/)).toBeVisible();
    await expect(page.getByText("Your Myte can brief you on this meeting once it has ended.")).toBeVisible();
    await expect(page.getByText(/Briefings after meetings are off/)).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test(`Settings > Briefings has no axe violations (${theme})`, async ({ mount, page }) => {
    await mount(<BriefingHarness theme={theme} view="settings" />);
    await expect(page.getByRole("switch", { name: "A briefing after every meeting" })).toHaveAttribute("aria-checked", "true");
    expect(await axe(page)).toEqual([]);
  });
}

test("the transcript highlights in sync, and skip, pause and open the moment work", async ({ mount, page }) => {
  await mount(<BriefingHarness view="after" />);
  const list = page.getByRole("list", { name: "Transcript" });
  const play = page.getByRole("button", { name: "Play briefing" });
  await play.click();
  const pause = page.getByRole("button", { name: "Pause briefing" });
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  await expect(list.locator('li[aria-current="true"]')).toHaveAttribute("data-seg", "0");
  // The highlighted word moves through the first point.
  const first = await page.locator("mark.brf-word").first().textContent();
  await page.waitForTimeout(400);
  expect(await page.locator("mark.brf-word").first().textContent()).not.toBe(first);
  // Next point: the second is said and highlighted.
  await page.getByRole("button", { name: "Next point" }).click();
  await expect(list.locator('li[aria-current="true"]')).toHaveAttribute("data-seg", "1");
  // It is said in the Myte's own voice, through the speech route.
  await expect.poll(() => spoken.map((b) => b.text).join(" ")).toContain(BRIEFING.segments[1]!.text.split(/(?<=[.!?])\s/)[0]!);
  // It runs on to the next point by itself.
  await expect(list.locator('li[aria-current="true"]')).toHaveAttribute("data-seg", "2", { timeout: 10_000 });
  await pause.click();
  await expect(page.getByRole("button", { name: "Play briefing" })).toHaveAttribute("aria-pressed", "false");
  // Open the moment goes to the transcript at the moment.
  await expect(list.getByRole("link", { name: "Open the moment" }).first()).toHaveAttribute(
    "href",
    `/meetings/${BRIEFING.meeting_id}/transcript#t=61000`,
  );
  await expect(list.getByRole("link", { name: "Open your promises" })).toHaveAttribute("href", "/work/promises");
  // A point in the transcript plays from there.
  await list.getByRole("button", { name: /Play from: You said you'd share/ }).click();
  await expect(list.locator('li[aria-current="true"]')).toHaveAttribute("data-seg", "3");
});

test("the keyboard: space plays and pauses, the arrows skip", async ({ mount, page }) => {
  await mount(<BriefingHarness view="after" />);
  const region = page.getByRole("region", { name: "A briefing from Juniper" });
  await page.getByRole("button", { name: "Play briefing" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Pause briefing" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(region.locator('li[aria-current="true"]')).toHaveAttribute("data-seg", "1");
  await page.keyboard.press("ArrowLeft");
  await expect(region.locator('li[aria-current="true"]')).toHaveAttribute("data-seg", "0");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Play briefing" })).toBeVisible();
});

test("speed is remembered for the person; no device voice menu", async ({ mount, page }) => {
  await mount(<BriefingHarness view="after" />);
  await page.getByRole("combobox", { name: "Speed" }).click();
  await page.getByRole("option", { name: "1.5x" }).click();
  await expect(page.getByText("Speed saved")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Voice" })).toHaveCount(0);
});

test("voice unavailable: a quiet note, the transcript stays, no other voice", async ({ mount, page }) => {
  await page.unroute("**/api/voice/speech");
  const failed = await fakeVoice(page, { status: 503 });
  await mount(<BriefingHarness view="after" />);
  await page.getByRole("button", { name: "Play briefing" }).click();
  await expect(page.getByText("Voice is unavailable right now. The whole briefing is written out below.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play briefing" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Transcript" }).getByRole("listitem")).toHaveCount(6);
  // The segments are rendered ahead three at a time, so up to three asks fail together; after
  // that it backs off and Play asks nothing more.
  expect(failed.length).toBeLessThanOrEqual(3);
});

test("Brief me: being written, then ready", async ({ mount, page }) => {
  await mount(<BriefingHarness view="states" />);
  await page.getByRole("button", { name: "Brief me" }).first().click();
  await expect(page.getByRole("heading", { name: /is writing your briefing/ }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "A briefing from Juniper" }).first()).toBeVisible({ timeout: 8000 });
});

test("settings: switches, length and the voice", async ({ mount, page }) => {
  await mount(<BriefingHarness view="settings" />);
  const on = page.getByRole("switch", { name: "A briefing after every meeting" });
  await on.click();
  await expect(page.getByText("Briefings turned off")).toBeVisible();
  await expect(on).toHaveAttribute("aria-checked", "false");
  await page.getByRole("radio", { name: /Short/ }).click();
  await expect(page.getByRole("radio", { name: /Short/ })).toHaveAttribute("aria-checked", "true");
  // The Myte's one voice: the same picker as Your Myte.
  await page.getByRole("region", { name: "Voice" }).locator("label").filter({ hasText: /^George/ }).click();
  await expect(page.getByText("Voice saved: George")).toBeVisible();
});

for (const width of [360, 1600]) {
  for (const view of ["after", "home", "states", "settings"] as const) {
    test(`${view} at ${width}px has no horizontal scroll`, async ({ mount, page }) => {
      await page.setViewportSize({ width, height: 900 });
      await mount(<BriefingHarness view={view} />);
      await page.waitForTimeout(100);
      await noOverflow(page);
    });
  }
}

test("reduced motion: the speaking ring does not animate", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mount(<BriefingHarness view="after" />);
  await page.getByRole("button", { name: "Play briefing" }).click();
  const anim = await page.locator(".brf-face.is-speaking .brf-ring").first().evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe("none");
});

/* ---------------- the recorded voice: pending, then ready; the live voice rendered ahead ---------------- */

test("a recording still being made: Preparing…, Play waits, then the file plays the moment it is ready", async ({ mount, page }) => {
  await page.route("**/fake/briefing.wav", (route) => route.fulfill({ status: 200, contentType: "audio/wav", body: wav(4000) }));
  const setup = () => {
    let polls = 0;
    const w = window as unknown as Record<string, unknown>;
    w.__briefingAudio = () => (++polls >= 2 ? "ready" : "pending");
    w.__briefingAudioUrl = "/fake/briefing.wav";
  };
  await page.addInitScript(setup);
  await page.evaluate(setup);
  await mount(<BriefingHarness view="pending" />);
  await expect(page.getByText("Preparing your briefing's voice…")).toBeVisible();
  await page.getByRole("button", { name: "Play briefing" }).click();
  await expect(page.getByText("It starts the moment it is ready.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel: preparing the voice" })).toBeVisible();
  // Two polls, two seconds apart: ready, and the recorded file plays.
  await expect(page.getByText("Recorded voice")).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("button", { name: "Pause briefing" })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Preparing your briefing's voice…")).toHaveCount(0);
  // Nothing was spoken live while it waited.
  expect(spoken.length).toBe(0);
  await axe(page);
});

test("a recording that fails: the live voice, with every segment rendered ahead three at a time", async ({ mount, page }) => {
  await page.unroute("**/api/voice/speech");
  const live = await fakeVoice(page, { msPerWord: 20, delayMs: 150 });
  const setup = () => {
    (window as unknown as Record<string, unknown>).__briefingAudio = () => "failed";
  };
  await page.addInitScript(setup);
  await page.evaluate(setup);
  await mount(<BriefingHarness view="pending" />);
  await expect(page.getByText("Preparing your briefing's voice…")).toHaveCount(0, { timeout: 6000 });
  // Shown, not yet played: every segment is already being rendered, in order, three at a time.
  await expect.poll(() => live.length, { timeout: 8000 }).toBeGreaterThanOrEqual(BRIEFING.segments.length);
  expect(live.stats.maxInFlight).toBeLessThanOrEqual(3);
  expect(live.stats.maxInFlight).toBeGreaterThan(1);
  expect(live[0]!.text).toBe(BRIEFING.segments[0]!.text.split(/(?<=[.!?])\s/)[0]);
  // Wait for the rendering to settle (some segments are more than one chunk).
  await expect
    .poll(async () => {
      const n = live.length;
      await page.waitForTimeout(400);
      return live.length === n && live.stats.inFlight === 0;
    })
    .toBe(true);
  const rendered = live.length;
  await page.getByRole("button", { name: "Play briefing" }).click();
  await expect(page.getByRole("button", { name: "Pause briefing" })).toBeVisible();
  // It runs on through every point to the end without asking the network again.
  await expect(page.getByRole("button", { name: "Play briefing again" })).toBeVisible({ timeout: 20_000 });
  expect(live.length).toBe(rendered);
});
