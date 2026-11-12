/* Screenshots of agent orbs where the app shows them (not a gate). Skipped unless ORB_SHOTS_DIR
   is set:

     ORB_SHOTS_DIR=/tmp/orbs npm run test:a11y -- agent-orb-shots */

import { expect, test, type Page } from "@playwright/experimental-ct-react";
import path from "node:path";
import { AgentHarness } from "./AgentHarness";
import { BriefingHarness } from "./BriefingHarness";
import { SidebarHarness } from "./SidebarHarness";
import { fakeSpeech } from "./briefing-speech-fake";

const DIR = process.env.ORB_SHOTS_DIR;
test.describe.configure({ timeout: 120_000 });

const settle = async (page: Page) => {
  await expect(page.locator("[data-orb]:not([data-ready])")).toHaveCount(0, { timeout: 60_000 });
  await page.waitForTimeout(500);
};

for (const theme of ["light", "dark"] as const) {
  test(`sidebar open and collapsed (${theme})`, async ({ mount, page }) => {
    test.skip(!DIR, "set ORB_SHOTS_DIR to take screenshots");
    const open = await mount(<SidebarHarness rail={false} theme={theme} />);
    await settle(page);
    await page.screenshot({ path: path.join(DIR!, `sidebar-open-${theme}.png`), clip: { x: 0, y: 0, width: 300, height: 420 } });
    await open.unmount();
    await mount(<SidebarHarness theme={theme} />);
    await page.mouse.move(900, 600);
    await settle(page);
    await page.screenshot({ path: path.join(DIR!, `sidebar-collapsed-${theme}.png`), clip: { x: 0, y: 0, width: 120, height: 420 } });
  });

  test(`agent page (${theme})`, async ({ mount, page }) => {
    test.skip(!DIR, "set ORB_SHOTS_DIR to take screenshots");
    await page.setViewportSize({ width: 1280, height: 1000 });
    await mount(<AgentHarness theme={theme} view="page" />);
    await settle(page);
    await page.screenshot({ path: path.join(DIR!, `agent-page-${theme}.png`) });
  });

  test(`briefing player (${theme})`, async ({ mount, page }) => {
    test.skip(!DIR, "set ORB_SHOTS_DIR to take screenshots");
    await fakeSpeech(page, 260);
    await page.setViewportSize({ width: 1280, height: 900 });
    await mount(<BriefingHarness view="after" theme={theme} />);
    await page.getByRole("button", { name: "Play briefing" }).click();
    await settle(page);
    await page.screenshot({ path: path.join(DIR!, `briefing-${theme}.png`) });
  });

  test(`settings agent picker (${theme})`, async ({ mount, page }) => {
    test.skip(!DIR, "set ORB_SHOTS_DIR to take screenshots");
    await page.setViewportSize({ width: 1280, height: 1000 });
    await mount(<AgentHarness theme={theme} view="settings" />);
    await settle(page);
    await page.screenshot({ path: path.join(DIR!, `settings-picker-${theme}.png`) });
  });
}
