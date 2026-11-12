/* Accessibility and keyboard gate for decisions as bets and the company time machine: the
   decision page's bet section in every state, the "How good are our calls" report and the time
   machine's three modes, light and dark, with the server actions answered at the edges.

   - no axe violations (WCAG 2.0/2.1 A and AA, colour contrast included) in both themes;
   - a suggested bet is kept or dismissed from the keyboard, and Undo brings it back;
   - a bet is added through the form and scored, the metric's suggestion chosen for you;
   - the time machine's scrubber moves by keyboard and the topic box follows a topic.

   Screenshots for the review (not a gate) when BEYOND_SHOTS_DIR is set. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import path from "node:path";
import { BetsHarness, type BetsView } from "./BetsHarness";

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

const VIEWS: BetsView[] = [
  "bet-empty",
  "bet-empty-readonly",
  "bet-proposed",
  "bet-open",
  "bet-due",
  "bet-resolved",
  "calls",
  "calls-empty",
  "tm-snapshot",
  "tm-compare",
  "tm-topic",
  "tm-topic-empty",
];

for (const theme of ["light", "dark"] as const) {
  for (const view of VIEWS) {
    test(`no axe violations: ${view} (${theme})`, async ({ mount, page }) => {
      await mount(<BetsHarness view={view} theme={theme} />);
      await expect(page.locator("main")).toBeVisible();
      expect(await axe(page)).toEqual([]);
    });
  }
  test(`no axe violations: bet editor (${theme})`, async ({ mount, page }) => {
    await mount(<BetsHarness view="bet-empty" theme={theme} />);
    await page.getByRole("button", { name: "Add the expected outcome" }).click();
    await expect(page.getByLabel("What should this decision achieve?")).toBeFocused();
    expect(await axe(page)).toEqual([]);
  });
}

test("keep a suggested bet from the keyboard", async ({ mount, page }) => {
  await mount(<BetsHarness view="bet-proposed" />);
  await expect(page.getByText("Your Myte heard an expected outcome in the meeting")).toBeVisible();
  await page.getByRole("button", { name: "Keep this expectation" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Expectation kept")).toBeVisible();
  await expect(page.getByText("Waiting for the check date")).toBeVisible();
});

test("dismiss a suggested bet, then Undo", async ({ mount, page }) => {
  await mount(<BetsHarness view="bet-proposed" />);
  await page.getByRole("button", { name: "Not a bet" }).click();
  await expect(page.getByText("Marked as not a bet:")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Expectation restored")).toBeVisible();
});

test("add a bet through the form; the form explains what is missing", async ({ mount, page }) => {
  await mount(<BetsHarness view="bet-empty" />);
  await page.getByRole("button", { name: "Add the expected outcome" }).click();
  await page.getByRole("button", { name: "Save expected outcome" }).click();
  await expect(page.getByText("Say what this decision should achieve.")).toBeVisible();
  await expect(page.getByLabel("What should this decision achieve?")).toBeFocused();
  await page.getByLabel("What should this decision achieve?").fill("Annual billing cuts churn by 3 points by March");
  await page.getByLabel("What is measured").fill("Monthly churn");
  await page.getByRole("button", { name: "Save expected outcome" }).click();
  await expect(page.getByText("Expected outcome added")).toBeVisible();
});

test("a due bet arrives with the metric's suggestion chosen, and is scored", async ({ mount, page }) => {
  await mount(<BetsHarness view="bet-due" />);
  await expect(page.getByText("What the check found")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Partly/ })).toBeChecked();
  await expect(page.getByText("A later meeting you were not in")).toBeVisible();
  await page.getByRole("radio", { name: /Missed/ }).check({ force: true });
  await page.getByRole("radio", { name: "It did not", exact: true }).check({ force: true });
  await page.getByLabel("What should the next similar decision learn?").fill("Give price changes two quarters");
  await page.getByRole("button", { name: "Score this bet" }).click();
  await expect(page.getByText("Bet scored: missed")).toBeVisible();
  await expect(page.getByText("Give price changes two quarters")).toBeVisible();
});

test("the scrubber moves by keyboard and the topic box follows a topic", async ({ mount, page }) => {
  await mount(<BetsHarness view="tm-snapshot" />);
  await expect(page.getByText("As of July 31, 2026")).toBeVisible();
  const slider = page.getByRole("slider", { name: "Date" });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("As of August 1, 2026")).toBeVisible();
  await page.getByRole("button", { name: "Follow a topic" }).click();
  await page.getByLabel("Topic").fill("pricing");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "How pricing changed" })).toBeVisible();
  await expect(page.getByText("Twenty-nine, and we grandfather everyone on nineteen")).toBeVisible();
});

test("the report never names a person", async ({ mount, page }) => {
  await mount(<BetsHarness view="calls" />);
  await expect(page.getByRole("heading", { name: "By team" })).toBeVisible();
  const report = await page.locator("main").innerText();
  // The private "Waiting for you" list is the only personal part; the aggregates name no one.
  const aggregates = report.split("Waiting for you")[0];
  for (const name of ["Maya", "Raj", "Priya", "Diego"]) expect(aggregates).not.toContain(name);
});

// --- screenshots (not a gate) -------------------------------------------------------------------

const DIR = process.env.BEYOND_SHOTS_DIR;
const SHOTS: { name: string; view: BetsView; width: number; prep?: (page: Page) => Promise<void> }[] = [
  { name: "decision-bet-proposed", view: "bet-proposed", width: 1200 },
  { name: "decision-bet-open", view: "bet-open", width: 1200 },
  { name: "decision-bet-due", view: "bet-due", width: 1200 },
  { name: "decision-bet-resolved", view: "bet-resolved", width: 1200 },
  { name: "decision-bet-editor", view: "bet-empty", width: 1200, prep: async (p) => void (await p.getByRole("button", { name: "Add the expected outcome" }).click()) },
  { name: "calls", view: "calls", width: 1440 },
  { name: "calls-empty", view: "calls-empty", width: 1200 },
  { name: "time-machine-as-of", view: "tm-snapshot", width: 1440 },
  { name: "time-machine-compare", view: "tm-compare", width: 1440 },
  { name: "time-machine-topic", view: "tm-topic", width: 1440 },
  { name: "time-machine-as-of-360", view: "tm-snapshot", width: 360 },
  { name: "calls-360", view: "calls", width: 360 },
  { name: "decision-bet-due-360", view: "bet-due", width: 360 },
];

for (const theme of ["light", "dark"] as const) {
  for (const shot of SHOTS) {
    test(`shot: ${shot.name} (${theme})`, async ({ mount, page }) => {
      test.skip(!DIR, "set BEYOND_SHOTS_DIR to take the review screenshots");
      await page.setViewportSize({ width: shot.width, height: 900 });
      await mount(<BetsHarness view={shot.view} theme={theme} />);
      if (shot.prep) await shot.prep(page);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(DIR as string, `${shot.name}-${theme}.png`), fullPage: true });
    });
  }
}
