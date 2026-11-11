import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import { compare, record, regions, shot, skeletonA11y, SHOTS_DIR } from "./measure";

/* The tests every skeleton group runs. A spec passes a `mount(id, mode, theme)` that mounts its
   group's Pair (CT mounts only components the spec file itself imports).

   Always on (part of `npm run test:a11y`): every skeleton is busy, says one polite "Loading ..."
   line, holds nothing focusable, and has no axe violations, in both themes.
   With SKELETON_SHOTS_DIR set: the skeleton and the loaded page are shot at 1440 and 375 px and
   their main regions compared (measure.ts); the numbers land next to the shots. */

type Mounted = { unmount: () => Promise<void> };
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the CT fixture's own mount type
export type MountPair = (mount: (c: any) => Promise<Mounted>, id: string, mode: "skeleton" | "page", theme: "light" | "dark") => Promise<Mounted>;

const SHIFT_LIMIT = 4;

export function skeletonSuite(group: string, ids: string[], mount: MountPair) {
  for (const id of ids) {
    for (const theme of ["light", "dark"] as const) {
      test(`${group} ${id}: skeleton is busy, quiet and unfocusable (${theme})`, async ({ page, mount: ct }) => {
        await mount(ct, id, "skeleton", theme);
        await page.waitForTimeout(250);
        const a = await skeletonA11y(page);
        expect(a.busy).toBeGreaterThanOrEqual(1);
        expect(a.status).toHaveLength(1);
        expect(a.status[0]).toMatch(/^Loading /);
        expect(a.focusable).toEqual([]);
        const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("[data-skel-root]").analyze();
        expect(axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
      });
    }

    for (const width of [1440, 375]) {
      test(`${group} ${id}: skeleton matches the page at ${width}px`, async ({ page, mount: ct }) => {
        test.skip(!SHOTS_DIR, "set SKELETON_SHOTS_DIR to shoot and measure the pairs");
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        const out: Record<string, unknown> = { route: id, width };
        for (const theme of width === 1440 ? (["light", "dark"] as const) : (["light"] as const)) {
          const sk = await mount(ct, id, "skeleton", theme);
          await page.waitForTimeout(250);
          const s = await regions(page);
          await page.screenshot({ path: shot(`${id}-${width}-${theme}-1-skeleton`), fullPage: true });
          await sk.unmount();
          const pg = await mount(ct, id, "page", theme);
          await page.waitForTimeout(350);
          const p = await regions(page);
          await page.screenshot({ path: shot(`${id}-${width}-${theme}-2-page`), fullPage: true });
          await pg.unmount();
          if (theme === "light") {
            const c = compare(s, p);
            // a page side that rendered nothing would match anything: both sides must have regions
            expect(c.regions, `${id}: the skeleton has regions`).toBeGreaterThanOrEqual(1);
            expect(p.length, `${id}: the page rendered`).toBeGreaterThanOrEqual(3);
            Object.assign(out, { comparison: c, skeleton: s, page: p });
            expect.soft(c.shift, `${id} at ${width}px: worst region ${JSON.stringify(c.worst)}`).toBeLessThanOrEqual(SHIFT_LIMIT);
            expect.soft(Math.abs(c.headDh), `${id} at ${width}px: title row height`).toBeLessThanOrEqual(SHIFT_LIMIT);
          }
        }
        record(`${id}-${width}`, out);
      });
    }
  }
}
