/* Plush faces (the felt character every person and agent wears): stills come from one shared
   WebGL context, live ones own a canvas, both carry an accessible name, never shift the layout
   while they load, fall back to an SVG face without WebGL2, and pass axe.

     npm run test:a11y -- plush-a11y

   Headless Chromium draws WebGL in software (SwiftShader), so nothing here depends on speed, and
   the fallback path is tested by taking WebGL away rather than by hoping it is slow. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/experimental-ct-react";
import { AgentHarness } from "./AgentHarness";
import { PlushHarness } from "./PlushHarness";

test.describe.configure({ timeout: 120_000 });

const PENDING = '[data-plush]:not([data-ready])';
const settled = (page: Page, timeout = 60_000) => expect(page.locator(PENDING)).toHaveCount(0, { timeout });

/** Share of the element's pixels that differ from the frame's own fill. */
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
    const mid = (Math.floor(c.height / 2) * c.width + Math.floor(c.width * 0.04)) * 4;
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

/** Count every WebGL context the page makes, and keep them so a test can take them away. */
async function trackContexts(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __gl: WebGL2RenderingContext[] };
    w.__gl = [];
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      const ctx = (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
      if (ctx && (type === "webgl" || type === "webgl2") && !w.__gl.includes(ctx as WebGL2RenderingContext)) w.__gl.push(ctx as WebGL2RenderingContext);
      return ctx;
    } as typeof orig;
  });
}
const contexts = (page: Page) => page.evaluate(() => (window as unknown as { __gl: unknown[] }).__gl.length);

/** Whether this browser draws WebGL on a real GPU (CT_GL=metal) rather than on the CPU. */
const gpu = (page: Page) =>
  page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    const name = gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "swiftshader";
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  });

async function noWebgl(page: Page) {
  // the CT page is already loaded, so patch it in place before mounting
  await page.evaluate(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
      return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof orig;
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`plush (${theme}): live and still render, are named, and do not shift`, async ({ mount, page }) => {
    await trackContexts(page);
    await mount(<PlushHarness theme={theme} />);
    await watchShifts(page);
    const frame = page.getByTestId("live-frame");
    const before = await frame.boundingBox();
    const stillBefore = await page.getByTestId("still-0").boundingBox();

    await settled(page);
    await expect(page.locator('[data-plush="live"]')).toHaveCount(2);
    await expect(page.locator('[data-plush="still"]')).toHaveCount(6);

    // accessible names on the labelled ones; the others are decorative
    await expect(page.getByRole("img", { name: "Samar's Myte" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Person 1" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Small face" })).toBeVisible();
    await expect(page.locator('[data-plush="live"][aria-hidden="true"]')).toHaveCount(1);
    await expect(page.locator('[data-plush="still"][aria-hidden="true"]')).toHaveCount(1);

    // real pixels, not a blank canvas or the placeholder circle alone
    await page.waitForTimeout(300);
    expect(await inkShare(page, frame)).toBeGreaterThan(0.2);
    expect(await inkShare(page, page.getByTestId("still-0"))).toBeGreaterThan(0.3);
    expect(await inkShare(page, page.getByTestId("still-small"))).toBeGreaterThan(0.3);

    // no layout shift while they loaded
    expect(await frame.boundingBox()).toEqual(before);
    expect(await page.getByTestId("still-0").boundingBox()).toEqual(stillBefore);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBe(0);

    // one canvas per live face; stills are images drawn by ONE shared context
    await expect(page.locator('[data-plush="live"] canvas')).toHaveCount(2);
    await expect(page.locator('[data-plush="still"] canvas')).toHaveCount(0);
    await expect(page.locator('[data-plush="still"] img')).toHaveCount(6);
    expect(await contexts(page)).toBe(3);

    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
  });
}

