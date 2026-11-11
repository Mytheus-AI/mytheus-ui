/* Visual check for the pre-join layout (not a gate): the page at 375, 768, 1280, 1440 and 1600 px,
   light and dark, full page. Skipped unless PREJOIN_SHOTS_DIR is set:

     PREJOIN_SHOTS_DIR=/tmp/prejoin npm run test:a11y -- prejoin-shots */

import { test } from "@playwright/experimental-ct-react";
import path from "node:path";
import { PreJoinHarness } from "./PreJoinHarness";

const DIR = process.env.PREJOIN_SHOTS_DIR;

test.use({
  permissions: ["camera", "microphone"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});

for (const width of [375, 768, 1280, 1440, 1600]) {
  for (const theme of ["light", "dark"] as const) {
    test(`prejoin ${width} ${theme}`, async ({ mount, page }) => {
      test.skip(!DIR, "set PREJOIN_SHOTS_DIR to take the shots");
      await page.setViewportSize({ width, height: width < 768 ? 812 : 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await mount(<PreJoinHarness theme={theme} />);
      await page.getByText("Microphone working").waitFor();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(DIR!, `prejoin-${width}-${theme}.png`),
        fullPage: true,
      });
    });
  }
}
