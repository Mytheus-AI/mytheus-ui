/* The meeting room's accessibility gate (polish program, Phase 0; CLAUDE.md: "Accessibility is a
   gate"). The real <MeetingRoom /> in a real browser with the gateway, Clerk and LiveKit mocked at
   the edges (see playwright-ct.config.ts):

   - no axe violations (WCAG 2.0/2.1 A and AA, colour contrast included) in light and dark, with a
     live decision card and an alert on screen;
   - the keyboard path: every control reachable by Tab in a sensible order (top bar, stage
     controls, panel), tabs move with the arrow keys, popovers open, take focus and close on
     Escape with focus returned;
   - shortcuts: M toggles the mic, never while typing in chat, and the off switch turns them off;
   - the socket asks Clerk for a token on every (re)connect. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { RoomHarness } from "./RoomHarness";
import { MEETING_ID } from "./fixtures";

const DECISION = "22222222-2222-4222-8222-222222222222";

async function pushLiveCards(page: Page) {
  await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
  await page.evaluate(
    ([meetingId, id]) => {
      window.__gateway!.push("agent-candidate", {
        meetingId,
        payload: {
          windowId: `${meetingId}:30000`,
          agent: "DecisionAgent",
          kind: "decision_candidate",
          candidates: [{ id, content: "Ship the beta on 2 December", confidence: 0.86, rationale: "QA signed off" }],
        },
      });
    },
    [MEETING_ID, DECISION],
  );
  await expect(page.getByText("Ship the beta on 2 December")).toBeVisible();
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .include(".cx-room")
    .analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

for (const theme of ["light", "dark"] as const) {
  test(`no axe violations in the live room (${theme})`, async ({ mount, page }) => {
    await mount(<RoomHarness theme={theme} />);
    await pushLiveCards(page);
    expect(await axe(page)).toEqual([]);
  });
}

test("the keyboard reaches every control in order, and tabs and popovers behave", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  await pushLiveCards(page);

  // Walk the page with Tab and record what receives focus.
  await page.locator("body").focus();
  const order: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const name = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return "";
      return (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ");
    });
    if (name) order.push(name);
  }
  const at = (label: string) => order.findIndex((n) => n.startsWith(label));
  for (const label of ["Call", "Copy meeting link", "Side panel", "Microphone", "Camera", "Raise hand", "Send a reaction", "Off the record", "Live captions", "Caption language", "Grid view", "More options", "Leave or end the meeting", "Myte"]) {
    expect(at(label), `${label} is reachable by Tab (got ${order.join(" | ")})`).toBeGreaterThanOrEqual(0);
  }
  // Top bar, then the stage's controls, then the panel.
  expect(at("Copy meeting link")).toBeLessThan(at("Microphone"));
  expect(at("Microphone")).toBeLessThan(at("Camera"));
  expect(at("Leave or end the meeting")).toBeLessThan(at("Myte"));
  // The live decision card is in the panel and its Confirm is reachable.
  expect(order.some((n) => n === "Confirm")).toBe(true);

  // Tabs: arrow keys move between Agent, Chat and People.
  const agentTab = page.getByRole("tab", { name: /Myte/ });
  await agentTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Chat/ })).toBeFocused();
  await expect(page.getByRole("tab", { name: /Chat/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: /People/ })).toHaveAttribute("aria-selected", "true");
  // People lists the call, the agent sent instead, and who was invited but is not here.
  await expect(page.getByRole("heading", { name: "Mytes attending" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Mytes attending" }).getByText("Attending for Sarah Okafor")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invited, not here" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Invited, not here" }).getByText("Priya Nair")).toBeVisible();

  // Popovers: open with Enter, focus goes in, Escape closes and returns focus.
  const more = page.getByRole("button", { name: "More options" });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(more).toHaveAttribute("aria-expanded", "true");
  // Its first item is "What is recorded" (wave 3), then the shortcuts switch.
  await expect(page.getByRole("button", { name: /What is recorded/ })).toBeFocused();
  await expect(page.getByRole("switch", { name: /Keyboard shortcuts/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(more).toBeFocused();

  // End for everyone opens the 60-second wrap-up, in a modal dialog that traps focus; Escape
  // keeps the meeting going.
  const leave = page.getByRole("button", { name: "Leave or end the meeting" });
  await leave.click();
  await page.getByRole("button", { name: /End for everyone/ }).click();
  const dialog = page.getByRole("dialog", { name: "Wrap up before everyone leaves" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Keep the meeting going" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("shortcuts toggle the mic, never while typing, and can be turned off", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
  const mic = page.getByRole("button", { name: "Microphone" }).first();
  await expect(mic).toHaveAttribute("aria-pressed", "true");

  await page.locator("body").press("m");
  await expect(mic).toHaveAttribute("aria-pressed", "false");

  // Typing an "m" in the chat composer is text, not a shortcut.
  await page.getByRole("tab", { name: /Chat/ }).click();
  const composer = page.getByRole("textbox", { name: "Message everyone" });
  await composer.fill("");
  await composer.press("m");
  await expect(composer).toHaveValue("m");
  await expect(mic).toHaveAttribute("aria-pressed", "false");

  // The off switch.
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("switch", { name: /Keyboard shortcuts/ }).uncheck();
  await page.locator("body").press("m");
  await expect(mic).toHaveAttribute("aria-pressed", "false");
});

test("chat goes through the meeting link, shows history, and every (re)connect asks for a fresh token", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
  await page.getByRole("tab", { name: /Chat/ }).click();
  await expect(page.getByText("Morning all, notes doc is in the invite.")).toBeVisible();
  const composer = page.getByRole("textbox", { name: "Message everyone" });
  await composer.fill("Agenda item 1 first?");
  await composer.press("Enter");
  await expect(page.locator(".cbubble", { hasText: "Agenda item 1 first?" })).toHaveCount(1);

  const before = await page.evaluate(() => window.__gateway!.tokens.length);
  await page.evaluate(() => {
    window.__gateway!.drop();
  });
  await expect(page.getByRole("status").filter({ hasText: "Myte paused, captions reconnecting" })).toBeVisible();
  await page.evaluate(() => {
    window.__gateway!.connect();
  });
  await expect(page.getByText("Myte paused, captions reconnecting")).toBeHidden();
  const tokens = await page.evaluate(() => window.__gateway!.tokens);
  expect(tokens.length).toBe(before + 1);
  expect(new Set(tokens).size).toBe(tokens.length);
});

/* ---------------------------------------------------------------- the room's top chrome (Phase 1) */

