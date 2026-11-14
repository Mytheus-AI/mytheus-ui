/* Screenshots and timings of the plush faces where the app shows them (not a gate). Skipped unless
   PLUSH_SHOTS_DIR is set. CT_GL=metal draws on the real GPU instead of SwiftShader:

     CT_GL=metal PLUSH_SHOTS_DIR=/tmp/plush npm run test:a11y -- plush-shots */

import { expect, test, type Page } from "@playwright/experimental-ct-react";
import fs from "node:fs";
import path from "node:path";
import { AgentHarness } from "./AgentHarness";
import { BriefingHarness } from "./BriefingHarness";
import { NewMeetingHarness } from "./NewMeetingHarness";
import { PeopleHarness } from "./PeopleHarness";
import { PlushHarness } from "./PlushHarness";
import { comboSeed } from "./plush-fixture";
import { SidebarHarness } from "./SidebarHarness";
import { fakeVoice } from "./voice-fake";
import { MANY } from "./picker-fixture";

const DIR = process.env.PLUSH_SHOTS_DIR;
test.describe.configure({ timeout: 180_000 });
test.skip(!DIR, "set PLUSH_SHOTS_DIR to take screenshots");

const settle = async (page: Page, wait = 500) => {
  await expect(page.locator("[data-plush]:not([data-ready])")).toHaveCount(0, { timeout: 90_000 });
  await page.waitForTimeout(wait);
};
const shot = (name: string) => path.join(DIR!, name);

for (const theme of ["light", "dark"] as const) {
  for (const px of [96, 32]) {
    test(`contact sheet ${px} (${theme})`, async ({ mount, page }) => {
      await page.setViewportSize({ width: 1100, height: 520 });
      await mount(<PlushHarness theme={theme} view="sheet" px={px} />);
      await settle(page);
      await page.getByTestId("sheet").screenshot({ path: shot(`sheet-${px}-${theme}.png`) });
    });
  }

  test(`every shape with every accessory (${theme})`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await mount(<PlushHarness theme={theme} view="combos" px={150} />);
    await settle(page);
    await page.getByTestId("sheet").screenshot({ path: shot(`combos-${theme}.png`) });
  });

  test(`sidebar open and collapsed (${theme})`, async ({ mount, page }) => {
    const open = await mount(<SidebarHarness rail={false} theme={theme} />);
    await settle(page);
    await page.screenshot({ path: shot(`sidebar-open-${theme}.png`), clip: { x: 0, y: 0, width: 300, height: 900 } });
    await open.unmount();
    await mount(<SidebarHarness theme={theme} />);
    await page.mouse.move(900, 600);
    await settle(page);
    await page.screenshot({ path: shot(`sidebar-collapsed-${theme}.png`), clip: { x: 0, y: 0, width: 120, height: 900 } });
  });

  test(`people page (${theme})`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 1280, height: 1100 });
    await mount(<PeopleHarness theme={theme} />);
    // faces far below the fold are drawn when they come near the viewport, so only wait for these
    await expect(page.locator('[data-plush="still"]').first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: shot(`people-${theme}.png`) });
  });

  test(`member picker cluster (${theme})`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route("**/api/meeting-precheck", (route) => route.fulfill({ status: 503, body: "{}" }));
    await mount(<NewMeetingHarness theme={theme} members={MANY} />);
    await page.getByRole("button", { name: "New meeting" }).click();
    await page.waitForTimeout(250);
    for (const m of MANY.slice(0, 7)) {
      await page.getByRole("checkbox", { name: new RegExp(m.name) }).click();
      await page.waitForTimeout(200);
    }
    await settle(page);
    const people = page.getByRole("region", { name: /People/ });
    await people.scrollIntoViewIfNeeded();
    await people.screenshot({ path: shot(`member-picker-${theme}.png`), animations: "disabled" });
  });

  test(`agent page with the live preview (${theme})`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 1280, height: 1250 });
    await mount(<AgentHarness theme={theme} view="page" />);
    await settle(page, 900);
    await page.screenshot({ path: shot(`agent-page-${theme}.png`) });
    // typing in the name field: the hero and the preview both look at the caret
    await page.locator("#ag-name").click();
    await page.keyboard.type("Juniper the note taker", { delay: 25 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: shot(`agent-page-typing-${theme}.png`) });
  });

  test(`settings agent picker (${theme})`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await mount(<AgentHarness theme={theme} view="settings" />);
    await settle(page, 900);
    await page.screenshot({ path: shot(`settings-picker-${theme}.png`) });
  });

  test(`briefing player speaking (${theme})`, async ({ mount, page }) => {
    await fakeVoice(page, { msPerWord: 260 });
    await page.setViewportSize({ width: 1280, height: 900 });
    await mount(<BriefingHarness view="after" theme={theme} />);
    await page.getByRole("button", { name: "Play briefing" }).click();
    await settle(page, 1200);
    await page.screenshot({ path: shot(`briefing-${theme}.png`) });
  });

  test(`live frames: idle, wink, typing, asleep, celebrate, thinking, listening, speaking (${theme})`, async ({ mount, page }) => {
    await page.setViewportSize({ width: 900, height: 700 });
    const seed = comboSeed("pebble", "none");
    const stage = page.getByTestId("stage");
    const frame = (name: string) => stage.screenshot({ path: shot(`live-${name}-${theme}.png`) });

    let h = await mount(<PlushHarness theme={theme} view="stage" seed={seed} />);
    await settle(page, 700);
    await page.mouse.move(200, 200);
    await page.waitForTimeout(400);
    await frame("idle");
    await stage.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(160);
    await frame("wink");
    await page.waitForTimeout(900);
    await page.getByLabel("Name").click();
    await page.keyboard.type("Juniper the note taker", { delay: 30 });
    await frame("typing");
    await page.getByRole("button", { name: "Confirm decision" }).click();
    await page.waitForTimeout(330);
    await frame("celebrate");
    await h.unmount();

    h = await mount(<PlushHarness theme={theme} view="stage" seed={seed} drowsyAfter={0.5} asleepAfter={1} />);
    await settle(page, 700);
    await page.waitForTimeout(700);
    await frame("drowsy");
    await page.waitForTimeout(1500);
    await frame("asleep");
    await h.unmount();

    h = await mount(<PlushHarness theme={theme} view="stage" seed={seed} state="thinking" />);
    await settle(page, 1900);
    await frame("thinking");
    await page.waitForTimeout(900);
    await frame("thinking-2");
    await h.unmount();

    h = await mount(<PlushHarness theme={theme} view="stage" seed={seed} state="listening" level={0.9} />);
    await settle(page, 1800);
    await frame("listening");
    await h.unmount();

    h = await mount(<PlushHarness theme={theme} view="stage" seed={seed} state="speaking" level={1} />);
    await settle(page, 1500);
    await frame("speaking-open");
    await h.unmount();
    h = await mount(<PlushHarness theme={theme} view="stage" seed={seed} state="speaking" level={0} />);
    await settle(page, 1500);
    await frame("speaking-closed");
    await h.unmount();

    // the headphones, close up, on the cloud they were designed on and on the boxy pillow
    for (const shape of ["cloud", "pillow"] as const) {
      h = await mount(<PlushHarness theme={theme} view="stage" seed={comboSeed(shape, "headphones")} box={480} />);
      await settle(page, 900);
      await page.mouse.move(300, 300);
      await page.waitForTimeout(500);
      await stage.screenshot({ path: shot(`headphones-${shape}-${theme}.png`) });
      await h.unmount();
    }
  });
}

