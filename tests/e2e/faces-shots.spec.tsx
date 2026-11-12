/* Screenshots of people (ink doodles) and agents (plush) where the app shows them. Not a gate;
   skipped unless FACES_SHOTS_DIR is set. CT_GL=metal draws the plush on the real GPU:

     CT_GL=metal FACES_SHOTS_DIR=/tmp/faces npm run test:a11y -- faces-shots */

import { expect, test, type Page } from "@playwright/experimental-ct-react";
import path from "node:path";
import { NewMeetingHarness } from "./NewMeetingHarness";
import { PeopleHarness } from "./PeopleHarness";
import { ShellHarness } from "./ShellHarness";
import { MANY } from "./picker-fixture";

const DIR = process.env.FACES_SHOTS_DIR;
test.describe.configure({ timeout: 120_000 });
test.skip(!DIR, "set FACES_SHOTS_DIR to take screenshots");

const settle = async (page: Page) => {
  await expect(page.locator("[data-plush]:not([data-ready])")).toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(500);
};
const shot = (name: string) => path.join(DIR!, name);

for (const theme of ["light", "dark"] as const) {
  test(`profile face picker, sidebar agent and topbar person (${theme})`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await mount(<ShellHarness theme={theme} />);
    await settle(page);
    await page.screenshot({ path: shot(`shell-profile-${theme}.png`) });
    await page.getByRole("radiogroup").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const card = page.locator("section", { has: page.getByRole("radiogroup") }).first();
    await card.screenshot({ path: shot(`profile-face-picker-${theme}.png`) });
    await page.screenshot({ path: shot(`sidebar-agent-vs-topbar-person-${theme}.png`), clip: { x: 0, y: 0, width: 1280, height: 280 } });
  });

  test(`people page (${theme})`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    await mount(<PeopleHarness theme={theme} />);
    await page.waitForTimeout(800);
    await page.screenshot({ path: shot(`people-${theme}.png`) });
  });

  test(`member picker cluster (${theme})`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route("**/api/meeting-precheck", (route) => route.fulfill({ status: 503, body: "{}" }));
    await mount(<NewMeetingHarness theme={theme} members={MANY} />);
    await page.getByRole("button", { name: "New meeting" }).click();
    await page.waitForTimeout(250);
    for (const m of MANY.slice(0, 7)) {
      await page.getByRole("checkbox", { name: new RegExp(m.name) }).click();
      await page.waitForTimeout(200);
    }
    const people = page.getByRole("region", { name: /People/ });
    await people.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await people.screenshot({ path: shot(`member-picker-${theme}.png`), animations: "disabled" });
  });
}