test("the agenda stage bar shows the item, its time and the next one, and the host's controls work by keyboard", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
  const bar = page.getByRole("region", { name: "Agenda" });
  await expect(bar.locator(".sb-name")).toHaveText("Beta readiness");
  await expect(bar.locator(".sb-next-name")).toHaveText("Launch date");
  // Started long ago against a 10 minute plan: the over-time state, said in words.
  await expect(bar.getByRole("img", { name: /over the 10 min planned/ })).toBeVisible();

  // The menu: Enter opens it on its first item, arrows move, Escape closes it with focus back.
  const more = bar.getByRole("button", { name: "More agenda controls" });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("menuitem", { name: /Mark covered/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: /Skip this item/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(more).toBeFocused();

  // Start next writes, then tells the room which rows changed.
  await bar.getByRole("button", { name: "Start next: Launch date" }).click();
  await expect.poll(() => page.evaluate(() => window.__gatewayLog!.some((e) => e.event === "agenda-status"))).toBe(true);

  // A live change from the host reaches everyone's bar: the next item starts.
  await page.evaluate((meetingId) => {
    const row = (id: string, position: number, title: string, status: string) => ({
      id,
      position,
      title,
      owner_user_id: position === 1 ? "u-sarah" : null,
      duration_minutes: 10,
      status,
      status_source: "host",
      agent_note: null,
      updated_at: "2026-11-11T10:00:00Z",
      started_at: new Date().toISOString(),
    });
    const items = [
      row("11111111-1111-4111-8111-111111111111", 0, "Beta readiness", "covered"),
      row("44444444-4444-4444-8444-444444444444", 1, "Launch date", "in_progress"),
    ];
    window.__gateway!.push("agenda-status", { meetingId, payload: { item: items[0], items, byUserId: "u-maya", at: "" } });
  }, MEETING_ID);
  await expect(bar.getByText("Now, 2 of 2")).toBeVisible();
  // Sarah sent her agent and owns this item: her question comes up for the host to raise.
  const questions = page.getByRole("region", { name: "Questions from Sarah Okafor's Myte" });
  await expect(questions).toBeVisible();
  await questions.getByRole("button", { name: /Raise in chat/ }).click();
  await expect(questions.getByText("Raised in chat")).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test("a late joiner gets the catch-up line and can open it", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  const line = page.getByRole("region", { name: "What you missed" });
  await expect(line.getByText("Since 0:00: 2 decisions, 1 task, item 1 in progress")).toBeVisible();
  const show = line.getByRole("button", { name: /Show|Hide/ });
  await expect(show).toHaveText(/Show/);
  await show.click();
  await expect(show).toHaveAttribute("aria-expanded", "true");
  await expect(line.getByText("Keep pricing flat for Q1")).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await line.getByRole("button", { name: "Close the catch-up line" }).click();
  await expect(line).toBeHidden();
});

test("the stand-in tile shows the update and asks the agent through a dialog", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  await expect(page.getByText("QA signed off on the beta.").first()).toBeVisible();
  await page.getByRole("button", { name: /Ask Sarah Okafor's Myte/ }).click();
  const dialog = page.getByRole("dialog", { name: /standing in for Sarah Okafor/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: /Ask Sarah Okafor.s Myte/ }).fill("What did we decide on pricing?");
  await dialog.getByRole("button", { name: "Ask" }).click();
  await expect(dialog.getByText("Pricing stays flat for Q1")).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

for (const theme of ["light", "dark"] as const) {
  test(`the wrap-up sheet has no axe violations and settles cards (${theme})`, async ({ mount, page }) => {
    await mount(<RoomHarness theme={theme} />);
    await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
    await page.getByRole("button", { name: "Leave or end the meeting" }).click();
    await page.getByRole("button", { name: /End for everyone/ }).click();
    const sheet = page.getByRole("dialog", { name: "Wrap up before everyone leaves" });
    await expect(sheet.getByText("Write the release notes")).toBeVisible();
    await expect(sheet.getByRole("timer")).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__gatewayLog!.some((e) => e.event === "wrap-up"))).toBe(true);
    expect(await axe(page)).toEqual([]);
    // One-click owner, then confirm.
    await sheet.getByRole("combobox", { name: "Assign: Write the release notes" }).click();
    await sheet.getByRole("option", { name: "Raj Patel" }).click();
    await expect(sheet.locator(".wu-owner").getByText("Raj Patel")).toBeVisible();
    await sheet.getByRole("button", { name: "Confirm: Write the release notes" }).click();
    await expect(sheet.getByText("Write the release notes")).toBeHidden();
    // End now closes the meeting for everyone.
    await sheet.getByRole("button", { name: "End now" }).click();
    await expect(page.getByRole("heading", { name: "You ended the meeting for everyone" })).toBeVisible();
    await expect(page.getByText(/1 cards nobody confirmed are in your review queue|cards nobody confirmed are in your review queue/)).toBeVisible();
  });
}

test("everyone else sees the host wrapping up, with a way to leave", async ({ mount, page }) => {
  await mount(<RoomHarness asHost={false} />);
  await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
  await expect(page.getByRole("button", { name: /Start next/ })).toHaveCount(0);
  await page.evaluate((meetingId) => {
    const started = new Date().toISOString();
    window.__gateway!.push("wrap-up", {
      meetingId,
      payload: { state: "started", startedAt: started, endsAt: new Date(Date.now() + 60_000).toISOString(), byUserId: "u-maya", at: started },
    });
  }, MEETING_ID);
  await expect(page.getByRole("status").filter({ hasText: "Maya Chen is wrapping up" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Leave now" })).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.evaluate((meetingId) => {
    window.__gateway!.push("wrap-up", { meetingId, payload: { state: "cancelled", startedAt: null, endsAt: null, byUserId: "u-maya", at: "" } });
  }, MEETING_ID);
  await expect(page.getByText("Maya Chen is wrapping up")).toBeHidden();
});
