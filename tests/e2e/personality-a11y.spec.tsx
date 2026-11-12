/* The Myte's "How it writes" card: the five personalities as a 3 x 2 grid with a sixth cell, "Your
   own", that is a plain button outside the radio group and hands focus to the instructions.

     npm run test:a11y -- personality-a11y */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import { AgentHarness } from "./AgentHarness";

test.describe.configure({ timeout: 90_000 });

for (const theme of ["light", "dark"] as const) {
  test(`personality grid: 3 across on desktop, equal rows, and it passes axe (${theme})`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await mount(<AgentHarness theme={theme} view="page" />);
    const group = page.getByRole("group", { name: "Personality" });
    const radios = group.getByRole("radio");
    await expect(radios).toHaveCount(5);
    const own = group.getByRole("button", { name: /Your own/ });
    await expect(own).toBeVisible();
    await expect(own).toContainText("Custom instructions on");

    const boxes = await Promise.all(
      [...(await radios.all()).map((r) => r.locator("xpath=ancestor::label[1]")), own].map((l) => l.boundingBox()),
    );
    const rows = new Map<number, number[]>();
    for (const b of boxes) rows.set(Math.round(b!.y), [...(rows.get(Math.round(b!.y)) ?? []), Math.round(b!.height)]);
    expect([...rows.values()].map((r) => r.length)).toEqual([3, 3]);
    for (const heights of rows.values()) expect(new Set(heights).size).toBe(1);

    const axe = await new AxeBuilder({ page }).include("form, section, fieldset").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });
}

test("personality grid: arrows stay in the five, and Your own keeps the choice and focuses the instructions", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await mount(<AgentHarness view="page" />);
  const group = page.getByRole("group", { name: "Personality" });
  const friendly = group.getByRole("radio", { name: /Friendly/ });
  await expect(friendly).toBeChecked();
  await friendly.focus();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: /Balanced/ })).toBeChecked();
  await expect(group.getByRole("radio", { name: /Balanced/ })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(friendly).toBeChecked();

  await group.getByRole("button", { name: /Your own/ }).click();
  await expect(page.locator("#ag-instructions")).toBeFocused();
  await expect(friendly).toBeChecked();
});

test("personality grid: two across on a tablet, one on a phone", async ({ mount, page }) => {
  await page.setViewportSize({ width: 800, height: 1400 });
  const c = await mount(<AgentHarness view="page" />);
  const labels = page.getByRole("group", { name: "Personality" }).locator("label");
  const y = async (i: number) => Math.round((await labels.nth(i).boundingBox())!.y);
  expect(await y(0)).toBe(await y(1));
  expect(await y(2)).toBeGreaterThan(await y(1));
  await c.unmount();
  await page.setViewportSize({ width: 375, height: 1400 });
  await mount(<AgentHarness view="page" />);
  expect(await y(1)).toBeGreaterThan(await y(0));
});
