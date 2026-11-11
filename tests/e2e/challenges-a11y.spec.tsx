/* Accessibility and keyboard gate for "Decisions that follow you": the decision page's
   "Challenged in N places" section in every state, and the Inbox rows for a challenge and a
   request to reopen, mounted in the app's `.mx-app` theme root, light and dark, with the server
   actions answered at the edges (see playwright-ct.config.ts).

   - no axe violations (WCAG 2.0/2.1 A and AA, colour contrast included) in both themes;
   - the owner answers a request from the keyboard, with Undo; decline takes an optional note;
   - someone else can ask to reopen, then withdraw with Undo; the writer or owner can dismiss.

   Screenshots (not a gate): A1_SHOTS_DIR=/path npm run test:a11y -- challenges-a11y */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import path from "node:path";
import { ChallengesHarness, type ChallengesView } from "./ChallengesHarness";

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

const VIEWS: ChallengesView[] = ["owner", "viewer", "requester", "empty", "unavailable", "locked", "loading", "inbox"];

for (const theme of ["light", "dark"] as const) {
  for (const view of VIEWS) {
    test(`no axe violations: ${view} (${theme})`, async ({ mount, page }) => {
      await mount(<ChallengesHarness view={view} theme={theme} />);
      if (view === "owner") {
        await expect(page.getByRole("heading", { name: "Challenged in 3 places" })).toBeVisible();
        await page.getByRole("button", { name: "Accept" }).click();
        await expect(page.getByRole("combobox", { name: "What happens next" })).toBeFocused();
      }
      if (view === "loading") await page.waitForTimeout(400);
      expect(await axe(page)).toEqual([]);
    });
  }
}

test("the owner schedules a revisit from the keyboard, and Undo takes it back", async ({ mount, page }) => {
  await mount(<ChallengesHarness view="owner" />);
  await page.getByRole("button", { name: "Accept" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Starts")).toHaveValue(/T10:00$/);
  await page.getByRole("button", { name: "Schedule revisit" }).click();
  await expect(page.getByText("A revisit meeting is scheduled.")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();
});

test("the owner can switch to a follow-up task with the custom dropdown", async ({ mount, page }) => {
  await mount(<ChallengesHarness view="owner" />);
  await page.getByRole("button", { name: "Accept" }).click();
  await page.getByRole("combobox", { name: "What happens next" }).click();
  await page.getByRole("option", { name: /Create a follow-up task/ }).click();
  await expect(page.getByLabel("Due")).toBeVisible();
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByText("A follow-up task was created for the owner.")).toBeVisible();
});

test("Escape closes the answer and focus returns to Accept", async ({ mount, page }) => {
  await mount(<ChallengesHarness view="owner" />);
  await page.getByRole("button", { name: "Accept" }).click();
  await page.getByLabel(/Note to Priya Nair/).focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Accept" })).toBeFocused();
});

test("declining takes an optional note", async ({ mount, page }) => {
  await mount(<ChallengesHarness view="owner" />);
  await page.getByRole("button", { name: "Decline" }).click();
  await page.getByLabel(/Tell Priya Nair why/).fill("We committed $18 to the board for Q1.");
  await page.getByRole("button", { name: "Decline request" }).click();
  await expect(page.getByText("The owner kept the decision as it is.")).toBeVisible();
});

test("the owner dismisses a challenge, with Undo", async ({ mount, page }) => {
  await mount(<ChallengesHarness view="owner" />);
  await page.getByRole("button", { name: "Dismiss the challenge from #pricing" }).click();
  await expect(page.getByRole("heading", { name: "Challenged in 2 places" })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("heading", { name: "Challenged in 3 places" })).toBeVisible();
});

test("someone else asks to reopen, then withdraws with Undo", async ({ mount, page }) => {
  await mount(<ChallengesHarness view="empty" />);
  await expect(page.getByText("No one has challenged this decision")).toBeVisible();
  await page.getByRole("button", { name: "Ask to reopen" }).click();
  await expect(page.getByLabel(/What changed/)).toBeFocused();
  await page.getByLabel(/What changed/).fill("The market moved.");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByRole("button", { name: "Withdraw request" })).toBeVisible();
  await page.getByRole("button", { name: "Withdraw request" }).click();
  await expect(page.getByText("The request was withdrawn.")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Withdraw request" })).toBeVisible();
});

test("a deep link focuses the request", async ({ mount, page }) => {
  await mount(<ChallengesHarness view="owner" focus />);
  await expect(page.locator('[aria-current="true"][id^="reopen-"]')).toBeFocused();
});

test("the Inbox answers a reopen request in place", async ({ mount, page }) => {
  await mount(<ChallengesHarness view="inbox" />);
  await expect(page.getByRole("heading", { name: "Your decision was challenged in #pricing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Priya Nair asked to reopen your decision" })).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await page.getByRole("button", { name: "Schedule revisit" }).click();
  await expect(page.getByText("A revisit meeting is scheduled.")).toBeVisible();
});

/* ---------------- screenshots (not a gate) ---------------- */

const DIR = process.env.A1_SHOTS_DIR;

const SHOTS: { name: string; view: ChallengesView; open?: boolean }[] = [
  { name: "decision-challenges-owner", view: "owner" },
  { name: "decision-challenges-accept", view: "owner", open: true },
  { name: "decision-challenges-viewer", view: "viewer" },
  { name: "decision-challenges-empty", view: "empty" },
  { name: "decision-challenges-error", view: "unavailable" },
  { name: "inbox-follow-rows", view: "inbox" },
];

for (const shot of SHOTS) {
  for (const [theme, width] of [
    ["light", 1440],
    ["dark", 1440],
    ["light", 390],
  ] as const) {
    test(`shot ${shot.name} ${theme} ${width}`, async ({ mount, page }) => {
      test.skip(!DIR, "set A1_SHOTS_DIR to take screenshots");
      await page.setViewportSize({ width, height: 900 });
      await mount(<ChallengesHarness view={shot.view} theme={theme} />);
      if (shot.open) await page.getByRole("button", { name: "Accept" }).click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(DIR!, `${shot.name}-${theme}-${width}.png`), fullPage: true });
    });
  }
}
