/* Accessibility gate for the Phase 4 reach surfaces outside the room: Settings > API access (the
   token list, the create dialog and its one-time secret, the connection snippets), a decision's
   Share and export card, and Workspace > Data erasure. Axe (WCAG 2.0/2.1 A and AA, contrast
   included) in light and dark, plus the keyboard paths through each dialog. Run: npm run test:a11y */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { ReachHarness } from "./ReachHarness";

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(".mx-app").analyze();
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

for (const theme of ["light", "dark"] as const) {
  test(`no axe violations on the reach surfaces (${theme})`, async ({ mount, page }) => {
    await mount(<ReachHarness theme={theme} />);
    await expect(page.getByRole("heading", { name: "Personal access tokens" })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test(`create token shows the secret once, accessibly (${theme})`, async ({ mount, page }) => {
    await mount(<ReachHarness theme={theme} />);
    await page.getByRole("button", { name: "Create token" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Create token" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Name")).toBeFocused();
    expect(await axe(page)).toEqual([]);
    await dialog.getByLabel("Name").fill("Claude Code");
    await dialog.getByRole("button", { name: "Create token", exact: true }).click();
    const reveal = page.getByRole("dialog", { name: "Copy your new token" });
    await expect(reveal.getByLabel("Token", { exact: true })).toHaveValue(/mytheus_pat_test/);
    await expect(reveal.getByText("This is the only time the token is shown", { exact: false })).toBeVisible();
    expect(await axe(page)).toEqual([]);
    await reveal.getByRole("button", { name: "I have copied it" }).click();
    await expect(reveal).toBeHidden();
    await expect(page.getByRole("list", { name: "Your tokens" }).getByText("Claude Code", { exact: true })).toBeVisible();
  });

  test(`erasure needs the typed confirmation (${theme})`, async ({ mount, page }) => {
    await mount(<ReachHarness theme={theme} />);
    await page.getByRole("button", { name: "Start erasure" }).click();
    const dialog = page.getByRole("dialog", { name: "Erase data" });
    await dialog.getByText("One meeting's data").click();
    await dialog.getByRole("combobox", { name: "Meeting" }).click();
    await dialog.getByRole("option", { name: /Pricing review/ }).click();
    await expect(dialog.getByRole("combobox", { name: "Meeting" })).toHaveText(/Pricing review/);
    const erase = dialog.getByRole("button", { name: "Erase meeting data" });
    await expect(erase).toBeDisabled();
    await dialog.getByLabel(/to confirm/).fill("pricing REVIEW ");
    await expect(erase).toBeEnabled();
    expect(await axe(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Start erasure" })).toBeFocused();
  });
}

test("exports that cannot run are off with their reason", async ({ mount, page }) => {
  await mount(<ReachHarness />);
  await expect(page.getByRole("button", { name: "Export to Notion" })).toBeEnabled();
  const confluence = page.getByRole("button", { name: "Export to Confluence" });
  await expect(confluence).toBeDisabled();
  await expect(confluence).toHaveAccessibleDescription(/not available on this Mytheus server yet/);
  await expect(page.getByRole("button", { name: "Export to Slack" })).toHaveAccessibleDescription(/not connected/);
});

test("empty token list and phone width", async ({ mount, page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mount(<ReachHarness empty />);
  await expect(page.getByText("No tokens yet")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(await axe(page)).toEqual([]);
});
