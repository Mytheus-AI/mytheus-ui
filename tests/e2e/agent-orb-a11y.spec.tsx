/* Agent orbs (the glass creature every agent wears): the live and still modes render real pixels
   in both themes, carry an accessible name, never shift the layout while they load, and pass axe.

     npm run test:a11y -- agent-orb
   ORB_SHOTS_DIR=/some/dir also saves a gallery screenshot per theme. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/experimental-ct-react";
import path from "node:path";
import { AgentHarness } from "./AgentHarness";
import { OrbHarness } from "./OrbHarness";

const SHOTS = process.env.ORB_SHOTS_DIR;

// Headless Chromium draws WebGL in software (SwiftShader), where the glass shader is slow.
test.describe.configure({ timeout: 120_000 });

/** Share of the element's pixels that differ from its corner (the frame's background). */
async function inkShare(page: Page, el: Locator): Promise<number> {
  const png = (await el.screenshot()).toString("base64");
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0);
    const { data } = g.getImageData(0, 0, c.width, c.height);
    // the frame's own fill, sampled just inside its round edge on the left middle
    const mid = (Math.floor(c.height / 2) * c.width + Math.floor(c.width * 0.08)) * 4;
    const bg = [data[mid], data[mid + 1], data[mid + 2]];
    let diff = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 40) diff++;
    }
    return diff / (data.length / 4);
  }, png);
}

async function watchShifts(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`orbs (${theme}): live and still render, are named, and do not shift`, async ({ mount, page }) => {
    await mount(<OrbHarness theme={theme} />);
    await watchShifts(page);
    const frame = page.getByTestId("live-frame");
    const before = await frame.boundingBox();
    const stillBefore = await page.getByTestId("still-0").boundingBox();

    // every orb on the page finishes rendering
    await expect(page.locator("[data-orb]:not([data-ready])")).toHaveCount(0, { timeout: 45_000 });
    await expect(page.locator('[data-orb="live"]')).toHaveCount(2);
    await expect(page.locator('[data-orb="still"]')).toHaveCount(5);

    // accessible names on the labelled ones; the unlabelled live orb beside a name is hidden
    await expect(page.getByRole("img", { name: "Samar's agent" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Agent 1" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Small agent" })).toBeVisible();
    await expect(page.locator('[data-orb="live"][aria-hidden="true"]')).toHaveCount(1);

    // real pixels, not a blank canvas or the placeholder circle alone
    await page.waitForTimeout(300);
    expect(await inkShare(page, frame)).toBeGreaterThan(0.2);
    expect(await inkShare(page, page.getByTestId("still-0"))).toBeGreaterThan(0.2);
    expect(await inkShare(page, page.getByTestId("still-small"))).toBeGreaterThan(0.15);

    // no layout shift while the orbs loaded
    expect(await frame.boundingBox()).toEqual(before);
    expect(await page.getByTestId("still-0").boundingBox()).toEqual(stillBefore);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBe(0);

    // one live canvas per live orb, and still orbs are images, not canvases
    await expect(page.locator('[data-orb="live"] canvas')).toHaveCount(2);
    await expect(page.locator('[data-orb="still"] canvas')).toHaveCount(0);
    await expect(page.locator('[data-orb="still"] img')).toHaveCount(5);

    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });
}

test("orbs: reduced motion draws one still frame", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mount(<OrbHarness />);
  await expect(page.locator("[data-orb]:not([data-ready])")).toHaveCount(0, { timeout: 45_000 });
  const frame = page.getByTestId("live-frame");
  await page.waitForTimeout(300);
  const a = await frame.screenshot();
  await page.waitForTimeout(600);
  const b = await frame.screenshot();
  expect(a.equals(b)).toBe(true);
  expect(await inkShare(page, frame)).toBeGreaterThan(0.2);
});

