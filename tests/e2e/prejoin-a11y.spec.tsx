/* Accessibility and layout gate for the pre-join (the "Ready to join?" page). Mounted in the call's
   `.mx-app.mx-meet` theme root, light and dark, with Chromium's fake camera and microphone so the
   preview, the device pickers and the level meter render as they do for a person.

   - no axe violations (WCAG 2.0/2.1 A and AA, colour contrast included) in both themes;
   - Join stays disabled until the agree box is ticked, and the box is a labelled checkbox;
   - the preview and devices (left) and the meeting card and agent brief (right rail) end on one
     line, and the consent card with the box and Join sits straight under them;
   - keyboard order: the preview toggles, the device pickers, the agree box, then Join;
   - no horizontal page scroll at 360, 375 and 768 px; on a phone the order reads preview,
     devices, consent, then the meeting. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { PreJoinHarness } from "./PreJoinHarness";

test.use({
  permissions: ["camera", "microphone"],
  launchOptions: {
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .include("main")
    .analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes
      .slice(0, 3)
      .map(
        (n) =>
          `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`,
      ),
  }));
}

async function settled(page: Page) {
  await expect(page.getByText("Microphone working")).toBeVisible({ timeout: 15_000 });
}

for (const theme of ["light", "dark"] as const) {
  test(`pre-join has no axe violations (${theme})`, async ({ mount, page }) => {
    await mount(<PreJoinHarness theme={theme} />);
    await settled(page);
    expect(await axe(page)).toEqual([]);
  });
}

test("Join is locked until the notice is agreed", async ({ mount, page }) => {
  await mount(<PreJoinHarness />);
  const join = page.getByRole("button", { name: "Join meeting" });
  const agree = page.getByRole("checkbox", {
    name: "I have read this and agree to join on these terms",
  });
  await expect(join).toBeDisabled();
  await expect(
    page.getByText("Tick the agreement to enable Join."),
  ).toBeVisible();
  await page.getByText("I have read this and agree to join on these terms").click();
  await expect(agree).toBeChecked();
  await expect(join).toBeEnabled();
  await expect(
    page.getByText("Ready. Your mic and camera choices come with you."),
  ).toBeVisible();
});

test("an earlier agreement opens Join without the box", async ({
  mount,
  page,
}) => {
  await mount(<PreJoinHarness agreed />);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Join meeting" }),
  ).toBeEnabled();
});

test("consent and Join sit under the preview; the rail holds the meeting and the agent", async ({
  mount,
  page,
}) => {
  await mount(<PreJoinHarness />);
  await settled(page);
  const left = page.locator(".pj-left");
  const right = page.locator(".pj-right");
  await expect(left.locator(".pv-stage")).toHaveCount(1);
  await expect(left.locator(".pj-devices")).toHaveCount(1);
  await expect(right.locator(".pj-meet")).toHaveCount(1);
  await expect(right.locator(".pj-agent")).toHaveCount(1);
  // All seven terms of the notice are there.
  await expect(page.locator(".pj-consent .pj-terms > li")).toHaveCount(7);

  // At 1440 px the two columns end on one line (no empty region under either), and the notice
  // with Join starts straight under them, well above where it was (about 1960 px down).
  const box = async (sel: string) => (await page.locator(sel).first().boundingBox())!;
  const [l, r, c, join] = await Promise.all([box(".pj-left"), box(".pj-right"), box(".pj-consent"), box(".pj-join")]);
  expect(l.x).toBeLessThan(r.x);
  expect(Math.abs(l.y + l.height - (r.y + r.height))).toBeLessThanOrEqual(1);
  expect(c.y).toBeGreaterThan(l.y + l.height);
  expect(c.y - (l.y + l.height)).toBeLessThanOrEqual(24);
  expect(join.y + join.height).toBeLessThan(1500);
});

test("keyboard order: preview toggles, devices, agree, Join", async ({
  mount,
  page,
}) => {
  await mount(<PreJoinHarness />);
  await settled(page);
  await page.getByText("I have read this and agree to join on these terms").click();
  await page.getByRole("button", { name: "Microphone", exact: true }).focus();
  const order: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    order.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return "";
        if (el.closest(".controls")) return "toggle";
        if (el.closest(".pj-devices")) return "device";
        if (el instanceof HTMLInputElement && el.type === "checkbox")
          return "agree";
        return el.textContent?.trim() ?? "";
      }),
    );
    await page.keyboard.press("Tab");
  }
  const first = (s: string) => order.indexOf(s);
  expect(first("toggle")).toBe(0);
  expect(first("device")).toBeGreaterThan(first("toggle"));
  expect(first("agree")).toBeGreaterThan(first("device"));
  expect(first("Join meeting")).toBeGreaterThan(first("agree"));
});

for (const width of [360, 375, 768]) {
  test(`no horizontal scroll at ${width} px, in reading order`, async ({
    mount,
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await mount(<PreJoinHarness />);
    await settled(page);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const top = async (sel: string) =>
      (await page.locator(sel).first().boundingBox())!.y;
    const ys = [
      await top(".pv-stage"),
      await top(".pj-devices"),
      await top(".pj-consent"),
      await top(".pj-meet"),
      await top(".pj-agent"),
    ];
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });
}
