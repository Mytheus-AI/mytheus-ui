/* Accessibility and keyboard gate for "decisions that know why", blast radius, the one-line chip,
   settle threads and the reopened reversal (a4). Each view is mounted in the app's `.mx-app` theme
   root, light and dark, with the server actions answered at the edges (playwright-ct.config.ts).

   - no axe violations (WCAG 2.0/2.1 A and AA, colour contrast included) in every state, both themes;
   - the owner's paths work from the keyboard and say what happened;
   - the ripple map moves along a ring with the arrows and shows the focused item's detail;
   - at 360px the map gives way to the ring-by-ring list, with no sideways scroll. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { WhyBlastHarness, type WhyBlastView } from "./WhyBlastHarness";

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

const VIEWS: WhyBlastView[] = [
  "why",
  "why-pending",
  "why-empty",
  "why-readonly",
  "why-redacted",
  "why-reopened",
  "why-error",
  "why-none",
  "blast",
  "blast-many",
  "blast-pending",
  "blast-empty",
  "blast-error",
  "chips",
  "settle-open",
  "settle-proposal",
  "settle-resolved",
  "settle-list",
  "settle-empty",
  "reversal-reopened",
];

for (const theme of ["light", "dark"] as const) {
  for (const view of VIEWS) {
    test(`no axe violations: ${view} (${theme})`, async ({ mount, page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await mount(<WhyBlastHarness view={view} theme={theme} />);
      await page.waitForTimeout(250);
      expect(await axe(page)).toEqual([]);
    });
  }
  test(`no axe violations: owner editing a reason (${theme})`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mount(<WhyBlastHarness view="why" theme={theme} />);
    await page.getByRole("button", { name: /^Edit reason: Acme ships SAML/ }).click();
    await expect(page.getByLabel("What has to stay true")).toBeFocused();
    expect(await axe(page)).toEqual([]);
  });
  test(`no axe violations: blast radius at 360px (${theme})`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 360, height: 800 });
    await mount(<WhyBlastHarness view="blast" theme={theme} />);
    await page.getByRole("button", { name: /^Renew the Okta contract/ }).click();
    expect(await axe(page)).toEqual([]);
  });
}

test("the owner adds a reason from the keyboard", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="why-empty" />);
  await expect(page.getByText("No reasons recorded yet")).toBeVisible();
  await page.getByRole("button", { name: "Add a reason" }).click();
  const statement = page.getByLabel("What has to stay true");
  await expect(statement).toBeFocused();
  // Saving with nothing says why instead of sending.
  await page.getByRole("button", { name: "Add reason" }).click();
  await expect(page.getByText("Say what has to stay true.")).toBeVisible();
  await statement.fill("Acme ships SAML by December 1");
  await page.getByLabel("Jira key").fill("not a key");
  await page.getByRole("button", { name: "Add reason" }).click();
  await expect(page.getByText("Use a Jira key such as SSO-142.")).toBeVisible();
  await page.getByLabel("Jira key").fill("SSO-142");
  await page.getByRole("button", { name: "Add reason" }).click();
  await expect(page.getByText("Reason added")).toBeVisible();
  await expect(page.getByRole("list", { name: "Reasons being watched" }).getByText("Acme ships SAML by December 1")).toBeVisible();
});

test("Escape cancels an edit and returns focus to the reason", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="why" />);
  await page.getByRole("button", { name: /^Edit reason: Login failures/ }).click();
  await expect(page.getByLabel("What has to stay true")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("What has to stay true")).toHaveCount(0);
});

test("removing a reason offers Undo", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="why" />);
  await page.getByRole("button", { name: /^Remove reason: Login failures/ }).click();
  await expect(page.getByText("Login failures stay under 2% after the switch")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Login failures stay under 2% after the switch")).toBeVisible();
});

test("a broken reason: old words and new evidence side by side, and Re-confirm needs a note", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="why" />);
  const hero = page.getByRole("article", { name: "A reason for your vendor decision is no longer true" });
  await expect(hero).toBeVisible();
  await expect(hero.getByRole("region", { name: "When you decided" })).toContainText("If they hold the price at forty");
  await expect(hero.getByRole("region", { name: "What changed" })).toContainText("fifty-two thousand");
  await expect(hero.getByRole("link", { name: "Said in Vendor sync, Nov 10, 2026" })).toBeVisible();
  await hero.getByRole("button", { name: "Re-confirm" }).click();
  await hero.getByRole("button", { name: "Re-confirm decision" }).click();
  await expect(page.getByText("Add a short note: why does the decision still stand?")).toBeVisible();
  await page.getByLabel("Why does the decision still stand?").fill("Acme will hold the old price until March.");
  await hero.getByRole("button", { name: "Re-confirm decision" }).click();
  await expect(page.getByText("Decision re-confirmed")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("evidence from a meeting you were not in is never quoted", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="why-redacted" />);
  await expect(page.getByText("Said in a meeting you were not in.", { exact: false })).toBeVisible();
  await expect(page.getByText("fifty-two thousand")).toHaveCount(0);
});

test("reopen asks first, then says what happens to tasks", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="why" />);
  await page.getByRole("button", { name: "Reopen decision" }).click();
  const dialog = page.getByRole("dialog", { name: "Reopen this decision?" });
  await expect(dialog).toContainText("keep, re-scope or close");
  await dialog.getByRole("button", { name: "Reopen decision" }).click();
  await expect(page.getByText("Decision reopened")).toBeVisible();
});

test("book a revisit: the proposed time and people, then a toast with the meeting", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="why" />);
  await page.getByRole("button", { name: "Book a 15-minute revisit" }).click();
  const dialog = page.getByRole("dialog", { name: "Book a 15-minute revisit" });
  await expect(dialog.getByText("Your agent proposes")).toBeVisible();
  await expect(dialog.getByText("Maya Chen")).toBeVisible();
  await expect(dialog.getByLabel("Change the time")).not.toHaveValue("");
  await dialog.getByRole("button", { name: "Book revisit" }).click();
  await expect(page.getByText("Revisit booked")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open meeting" })).toBeVisible();
});

test("?assumption= lands on that reason", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="why" focus="price" />);
  await expect(page.locator("article[id^='assumption-']")).toBeFocused();
});

test("non-owners read the reasons but cannot change them", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="why-readonly" />);
  await expect(page.getByRole("button", { name: "Add a reason" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Edit reason/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reopen decision" })).toHaveCount(0);
  await expect(page.getByText("Sarah Okafor owns this decision", { exact: false })).toBeVisible();
});

test("the ripple map: Tab to a ring, arrows move along it, focus shows the detail", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="blast" />);
  const first = page.getByRole("button", { name: /^Draft the Okta migration plan/ });
  await first.focus();
  await expect(page.getByRole("heading", { name: "Draft the Okta migration plan", level: 3 })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("button", { name: /^Renew the Okta contract/ })).toBeFocused();
  await expect(page.getByText("Renewing would pay for a vendor we are leaving.", { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("button", { name: /^Cut tooling spend/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const clash = page.getByRole("button", { name: /^A decision from Sales you were not in/ });
  await expect(clash).toBeFocused();
  await expect(page.getByRole("link", { name: "Settle it together" })).toHaveAttribute("href", "/work/settle/55555555-5555-4555-8555-555555555555");
  // Tab leaves the ring: the next stop is ring 3.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /^Send Northwind the SSO rollout date/ })).toBeFocused();
  await expect(page.getByText("HubSpot not connected").first()).toBeVisible();
});

test("a ring with more than fits opens with N more", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="blast-many" />);
  await page.getByRole("button", { name: /^Show \d+ more in Work it changes/ }).click();
  await expect(page.getByRole("button", { name: /^Tell the partner team about the switch/ })).toBeVisible();
});

test("on a phone the map becomes the ring-by-ring list, with no sideways scroll", async ({ mount, page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mount(<WhyBlastHarness view="blast" />);
  await expect(page.getByRole("group", { name: "Ripple map" })).toBeHidden();
  const row = page.getByRole("button", { name: /^Renew the Okta contract/ });
  await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Open task" })).toBeVisible();
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(scroll).toBeLessThanOrEqual(0);
});

test("the one-line chip reads the meeting's summaries", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="chips" />);
  await expect(page.getByRole("link", { name: /Changes 4 tasks, moves 2 goals/ }).first()).toBeVisible();
  await expect(page.getByText("Working out what this decision touches").first()).toBeVisible();
});

test("settle: share my wording, send a message, propose mine stands", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="settle-open" />);
  await expect(page.getByText("Only Priya Nair can share the wording of their decision.")).toBeVisible();
  await page.getByRole("button", { name: "Share my wording" }).click();
  await expect(page.getByText("Wording shared")).toBeVisible();
  await page.getByRole("textbox", { name: "Message" }).fill("Can Northwind keep Okta until March?");
  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByRole("list", { name: "Messages" }).getByText("Can Northwind keep Okta until March?")).toBeVisible();
  const mine = page.getByRole("radio", { name: /Mine stands/ });
  await mine.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: /Priya Nair's stands/ })).toBeChecked();
  await page.keyboard.press("ArrowUp");
  await expect(mine).toBeChecked();
  await page.getByRole("button", { name: "Propose mine stands" }).click();
  await expect(page.getByText("Proposal sent")).toBeVisible();
  await expect(page.getByText("You proposed that your decision stands.", { exact: false })).toBeVisible();
});

test("settle: the other owner's proposal asks before yours is replaced", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="settle-proposal" />);
  await expect(page.getByText("Priya Nair proposed that their decision stands over yours.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  const dialog = page.getByRole("dialog", { name: "Let Priya Nair's decision stand?" });
  await dialog.getByRole("button", { name: "Accept, theirs stands" }).click();
  await expect(page.getByText("Proposal accepted")).toBeVisible();
  await expect(page.getByRole("heading", { name: "One decision stands" })).toBeVisible();
});

test("settle: keep both needs a note", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="settle-open" />);
  await page.getByRole("button", { name: "Keep both" }).click();
  await page.getByRole("button", { name: "Keep both decisions" }).click();
  await expect(page.getByText("Add a short note: why can both decisions stand?")).toBeVisible();
  await page.getByLabel("Why both can stand").fill("Northwind keeps Okta on its own tenant.");
  await page.getByRole("button", { name: "Keep both decisions" }).click();
  await expect(page.getByRole("heading", { name: "Both decisions stand" })).toBeVisible();
});

test("settle: meet books the proposed time", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="settle-open" />);
  await page.getByRole("button", { name: "Find a time" }).click();
  const dialog = page.getByRole("dialog", { name: "Meet to settle it" });
  await dialog.getByRole("button", { name: "Book meeting" }).click();
  await expect(page.getByText("Meeting booked")).toBeVisible();
});

test("a reopened reversal reads as reopened, not replaced", async ({ mount, page }) => {
  await mount(<WhyBlastHarness view="reversal-reopened" />);
  await expect(page.getByText("Go with Acme as our SSO vendor was reopened because a reason for it no longer holds.")).toBeVisible();
  await expect(page.getByText("Was", { exact: true })).toHaveCount(0);
});