test("plush: a page of faces uses one WebGL context and one render per seed", async ({ mount, page }) => {
  await trackContexts(page);
  const sheet = await mount(<PlushHarness view="sheet" px={32} />);
  await settled(page);
  await expect(page.locator('[data-plush="still"] img')).toHaveCount(24);
  expect(await contexts(page)).toBe(1);
  const first = await page.locator('[data-plush="still"] img').first().getAttribute("src");
  expect(first).toMatch(/^data:image\/png;base64,/);
  // the same seeds again: served from the cache, on the first frame, with no new context
  await sheet.unmount();
  await mount(<PlushHarness view="sheet" px={40} />);
  await expect(page.locator('[data-plush="still"] img')).toHaveCount(24, { timeout: 2000 });
  expect(await page.locator('[data-plush="still"] img').first().getAttribute("src")).toBe(first);
  expect(await contexts(page)).toBe(1);
});

test("plush: every shape with every accessory fills about 86% of its box", async ({ mount, page }) => {
  await mount(<PlushHarness view="combos" px={96} />);
  await settled(page);
  const fills = await page.evaluate(async () => {
    const out: Record<string, number> = {};
    for (const cell of Array.from(document.querySelectorAll<HTMLElement>("[data-combo]"))) {
      const img = cell.querySelector("img")!;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0);
      const { data } = g.getImageData(0, 0, c.width, c.height);
      let l = c.width, r = 0, t = c.height, b = 0;
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++)
          if (data[(y * c.width + x) * 4 + 3] > 200) {
            if (x < l) l = x;
            if (x > r) r = x;
            if (y < t) t = y;
            if (y > b) b = y;
          }
      out[cell.dataset.combo!] = Math.max(r - l + 1, b - t + 1) / c.width;
    }
    return out;
  });
  expect(Object.keys(fills)).toHaveLength(24);
  for (const [combo, share] of Object.entries(fills)) {
    expect(share, combo).toBeGreaterThan(0.82);
    expect(share, combo).toBeLessThan(0.9);
  }
});

test("plush: reduced motion shows the still only", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mount(<PlushHarness state="speaking" />);
  await settled(page);
  await expect(page.locator("[data-plush] canvas")).toHaveCount(0);
  await expect(page.locator('[data-plush="still"] img')).toHaveCount(8);
  await expect(page.getByRole("img", { name: "Samar's Myte" })).toBeVisible();
  const frame = page.getByTestId("live-frame");
  await page.waitForTimeout(400);
  const a = await frame.screenshot();
  await page.waitForTimeout(600);
  expect((await frame.screenshot()).equals(a)).toBe(true);
});

test("plush: the live one moves when motion is allowed", async ({ mount, page }) => {
  await mount(<PlushHarness state="speaking" />);
  await settled(page);
  const frame = page.getByTestId("live-frame");
  const a = await frame.screenshot();
  await page.waitForTimeout(500);
  expect((await frame.screenshot()).equals(a)).toBe(false);
});

test("plush: never more than four live canvases; the rest are stills", async ({ mount, page }) => {
  await mount(<PlushHarness view="many" count={7} />);
  await settled(page);
  await expect(page.locator('[data-plush="live"] canvas')).toHaveCount(4);
  await expect(page.locator('[data-plush="still"] img')).toHaveCount(3);
});

