/* Accessibility gate for connecting an app over OAuth: the consent page (approve, deny, narrowing
   the access, the warnings for an unverified or local return address, every problem state) and
   Settings > API access's Connected apps with the Claude connector steps. Axe (WCAG 2.0/2.1 A and
   AA, contrast included) in light and dark, the keyboard path through the decision, and phone to
   wide widths with no sideways scroll. Run: npm run test:a11y */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { ConnectedAppsHarness, ConsentHarness } from "./OAuthHarness";

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(".mx-app").analyze();
  return results.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const theme of ["light", "dark"] as const) {
  test(`consent page has no axe violations (${theme})`, async ({ mount, page }) => {
    await mount(<ConsentHarness theme={theme} />);
    await expect(page.getByRole("heading", { level: 1, name: "Claude wants to use Mytheus as you" })).toBeVisible();
    await expect(page.getByText("Verified")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test(`consent warnings for a local and an unknown return address (${theme})`, async ({ mount, page }) => {
    const local = await mount(<ConsentHarness theme={theme} variant="loopback" />);
    await expect(page.getByText("This app runs on your computer", { exact: false })).toBeVisible();
    // Asked for read only: no choice to widen it.
    await expect(page.getByRole("radio")).toHaveCount(0);
    expect(await axe(page)).toEqual([]);
    await local.unmount();
    await mount(<ConsentHarness theme={theme} variant="unknown" />);
    await expect(page.getByText("Mytheus does not recognise notes.example.com", { exact: false })).toBeVisible();
    await expect(page.getByText("Not verified")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test(`connected apps and the Claude connector steps (${theme})`, async ({ mount, page }) => {
    await mount(<ConnectedAppsHarness theme={theme} />);
    await expect(page.getByRole("heading", { name: "Connected apps" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Claude (claude.ai and Claude Desktop)" })).toBeVisible();
    await expect(page.getByText("https://api.mytheus.cloud/mcp as the server URL", { exact: false })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
}

test("approve by keyboard, narrowing the access to read only", async ({ mount, page }) => {
  await mount(<ConsentHarness />);
  const readAct = page.getByRole("radio", { name: /Read and act/ });
  await expect(readAct).toBeChecked();
  await readAct.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: /Read only/ })).toBeChecked();
  // The side panel follows the choice.
  await expect(page.getByText("Create tasks as you, when you ask it to")).toBeHidden();
  await page.getByRole("button", { name: "Allow access" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Access allowed. Returning you to claude.ai.");
  await expect(page.getByRole("button", { name: "Allow access" })).toBeHidden();
  expect(await axe(page)).toEqual([]);
});

test("deny says where it is going", async ({ mount, page }) => {
  await mount(<ConsentHarness />);
  await page.getByRole("button", { name: "Deny" }).click();
  await expect(page.getByRole("status")).toContainText("You denied access. Returning you to claude.ai.");
});

test("a request that expires while open becomes its explanation", async ({ mount, page }) => {
  await mount(<ConsentHarness request="expired" />);
  await page.getByRole("button", { name: "Allow access" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "This sign-in request has expired" })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

for (const [problem, title] of [
  ["missing_request", "There is nothing to approve here"],
  ["invalid_request", "This sign-in link is not valid"],
  ["unknown_client", "This app is not registered with Mytheus"],
  ["invalid_redirect", "This app's return address does not match"],
  ["no_account", "Your account is not set up in this workspace yet"],
] as const) {
  test(`problem state: ${problem}`, async ({ mount, page }) => {
    await mount(<ConsentHarness problem={problem} />);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Mytheus" })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
}

test("problem state: unavailable offers Retry", async ({ mount, page }) => {
  await mount(<ConsentHarness problem="unavailable" theme="dark" />);
  await expect(page.getByRole("heading", { name: "Mytheus could not load this request" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test("disconnect asks first and returns focus on Escape", async ({ mount, page }) => {
  // The dialog fades in; measure contrast on its settled colours, not mid-fade.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mount(<ConnectedAppsHarness />);
  const trigger = page.getByRole("button", { name: "Disconnect Claude", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Disconnect app" });
  await expect(dialog).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Disconnect app", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("list", { name: "Your connected apps" }).getByText("Claude", { exact: true })).toBeHidden();
});

for (const width of [360, 768, 1600]) {
  test(`no sideways scroll at ${width}px`, async ({ mount, page }) => {
    await page.setViewportSize({ width, height: 900 });
    const consent = await mount(<ConsentHarness variant="unknown" />);
    await noSidewaysScroll(page);
    expect(await axe(page)).toEqual([]);
    await consent.unmount();
    await mount(<ConnectedAppsHarness empty={width === 360} />);
    await noSidewaysScroll(page);
    expect(await axe(page)).toEqual([]);
  });
}
