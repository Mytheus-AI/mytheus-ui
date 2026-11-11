/* Visual check for the UI polish pass (not a gate): the room header, the empty agenda, raised
   hands, the device-style dropdown and the New meeting window, at 1440 and 375 px, light and dark.
   Skipped unless POLISH_SHOTS_DIR is set:

     POLISH_SHOTS_DIR=/tmp/polish-after npm run test:a11y -- polish-shots

   States that a build does not have yet (a hands queue before it existed) are shot as they are. */

import { test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import path from "node:path";
import { RoomHarness } from "./RoomHarness";
import { NewMeetingHarness } from "./NewMeetingHarness";
import { DropdownHarness } from "./DropdownHarness";
import { MEETING_ID } from "./fixtures";

const DIR = process.env.POLISH_SHOTS_DIR;

async function push(page: Page, event: string, payload: unknown) {
  await page.evaluate(([e, meetingId, p]) => window.__gateway!.push(e as string, { meetingId, payload: p }), [event, MEETING_ID, payload] as const);
}

async function joined(page: Page) {
  await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
  await page.waitForTimeout(150);
}

async function hands(page: Page) {
  await joined(page);
  const t = Date.now();
  await push(page, "hand", { userId: "u-raj", raised: true, at: new Date(t - 95_000).toISOString() });
  await push(page, "hand", { userId: "u-priya", raised: true, at: new Date(t - 30_000).toISOString() });
}

async function openNew(page: Page) {
  await page.getByRole("button", { name: "New meeting" }).click();
  await page.waitForTimeout(250);
}

type Shot = { name: string; run: (page: Page, mount: (c: JSX.Element) => Promise<unknown>, theme: "light" | "dark") => Promise<void> };

const shots: Shot[] = [
  {
    name: "room",
    run: async (page, mount, theme) => {
      await mount(<RoomHarness theme={theme} />);
      await joined(page);
    },
  },
  {
    name: "room-empty-agenda",
    run: async (page, mount, theme) => {
      await mount(<RoomHarness theme={theme} emptyAgenda />);
      await joined(page);
    },
  },
  {
    name: "room-hands",
    run: async (page, mount, theme) => {
      await mount(<RoomHarness theme={theme} />);
      await hands(page);
      await page.getByRole("button", { name: /Raise hand/ }).first().click().catch(() => undefined);
      await page.waitForTimeout(300);
    },
  },
  {
    name: "room-hands-people",
    run: async (page, mount, theme) => {
      await mount(<RoomHarness theme={theme} />);
      await hands(page);
      const t = page.getByRole("tab", { name: /People/ });
      if (!(await t.isVisible())) await page.getByRole("button", { name: "Side panel" }).first().click({ timeout: 4000 });
      await t.click({ timeout: 4000 });
    },
  },
  {
    name: "new-meeting",
    run: async (page, mount, theme) => {
      await mount(<NewMeetingHarness theme={theme} />);
      await openNew(page);
    },
  },
  {
    name: "new-meeting-filled",
    run: async (page, mount, theme) => {
      await mount(<NewMeetingHarness theme={theme} />);
      await openNew(page);
      await page.getByLabel("Title").fill("Weekly product standup");
      for (const who of ["Raj Patel", "Priya Nair"]) await page.getByRole("checkbox", { name: new RegExp(who) }).click();
      await page.getByRole("radio", { name: "Schedule" }).click();
    },
  },
  {
    name: "new-meeting-dropdown",
    run: async (page, mount, theme) => {
      await mount(<NewMeetingHarness theme={theme} />);
      await openNew(page);
      const len = page.getByRole("combobox", { name: /Length/ });
      if (await len.count()) await len.click();
      await page.waitForTimeout(250);
    },
  },
  {
    name: "dropdown-open",
    run: async (page, mount, theme) => {
      await mount(<DropdownHarness theme={theme} />);
      await page.getByRole("combobox", { name: "Owner" }).click();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
    },
  },
  {
    name: "room-hands-queue",
    run: async (page, mount, theme) => {
      await mount(<RoomHarness theme={theme} />);
      await hands(page);
      await page.getByRole("button", { name: /Hands raised/ }).click();
    },
  },
  {
    name: "room-add-agenda",
    run: async (page, mount, theme) => {
      await mount(<RoomHarness theme={theme} emptyAgenda />);
      await joined(page);
      await page.getByRole("button", { name: "Add agenda" }).click();
      await page.getByLabel("Items").fill("Beta readiness\nLaunch date\nPricing questions");
    },
  },
  {
    name: "new-meeting-error",
    run: async (page, mount, theme) => {
      await mount(<NewMeetingHarness theme={theme} members={null} templates={null} />);
      await openNew(page);
    },
  },
];

for (const theme of ["light", "dark"] as const) {
  for (const width of [1440, 375]) {
    for (const s of shots) {
      test(`polish shot ${s.name} ${width} ${theme}`, async ({ mount, page }) => {
        test.skip(!DIR, "set POLISH_SHOTS_DIR to save the polish screenshots");
        await page.setViewportSize({ width, height: width < 600 ? 812 : 900 });
        await page.route("**/api/meeting-precheck", (route) => route.fulfill({ status: 503, body: "{}" }));
        try {
          await s.run(page, mount, theme);
        } catch {
          // A state this build cannot reach is still shot as it is.
        }
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(DIR!, `${s.name}-${width}-${theme}.png`), fullPage: false, animations: "disabled" });
      });
    }
  }
}
