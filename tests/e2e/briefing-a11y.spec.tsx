/* Accessibility and behaviour gate for "A briefing from your agent": the after page's player,
   Home's compact player, every state, and Settings > Briefings. axe (WCAG 2.0/2.1 A and AA,
   contrast included) in light and dark; play, the transcript highlighting in sync, skip, speed,
   the keyboard; Brief me through writing to ready; 360 and 1600 px with no horizontal scroll;
   reduced motion. Speech is a fake Web Speech API (briefing-speech-fake.ts).
   Run: npm run test:a11y -- briefing */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { BriefingHarness } from "./BriefingHarness";
import { BRIEFING } from "./briefing-fixture";
import { fakeSpeech } from "./briefing-speech-fake";

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

test.beforeEach(async ({ page }) => {
  await fakeSpeech(page);
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
    await expect(page.getByRole("heading", { name: "A briefing from your agent" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Juniper is writing your briefing" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nothing needs you right now" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your briefing could not be written" })).toBeVisible();
    await expect(page.getByText(/used its agent budget/)).toBeVisible();
    await expect(page.getByText("Your agent can brief you on this meeting once it has ended.")).toBeVisible();
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
  const spoken = await page.evaluate(() => JSON.stringify((window as unknown as { __spoken?: string[] }).__spoken ?? null));
  expect((JSON.parse(spoken) as string[] | null)?.at(-1)).toBe(BRIEFING.segments[1]!.text);
  // It runs on to the next point by itself.
  await page.evaluate(() => ((window as unknown as { __wordMs: number }).__wordMs = 5));
  await expect(list.locator('li[aria-current="true"]')).toHaveAttribute("data-seg", "2", { timeout: 5000 });
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

test("speed and voice are remembered for the person", async ({ mount, page }) => {
  await mount(<BriefingHarness view="after" />);
  await page.getByRole("combobox", { name: "Speed" }).click();
  await page.getByRole("option", { name: "1.5x" }).click();
  await expect(page.getByText("Speed saved")).toBeVisible();
  await page.getByRole("combobox", { name: "Voice" }).click();
  await page.getByRole("option", { name: /Samantha/ }).click();
  await expect(page.getByText("Voice remembered")).toBeVisible();
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
  await page.getByRole("combobox", { name: "Juniper's voice on this device" }).click();
  await expect(page.getByRole("option", { name: /Matched to your agent/ })).toBeVisible();
  await page.getByRole("option", { name: /Samantha/ }).click();
  await expect(page.getByText("Voice remembered")).toBeVisible();
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
