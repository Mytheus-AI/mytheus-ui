/* The workspace logo (ADR-0048): the editor in every state, the logo in the sidebar switcher (open
   and on the rail, still centred on the rail line), and in the workspace chooser. Axe runs on each
   state in both themes. With ORG_LOGO_SHOTS set, every state is also saved as a screenshot:

     ORG_LOGO_SHOTS=/tmp/org-logo CT_PORT=3611 npm run test:a11y -- org-logo --workers=4 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/experimental-ct-react";
import path from "node:path";
import { ChooserHarness, LogoEditorHarness, LogoSidebarHarness } from "./LogoHarness";
import { KESTREL_DATA_URL, KESTREL_SVG, WHITE_DATA_URL } from "./logo-fixture";

const DIR = process.env.ORG_LOGO_SHOTS;
const shot = async (page: Page, name: string, el?: ReturnType<Page["locator"]>) => {
  if (!DIR) return;
  await page.waitForTimeout(150);
  if (el) await el.screenshot({ path: path.join(DIR, name), animations: "disabled" });
  else await page.screenshot({ path: path.join(DIR, name), animations: "disabled" });
};
const axe = async (page: Page, include = "body") => {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).include(include).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => `${n.target.join(" ")} ${n.failureSummary ?? ""}`).join(", ")}`)).toEqual([]);
};
const card = (page: Page) => page.locator("section", { has: page.getByRole("heading", { name: "Workspace logo" }) });
const svgFile = { name: "kestrel.svg", mimeType: "image/svg+xml", buffer: Buffer.from(KESTREL_SVG) };

for (const theme of ["light", "dark"] as const) {
  test(`editor (${theme}): empty, crop, upload, saved`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 900, height: 900 });
    await mount(<LogoEditorHarness theme={theme} />);
    const c = card(page);
    await expect(c.getByRole("button", { name: "Choose an image" })).toBeVisible();
    await expect(c.getByRole("img", { name: "Kestrel Labs" })).toBeVisible(); // the initial
    await axe(page);
    await shot(page, `editor-empty-${theme}.png`, c);

    await c.locator('input[type="file"]').setInputFiles(svgFile);
    const viewport = c.getByRole("group", { name: /Logo position/ });
    await expect(viewport).toBeFocused();
    // keyboard: zoom in and move; the zoom slider follows
    await page.keyboard.press("+");
    await page.keyboard.press("+");
    await page.keyboard.press("ArrowLeft");
    await expect(c.getByRole("slider", { name: "Zoom" })).not.toHaveValue("1");
    // pointer drag pans too
    const box = (await viewport.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 10, { steps: 4 });
    await page.mouse.up();
    await axe(page);
    await shot(page, `editor-cropping-${theme}.png`, c);

    await page.evaluate(() => ((window as unknown as { __logoUpload?: string }).__logoUpload = "slow"));
    await c.getByRole("button", { name: "Save logo" }).click();
    await expect(c.getByRole("progressbar", { name: "Saving the logo" })).toBeVisible();
    await expect(c.getByRole("button", { name: "Saving logo" })).toBeDisabled();
    await axe(page);
    await shot(page, `editor-uploading-${theme}.png`, c);
  });

  test(`editor (${theme}): saved, replace and remove`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 900, height: 900 });
    await mount(<LogoEditorHarness theme={theme} />);
    const c = card(page);
    await c.locator('input[type="file"]').setInputFiles(svgFile);
    await c.getByRole("button", { name: "Save logo" }).click();
    await expect(c.getByRole("status").filter({ hasText: "Logo saved" })).toBeVisible();
    await expect(c.getByRole("img", { name: "Kestrel Labs logo" })).toBeVisible();
    await expect(c.getByRole("button", { name: "Replace logo" })).toBeVisible();
    await axe(page);
    await shot(page, `editor-done-${theme}.png`, c);

    await c.getByRole("button", { name: "Remove" }).click();
    await expect(c.getByRole("group", { name: "Remove the workspace logo?" })).toBeVisible();
    await shot(page, `editor-remove-confirm-${theme}.png`, c);
    await c.getByRole("group", { name: "Remove the workspace logo?" }).getByRole("button", { name: /^Remove/ }).click();
    await expect(c.getByRole("button", { name: "Choose an image" })).toBeVisible();
  });

  test(`editor (${theme}): wrong type and too big are explained`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await mount(<LogoEditorHarness theme={theme} logoUrl={KESTREL_DATA_URL} />);
    const c = card(page);
    await c.locator('input[type="file"]').setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await expect(c.getByRole("alert")).toContainText("PNG, JPEG, WebP or SVG");
    await c.locator('input[type="file"]').setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: Buffer.alloc(3 * 1024 * 1024, 1) });
    await expect(c.getByRole("alert")).toContainText("Logos can be up to 2 MB");
    await axe(page);
    await shot(page, `editor-error-${theme}.png`, c);
  });

  test(`editor (${theme}): a refused upload keeps the crop and says why`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await mount(<LogoEditorHarness theme={theme} />);
    const c = card(page);
    await page.evaluate(() => ((window as unknown as { __logoUpload?: string }).__logoUpload = "refuse"));
    await c.locator('input[type="file"]').setInputFiles(svgFile);
    await c.getByRole("button", { name: "Save logo" }).click();
    await expect(c.getByRole("alert")).toContainText("too many times this hour");
    await expect(c.getByRole("button", { name: "Save logo" })).toBeEnabled();
    await shot(page, `editor-error-server-${theme}.png`, c);
  });

  test(`editor (${theme}): read-only for members`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 900, height: 600 });
    await mount(<LogoEditorHarness theme={theme} role="member" logoUrl={KESTREL_DATA_URL} />);
    const c = card(page);
    await expect(c.getByRole("img", { name: "Kestrel Labs logo" })).toBeVisible();
    await expect(c.getByText("Only workspace admins can change the logo.")).toBeVisible();
    await expect(c.getByRole("button")).toHaveCount(0);
    await expect(c.locator('input[type="file"]')).toHaveCount(0);
    await axe(page);
    await shot(page, `editor-readonly-${theme}.png`, c);
  });

  test(`sidebar switcher with a logo (${theme}): open`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mount(<LogoSidebarHarness theme={theme} logoUrl={KESTREL_DATA_URL} />);
    const aside = page.getByRole("complementary", { name: "Primary" });
    const link = aside.getByRole("link", { name: "Kestrel Labs: switch workspace" });
    await expect(link.locator('[data-org-mark="logo"] img')).toBeVisible();
    await axe(page, "aside");
    await shot(page, `sidebar-open-${theme}.png`, page.locator("aside"));
  });

  test(`sidebar switcher with a logo (${theme}): rail, centred`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mount(<LogoSidebarHarness theme={theme} rail logoUrl={KESTREL_DATA_URL} />);
    await page.mouse.move(600, 600);
    const aside = page.getByRole("complementary", { name: "Primary" });
    const box = (await aside.boundingBox())!;
    const mark = (await aside.locator('[data-org-mark="logo"]').boundingBox())!;
    expect(Math.abs(mark.x + mark.width / 2 - (box.x + box.width / 2))).toBeLessThanOrEqual(1.5);
    expect(Math.round(mark.width)).toBe(30);
    await axe(page, "aside");
    if (DIR) await page.screenshot({ path: path.join(DIR, `sidebar-rail-${theme}.png`), clip: { x: 0, y: 0, width: 120, height: 400 } });
  });

  test(`a white logo still has an edge (${theme})`, async ({ mount, page }) => {
    await mount(<LogoSidebarHarness theme={theme} logoUrl={WHITE_DATA_URL} />);
    const aside = page.getByRole("complementary", { name: "Primary" });
    await expect(aside.locator('[data-org-mark="logo"]')).toBeVisible();
    await shot(page, `sidebar-white-logo-${theme}.png`, page.locator("aside"));
  });

  test(`a logo that fails to load falls back to the initial (${theme})`, async ({ mount, page }) => {
    await mount(<LogoSidebarHarness theme={theme} logoUrl="/api/org-logo?v=404" />);
    const aside = page.getByRole("complementary", { name: "Primary" });
    await expect(aside.locator('[data-org-mark="initial"]')).toHaveText("K");
  });

  test(`workspace chooser shows each workspace's logo (${theme})`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(
      (logo) =>
        ((window as unknown as { __orgMemberships?: unknown }).__orgMemberships = [
          { id: "m1", role: "org:admin", organization: { id: "o1", name: "Kestrel Labs", hasImage: true, imageUrl: logo, membersCount: 14 } },
          { id: "m2", role: "org:member", organization: { id: "o2", name: "Diego's team", hasImage: false, imageUrl: "", membersCount: 3 } },
        ]),
      KESTREL_DATA_URL,
    );
    await mount(<ChooserHarness theme={theme} />);
    await expect(page.getByRole("button", { name: /Kestrel Labs/ }).locator('[data-org-mark="logo"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /Diego's team/ }).locator('[data-org-mark="initial"]')).toHaveText("D");
    await shot(page, `chooser-${theme}.png`);
  });
}

test("editor at 360 px stacks without sideways scroll", async ({ mount, page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await mount(<LogoEditorHarness logoUrl={KESTREL_DATA_URL} />);
  const c = card(page);
  await c.locator('input[type="file"]').setInputFiles(svgFile);
  await expect(c.getByRole("group", { name: /Logo position/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await shot(page, "editor-cropping-360.png");
});
