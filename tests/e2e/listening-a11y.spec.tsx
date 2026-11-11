/* Accessibility and keyboard gate for "In every meeting at once" (Beyond the meeting, Layer 3):
   the Listening week, the rules, the evening digest, what your agent raised, the settings and
   your lines, the live interruption toast and its three answers, the Inbox row, the meeting's
   choice card, and the room's "agents listening" chip and the host's views tray. Mounted in the
   app's `.mx-app` theme root, light and dark, with the server actions and the gateway answered at
   the edges (playwright-ct.config.ts).

   - no axe violations (WCAG 2.0/2.1 A and AA, colour contrast included) in both themes;
   - the choice is a radio group the arrow keys move through, with Undo;
   - one toast per interruption however often the socket repeats it; the dialogs trap focus and
     hold only the person's own lines;
   - the room counts listening agents live and the host shares a view into the chat. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { ListeningHarness, type ListeningView } from "./ListeningHarness";
import { INTERRUPTION as LIVE_INTERRUPTION } from "./listening-fixture";
import { RoomHarness } from "./RoomHarness";
import { MEETING_ID } from "./fixtures";

async function axe(page: Page, include = "main") {
  // let a toast or a dialog finish its entrance first (its fade would read as low contrast)
  await page.waitForTimeout(450);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(include).analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

const VIEWS: ListeningView[] = ["week", "week-empty", "rules", "rules-empty", "digest", "raised", "raised-empty", "settings", "toast", "inbox-row", "choice-card"];

for (const theme of ["light", "dark"] as const) {
  for (const view of VIEWS) {
    test(`no axe violations: ${view} (${theme})`, async ({ mount, page }) => {
      await mount(<ListeningHarness view={view} theme={theme} />);
      await page.waitForTimeout(50);
      expect(await axe(page)).toEqual([]);
    });
  }
}

test("no axe violations on a phone: the week as a day list", async ({ mount, page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mount(<ListeningHarness view="week" />);
  await expect(page.getByRole("heading", { name: /Monday 9 Nov/ })).toBeVisible();
  expect(await axe(page)).toEqual([]);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(360);
});

test("the week: arrow keys change a choice, the headline recounts, Undo puts it back", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await mount(<ListeningHarness view="week" />);
  const group = page.getByRole("radiogroup", { name: "Your choice for Pricing review" });
  await group.getByRole("radio", { name: "Attend" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: "Agent listens" })).toBeChecked();
  await expect(page.getByText("Your agent listens to Pricing review")).toBeVisible();
  await expect(page.getByText(/agent listens to 5/)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(group.getByRole("radio", { name: "Attend" })).toBeChecked();
  // a confidential meeting takes no agent, and says why
  const board = page.getByRole("radiogroup", { name: "Your choice for Board prep" });
  await expect(board.getByRole("radio", { name: "Agent listens" })).toBeDisabled();
});

test("a live interruption shows once, and holding the line pre-picks the matching line", async ({ mount, page }) => {
  await mount(<ListeningHarness view="live" />);
  await page.waitForFunction(() => Boolean(window.__gateway?.connected));
  await page.waitForTimeout(50);
  const listen = await page.evaluate(() => window.__gatewayLog?.some((e) => e.event === "listen"));
  expect(listen).toBe(true);
  for (let i = 0; i < 3; i++) {
    await page.evaluate((p) => window.__gateway!.push("agent-interrupt", { payload: p }), LIVE_INTERRUPTION);
  }
  await expect(page.getByText("Pricing for your segment is being decided in the 3pm right now.")).toHaveCount(1);
  expect(await axe(page, "body")).toEqual([]);
  await page.getByRole("button", { name: "Hold the line" }).click();
  const dialog = page.getByRole("dialog", { name: "Let your agent hold the line" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("checkbox", { name: /No discount above 10%/ })).toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: /No new contractors/ })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: /pricing page stays public/ })).toBeChecked();
  expect(await axe(page, "body")).toEqual([]);
  await dialog.getByRole("button", { name: "Hold the line", exact: true }).click();
  await expect(page.getByText("Your agent is holding the line")).toBeVisible();
  await expect(dialog).toBeHidden();
});

test("send a view from the Inbox row: Escape closes, sending shows the outcome", async ({ mount, page }) => {
  await mount(<ListeningHarness view="inbox-row" />);
  await page.getByRole("button", { name: "Send a view" }).click();
  const dialog = page.getByRole("dialog", { name: "Send a view" });
  await expect(dialog.getByLabel("Your view")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Send a view" }).click();
  await page.getByLabel("Your view").fill("Keep SMB at 10% off. 15% breaks the margin model.");
  expect(await axe(page, "body")).toEqual([]);
  await page.getByRole("button", { name: "Send view" }).click();
  await expect(page.getByText("You sent your view")).toBeVisible();
});

test("settings: a focus block that ends before it starts is caught; changes wait for Save", async ({ mount, page }) => {
  await mount(<ListeningHarness view="settings" />);
  await expect(page.getByText(/held until/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeHidden();
  await page.getByRole("button", { name: "Add a focus block" }).click();
  const until = page.getByLabel("Until").last();
  await until.fill("08:00");
  await expect(page.getByText("A focus block ends after it starts.")).toBeVisible();
  await until.fill("17:00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Listening settings saved")).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test("your lines: add one, then remove it with Undo", async ({ mount, page }) => {
  await mount(<ListeningHarness view="settings" />);
  await page.getByRole("button", { name: "Add a line" }).click();
  await page.getByLabel("Topic").fill("Roadmap");
  await page.getByLabel("The line").fill("Mobile ships after web, not before.");
  await page.getByRole("button", { name: "Save line" }).click();
  await expect(page.getByText("Mobile ships after web, not before.")).toBeVisible();
  await page.getByRole("button", { name: "Remove line: Mobile ships after web, not before." }).click();
  await expect(page.getByText("Line removed")).toBeVisible();
});

test("rules: the dialog previews the rule as a sentence and reports how many meetings follow it", async ({ mount, page }) => {
  await mount(<ListeningHarness view="rules-empty" />);
  await page.getByRole("button", { name: "Add that rule" }).click();
  const dialog = page.getByRole("dialog", { name: "New rule" });
  await expect(dialog.getByText("Your agent listens to every recurring meeting with “status” in the title, except ones you host.")).toBeVisible();
  expect(await axe(page, "body")).toEqual([]);
  await dialog.getByRole("button", { name: "Add rule" }).click();
  await expect(page.getByText("Applied to 3 upcoming meetings.")).toBeVisible();
});

test("room: listening agents are counted live, passive ones get no tile, the host shares a view", async ({ mount, page }) => {
  await mount(<RoomHarness passiveListener />);
  await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
  const chip = page.getByRole("button", { name: /2 agents listening/ });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.getByText("Priya Nair’s agent")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.evaluate(
    ([meetingId]) => window.__gateway!.push("listeners", { meetingId, payload: { count: 3, userIds: ["u-sarah", "u-priya", "u-raj-2"] } }),
    [MEETING_ID] as const,
  );
  await expect(page.getByRole("button", { name: /3 agents listening/ })).toBeVisible();
  // the views tray, read on mount for the host
  const tray = page.getByRole("region", { name: "Views from people who are not here" });
  await expect(tray.getByText("Keep SMB at 10% off. 15% breaks the margin model.")).toBeVisible();
  expect(await axe(page, "body")).toEqual([]);
  await tray.getByRole("button", { name: "Share with the room" }).click();
  await expect(tray).toBeHidden();
  const chat = await page.evaluate(() => window.__gatewayLog?.filter((e) => e.event === "chat").map((e) => (e.payload as { content?: string }).content));
  expect(chat).toContain("Priya's view: Keep SMB at 10% off. 15% breaks the margin model.");
});
