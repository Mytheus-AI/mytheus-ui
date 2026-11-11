import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import { skeletonSuite } from "./skeletons/run";
import { skeletonA11y } from "./skeletons/measure";
import { ADMIN_IDS } from "./skeletons/ids-admin";
import { AdminPair, CallSkeleton } from "./skeletons/AdminPairs";

/* Skeleton pairs: the Workspace console, the company brain, the ops console and onboarding. See
   skeletons/run.ts. */
skeletonSuite("admin", ADMIN_IDS, (mount, id, mode, theme) => mount(<AdminPair id={id} mode={mode} theme={theme} />));

/* The call's loading frame has no loaded pair (pre-join and the room need media and LiveKit, and
   are two different screens): only its accessibility is checked. */
for (const theme of ["light", "dark"] as const) {
  test(`admin call: skeleton is busy, quiet and unfocusable (${theme})`, async ({ mount, page }) => {
    await mount(<CallSkeleton theme={theme} />);
    await page.waitForTimeout(250);
    const a = await skeletonA11y(page);
    expect(a.busy).toBeGreaterThanOrEqual(1);
    expect(a.status).toEqual(["Loading the meeting"]);
    expect(a.focusable).toEqual([]);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("[data-skel-root]").analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
  });
}
