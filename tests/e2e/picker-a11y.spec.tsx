/* The member picker's gate (New meeting window and Invite dialog share it): picking collapses a
   row into a face in the one-line cluster, removing pops it back, past eight the earliest fold
   into "+N", every change is announced politely, the list and the balls work by keyboard, names
   show on hover and focus, and there are no axe violations in either theme or at 360 px.
   Real component in a real browser, the edges mocked as in playwright-ct.config.ts. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { NewMeetingHarness } from "./NewMeetingHarness";
import { MANY } from "./picker-fixture";

async function axe(page: Page) {
  await page.waitForTimeout(350);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(".mx-app").analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

async function open(page: Page) {
  await page.route("**/api/meeting-precheck", (r) => r.fulfill({ status: 503, body: "{}" }));
  await page.getByRole("button", { name: "New meeting" }).click();
  return page.getByRole("region", { name: /People/ });
}

test("select: the row leaves the list and a ball joins the cluster, announced", async ({ mount, page }) => {
  await mount(<NewMeetingHarness />);
  const people = await open(page);
  await expect(people.getByText("No one picked yet")).toBeVisible();
  await people.getByRole("checkbox", { name: /Priya Nair/ }).click();
  await expect(people.getByRole("button", { name: "Remove Priya Nair" })).toBeVisible();
  await expect(people.getByRole("checkbox", { name: /Priya Nair/ })).toHaveCount(0);
  await expect(people.getByText("1 person", { exact: true })).toBeVisible();
  await expect(people.getByRole("status")).toHaveText("Added Priya Nair. 1 person picked.");
  await people.getByRole("checkbox", { name: /Raj Patel/ }).click();
  await expect(people.getByText("2 people", { exact: true })).toBeVisible();
  await expect(people.getByRole("list", { name: "Invited" }).getByRole("button")).toHaveCount(2);
});

test("deselect: clicking a ball, or Backspace and Delete on one, puts the person back", async ({ mount, page }) => {
  await mount(<NewMeetingHarness />);
  const people = await open(page);
  for (const n of ["Raj Patel", "Priya Nair", "Sarah Okafor"]) await people.getByRole("checkbox", { name: new RegExp(n) }).click();
  await people.getByRole("button", { name: "Remove Priya Nair" }).click();
  await expect(people.getByRole("checkbox", { name: /Priya Nair/ })).toBeVisible();
  await expect(people.getByRole("status")).toHaveText("Removed Priya Nair. 2 people picked.");
  // Backspace on a focused ball removes it and focus moves to the neighbouring ball.
  await people.getByRole("button", { name: "Remove Raj Patel" }).focus();
  await page.keyboard.press("Backspace");
  await expect(people.getByRole("button", { name: "Remove Raj Patel" })).toHaveCount(0);
  await expect(people.getByRole("button", { name: "Remove Sarah Okafor" })).toBeFocused();
  await page.keyboard.press("Delete");
  await expect(people.getByText("No one picked yet")).toBeVisible();
  await expect(people.getByRole("checkbox")).toHaveCount(7);
  await expect(people.getByRole("checkbox", { name: /Sarah Okafor/ })).toBeFocused();
});

test("+N overflow: past eight the earliest fold into one ball that shows everyone", async ({ mount, page }) => {
  await mount(<NewMeetingHarness members={MANY} />);
  const people = await open(page);
  const balls = people.getByRole("list", { name: "Invited" }).getByRole("button");
  for (const m of MANY.slice(0, 8)) await people.getByRole("checkbox", { name: new RegExp(m.name) }).click();
  await expect(balls).toHaveCount(8);
  await expect(people.getByRole("button", { name: /more/ })).toHaveCount(0);
  for (const m of MANY.slice(8, 11)) await people.getByRole("checkbox", { name: new RegExp(m.name) }).click();
  await expect(people.getByText("11 people", { exact: true })).toBeVisible();
  await expect(balls).toHaveCount(8); // seven faces and "+4", still one line
  const more = people.getByRole("button", { name: "Show 4 more people" });
  await expect(more).toHaveText(/\+4/);
  await expect(more).toHaveAttribute("aria-expanded", "false");
  // The latest pick is visible; the first ones are folded.
  await expect(people.getByRole("button", { name: "Remove Shaun Marvell Rodrigues" })).toBeVisible();
  await expect(people.getByRole("button", { name: "Remove Raj Patel" })).toHaveCount(0);
  await page.waitForTimeout(400); // let the last travel settle before measuring
  const tops = await balls.evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size);
  expect(tops).toBe(1);
  await more.click();
  await expect(people.getByRole("button", { name: "Show fewer people" })).toHaveAttribute("aria-expanded", "true");
  await expect(balls).toHaveCount(12);
  await people.getByRole("button", { name: "Remove Raj Patel" }).click();
  await people.getByRole("button", { name: "Remove Priya Nair" }).click();
  await people.getByRole("button", { name: "Remove Sarah Okafor" }).click();
  // Back to eight: the cluster folds itself and no +N is left.
  await expect(balls).toHaveCount(8);
  await expect(people.getByRole("button", { name: /more|fewer/ })).toHaveCount(0);
});

