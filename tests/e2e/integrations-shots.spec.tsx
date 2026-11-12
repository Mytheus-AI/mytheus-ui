/* Visual check for Settings > Integrations (not a gate): light and dark at 1440 and 375 px, and
   the setup sheet. Skipped unless INTEGRATIONS_SHOTS_DIR is set:

     INTEGRATIONS_SHOTS_DIR=/tmp/integrations npm run test:a11y -- integrations-shots

   SHOTS_PREFIX names the set ("before", "after"). */

import { test } from "@playwright/experimental-ct-react";
import path from "node:path";
import { IntegrationsHarness, type IntegrationsScenario } from "./IntegrationsHarness";

const DIR = process.env.INTEGRATIONS_SHOTS_DIR;
const PREFIX = process.env.SHOTS_PREFIX ?? "after";

const SETS: { scenario: IntegrationsScenario; widths: number[] }[] = [
  { scenario: "nothing", widths: [1440, 375] },
  { scenario: "mixed", widths: [1440, 375] },
];

for (const theme of ["light", "dark"] as const) {
  for (const set of SETS) {
    for (const width of set.widths) {
      test(`shot ${set.scenario} ${theme} ${width}`, async ({ mount, page }) => {
        test.skip(!DIR, "set INTEGRATIONS_SHOTS_DIR to take screenshots");
        if (PREFIX === "before" && set.scenario !== "nothing") test.skip();
        await page.setViewportSize({ width, height: 900 });
        await mount(<IntegrationsHarness theme={theme} scenario={set.scenario} />);
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(DIR!, `${PREFIX}-${set.scenario}-${theme}-${width}.png`), fullPage: true });
      });
    }
  }

  for (const width of [1440, 375]) {
    test(`shot setup sheet ${theme} ${width}`, async ({ mount, page }) => {
      test.skip(!DIR || PREFIX === "before", "after only");
      await page.setViewportSize({ width, height: 900 });
      await mount(<IntegrationsHarness theme={theme} scenario="nothing" />);
      await page.getByRole("button", { name: "Set up Slack" }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(DIR!, `${PREFIX}-setup-sheet-${theme}-${width}.png`), fullPage: false });
    });
  }

  test(`shot loading ${theme}`, async ({ mount, page }) => {
    test.skip(!DIR || PREFIX === "before", "after only");
    await mount(<IntegrationsHarness theme={theme} scenario="loading" />);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(DIR!, `${PREFIX}-loading-${theme}-1440.png`), fullPage: true });
  });
}
