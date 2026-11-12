/* Accessibility gate for My work > Promise ledger (Beyond the meeting, Layer 2): axe (WCAG 2.0/2.1
   A and AA, contrast included) in light and dark, with the week bar, a date someone asks to move,
   a promise found in Slack, the grouped ledger and the side column; the empty ledger; every action
   with its undo toast (kept, drop, hand off, renegotiate); the capacity warning with its one-tap
   better day; keyboard paths; and 360 / 1600 px with no horizontal scroll.

   Screenshots (not a gate): LEDGER_SHOTS_DIR=<dir> npm run test:a11y -- ledger-a11y

   Run: npm run test:a11y -- ledger-a11y */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import path from "node:path";
import { LedgerHarness } from "./LedgerHarness";

const SHOTS = process.env.LEDGER_SHOTS_DIR;

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(".mx-app").analyze();
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

for (const theme of ["light", "dark"] as const) {
  test(`the ledger has no axe violations (${theme})`, async ({ mount, page }) => {
    await mount(<LedgerHarness theme={theme} />);
    await expect(page.getByRole("heading", { name: "Your week" })).toBeVisible();
    await expect(page.getByText(/is too full: 6 things due/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Asked of you" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Found by your Myte" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Overdue" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Written in Slack.*Open the message in Slack/ }).first()).toHaveAttribute("target", "_blank");
    expect(await axe(page)).toEqual([]);
    await shot(page, `ledger-${theme}-1440`);
  });

  test(`the empty ledger reads clearly (${theme})`, async ({ mount, page }) => {
    await mount(<LedgerHarness theme={theme} empty />);
    await expect(page.getByText("No promises yet")).toBeVisible();
    expect(await axe(page)).toEqual([]);
    await shot(page, `ledger-empty-${theme}`);
  });

  test(`renegotiate offers the better day, by keyboard (${theme})`, async ({ mount, page }) => {
    await mount(<LedgerHarness theme={theme} />);
    const open = page.getByRole("button", { name: "Renegotiate the date: Send Priya the revised pricing deck" });
    await open.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Renegotiate the date" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/gets your request and accepts or declines/)).toBeVisible();
    await page.waitForTimeout(400); // the dialog's entrance settles before contrast is measured
    expect(await axe(page)).toEqual([]);
    await shot(page, `ledger-renegotiate-${theme}`);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });
}

test("kept, drop and their undo toasts", async ({ mount, page }) => {
  await mount(<LedgerHarness />);
  await page.getByRole("checkbox", { name: "Mark done: Write up the Q1 hiring plan" }).click();
  await expect(page.getByText("Promise kept")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Move back to open: Write up the Q1 hiring plan" })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).first().click();
  await expect(page.getByRole("checkbox", { name: "Mark done: Write up the Q1 hiring plan" })).toBeVisible();

  await page.getByRole("button", { name: "Drop: Call the landlord about the lease" }).click();
  await expect(page.getByText("Promise dropped")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Overdue" })).toBeHidden();
});

test("hand off sends it to a colleague, with undo", async ({ mount, page }) => {
  await mount(<LedgerHarness />);
  await page.getByRole("button", { name: "Hand off: Write up the Q1 hiring plan" }).click();
  const dialog = page.getByRole("dialog", { name: "Hand off this promise" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Hand off", exact: true }).click();
  await expect(dialog.getByText("Pick who takes it over.")).toBeVisible();
  await dialog.getByRole("button", { name: /Who takes it over/ }).click();
  await page.getByRole("option", { name: /Raj Patel/ }).click();
  await dialog.getByRole("button", { name: "Hand off", exact: true }).click();
  await expect(page.getByText("Handed off to Raj Patel")).toBeVisible();
  await expect(page.getByText("Write up the Q1 hiring plan")).toBeHidden();
  await page.getByRole("button", { name: "Undo" }).first().click();
  await expect(page.getByText("Promise taken back")).toBeVisible();
});

test("a found promise is confirmed and the agent offers a better day", async ({ mount, page }) => {
  await mount(<LedgerHarness />);
  await page.getByRole("button", { name: "Confirm promise: Send Sam the security questionnaire" }).click();
  await expect(page.getByText("Promise confirmed")).toBeVisible();
  await expect(page.getByText("That's your seventh promise due Friday. Offer Monday instead?")).toBeVisible();
  await page.getByRole("button", { name: "Offer Monday" }).click();
  await expect(page.getByRole("dialog", { name: "Renegotiate the date" })).toBeVisible();
});

test("asking someone to move a date, then withdrawing it", async ({ mount, page }) => {
  await mount(<LedgerHarness />);
  await page.getByRole("button", { name: "Renegotiate the date: Send Priya the revised pricing deck" }).click();
  const dialog = page.getByRole("dialog", { name: "Renegotiate the date" });
  await dialog.getByRole("button", { name: /^Offer / }).click();
  await expect(page.getByText(/Asked Priya Shah for/).first()).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).first().click();
  await expect(page.getByText("Request withdrawn")).toBeVisible();
});

test("add a promise by hand and accept a moved date", async ({ mount, page }) => {
  await mount(<LedgerHarness />);
  await page.getByRole("button", { name: "Add a promise" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add a promise" });
  await dialog.getByRole("button", { name: "Add promise" }).click();
  await expect(dialog.getByText("Say what you promised.")).toBeVisible();
  await dialog.getByLabel("What you promised").fill("Send Diego the Q4 numbers");
  await dialog.getByRole("button", { name: "Add promise" }).click();
  await expect(page.getByText("Promise added")).toBeVisible();
  await expect(page.getByRole("main").getByText("Send Diego the Q4 numbers")).toBeVisible();

  await page.getByRole("button", { name: /^Accept .* for: Send the signed contract to legal/ }).click();
  await expect(page.getByText(/^Accepted /)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Asked of you" })).toBeHidden();
});

test("filters by source and recipient", async ({ mount, page }) => {
  await mount(<LedgerHarness />);
  await page.getByRole("button", { name: /^Slack/, pressed: false }).click();
  await expect(page.getByText("Get Acme an answer on the SSO question")).toBeVisible();
  await expect(page.getByText("Write up the Q1 hiring plan")).toBeHidden();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("Write up the Q1 hiring plan")).toBeVisible();
});

for (const width of [360, 1600]) {
  test(`no horizontal scroll at ${width}px`, async ({ mount, page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mount(<LedgerHarness />);
    await expect(page.getByRole("heading", { name: "Your week" })).toBeVisible();
    await noOverflow(page);
    expect(await axe(page)).toEqual([]);
    await shot(page, `ledger-light-${width}`);
  });
}

test("a capacity warning link opens the renegotiate sheet", async ({ mount, page }) => {
  await mount(<LedgerHarness offer />);
  await expect(page.getByRole("dialog", { name: "Renegotiate the date" })).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Send Priya the revised pricing deck")).toBeVisible();
});
