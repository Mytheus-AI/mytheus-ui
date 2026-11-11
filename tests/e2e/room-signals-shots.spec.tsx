/* Visual check for the a3 room signals (not a gate): the Inbox rows, the after page section, the
   agreement card (owner and asked), the composer and the room's pinned thread, at 1440 and 390 px,
   light and dark. Skipped unless ROOM_SIGNALS_SHOTS_DIR is set:

     ROOM_SIGNALS_SHOTS_DIR=/tmp/a3-shots npm run test:a11y -- room-signals-shots */

import { test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import path from "node:path";
import { RoomSignalsHarness, type RoomSignalsView } from "./RoomSignalsHarness";
import { RoomHarness } from "./RoomHarness";
import { RESUME } from "./room-signals-fixture";

const DIR = process.env.ROOM_SIGNALS_SHOTS_DIR;

type Mount = (c: JSX.Element) => Promise<unknown>;
type Shot = { name: string; run: (page: Page, mount: Mount, theme: "light" | "dark") => Promise<void> };

const harness = (view: RoomSignalsView, after?: (page: Page) => Promise<void>): Shot => ({
  name: view,
  run: async (page, mount, theme) => {
    await mount(<RoomSignalsHarness view={view} theme={theme} />);
    await page.waitForTimeout(200);
    if (after) await after(page);
  },
});

const shots: Shot[] = [
  harness("inbox"),
  {
    name: "inbox-composer",
    run: async (page, mount, theme) => {
      await mount(<RoomSignalsHarness view="inbox" theme={theme} />);
      await page.getByRole("button", { name: "Add your point" }).click();
      await page.getByLabel("Your point", { exact: true }).fill("The enterprise tier needs a yearly price before we raise the team plan.");
      await page.waitForTimeout(200);
    },
  },
  harness("after"),
  harness("agreement-owner"),
  harness("agreement-member"),
  harness("composer", async (page) => {
    await page.getByRole("tab", { name: "Record" }).click();
    await page.waitForTimeout(200);
  }),
  {
    name: "room-pin",
    run: async (page, mount, theme) => {
      await page.evaluate((p) => {
        (window as unknown as { __resumeFixture: unknown }).__resumeFixture = p;
      }, RESUME);
      await mount(<RoomHarness theme={theme} />);
      await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
      await page.getByRole("button", { name: "Where it stood" }).click();
      await page.waitForTimeout(400);
    },
  },
];

for (const theme of ["light", "dark"] as const) {
  for (const width of [1440, 390]) {
    for (const shot of shots) {
      test(`shot ${shot.name} ${theme} ${width}`, async ({ mount, page }) => {
        test.skip(!DIR, "set ROOM_SIGNALS_SHOTS_DIR to take the screenshots");
        await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
        await shot.run(page, mount as Mount, theme);
        await page.screenshot({ path: path.join(DIR as string, `${shot.name}-${theme}-${width}.png`), fullPage: true });
      });
    }
  }
}
