/* The where-do-you-work prompt, and the logo picker on Start a workspace. Axe runs on each state in
   both themes. With TZ_SHOTS set, every state is also saved as a screenshot:

     TZ_SHOTS=/tmp/tz CT_PORT=3612 npm run test:a11y -- location-prompt */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/experimental-ct-react";
import path from "node:path";
import { LocationHarness } from "./LocationHarness";
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
// The CT page is already loaded when a test starts, so the stub state is set on it directly.
const setLocation = (page: Page, loc: Record<string, unknown>) =>
  page.evaluate((l) => {
    (globalThis as { __location?: unknown; __savedLocation?: unknown }).__location = l;
    (globalThis as { __savedLocation?: unknown }).__savedLocation = [];
  }, loc);
const prompt = (page: Page) => page.getByRole("region", { name: /Where do you work|Please save your time zone/ });

test.use({ timezoneId: "Asia/Kolkata" });

for (const theme of ["light", "dark"] as const) {
  test(`where you work (${theme}): India pre-selected, state required, saved with the zone`, async ({ mount, page }) => {
    await setLocation(page, { country: null, savedZone: "UTC" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await mount(<LocationHarness theme={theme} />);
    const p = prompt(page);
    await expect(p.getByRole("heading", { name: "Where do you work?" })).toBeVisible();
    // Chromium reports India as Asia/Calcutta; the prompt names the current zone.
    await expect(p).toContainText("Asia/Kolkata");
    await expect(p.getByRole("combobox", { name: "Country" })).toContainText("India");
    await axe(page);
    await shot(page, `location-${theme}.png`);

    await p.getByRole("button", { name: "Save" }).click();
    await expect(p.getByRole("alert")).toHaveText("Choose your state.");
    await p.getByRole("combobox", { name: "State" }).click();
    await page.getByRole("option", { name: "Karnataka" }).click();
    await p.getByRole("button", { name: "Save" }).click();
    await expect(p).toBeHidden();
    const sent = await page.evaluate(() => (globalThis as { __savedLocation?: unknown[] }).__savedLocation);
    expect(sent).toEqual([{ country: "IN", subdivision: "IN-KA", timeZone: "Asia/Kolkata" }]);
  });
}

test("time zone only: a member with a country but the UTC default", async ({ mount, page }) => {
  await setLocation(page, { country: "IN", subdivision: "IN-KA", savedZone: "UTC" });
  await mount(<LocationHarness />);
  const p = prompt(page);
  await expect(p.getByRole("heading", { name: "Please save your time zone" })).toBeVisible();
  await expect(p.getByRole("combobox", { name: "Country" })).toHaveCount(0);
  await axe(page);
  await p.getByRole("button", { name: "Save time zone" }).click();
  await expect(p).toBeHidden();
});

test("hidden once both are set", async ({ mount, page }) => {
  await setLocation(page, { country: "IN", subdivision: "IN-KA", savedZone: "Asia/Kolkata" });
  await mount(<LocationHarness />);
  await page.waitForTimeout(300);
  await expect(prompt(page)).toHaveCount(0);
});

test("the X hides it until the next sign-in", async ({ mount, page }) => {
  await setLocation(page, { country: null });
  await mount(<LocationHarness />);
  await prompt(page).getByRole("button", { name: "Dismiss until next sign-in" }).click();
  await expect(prompt(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.localStorage.getItem("mx-location-prompt-dismissed:sess_test"))).toBe("1");
});

test("phone width: clear of the Myte button", async ({ mount, page }) => {
  await setLocation(page, { country: null });
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(<LocationHarness />);
  const box = await prompt(page).boundingBox();
  expect(box).not.toBeNull();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(844 - 88);
  await shot(page, "location-phone.png");
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
