/* Accessibility and layout gate for People (departments, teams, what each does, who is on them):
   axe (WCAG 2.0/2.1 A and AA, contrast included) in light and dark for every state (an admin's
   board, a member's read-only board, empty, a failed read), the keyboard paths through the menus
   and dialogs, three team columns at desktop width and no horizontal scroll from 360 to 1600 px.
   With PEOPLE_SHOTS_DIR set it also saves screenshots at 1440 and 375 px in both themes.
   Run: npm run test:a11y */

import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { PeopleHarness } from "./PeopleHarness";

const SHOTS = process.env.PEOPLE_SHOTS_DIR;

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(".mx-app").analyze();
  return results.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const theme of ["light", "dark"] as const) {
  for (const state of ["admin", "member", "empty", "error"] as const) {
    test(`people ${state} has no axe violations (${theme})`, async ({ mount, page }) => {
      await mount(<PeopleHarness theme={theme} state={state} />);
      await expect(page.getByRole("heading", { level: 1, name: "People" })).toBeVisible();
      expect(await axe(page)).toEqual([]);
    });
  }

  test(`people dialogs have no axe violations (${theme})`, async ({ mount, page }) => {
    await mount(<PeopleHarness theme={theme} />);
    await page.getByRole("button", { name: "New department" }).first().click();
    const dialog = page.getByRole("dialog", { name: "New department" });
    await expect(dialog.getByLabel("What does it do?")).toBeVisible();
    await page.waitForTimeout(400);
    expect(await axe(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Edit Engineering" }).click();
    await page.getByRole("menuitem", { name: "Delete department" }).click();
    await expect(page.getByRole("dialog", { name: "Delete Engineering?" })).toBeVisible();
    await page.waitForTimeout(400); // the dialog's entrance has settled
    expect(await axe(page)).toEqual([]);
  });
}

test("the board shows what each department and team does, clamped with More", async ({ mount, page }) => {
  await mount(<PeopleHarness />);
  const eng = page.getByRole("region", { name: "Engineering" });
  await expect(eng.getByText(/Builds and runs the product/)).toBeVisible();
  const platform = page.getByRole("article", { name: "Platform" });
  await expect(platform.getByText("3 members, led by Raj Patel")).toBeVisible();
  const more = platform.getByRole("button", { name: "More about Platform" });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  await expect(platform.getByRole("button", { name: "Less about Platform" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "No department" }).getByRole("article", { name: "Founders office" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Not on a team" }).getByText("Lena Novak")).toBeVisible();
  // a team with no description invites an admin to add one
  await expect(page.getByRole("article", { name: "Agents" }).getByRole("button", { name: /Add what this team does/ })).toBeVisible();
});

test("a member sees the same board read-only", async ({ mount, page }) => {
  await mount(<PeopleHarness state="member" />);
  await expect(page.getByText("Only workspace owners and admins can change departments and teams.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Edit / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "New team" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Change / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Add a person/ })).toHaveCount(0);
  await expect(page.getByRole("article", { name: "Agents" }).getByText("No description yet.")).toBeVisible();
});

test("department menu by keyboard: delete says where the teams go, Escape returns focus", async ({ mount, page }) => {
  await mount(<PeopleHarness />);
  const menuButton = page.getByRole("button", { name: "Edit Engineering" });
  await menuButton.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Rename" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("menuitem", { name: "Delete department" })).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Delete Engineering?" });
  await expect(dialog).toContainText("Its 3 teams move to No department");
  // the safe choice takes focus, not the destructive one
  await expect(dialog.getByRole("button", { name: "Keep department" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(menuButton).toBeFocused();
});

test("rename, describe and delete go through and close", async ({ mount, page }) => {
  await mount(<PeopleHarness />);
  await page.getByRole("button", { name: "Edit Engineering" }).click();
  await page.getByRole("menuitem", { name: "Edit description" }).click();
  const describe = page.getByRole("dialog", { name: "What Engineering does" });
  const field = describe.getByLabel("What does it do?");
  await expect(field).toHaveValue(/Builds and runs the product/);
  await field.fill("x".repeat(1001));
  await expect(describe.getByText("Keep it under 1000 characters.")).toBeVisible();
  await expect(describe.getByRole("button", { name: "Save description" })).toBeDisabled();
  await field.fill("Builds the product.");
  await describe.getByRole("button", { name: "Save description" }).click();
  await expect(describe).toBeHidden();
  await expect(page.getByText("Description saved")).toBeVisible();

  await page.getByRole("button", { name: "Edit Platform" }).click();
  await page.getByRole("menuitem", { name: "Delete team" }).click();
  const del = page.getByRole("dialog", { name: "Delete Platform?" });
  await expect(del).toContainText("The 3 people on it stay in the workspace");
  await del.getByRole("button", { name: "Delete team" }).click();
  await expect(del).toBeHidden();
});

test("create flows ask what it does and say why", async ({ mount, page }) => {
  await mount(<PeopleHarness />);
  await page.getByRole("button", { name: "New team" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New team" });
  await expect(dialog.getByLabel("Name")).toBeFocused();
  const what = dialog.getByLabel("What does it do?");
  await expect(what).toHaveAttribute("placeholder", /Owns CI, deploys/);
  await expect(dialog.getByText(/Mytes read this to tune notes to each person's role and to suggest stakeholders/)).toBeVisible();
  // the department choice is the custom Dropdown, never a native select
  await expect(dialog.locator("select")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Create team" })).toBeDisabled();
  await dialog.getByLabel("Name").fill("Data");
  await expect(dialog.getByRole("button", { name: "Create team" })).toBeEnabled();
});

test("a person's menu moves them to another team", async ({ mount, page }) => {
  await mount(<PeopleHarness />);
  await page.getByRole("button", { name: "Change Diego Alvarez on Platform" }).click();
  await page.getByRole("menuitem", { name: "Move to another team" }).click();
  const dialog = page.getByRole("dialog", { name: "Move Diego Alvarez" });
  await expect(dialog.getByRole("combobox", { name: "New team" })).toBeVisible();
  await dialog.getByRole("button", { name: "Move Diego", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Moved to another team")).toBeVisible();
});

test("three team columns at desktop width, one on a phone, no horizontal scroll 360 to 1600", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(<PeopleHarness />);
  const cards = page.getByRole("region", { name: "Engineering" }).getByRole("article");
  const xs = await cards.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(xs).size).toBe(3);
  for (const width of [360, 375, 768, 1024, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
  }
  await page.setViewportSize({ width: 375, height: 900 });
  const narrow = await cards.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)));
  expect(new Set(narrow).size).toBe(1);
});

for (const width of [1440, 375]) {
  for (const theme of ["light", "dark"] as const) {
    test(`people screenshots ${width} ${theme}`, async ({ mount, page }) => {
      test.skip(!SHOTS, "set PEOPLE_SHOTS_DIR to save screenshots");
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      const out = (name: string) => path.join(SHOTS!, `people-${width}-${theme}-${name}.png`);
      const board = await mount(<PeopleHarness theme={theme} />);
      await page.waitForTimeout(300);
      await page.screenshot({ path: out("1-admin"), fullPage: true });
      await page.getByRole("button", { name: "New department" }).first().click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: out("2-new-department") });
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Edit Engineering" }).click();
      await page.waitForTimeout(150);
      await page.screenshot({ path: out("3-department-menu") });
      await page.getByRole("menuitem", { name: "Delete department" }).click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: out("4-delete-department") });
      await board.unmount();
      for (const state of ["member", "empty", "error", "loading"] as const) {
        const m = await mount(<PeopleHarness theme={theme} state={state} />);
        await page.waitForTimeout(300);
        await page.screenshot({ path: out(`5-${state}`), fullPage: true });
        await m.unmount();
      }
    });
  }
}
