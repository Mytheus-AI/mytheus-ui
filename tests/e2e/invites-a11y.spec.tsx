/* Meeting invitations by email (ADR-0043): the "Invite and share" card in every state and the New
   meeting window's "Send email invites". Copy link and the calendar buttons for everyone; invite
   controls only for the host; email not set up said plainly with the link still offered; a failed
   read shows Retry; keyboard paths; no axe violations in either theme or at 360 px.
   Real components in a real browser, the server actions stubbed (stubs/actions.ts). */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { InvitesHarness } from "./InvitesHarness";
import { NewMeetingHarness } from "./NewMeetingHarness";
import { INVITES } from "./invites-fixture";

async function axe(page: Page) {
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(".mx-app").analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

for (const theme of ["light", "dark"] as const) {
  for (const state of ["host", "empty", "notConfigured", "member", "noTime", "error"] as const) {
    test(`card ${state} has no axe violations (${theme})`, async ({ mount, page }) => {
      await mount(<InvitesHarness state={state} theme={theme} />);
      expect(await axe(page)).toEqual([]);
    });
  }
}

test("host: link, calendar buttons, the list with statuses and per-person actions", async ({ mount, page }) => {
  await mount(<InvitesHarness state="host" />);
  const card = page.getByRole("region", { name: "Invite and share" });
  await expect(card.getByRole("textbox", { name: "Join link" })).toHaveValue("https://dashboard.mytheus.cloud/meetings/m-1/join");
  await expect(card.getByRole("link", { name: /Google/ })).toHaveAttribute("target", "_blank");
  await expect(card.getByRole("link", { name: /Outlook/ })).toHaveAttribute("href", /outlook\.office\.com/);
  await expect(card.getByRole("link", { name: "Download .ics" })).toHaveAttribute("href", "/api/meetings/m-1/calendar");
  const list = card.getByRole("list", { name: "Invitations" });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list.getByText("Update sent")).toBeVisible();
  await expect(list.getByText("Failed")).toBeVisible();
  await expect(list.getByText("The email provider was unavailable.")).toBeVisible();
  await expect(card.getByRole("button", { name: "Retry invitation to Diego Alvarez" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Resend invitation to Raj Patel" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Resend to everyone" })).toBeVisible();
});

test("retry sends to that one person and reloads the list", async ({ mount, page }) => {
  await mount(<InvitesHarness state="host" />);
  await page.evaluate((read) => ((window as unknown as { __invitesRead: unknown }).__invitesRead = read), INVITES.host);
  await page.getByRole("button", { name: "Retry invitation to Diego Alvarez" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __invitesSent?: string[][] }).__invitesSent)).toEqual([["u-diego"]]);
  await expect(page.getByRole("status").last()).toHaveText(/Emailed Diego/);
});

test("invite by email: open with the keyboard, pick, add a note, send", async ({ mount, page }) => {
  await mount(<InvitesHarness state="empty" />);
  const card = page.getByRole("region", { name: "Invite and share" });
  await expect(card.getByText("No one has been emailed yet.", { exact: false })).toBeVisible();
  await card.getByRole("button", { name: "Invite by email" }).focus();
  await page.keyboard.press("Enter");
  const send = card.getByRole("button", { name: "Send invite" });
  await expect(send).toBeDisabled();
  await card.getByRole("checkbox", { name: /Priya Nair/ }).click();
  await card.getByRole("checkbox", { name: /Raj Patel/ }).click();
  await card.getByLabel("Note").fill("Bring the Q1 numbers");
  await expect(card.getByText("20 of 500")).toBeVisible();
  await page.evaluate((read) => ((window as unknown as { __invitesRead: unknown }).__invitesRead = read), INVITES.host);
  await card.getByRole("button", { name: "Send 2 invites" }).click();
  await expect(card.getByRole("button", { name: "Invite by email" })).toBeFocused();
  await expect(card.getByRole("list", { name: "Invitations" }).getByRole("listitem")).toHaveCount(3);
});

