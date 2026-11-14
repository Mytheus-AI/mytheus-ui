/* Screenshots of "A briefing from your agent" (not a gate). Skipped unless BRIEFING_SHOTS_DIR is set:

     BRIEFING_SHOTS_DIR=/tmp/briefing npm run test:a11y -- briefing-shots */

import { test } from "@playwright/experimental-ct-react";
import path from "node:path";
import { BriefingHarness, type BriefingView } from "./BriefingHarness";
import { fakeVoice } from "./voice-fake";

const DIR = process.env.BRIEFING_SHOTS_DIR;

const SHOTS: { name: string; view: BriefingView; width: number; theme: "light" | "dark"; playing?: boolean }[] = [
  { name: "after-playing-light-1440", view: "after", width: 1440, theme: "light", playing: true },
  { name: "after-playing-dark-1440", view: "after", width: 1440, theme: "dark", playing: true },
  { name: "after-light-390", view: "after", width: 390, theme: "light" },
  { name: "home-light-1440", view: "home", width: 1440, theme: "light", playing: true },
  { name: "home-dark-390", view: "home", width: 390, theme: "dark" },
  { name: "states-light-1440", view: "states", width: 1440, theme: "light" },
  { name: "states-dark-1440", view: "states", width: 1440, theme: "dark" },
  { name: "settings-light-1440", view: "settings", width: 1440, theme: "light" },
  { name: "settings-dark-390", view: "settings", width: 390, theme: "dark" },
];

for (const s of SHOTS) {
  test(`shot ${s.name}`, async ({ mount, page }) => {
    test.skip(!DIR, "set BRIEFING_SHOTS_DIR to take screenshots");
    await fakeVoice(page, { msPerWord: 260 });
    await page.setViewportSize({ width: s.width, height: 1000 });
    await mount(<BriefingHarness view={s.view} theme={s.theme} />);
    if (s.playing) {
      await page.getByRole("button", { name: "Play briefing" }).click();
      await page.getByRole("button", { name: "Next point" }).click();
      await page.waitForTimeout(900);
    } else {
      await page.waitForTimeout(250);
    }
    await page.screenshot({ path: path.join(DIR!, `${s.name}.png`), fullPage: true });
  });
}
