/* Review screenshots for "decisions that know why", blast radius, the one-line chip and settle
   threads (not a gate). Skipped unless A4_SHOTS_DIR is set:

     A4_SHOTS_DIR=/tmp/a4-shots npm run test:a11y -- why-blast-shots */

import { test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import path from "node:path";
import { WhyBlastHarness, type WhyBlastView } from "./WhyBlastHarness";

const DIR = process.env.A4_SHOTS_DIR;

type Shot = { name: string; view: WhyBlastView; width: number; themes: ("light" | "dark")[]; harness?: number; before?: (page: Page) => Promise<void> };

const shots: Shot[] = [
  { name: "why-normal", view: "why-quiet", width: 1200, themes: ["light", "dark"] },
  { name: "why-broken", view: "why", width: 1200, themes: ["light", "dark"] },
  { name: "why-broken-phone", view: "why", width: 360, themes: ["light"] },
  { name: "why-redacted", view: "why-redacted", width: 1200, themes: ["light"] },
  { name: "why-pending", view: "why-pending", width: 1200, themes: ["light", "dark"] },
  { name: "why-empty", view: "why-empty", width: 1200, themes: ["light"] },
  { name: "why-reopened", view: "why-reopened", width: 1200, themes: ["light"] },
  { name: "why-error", view: "why-error", width: 1200, themes: ["light"] },
  {
    name: "why-owner-editing",
    view: "why",
    width: 1200,
    themes: ["light", "dark"],
    before: async (page) => {
      await page.getByRole("button", { name: /^Edit reason: Acme ships SAML/ }).click();
    },
  },
  {
    name: "why-revisit-dialog",
    view: "why",
    width: 1200,
    themes: ["light"],
    before: async (page) => {
      await page.getByRole("button", { name: "Book a 15-minute revisit" }).click();
      await page.getByText("Your agent proposes").waitFor();
    },
  },
  {
    name: "blast-desktop",
    view: "blast",
    width: 1200,
    themes: ["light", "dark"],
    before: async (page) => {
      await page.getByRole("button", { name: /^A decision from Sales/ }).focus();
    },
  },
  { name: "blast-many", view: "blast-many", width: 1200, themes: ["light"] },
  {
    name: "blast-phone",
    view: "blast",
    width: 360,
    themes: ["light", "dark"],
    before: async (page) => {
      await page.getByRole("button", { name: /^Renew the Okta contract/ }).click();
    },
  },
  { name: "blast-pending", view: "blast-pending", width: 1200, themes: ["light"] },
  { name: "blast-empty", view: "blast-empty", width: 1200, themes: ["light"] },
  { name: "chips-room-after", view: "chips", width: 1200, themes: ["light", "dark"] },
  { name: "settle-open", view: "settle-open", width: 1440, themes: ["light", "dark"] },
  { name: "settle-open-phone", view: "settle-open", width: 360, themes: ["light"] },
  { name: "settle-proposal", view: "settle-proposal", width: 1440, themes: ["light"] },
  { name: "settle-resolved", view: "settle-resolved", width: 1440, themes: ["light", "dark"] },
  { name: "settle-list", view: "settle-list", width: 1440, themes: ["light"] },
  { name: "reversal-reopened", view: "reversal-reopened", width: 1200, themes: ["light"] },
];

for (const s of shots) {
  for (const theme of s.themes) {
    test(`shot ${s.name} ${theme}`, async ({ mount, page }) => {
      test.skip(!DIR, "set A4_SHOTS_DIR to write review screenshots");
      await page.setViewportSize({ width: s.width, height: 900 });
      const main = s.width >= 1440 ? 1320 : s.width >= 1200 ? 880 : s.width;
      await mount(<WhyBlastHarness view={s.view} theme={theme} width={main} />);
      await page.waitForTimeout(2600);
      if (s.before) await s.before(page);
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(DIR!, `${s.name}-${theme}.png`), fullPage: true });
    });
  }
}