test("a refused send stays in the form and says why", async ({ mount, page }) => {
  await mount(<InvitesHarness state="empty" />);
  await page.evaluate(() => ((window as unknown as { __inviteFail: boolean }).__inviteFail = true));
  await page.getByRole("button", { name: "Invite by email" }).click();
  await page.getByRole("checkbox", { name: /Sarah Okafor/ }).click();
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByRole("alert")).toHaveText(/Try again in an hour/);
});

test("email not set up: said plainly, the link and the calendar file still offered", async ({ mount, page }) => {
  await mount(<InvitesHarness state="notConfigured" />);
  const card = page.getByRole("region", { name: "Invite and share" });
  await expect(card.getByText("Email isn’t set up for this workspace yet.")).toBeVisible();
  await expect(card.getByRole("button", { name: "Copy join link" })).toBeVisible();
  await expect(card.getByRole("link", { name: "Download .ics" })).toBeVisible();
  await expect(card.getByText("Not emailed")).toHaveCount(2);
  await expect(card.getByRole("button", { name: /Resend/ })).toHaveCount(0);
  await expect(card.getByRole("button", { name: "Add people" })).toBeVisible();
});

test("not the host: share links only, no invite controls", async ({ mount, page }) => {
  await mount(<InvitesHarness state="member" />);
  const card = page.getByRole("region", { name: "Invite and share" });
  await expect(card.getByRole("button", { name: "Copy join link" })).toBeVisible();
  await expect(card.getByRole("button", { name: /Invite by email|Add people/ })).toHaveCount(0);
  await expect(card.getByText("Only the host can email invitations.", { exact: false })).toBeVisible();
});

test("copy the join link announces it", async ({ mount, page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await mount(<InvitesHarness state="member" />);
  await page.getByRole("button", { name: "Copy join link" }).click();
  await expect(page.getByRole("button", { name: "Copy join link" })).toHaveText(/Copied/);
  await expect(page.getByRole("status").last()).toHaveText("Join link copied.");
});

test("a failed read shows Retry, which reloads the card", async ({ mount, page }) => {
  await mount(<InvitesHarness state="error" />);
  const card = page.getByRole("region", { name: "Invite and share" });
  await expect(card.getByRole("alert")).toHaveText(/couldn’t be loaded|couldn't be loaded/);
  await page.evaluate((read) => ((window as unknown as { __invitesRead: unknown }).__invitesRead = read), INVITES.member);
  await card.getByRole("button", { name: "Retry" }).click();
  await expect(card.getByRole("button", { name: "Copy join link" })).toBeVisible();
});

test("360 px: no horizontal scroll and no axe violations", async ({ mount, page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await mount(<InvitesHarness state="host" />);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(await axe(page)).toEqual([]);
});

test("new meeting: Send email invites appears once someone is picked, on by default", async ({ mount, page }) => {
  await page.route("**/api/meeting-precheck", (r) => r.fulfill({ status: 503, body: "{}" }));
  await mount(<NewMeetingHarness />);
  await page.getByRole("button", { name: "New meeting" }).click();
  await expect(page.getByRole("switch", { name: "Send email invites" })).toHaveCount(0);
  await page.getByRole("checkbox", { name: /Priya Nair/ }).click();
  const toggle = page.getByRole("switch", { name: "Send email invites" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Note")).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.getByLabel("Note")).toHaveCount(0);
  expect(await axe(page)).toEqual([]);
});

test("new meeting: email not set up turns the switch off and says so", async ({ mount, page }) => {
  await page.route("**/api/meeting-precheck", (r) => r.fulfill({ status: 503, body: "{}" }));
  await mount(<NewMeetingHarness />);
  await page.evaluate(() => ((window as unknown as { __emailConfigured: boolean }).__emailConfigured = false));
  await page.getByRole("button", { name: "New meeting" }).click();
  await page.getByRole("checkbox", { name: /Raj Patel/ }).click();
  const toggle = page.getByRole("switch", { name: "Send email invites" });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(toggle).toBeDisabled();
  await expect(page.getByText("Email isn’t set up for this workspace yet.", { exact: false })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});
