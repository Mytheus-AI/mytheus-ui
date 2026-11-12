/* Screenshots for "In every meeting at once" (not a gate): the Listening week (1440, 1000 and
   360 px, light and dark), the rules, the evening digest, what your agent raised, the settings and
   your lines, the live interruption toast and its hold-the-line dialog, the Inbox row, the
   meeting's choice card, and the room's "agents listening" chip with the host's views tray.
   Skipped unless B2_SHOTS_DIR is set:

     B2_SHOTS_DIR=/tmp/shots npm run test:a11y -- listening-shots */

import { test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import path from "node:path";
import { ListeningHarness, type ListeningView } from "./ListeningHarness";
import { RoomHarness } from "./RoomHarness";
import { INTERRUPTION } from "./listening-fixture";

const DIR = process.env.B2_SHOTS_DIR;

type Mount = (c: JSX.Element) => Promise<unknown>;
type Shot = { name: string; width?: number; height?: number; full?: boolean; run: (page: Page, mount: Mount, theme: "light" | "dark") => Promise<void> };

const view = (v: ListeningView) => async (_page: Page, mount: Mount, theme: "light" | "dark") => {
  await mount(<ListeningHarness view={v} theme={theme} />);
};

const shots: Shot[] = [
  { name: "listening-week-1440", full: true, run: view("week") },
  { name: "listening-week-1000", width: 1000, full: true, run: view("week") },
  { name: "listening-week-360", width: 360, height: 800, full: true, run: view("week") },
  { name: "listening-week-empty", run: view("week-empty") },
  { name: "listening-rules", run: view("rules") },
  {
    name: "listening-rule-dialog",
    run: async (page, mount, theme) => {
      await mount(<ListeningHarness view="rules-empty" theme={theme} />);
      await page.getByRole("button", { name: "Add that rule" }).click();
    },
  },
  { name: "listening-evening-digest", run: view("digest") },
  { name: "listening-raised", run: view("raised") },
  { name: "settings-listening", full: true, run: view("settings") },
  { name: "settings-listening-360", width: 360, height: 800, full: true, run: view("settings") },
  {
    name: "interruption-toast",
    run: async (page, mount, theme) => {
      await mount(<ListeningHarness view="live" theme={theme} />);
      await page.waitForFunction(() => Boolean(window.__gateway?.connected));
      await page.waitForTimeout(80);
      await page.evaluate((p) => window.__gateway!.push("agent-interrupt", { payload: p }), INTERRUPTION);
    },
  },
  {
    name: "interruption-hold-the-line",
    run: async (page, mount, theme) => {
      await mount(<ListeningHarness view="live" theme={theme} />);
      await page.waitForFunction(() => Boolean(window.__gateway?.connected));
      await page.waitForTimeout(80);
      await page.evaluate((p) => window.__gateway!.push("agent-interrupt", { payload: p }), INTERRUPTION);
      await page.getByRole("button", { name: "Hold the line" }).click();
    },
  },
  {
    name: "interruption-send-a-view",
    run: async (page, mount, theme) => {
      await mount(<ListeningHarness view="inbox-row" theme={theme} />);
      await page.getByRole("button", { name: "Send a view" }).click();
      await page.getByLabel("Your view").fill("Keep SMB at 10% off. 15% breaks the margin model; I can walk it through tomorrow.");
    },
  },
  { name: "inbox-interruption-row", run: view("inbox-row") },
  { name: "meeting-choice-card", run: view("choice-card") },
  {
    name: "room-agents-listening",
    run: async (page, mount, theme) => {
      await mount(<RoomHarness theme={theme} passiveListener />);
      await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
      await page.waitForTimeout(200);
      await page.getByRole("button", { name: /Mytes listening/ }).click();
    },
  },
];

for (const theme of ["light", "dark"] as const) {
  for (const s of shots) {
    test(`shot: ${s.name} (${theme})`, async ({ mount, page }) => {
      test.skip(!DIR, "set B2_SHOTS_DIR to take screenshots");
      await page.setViewportSize({ width: s.width ?? 1440, height: s.height ?? 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await s.run(page, mount, theme);
      await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(DIR!, `${s.name}-${theme}.png`), fullPage: s.full ?? false });
    });
  }
}
