/* Accessibility and behaviour gate for Settings > Integrations: every state (needs setup, ready,
   connected, error, blocked tracker, a member's view, the failed read, the loading skeleton) under
   axe (WCAG 2.0/2.1 A and AA, contrast included) in light and dark; the setup dialog's contents,
   focus trap and Escape; Connect and Disconnect reaching their form actions; and the layout from
   360 to 1600 px. Run: npm run test:a11y -- integrations-a11y */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { IntegrationsHarness, type IntegrationsScenario } from "./IntegrationsHarness";

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(".mx-app").analyze();
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

/* React 18 (which the component tests mount) cannot run a function form action, so the test checks
   what the submit would send: the button submits a form whose action is the server action and
   whose only field is the provider. */
async function submits(page: Page, button: ReturnType<Page["getByRole"]>) {
  return button.evaluate((b) => {
    const form = (b as HTMLButtonElement).form;
    return form && (b as HTMLButtonElement).type === "submit" ? Array.from(new FormData(form).entries()).map(([k, v]) => `${k}=${String(v)}`) : null;
  });
}
const card = (page: Page, name: string) => page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });

for (const theme of ["light", "dark"] as const) {
  for (const scenario of ["nothing", "mixed", "other-tracker", "member", "unavailable", "loading"] as IntegrationsScenario[]) {
    test(`no axe violations: ${scenario} (${theme})`, async ({ mount, page }) => {
      await mount(<IntegrationsHarness theme={theme} scenario={scenario} />);
      await page.waitForTimeout(250);
      expect(await axe(page)).toEqual([]);
    });
  }

  test(`setup dialog is complete, traps focus and closes on Escape (${theme})`, async ({ mount, page }) => {
    await mount(<IntegrationsHarness theme={theme} scenario="nothing" />);
    const open = page.getByRole("button", { name: "Set up Slack" });
    await open.click();
    const dialog = page.getByRole("dialog", { name: "Set up Slack" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("https://dashboard.mytheus.cloud/settings/integrations/callback/slack", { exact: true })).toBeVisible();
    await expect(dialog.getByText("https://api.mytheus.cloud/webhooks/slack", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Copy redirect URL" })).toBeVisible();
    await expect(dialog.getByRole("list", { name: "Slack scopes" }).getByRole("listitem")).toHaveCount(11);
    await expect(dialog.getByRole("list", { name: "Slack environment variables" })).toContainText("SLACK_SIGNING_SECRET");
    await expect(dialog.getByRole("link", { name: /Open Slack apps/ })).toHaveAttribute("href", "https://api.slack.com/apps");
    await expect(dialog).toContainText("scripts/push-secrets.sh integrations");
    // let the dialog's entrance finish before contrast is measured
    await dialog.evaluate((d) => Promise.all(d.getAnimations({ subtree: true }).map((a) => a.finished)));
    await page.waitForTimeout(100);
    expect(await axe(page)).toEqual([]);

    // Tab cycles inside the dialog.
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });
}

test("needs setup: one chip and one action per card, no long paragraph", async ({ mount, page }) => {
  await mount(<IntegrationsHarness scenario="nothing" />);
  for (const name of ["Google Calendar", "Slack", "Project tracker", "Notion", "Confluence"]) {
    const c = card(page, name);
    await expect(c.getByText(/Needs setup$/)).toHaveCount(1);
    await expect(c.getByRole("button", { name: /^Set up / })).toHaveCount(1);
    await expect(c.getByRole("button", { name: /^Connect/ })).toHaveCount(0);
  }
  await expect(page.getByText("is not enabled on this Mytheus server")).toHaveCount(0);
  await expect(page.getByText("Not available yet")).toHaveCount(0);
});

test("tracker: Jira chosen, Linear a disabled Coming soon segment, never a chip", async ({ mount, page }) => {
  await mount(<IntegrationsHarness scenario="mixed" />);
  const tracker = card(page, "Project tracker");
  await expect(tracker.getByRole("radio", { name: "Jira" })).toBeChecked();
  const linear = tracker.getByRole("radio", { name: /Linear/ });
  await expect(linear).toBeDisabled();
  await expect(linear).toHaveAccessibleDescription("Coming soon");
  await expect(tracker.getByText(/Ready to connect$/)).toHaveCount(1);
  expect(await submits(page, tracker.getByRole("button", { name: "Connect Jira" }))).toEqual(["provider=jira"]);
});

test("ready, connected and error each offer their one action", async ({ mount, page }) => {
  await mount(<IntegrationsHarness scenario="mixed" />);
  const google = card(page, "Google Calendar");
  await expect(google.getByText(/Connected$/)).toBeVisible();
  await expect(google.getByText("maya@acme.com")).toBeVisible();
  await expect(google.getByText("Last sync")).toBeVisible();
  const disconnect = google.getByRole("button", { name: "Disconnect Google Calendar" });
  expect(await submits(page, disconnect)).toEqual(["provider=google_calendar"]);
  // Disconnect asks for a second press before it submits.
  await disconnect.click();
  await expect(google.getByRole("button", { name: "Confirm disconnect" })).toBeVisible();

  const slack = card(page, "Slack");
  await expect(slack.getByText(/Error$/)).toBeVisible();
  expect(await submits(page, slack.getByRole("button", { name: "Reconnect Slack" }))).toEqual(["provider=slack"]);
  expect(await submits(page, card(page, "Notion").getByRole("button", { name: "Connect Notion" }))).toEqual(["provider=notion"]);
});

test("another tracker connected blocks Jira with a reason", async ({ mount, page }) => {
  await mount(<IntegrationsHarness scenario="other-tracker" />);
  const tracker = card(page, "Project tracker");
  await expect(tracker.getByRole("button", { name: /Connect Jira/ })).toHaveCount(0);
  await expect(tracker.getByText("Disconnect the other tracker first")).toBeVisible();
});

test("a member sees the cards and is told to ask an admin, with no buttons", async ({ mount, page }) => {
  await mount(<IntegrationsHarness scenario="member" />);
  await expect(page.getByText("Only workspace admins can connect integrations", { exact: false })).toBeVisible();
  await expect(page.getByText("Ask an admin to set this up")).toHaveCount(5);
  await expect(page.getByRole("button", { name: /^(Set up|Connect|Disconnect|Reconnect)/ })).toHaveCount(0);
});

test("a failed read says so and offers Retry", async ({ mount, page }) => {
  await mount(<IntegrationsHarness scenario="unavailable" />);
  await expect(page.getByRole("alert")).toContainText("Integrations could not be loaded");
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("More expands a clamped description", async ({ mount, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mount(<IntegrationsHarness scenario="nothing" />);
  const more = card(page, "Slack").getByRole("button", { name: "More" });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  await expect(card(page, "Slack").getByRole("button", { name: "Less" })).toHaveAttribute("aria-expanded", "true");
});

for (const [width, cols] of [
  [360, 1],
  [768, 2],
  [1024, 2],
  [1440, 3],
  [1600, 3],
] as const) {
  test(`grid at ${width}px: ${cols} column(s), equal widths, equal heights per row, no horizontal scroll`, async ({ mount, page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mount(<IntegrationsHarness scenario="mixed" />);
    await page.waitForTimeout(200);
    for (const group of ["For your Mytes", "Share and export"]) {
      const boxes = await page
        .getByRole("region", { name: group })
        .getByRole("listitem")
        .filter({ has: page.getByRole("heading", { level: 4 }) })
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) })));
      expect(new Set(boxes.slice(0, cols).map((b) => b.y)).size).toBe(1);
      expect(new Set(boxes.map((b) => b.x)).size).toBe(Math.min(cols, boxes.length));
      expect(new Set(boxes.map((b) => b.w)).size).toBe(1);
      const rows = new Map<number, number[]>();
      for (const b of boxes) rows.set(b.y, [...(rows.get(b.y) ?? []), b.h]);
      for (const hs of rows.values()) expect(new Set(hs).size).toBe(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