test("keyboard: search, list and balls", async ({ mount, page }) => {
  await mount(<NewMeetingHarness />);
  const people = await open(page);
  await people.getByLabel("Search people").focus();
  await page.keyboard.press("ArrowDown");
  await expect(people.getByRole("checkbox", { name: /Raj Patel/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(people.getByRole("checkbox", { name: /Priya Nair/ })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(people.getByRole("button", { name: "Remove Priya Nair" })).toBeVisible();
  await expect(people.getByRole("checkbox", { name: /Sarah Okafor/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(people.getByRole("checkbox", { name: /Diego Alvarez/ })).toBeFocused();
  // The list is one tab stop; the cluster is another.
  await page.keyboard.press("End");
  await expect(people.getByRole("checkbox", { name: /Daniel Okafor/ })).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowUp");
  await expect(people.getByLabel("Search people")).toBeFocused();
  await people.getByRole("button", { name: "Remove Priya Nair" }).focus();
  // Programmatic focus does not match :focus-visible; a key press does, and shows the name.
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(people.getByRole("button", { name: "Remove Priya Nair" }).locator(".mh-pick-tip")).toHaveCSS("opacity", "1");
  await page.keyboard.press("ArrowRight");
  await expect(people.getByRole("button", { name: "Remove Sarah Okafor" })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(people.getByRole("button", { name: "Remove Priya Nair" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(people.getByRole("checkbox").first()).toBeFocused();
});

test("hovering a ball shows the person's name", async ({ mount, page }) => {
  await mount(<NewMeetingHarness />);
  const people = await open(page);
  await people.getByRole("checkbox", { name: /Aiko Tanaka/ }).click();
  const ball = people.getByRole("button", { name: "Remove Aiko Tanaka" });
  const tip = ball.locator(".mh-pick-tip");
  await expect(tip).toHaveCSS("opacity", "0");
  await ball.hover();
  await expect(tip).toHaveCSS("opacity", "1");
  await expect(tip).toHaveText("Aiko Tanaka");
});

test("reduced motion: picking and removing still work, with no travel", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mount(<NewMeetingHarness />);
  const people = await open(page);
  await people.getByRole("checkbox", { name: /Diego Alvarez/ }).click();
  await expect(people.getByRole("button", { name: "Remove Diego Alvarez" })).toBeVisible();
  await people.getByRole("button", { name: "Remove Diego Alvarez" }).click();
  await expect(people.getByRole("checkbox", { name: /Diego Alvarez/ })).toBeVisible();
});

for (const theme of ["light", "dark"] as const) {
  for (const width of [1440, 360]) {
    test(`no axe violations and no sideways scroll with a full cluster (${theme}, ${width} px)`, async ({ mount, page }) => {
      await page.setViewportSize({ width, height: 812 });
      await mount(<NewMeetingHarness theme={theme} members={MANY} />);
      const people = await open(page);
      for (const m of MANY.slice(0, 10)) await people.getByRole("checkbox", { name: new RegExp(m.name) }).click();
      await people.getByRole("button", { name: "Remove Samar Rihan" }).focus();
      expect(await axe(page)).toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const cluster = await people.getByRole("list", { name: "Invited" }).boundingBox();
      const region = await people.boundingBox();
      expect(cluster!.x + cluster!.width).toBeLessThanOrEqual(region!.x + region!.width + 1);
    });
  }
}