test("measured cost: a sheet of 24 stills and a live canvas at 320 px", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    const name = gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "none";
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  });
  // the longest main-thread task while 24 stills fill in
  await page.evaluate(() => {
    const w = window as unknown as { __long: number[] };
    w.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__long.push(e.duration))).observe({ entryTypes: ["longtask"] });
  });
  const t0 = Date.now();
  const sheet = await mount(<PlushHarness view="sheet" px={40} />);
  await expect(page.locator("[data-plush]:not([data-ready])")).toHaveCount(0, { timeout: 90_000 });
  const sheetMs = Date.now() - t0;
  const long = await page.evaluate(() => (window as unknown as { __long: number[] }).__long);
  await sheet.unmount();

  // a live canvas at 320 CSS px (2x: 640 px square): frames per second over three seconds
  await mount(<PlushHarness view="stage" box={320} state="speaking" />);
  await settle(page, 1500);
  const fps = await page.evaluate(
    () =>
      new Promise<{ frames: number; ms: number }>((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - start < 3000) requestAnimationFrame(tick);
          else resolve({ frames, ms: performance.now() - start });
        };
        requestAnimationFrame(tick);
      }),
  );
  const report = { renderer, dpr: await page.evaluate(() => devicePixelRatio), sheetOf24Ms: sheetMs, longTasksMs: long.map((d) => Math.round(d)), liveRafPerSecond: +(fps.frames / (fps.ms / 1000)).toFixed(1) };
  fs.writeFileSync(shot("cost.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
});