test("orbs: the live one moves when motion is allowed", async ({ mount, page }) => {
  await mount(<OrbHarness liveState="speaking" />);
  await expect(page.locator("[data-orb]:not([data-ready])")).toHaveCount(0, { timeout: 45_000 });
  const frame = page.getByTestId("live-frame");
  const a = await frame.screenshot();
  await page.waitForTimeout(400);
  const b = await frame.screenshot();
  expect(a.equals(b)).toBe(false);
});

test("orbs: without WebGL, agents keep their doodle", async ({ mount, page }) => {
  // the CT page is already loaded, so patch it in place before mounting
  await page.evaluate(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
      return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof orig;
  });
  await mount(<OrbHarness />);
  await expect(page.locator("[data-orb]:not([data-ready])")).toHaveCount(0, { timeout: 30_000 });
  await expect(page.locator("[data-orb] svg")).toHaveCount(7);
  await expect(page.getByRole("img", { name: "Samar's agent" })).toBeVisible();
});

test("orbs: a lost WebGL context is rebuilt, so a new face is still an orb", async ({ mount, page }) => {
  // record every WebGL context the page makes, so the test can take them all away
  await page.evaluate(() => {
    const w = window as unknown as { __gl: WebGLRenderingContext[] };
    w.__gl = [];
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      const ctx = (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
      if (ctx && (type === "webgl" || type === "webgl2")) w.__gl.push(ctx as WebGLRenderingContext);
      return ctx;
    } as typeof orig;
  });
  await mount(<AgentHarness view="settings" />);
  const group = page.getByRole("radiogroup", { name: "Its face" });
  await expect(page.locator("[data-orb]:not([data-ready])")).toHaveCount(0, { timeout: 60_000 });
  // what a browser does when it has too many WebGL canvases: the old contexts are dropped
  await page.evaluate(() => {
    for (const gl of (window as unknown as { __gl: WebGLRenderingContext[] }).__gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await page.getByRole("button", { name: "Shuffle" }).click();
  await expect(page.locator("[data-orb]:not([data-ready])")).toHaveCount(0, { timeout: 60_000 });
  await expect(page.locator("[data-orb] svg")).toHaveCount(0);
  await expect(group.locator('[data-orb="still"] img')).toHaveCount(7);
});

test("the agent face picker shows orbs, shuffles, and moves by keyboard", async ({ mount, page }) => {
  await mount(<AgentHarness view="settings" />);
  const group = page.getByRole("radiogroup", { name: "Its face" });
  const radios = group.getByRole("radio");
  await expect(radios).toHaveCount(7);
  await expect(radios.nth(0)).toHaveAttribute("aria-checked", "true");
  await expect(group.locator('[data-orb="still"]')).toHaveCount(7);
  await expect(page.getByRole("img", { name: "Your agent's face" })).toBeVisible();

  await page.getByRole("button", { name: "Shuffle" }).click();
  await expect(radios.nth(0)).toHaveAttribute("aria-checked", "true");
  // the strip is a fresh deal: the "Use its original face" link appears because the seed changed
  await expect(page.getByRole("button", { name: "Use its original face" })).toBeVisible();

  await radios.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(radios.nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(radios.nth(1)).toBeFocused();

  await page.getByRole("button", { name: "Use its original face" }).click();
  await expect(group.getByRole("radio", { checked: true })).toHaveCount(1);
  await expect(page.locator("[data-orb]:not([data-ready])")).toHaveCount(0, { timeout: 60_000 });
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
});

if (SHOTS) {
  for (const theme of ["light", "dark"] as const) {
    test(`orb gallery shot (${theme})`, async ({ mount, page }) => {
      await page.setViewportSize({ width: 1000, height: 700 });
      await mount(<OrbHarness theme={theme} gallery />);
      await expect(page.locator("[data-orb]:not([data-ready])")).toHaveCount(0, { timeout: 60_000 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SHOTS, `orbs-${theme}.png`) });
    });
  }
}
