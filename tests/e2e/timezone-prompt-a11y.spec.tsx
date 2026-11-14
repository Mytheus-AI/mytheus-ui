/* The save-your-time-zone prompt, and the logo picker on Start a workspace. Axe runs on each state
   in both themes. With TZ_SHOTS set, every state is also saved as a screenshot:

     TZ_SHOTS=/tmp/tz CT_PORT=3612 npm run test:a11y -- timezone-prompt */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/experimental-ct-react";
import path from "node:path";
import { TimeZoneHarness } from "./TimeZoneHarness";
import { ChooserHarness } from "./LogoHarness";
import { KESTREL_SVG } from "./logo-fixture";

const DIR = process.env.TZ_SHOTS;
const shot = async (page: Page, name: string) => {
  if (!DIR) return;
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(DIR, name), animations: "disabled" });
};
const axe = async (page: Page) => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
};
// The CT page is already loaded when a test starts, so the value is set on it directly.
const setSaved = (page: Page, zone: string | null) =>
  page.evaluate((z) => {
    (globalThis as { __savedTimeZone?: string | null }).__savedTimeZone = z;
  }, zone);

test.use({ timezoneId: "Asia/Kolkata" });

for (const theme of ["light", "dark"] as const) {
  test(`prompt (${theme}): shown while the saved zone is UTC, links to the field, X hides it`, async ({ mount, page }) => {
    await setSaved(page, "UTC");
    await page.setViewportSize({ width: 1280, height: 720 });
    await mount(<TimeZoneHarness theme={theme} />);
    const prompt = page.getByRole("region", { name: "Save your time zone" });
    await expect(prompt).toBeVisible();
    // Chromium reports India as Asia/Calcutta; the prompt names the current zone.
    await expect(prompt).toContainText("Asia/Kolkata");
    await expect(prompt.getByRole("link")).toHaveAttribute("href", "/settings/listening#time-zone");
    await axe(page);
    await shot(page, `prompt-${theme}.png`);

    await prompt.getByRole("button", { name: "Dismiss until next sign-in" }).click();
    await expect(prompt).toBeHidden();
    // Remembered for this session only: the key carries the session id.
    expect(await page.evaluate(() => window.localStorage.getItem("mx-tz-prompt-dismissed:sess_test"))).toBe("1");
  });
}

test("prompt: hidden once a time zone is saved", async ({ mount, page }) => {
  await setSaved(page, "Asia/Kolkata");
  await mount(<TimeZoneHarness />);
  await page.waitForTimeout(300);
  await expect(page.getByRole("region", { name: "Save your time zone" })).toHaveCount(0);
});

test("prompt: hidden when the zone cannot be read", async ({ mount, page }) => {
  await setSaved(page, null);
  await mount(<TimeZoneHarness />);
  await page.waitForTimeout(300);
  await expect(page.getByRole("region", { name: "Save your time zone" })).toHaveCount(0);
});

test("prompt: phone width clears the Myte button", async ({ mount, page }) => {
  await setSaved(page, "UTC");
  await page.setViewportSize({ width: 390, height: 780 });
  await mount(<TimeZoneHarness />);
  const box = await page.getByRole("region", { name: "Save your time zone" }).boundingBox();
  expect(box).not.toBeNull();
  // The floating Myte button sits in the bottom 88px; the prompt ends above it.
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(780 - 88);
  await shot(page, "prompt-phone.png");
});

for (const theme of ["light", "dark"] as const) {
  test(`start a workspace (${theme}): optional logo, picked and removed`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 1100, height: 1000 });
    await mount(<ChooserHarness theme={theme} />);
    await expect(page.getByRole("button", { name: "Choose an image" })).toBeVisible();
    await axe(page);
    await page.locator('input[type="file"]').setInputFiles({ name: "kestrel.svg", mimeType: "image/svg+xml", buffer: Buffer.from(KESTREL_SVG) });
    await expect(page.getByRole("button", { name: "Choose another" })).toBeVisible();
    await expect(page.locator('[data-org-mark="logo"]').first()).toBeVisible();
    await axe(page);
    await shot(page, `create-logo-${theme}.png`);
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("button", { name: "Choose an image" })).toBeVisible();

    // a file that is not an image says so, in words
    await page.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByRole("alert")).toBeVisible();
  });
}