test("plush: without WebGL2, every face is the SVG fallback", async ({ mount, page }) => {
  await noWebgl(page);
  await mount(<PlushHarness />);
  await settled(page, 30_000);
  await expect(page.locator('[data-plush="fallback"] svg')).toHaveCount(8);
  await expect(page.locator("[data-plush] canvas")).toHaveCount(0);
  await expect(page.locator("[data-plush] img")).toHaveCount(0);
  // still named, still the same box, still some ink
  await expect(page.getByRole("img", { name: "Samar's Myte" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Person 1" })).toBeVisible();
  expect((await page.getByTestId("still-0").boundingBox())!.width).toBe(44);
  expect(await inkShare(page, page.getByTestId("still-0"))).toBeGreaterThan(0.3);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
});

test("plush: a lost shared context is rebuilt, so a new face is still a plush", async ({ mount, page }) => {
  await trackContexts(page);
  await mount(<AgentHarness view="settings" />);
  const group = page.getByRole("radiogroup", { name: "Its face" });
  await settled(page);
  // what a browser does when a page has too many WebGL canvases: the old contexts are dropped
  await page.evaluate(() => {
    for (const gl of (window as unknown as { __gl: WebGL2RenderingContext[] }).__gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await page.getByRole("button", { name: "Shuffle" }).click();
  await settled(page);
  await expect(group.locator('[data-plush="fallback"]')).toHaveCount(0);
  await expect(group.locator('[data-plush="still"] img')).toHaveCount(7);
  // the live preview lost its canvas for good and shows its still instead
  await expect(page.getByRole("img", { name: "Your Myte's face" })).toBeVisible();
});

test("plush live: a click winks, typing is watched, Confirm celebrates, and it sleeps and wakes", async ({ mount, page }) => {
  await mount(<PlushHarness view="stage" box={240} drowsyAfter={0.6} asleepAfter={1.2} />);
  await settled(page);
  const stage = page.getByTestId("stage");
  const live = page.getByRole("img", { name: "Your Myte" });
  await expect(live.locator("canvas")).toHaveCount(1);

  // left alone it falls asleep: the picture stops changing much, then any activity wakes it
  await page.mouse.move(900, 700);
  await page.waitForTimeout(2200);
  const asleep = await stage.screenshot();
  await page.mouse.move(60, 60);
  await page.waitForTimeout(700);
  expect((await stage.screenshot()).equals(asleep)).toBe(false);

  // it is not in the tab order and never steals a click or a key from the form beside it
  const input = page.getByLabel("Name");
  await input.click();
  await page.keyboard.type("Juniper");
  await expect(input).toHaveValue("Juniper");
  await expect(input).toBeFocused();
  await stage.click();
  await stage.dblclick();
  await page.getByRole("button", { name: "Confirm decision" }).click();
  await expect(live.locator("canvas")).toHaveCount(1);

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
});

test("the agent face picker shows plush candidates, a live preview, shuffles, and moves by keyboard", async ({ mount, page }) => {
  await mount(<AgentHarness view="settings" />);
  const group = page.getByRole("radiogroup", { name: "Its face" });
  const radios = group.getByRole("radio");
  await expect(radios).toHaveCount(7);
  await expect(radios.nth(0)).toHaveAttribute("aria-checked", "true");
  await settled(page);
  await expect(group.locator('[data-plush="still"]')).toHaveCount(7);
  // The preview is live on a GPU. Headless Chromium draws WebGL on the CPU, where a plush never
  // runs live, so there it is the still; either way it is one named picture, larger than the strip.
  const preview = page.getByRole("img", { name: "Your Myte's face" });
  await expect(preview).toBeVisible();
  const live = await gpu(page);
  await expect(preview.locator("canvas")).toHaveCount(live ? 1 : 0);
  await expect(preview.locator("img")).toHaveCount(live ? 0 : 1);
  expect((await preview.boundingBox())!.width).toBeGreaterThanOrEqual(120);

  await page.getByRole("button", { name: "Shuffle" }).click();
  await expect(radios.nth(0)).toHaveAttribute("aria-checked", "true");
  // the strip is a fresh deal: the "Use its original face" link appears because the seed changed
  await expect(page.getByRole("button", { name: "Use its original face" })).toBeVisible();
  // the preview kept its one canvas through the change of face
  await expect(preview.locator("canvas")).toHaveCount(live ? 1 : 0);

  await radios.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(radios.nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(radios.nth(1)).toBeFocused();

  await page.getByRole("button", { name: "Use its original face" }).click();
  await expect(group.getByRole("radio", { checked: true })).toHaveCount(1);
  await settled(page);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
});
