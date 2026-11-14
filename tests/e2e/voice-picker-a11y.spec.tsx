/* Accessibility and behaviour gate for the Myte's voice picker (ADR-0050) on Your Myte: axe
   (WCAG 2.0/2.1 A and AA, contrast included) in light and dark and at phone width, the keyboard
   (native radios: arrows choose, Tab reaches Preview), a preview spoken through the speech route
   in the chosen voice while the portrait speaks, the personality match, a refused save rolling
   back, the voice server off, and the speed kept on this device. The voice is a fake Kokoro
   route (voice-fake.ts).
   Run: npm run test:a11y -- voice-picker
        VOICE_SHOTS=/some/dir npm run test:a11y -- voice-picker   (also writes screenshots) */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { AgentHarness } from "./AgentHarness";
import { fakeVoice, VOICES } from "./voice-fake";

const SHOTS = process.env.VOICE_SHOTS;
const shot = async (page: Page, name: string, fullPage = false) => {
  if (!SHOTS) return;
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage });
};

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(".mx-app").analyze();
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

const picker = (page: Page) => page.getByRole("region", { name: "Voice" });
// The radios are visually hidden inside their cards; a person clicks the card's label.
const pick = (page: Page, text: string | RegExp) => picker(page).locator("label").filter({ hasText: text }).first().click();

for (const theme of ["light", "dark"] as const) {
  test(`the voice picker has no axe violations (${theme})`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await fakeVoice(page);
    await mount(<AgentHarness theme={theme} />);
    const v = picker(page);
    await expect(v).toBeVisible();
    await expect(v.getByRole("group", { name: "Juniper's voice" }).getByRole("radio")).toHaveCount(VOICES.voices.length + 1);
    await expect(v.getByRole("radio", { name: "Match my Myte's personality" })).toBeChecked();
    await expect(v.getByText("Right now that is Heart.")).toBeVisible();
    for (const name of ["Heart", "Bella", "Kore", "Aoede", "Michael", "Fenrir", "Puck", "Emma", "George"]) {
      await expect(v.getByRole("button", { name: `Preview ${name}` })).toBeVisible();
    }
    expect(await axe(page)).toEqual([]);
    await v.scrollIntoViewIfNeeded();
    await shot(page, `picker-${theme}-1440`);
    await v.screenshot({ path: SHOTS ? `${SHOTS}/picker-${theme}-section.png` : undefined }).catch(() => {});
  });

  test(`phone width: no horizontal scroll, no axe violations (${theme})`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await fakeVoice(page);
    await mount(<AgentHarness theme={theme} />);
    await expect(picker(page)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await axe(page)).toEqual([]);
    if (SHOTS) await picker(page).screenshot({ path: `${SHOTS}/picker-${theme}-390.png` });
  });
}

test("the keyboard: arrows choose (saved once, where you stop), Tab reaches Preview", async ({ mount, page }) => {
  await fakeVoice(page);
  await mount(<AgentHarness />);
  const v = picker(page);
  const match = v.getByRole("radio", { name: "Match my Myte's personality" });
  await match.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(v.getByRole("radio", { name: "Bella" })).toBeChecked();
  await expect(v.getByRole("radio", { name: "Bella" })).toBeFocused();
  await expect(page.getByText("Voice saved: Bella")).toBeVisible();
  const saved = await page.evaluate(() => (window as unknown as { __savedVoices?: (string | null)[] }).__savedVoices);
  expect(saved).toEqual(["af_bella"]);
  // Tab leaves the group to the next control, a Preview button.
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAccessibleName(/^Preview /);
  // Back to the personality match.
  await pick(page, "Match my Myte's personality");
  await expect(page.getByText("Voice saved: matched to your Myte")).toBeVisible();
});

test("preview speaks the in-character line in that voice, the portrait speaks, then it stops", async ({ mount, page }) => {
  const spoken = await fakeVoice(page, { msPerWord: 160 });
  await mount(<AgentHarness />);
  const v = picker(page);
  await v.getByRole("button", { name: "Preview George" }).click();
  const stop = v.getByRole("button", { name: "Stop the George preview" });
  await expect(stop).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => spoken.length).toBeGreaterThan(0);
  await shot(page, "preview-speaking", true);
  expect(spoken[0]).toMatchObject({ text: "Hi, I'm Juniper.", voice: "bm_george", speed: 1 });
  await expect.poll(() => spoken.map((s) => s.text).join(" ")).toBe("Hi, I'm Juniper. I'll keep track of what matters to you.");
  // Previewing another voice stops the first: one speaker in the app.
  await v.getByRole("button", { name: "Preview Emma" }).click();
  await expect(v.getByRole("button", { name: "Preview George" })).toHaveAttribute("aria-pressed", "false");
  await expect(v.getByRole("button", { name: "Stop the Emma preview" })).toBeVisible();
  await v.getByRole("button", { name: "Stop the Emma preview" }).click();
  await expect(v.getByRole("button", { name: "Preview Emma" })).toBeVisible();
  // Previewing never changes the choice.
  await expect(v.getByRole("radio", { name: "Match my Myte's personality" })).toBeChecked();
});

test("a refused save rolls back and says why", async ({ mount, page }) => {
  await fakeVoice(page);
  await mount(<AgentHarness />);
  await page.evaluate(() => ((window as unknown as { __refuseVoice: boolean }).__refuseVoice = true));
  const v = picker(page);
  await pick(page, /^Emma/);
  await expect(page.getByText("Your Myte's voice could not be saved just now. Nothing changed.")).toBeVisible();
  await expect(v.getByRole("radio", { name: "Match my Myte's personality" })).toBeChecked();
});

test("voice server off: preview says so quietly; a disconnected catalogue turns previews off", async ({ mount, page }) => {
  await fakeVoice(page, { status: 503 });
  const c = await mount(<AgentHarness />);
  const v = picker(page);
  await v.getByRole("button", { name: "Preview Heart" }).click();
  await expect(v.getByText("Voice is unavailable right now")).toBeVisible();
  await expect(v.getByRole("button", { name: "Preview Heart" })).toBeVisible();

  await c.update(<AgentHarness voices={{ ...VOICES, connected: false }} />);
  await expect(v.getByText(/previews are off/)).toBeVisible();
  await expect(v.getByRole("button", { name: "Preview Heart" })).toBeDisabled();
  expect(await axe(page)).toEqual([]);
  await shot(page, "picker-disconnected");
});

test("the voices could not be read: an inline error with Retry", async ({ mount, page }) => {
  await mount(<AgentHarness voices={null} />);
  await expect(page.getByText("The voices could not be loaded")).toBeVisible();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(picker(page).getByRole("radio", { name: "Heart" })).toBeVisible();
});

test("speed is kept on this device and used by previews", async ({ mount, page }) => {
  const spoken = await fakeVoice(page);
  await mount(<AgentHarness />);
  const v = picker(page);
  await pick(page, "1.1x");
  await expect(v.getByRole("radio", { name: /1\.1x/ })).toBeChecked();
  expect(await page.evaluate(() => window.localStorage.getItem("mytheus.myte-voice.speed"))).toBe("1.1");
  await v.getByRole("button", { name: "Preview Puck" }).click();
  await expect.poll(() => spoken[0]?.speed).toBe(1.1);
});
