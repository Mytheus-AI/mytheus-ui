/* Accessibility and keyboard gate for the only-Mytheus wave's interactive components (decision
   reversal, pre-approved answers, the new-meeting precheck hint, the weekly digest switches and
   the digest's sections). Each is mounted in the app's `.mx-app` theme root, light and dark, with
   the server actions and the precheck route answered at the edges (see playwright-ct.config.ts).

   - no axe violations (WCAG 2.0/2.1 A and AA, colour contrast included) in both themes;
   - the one-click paths work from the keyboard and say what happened;
   - the precheck asks once, after the pause, and its one button reports who was asked. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { OnlyHarness, type HarnessView } from "./OnlyHarness";

const PRECHECK = {
  already_decided: [
    {
      decision_id: "d-1",
      meeting_id: "m-1",
      meeting_title: "Beta review",
      content: "Ship the beta to 10 design partners first",
      decided_at: "2026-10-03T10:00:00Z",
      score: 0.82,
      superseded_by: null,
    },
  ],
  status_updates: [
    { agenda_index: 0, text: "QA status from Raj", action: { id: "a-1", content: "Finish QA", owner_user_id: "u-raj", owner_name: "Raj Patel", due_date: null } },
    { agenda_index: 1, text: "Docs status from Priya", action: { id: "a-2", content: "Docs", owner_user_id: "u-priya", owner_name: "Priya Nair", due_date: null } },
  ],
  recent_meetings: [{ meeting_id: "m-1", title: "Beta review", when: "2026-10-03T10:00:00Z" }],
  retrieval: "semantic",
};

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

async function routePrecheck(page: Page, counter: { n: number }) {
  await page.route("**/api/meeting-precheck", async (route) => {
    counter.n += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PRECHECK) });
  });
}

const VIEWS: HarnessView[] = ["reversal", "banner", "answers", "answers-readonly", "precheck", "digest-prefs", "digest-prefs-no-email", "digest"];

for (const theme of ["light", "dark"] as const) {
  for (const view of VIEWS) {
    test(`no axe violations: ${view} (${theme})`, async ({ mount, page }) => {
      const counter = { n: 0 };
      await routePrecheck(page, counter);
      await mount(<OnlyHarness view={view} theme={theme} />);
      if (view === "precheck") await expect(page.getByRole("heading", { name: "Before you schedule it" })).toBeVisible();
      if (view === "reversal") {
        await page.getByRole("button", { name: "Re-scope" }).click();
        await expect(page.getByLabel("The task, for the new decision")).toBeFocused();
      }
      expect(await axe(page)).toEqual([]);
    });
  }
}

test("keep a task in one keystroke, with Undo", async ({ mount, page }) => {
  await mount(<OnlyHarness view="reversal" />);
  await page.getByRole("button", { name: "Keep task" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("You kept this task as it was.")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Keep task" })).toBeVisible();
});

test("re-scope edits the task in place and Escape cancels", async ({ mount, page }) => {
  await mount(<OnlyHarness view="reversal" />);
  await page.getByRole("button", { name: "Re-scope" }).click();
  await expect(page.getByLabel("The task, for the new decision")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Re-scope" })).toBeFocused();
  await page.getByRole("button", { name: "Re-scope" }).click();
  // Saving with nothing changed says why instead of sending.
  await page.getByRole("button", { name: "Save re-scope" }).click();
  await expect(page.getByText("Change the task or its due date, or choose Keep task instead.")).toBeVisible();
  await page.getByLabel("The task, for the new decision").fill("Email the 10 design partners");
  await page.getByRole("button", { name: "Save re-scope" }).click();
  await expect(page.getByText("Now: Email the 10 design partners")).toBeVisible();
});

test("the banner lands on the reversal it was opened for", async ({ mount, page }) => {
  await mount(<OnlyHarness view="banner" />);
  await expect(page.locator("li[aria-current='true']")).toBeFocused();
  // One still waits on you; the other shows how it was settled.
  await expect(page.getByRole("heading", { name: "Decisions changed under your tasks" })).toBeVisible();
  await expect(page.getByText("1 waiting on you")).toBeAttached();
  await expect(page.getByText("You kept this task as it was.")).toBeVisible();
});

test("pre-approved answers: Enter adds, X removes, limits are explained", async ({ mount, page }) => {
  await mount(<OnlyHarness view="answers" />);
  await expect(page.getByText("Sarah didn't pre-approve an answer to that.", { exact: false })).toBeVisible();
  const field = page.getByLabel("Add a statement");
  await field.fill("Partners get the beta on Dec 2.");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listitem").filter({ hasText: "Partners get the beta on Dec 2." })).toBeVisible();
  await expect(field).toHaveValue("");
  await field.fill("partners get the beta on dec 2.");
  await page.keyboard.press("Enter");
  await expect(page.getByText("That one is already on the list.")).toBeVisible();
  await page.getByRole("button", { name: "Remove: The budget for partners is approved." }).click();
  await expect(page.getByText("The budget for partners is approved.")).toHaveCount(0);
});

test("the precheck asks once after the pause, and asking reports who", async ({ mount, page }) => {
  const counter = { n: 0 };
  await routePrecheck(page, counter);
  await mount(<OnlyHarness view="precheck" />);
  await expect(page.getByText("This was already decided on Oct 3")).toBeVisible();
  expect(counter.n).toBe(1);
  await page.getByRole("button", { name: "Send 2 status requests" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Asked Raj and Priya" })).toBeVisible();
  await page.getByRole("button", { name: "Hide these hints" }).click();
  await expect(page.getByRole("heading", { name: "Before you schedule it" })).toHaveCount(0);
});

test("the digest email switch explains when email is not set up", async ({ mount, page }) => {
  await mount(<OnlyHarness view="digest-prefs-no-email" />);
  await expect(page.getByText("Email isn't set up on this workspace's server yet", { exact: false })).toBeVisible();
  await page.getByRole("switch", { name: "Send me the digest" }).click();
  await expect(page.getByRole("switch", { name: "Send me the digest" })).toHaveAttribute("aria-checked", "false");
});

/* Screenshots for review, not assertions: run with SHOTS=1 to write them to test-results/. */
for (const view of VIEWS) {
  for (const theme of ["light", "dark"] as const) {
    test(`screenshot ${view} ${theme}`, async ({ mount, page }) => {
      test.skip(!process.env.SHOTS, "set SHOTS=1 to write review screenshots");
      const counter = { n: 0 };
      await routePrecheck(page, counter);
      await page.setViewportSize({ width: 1200, height: 900 });
      await mount(<OnlyHarness view={view} theme={theme} />);
      if (view === "precheck") await expect(page.getByRole("heading", { name: "Before you schedule it" })).toBeVisible();
      if (view === "reversal") await page.getByRole("button", { name: "Re-scope" }).click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `test-results/only-shots/${view}-${theme}.png`, fullPage: true });
      await page.setViewportSize({ width: 375, height: 900 });
      await page.waitForTimeout(200);
      await page.screenshot({ path: `test-results/only-shots/${view}-${theme}-375.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "no horizontal scroll at 375px").toBeLessThanOrEqual(0);
    });
  }
}
