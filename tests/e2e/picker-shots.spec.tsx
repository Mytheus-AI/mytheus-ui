/* Visual check for the member picker (not a gate): the New meeting window's People section with
   nobody, three and eleven people picked, at 1440 and 360 px, light and dark, plus a short frame
   sequence of one pick. Skipped unless PICKER_SHOTS_DIR is set:

     PICKER_SHOTS_DIR=/tmp/picker-after npm run test:a11y -- picker-shots

   It picks people through their list rows only, so it runs on any build of the picker. */

import { test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import path from "node:path";
import { NewMeetingHarness } from "./NewMeetingHarness";
import { MANY } from "./picker-fixture";

const DIR = process.env.PICKER_SHOTS_DIR;

async function openNew(page: Page) {
  await page.getByRole("button", { name: "New meeting" }).click();
  await page.waitForTimeout(250);
}

async function pick(page: Page, names: string[]) {
  for (const n of names) {
    await page.getByRole("checkbox", { name: new RegExp(n) }).click();
    await page.waitForTimeout(320);
  }
}

async function shootPeople(page: Page, file: string) {
  const people = page.getByRole("region", { name: /People/ });
  await people.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await people.screenshot({ path: path.join(DIR!, file), animations: "disabled" });
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [1440, 360]) {
    test(`picker shots ${width} ${theme}`, async ({ mount, page }) => {
      test.skip(!DIR, "set PICKER_SHOTS_DIR to save the picker screenshots");
      await page.setViewportSize({ width, height: width < 600 ? 812 : 900 });
      await page.route("**/api/meeting-precheck", (route) => route.fulfill({ status: 503, body: "{}" }));
      const one = await mount(<NewMeetingHarness theme={theme} />);
      await openNew(page);
      // The Start now note beside Length (it used to carry a red "live" dot).
      await page.getByRole("region", { name: "When" }).screenshot({ path: path.join(DIR!, `when-${width}-${theme}.png`), animations: "disabled" });
      await shootPeople(page, `picker-empty-${width}-${theme}.png`);
      await pick(page, ["Raj Patel", "Priya Nair", "Sarah Okafor"]);
      await shootPeople(page, `picker-three-${width}-${theme}.png`);
      await one.unmount();
      await mount(<NewMeetingHarness theme={theme} members={MANY} />);
      await openNew(page);
      await pick(page, MANY.slice(0, 11).map((m) => m.name));
      await shootPeople(page, `picker-eleven-${width}-${theme}.png`);
    });
  }
}

test("picker frame sequence", async ({ mount, page }) => {
  test.skip(!DIR, "set PICKER_SHOTS_DIR to save the picker screenshots");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/meeting-precheck", (route) => route.fulfill({ status: 503, body: "{}" }));
  // A fake clock (it drives requestAnimationFrame too) so each frame is an exact 30 ms step.
  await page.clock.install();
  await mount(<NewMeetingHarness />);
  await page.getByRole("button", { name: "New meeting" }).click();
  await page.clock.runFor(400);
  await page.getByRole("checkbox", { name: /Raj Patel/ }).click();
  await page.clock.runFor(600);
  // install() lets time flow; pause it so only runFor moves the animation.
  await page.clock.pauseAt(new Date(Date.now() + 60_000));
  const people = page.getByRole("region", { name: /People/ });
  const clip = (await people.boundingBox())!;
  const frames = async (prefix: string) => {
    for (let i = 0; i <= 10; i++) {
      await page.screenshot({ path: path.join(DIR!, `${prefix}-${String(i * 30).padStart(3, "0")}ms.png`), clip });
      await page.clock.runFor(16);
      await page.clock.runFor(14);
    }
  };
  // Picking Priya: her row collapses and her face travels into the cluster.
  await page.getByRole("checkbox", { name: /Priya Nair/ }).click({ noWaitAfter: true });
  await frames("frame-pick");
  await page.clock.runFor(600);
  // Removing her again: the ball pops back out into the list.
  await page.getByRole("button", { name: "Remove Priya Nair" }).click({ noWaitAfter: true });
  await frames("frame-remove");
});
