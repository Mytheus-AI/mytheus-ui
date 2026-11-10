/* Accessibility gate for Settings > Agent memory ("What your agent remembers") and the erasure
   per-store checklist: axe (WCAG 2.0/2.1 A and AA, contrast included) in light and dark, every
   state (memory, empty, learning off, a refused change, forget everything), the keyboard paths,
   and 360 / 1600 px widths with no horizontal scroll. Run: npm run test:a11y */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { MemoryHarness } from "./MemoryHarness";

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

for (const theme of ["light", "dark"] as const) {
  test(`memory and erasure progress have no axe violations (${theme})`, async ({ mount, page }) => {
    await mount(<MemoryHarness theme={theme} />);
    await expect(page.getByRole("heading", { name: "Topics it follows" })).toBeVisible();
    await expect(page.getByText("Your agent shows notes above 0.75 because you dismissed 4 of the last 10.")).toBeVisible();
    await expect(page.getByText("2 of 5 stores done")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test(`the empty memory reads clearly (${theme})`, async ({ mount, page }) => {
    await mount(<MemoryHarness theme={theme} empty />);
    await expect(page.getByText("Your agent has not learned anything yet")).toBeVisible();
    await expect(page.getByText(/It tunes to you after 8 more notes/)).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test(`forget everything asks first, by keyboard (${theme})`, async ({ mount, page }) => {
    await mount(<MemoryHarness theme={theme} />);
    const open = page.getByRole("button", { name: "Forget everything", exact: true }).first();
    await open.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Forget everything?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Keep my memory" })).toBeFocused();
    expect(await axe(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
    await open.click();
    await page.getByRole("dialog").getByRole("button", { name: "Forget everything", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Memory cleared")).toBeVisible();
    await expect(page.getByText("Your agent has not learned anything yet")).toBeVisible();
  });
}

test("pin, forget, unmute and the learning switch", async ({ mount, page }) => {
  await mount(<MemoryHarness />);
  const topics = page.getByRole("list", { name: "Topics your agent follows" });

  await page.getByRole("button", { name: "Forget Hiring plan" }).click();
  await expect(topics.getByText("Hiring plan")).toHaveCount(0);
  await expect(topics).toBeFocused();
  await expect(page.getByRole("list", { name: "Muted topics" }).getByText("Hiring plan")).toBeVisible();

  await page.getByRole("button", { name: "Unmute Lunch orders" }).click();
  await expect(page.getByRole("list", { name: "Muted topics" }).getByText("Lunch orders")).toHaveCount(0);

  await page.getByRole("button", { name: "Pin Pricing" }).click();
  await expect(topics.getByRole("button", { name: "Pin Pricing" })).toHaveCount(0);

  const field = page.getByLabel("Pin a topic of your own");
  await field.fill("Q4 launch");
  await field.press("Enter");
  await expect(topics.getByText("Q4 launch")).toBeVisible();
  await expect(field).toHaveValue("");

  await field.fill("project falcon");
  await field.press("Enter");
  await expect(page.getByText("That topic is already pinned.")).toBeVisible();
  await expect(field).toHaveAttribute("aria-invalid", "true");

  await page.getByRole("button", { name: "Forget the question: When does the beta ship?" }).click();
  await expect(page.getByText("When does the beta ship?")).toHaveCount(0);

  const learning = page.getByRole("switch", { name: "Learn from what I keep and dismiss" });
  await expect(learning).toHaveAttribute("aria-checked", "true");
  await learning.focus();
  await page.keyboard.press("Space");
  await expect(learning).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText(/Learning is off/)).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test("a refused change rolls back and says why", async ({ mount, page }) => {
  await mount(<MemoryHarness />);
  const field = page.getByLabel("Pin a topic of your own");
  await field.fill("Refuse me");
  await field.press("Enter");
  await expect(page.getByText("Your change could not be saved just now. Try again in a moment.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Topics your agent follows" }).getByText("Refuse me")).toHaveCount(0);
});

test("open items link into My work and the meetings", async ({ mount, page }) => {
  await mount(<MemoryHarness />);
  await expect(page.getByRole("link", { name: /Send the pricing deck to Priya/ })).toHaveAttribute("href", "/meetings/77777777-7777-4777-8777-777777777777");
  await expect(page.getByRole("link", { name: "All your tasks" })).toHaveAttribute("href", "/work/tasks");
  await expect(page.getByRole("link", { name: "All your promises" })).toHaveAttribute("href", "/work/promises");
});

for (const width of [360, 1600]) {
  test(`fits ${width} px without horizontal scroll`, async ({ mount, page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mount(<MemoryHarness />);
    await expect(page.getByRole("heading", { name: "How sure it needs to be" })).toBeVisible();
    await noOverflow(page);
    expect(await axe(page)).toEqual([]);
  });
}
