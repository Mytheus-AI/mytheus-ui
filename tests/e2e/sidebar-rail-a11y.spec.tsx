/* The collapsed sidebar: every item sits on the rail's one centre line (a zero-width label used to
   grow and push icons left), the groups are separated, and there are no axe violations. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import { SidebarHarness } from "./SidebarHarness";

const SHOTS = process.env.SIDEBAR_SHOTS_DIR;

for (const theme of ["light", "dark"] as const) {
  test(`rail (${theme}): every item is centred on the rail`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mount(<SidebarHarness theme={theme} />);
    await page.mouse.move(600, 600);
    const aside = page.getByRole("complementary", { name: "Primary" });
    const box = (await aside.boundingBox())!;
    const centre = box.x + box.width / 2;
    const offsets = await page.$$eval(
      "aside [data-sb-item]",
      (els, c) =>
        els.map((el) => {
          const visible = Array.from(el.querySelectorAll("svg, span")).find((n) => n.getBoundingClientRect().width > 0);
          const r = (visible ?? el).getBoundingClientRect();
          const o = el.getBoundingClientRect();
          return {
            label: el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "",
            icon: Math.round((r.left + r.width / 2 - c) * 10) / 10,
            row: Math.round((o.left + o.width / 2 - c) * 10) / 10,
          };
        }),
      centre,
    );
    for (const o of offsets) {
      expect(Math.abs(o.icon), `${o.label} icon off centre by ${o.icon}px`).toBeLessThanOrEqual(1.5);
      expect(Math.abs(o.row), `${o.label} row off centre by ${o.row}px`).toBeLessThanOrEqual(1.5);
    }
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).include("aside").analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/rail-${theme}.png`, clip: { x: 0, y: 0, width: 120, height: 900 } });
  });
}

test("open: the panel still lays out as before", async ({ mount, page }) => {
  await mount(<SidebarHarness rail={false} />);
  const aside = page.getByRole("complementary", { name: "Primary" });
  await expect(aside.getByText("Samar's agent")).toBeVisible();
  await expect(aside.getByText("Inbox")).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/open-light.png`, clip: { x: 0, y: 0, width: 300, height: 900 } });
});

test("rail peek: hovering opens labels", async ({ mount, page }) => {
  await mount(<SidebarHarness />);
  const aside = page.getByRole("complementary", { name: "Primary" });
  await aside.hover();
  await expect(aside.getByText("Inbox")).toBeVisible();
  if (SHOTS) {
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/rail-peek.png`, clip: { x: 0, y: 0, width: 300, height: 900 } });
  }
});
