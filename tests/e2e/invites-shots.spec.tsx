/* Visual check for meeting invitations (not a gate): the "Invite and share" card in every state,
   the invite form open, and the New meeting window with email invites, light and dark, at 1440
   and 360 px. Skipped unless INVITES_SHOTS_DIR is set:

     INVITES_SHOTS_DIR=/tmp/invites npm run test:a11y -- invites-shots */

import { test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import path from "node:path";
import { InvitesHarness } from "./InvitesHarness";
import { NewMeetingHarness } from "./NewMeetingHarness";

const DIR = process.env.INVITES_SHOTS_DIR;

async function shoot(page: Page, file: string) {
  await page.waitForTimeout(350);
  await page.getByRole("region", { name: "Invite and share" }).screenshot({ path: path.join(DIR!, file), animations: "disabled" });
}

for (const theme of ["light", "dark"] as const) {
  for (const state of ["host", "empty", "notConfigured", "member", "noTime", "error"] as const) {
    test(`card ${state} ${theme}`, async ({ mount, page }) => {
      test.skip(!DIR, "set INVITES_SHOTS_DIR");
      await mount(<InvitesHarness state={state} theme={theme} />);
      await shoot(page, `card-${state}-${theme}.png`);
    });
  }

  test(`card composing ${theme}`, async ({ mount, page }) => {
    test.skip(!DIR, "set INVITES_SHOTS_DIR");
    await mount(<InvitesHarness state="host" theme={theme} />);
    await page.getByRole("button", { name: "Invite by email" }).click();
    await page.getByRole("checkbox", { name: /Sarah Okafor/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole("checkbox", { name: /Aiko Tanaka/ }).click();
    await page.getByLabel("Note").fill("Bring the Q1 numbers, we'll decide on pricing.");
    await shoot(page, `card-composing-${theme}.png`);
  });

  for (const width of [1440, 360]) {
    test(`new meeting with invites ${width} ${theme}`, async ({ mount, page }) => {
      test.skip(!DIR, "set INVITES_SHOTS_DIR");
      await page.setViewportSize({ width, height: width < 600 ? 812 : 900 });
      await page.route("**/api/meeting-precheck", (r) => r.fulfill({ status: 503, body: "{}" }));
      await mount(<NewMeetingHarness theme={theme} />);
      await page.getByRole("button", { name: "New meeting" }).click();
      await page.getByLabel("Title").fill("Pricing review");
      for (const n of ["Raj Patel", "Priya Nair", "Diego Alvarez"]) {
        await page.getByRole("checkbox", { name: new RegExp(n) }).click();
        await page.waitForTimeout(300);
      }
      await page.getByLabel("Note").fill("Bring the Q1 numbers.");
      const people = page.getByRole("region", { name: /People/ });
      await people.scrollIntoViewIfNeeded();
      await page.waitForTimeout(350);
      await people.screenshot({ path: path.join(DIR!, `new-meeting-people-${width}-${theme}.png`), animations: "disabled" });
      await page.screenshot({ path: path.join(DIR!, `new-meeting-window-${width}-${theme}.png`), animations: "disabled" });
    });
  }

  test(`new meeting email not set up ${theme}`, async ({ mount, page }) => {
    test.skip(!DIR, "set INVITES_SHOTS_DIR");
    await page.route("**/api/meeting-precheck", (r) => r.fulfill({ status: 503, body: "{}" }));
    await mount(<NewMeetingHarness theme={theme} />);
    await page.evaluate(() => ((window as unknown as { __emailConfigured: boolean }).__emailConfigured = false));
    await page.getByRole("button", { name: "New meeting" }).click();
    await page.getByRole("checkbox", { name: /Raj Patel/ }).click();
    const people = page.getByRole("region", { name: /People/ });
    await people.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await people.screenshot({ path: path.join(DIR!, `new-meeting-not-configured-${theme}.png`), animations: "disabled" });
  });
}

test("card host 360 light", async ({ mount, page }) => {
  test.skip(!DIR, "set INVITES_SHOTS_DIR");
  await page.setViewportSize({ width: 360, height: 900 });
  await mount(<InvitesHarness state="host" />);
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(DIR!, "card-host-360-light.png"), fullPage: true, animations: "disabled" });
});
