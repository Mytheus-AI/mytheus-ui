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
  for (const label of ["Call", "Copy meeting link", "Side panel", "Microphone", "Camera", "Raise hand", "Send a reaction", "Live captions", "Grid view", "More options", "Leave or end the meeting", "Agent"]) {
    expect(at(label), `${label} is reachable by Tab (got ${order.join(" | ")})`).toBeGreaterThanOrEqual(0);
  }
  // Top bar, then the stage's controls, then the panel.
  expect(at("Copy meeting link")).toBeLessThan(at("Microphone"));
  expect(at("Microphone")).toBeLessThan(at("Camera"));
  expect(at("Leave or end the meeting")).toBeLessThan(at("Agent"));
  // The live decision card is in the panel and its Confirm is reachable.
  expect(order.some((n) => n === "Confirm")).toBe(true);

  // Tabs: arrow keys move between Agent, Chat and People.
  const agentTab = page.getByRole("tab", { name: /Agent/ });
  await agentTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Chat/ })).toBeFocused();
  await expect(page.getByRole("tab", { name: /Chat/ })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: /People/ })).toHaveAttribute("aria-selected", "true");
  // People lists the call, the agent sent instead, and who was invited but is not here.
  await expect(page.getByRole("heading", { name: "Agents attending" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Agents attending" }).getByText("Attending for Sarah Okafor")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invited, not here" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Invited, not here" }).getByText("Priya Nair")).toBeVisible();

  // Popovers: open with Enter, focus goes in, Escape closes and returns focus.
  const more = page.getByRole("button", { name: "More options" });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("switch", { name: /Keyboard shortcuts/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(more).toBeFocused();

  // End for everyone asks first, in a modal dialog that traps focus.
  const leave = page.getByRole("button", { name: "Leave or end the meeting" });
  await leave.click();
  await page.getByRole("button", { name: /End for everyone/ }).click();
  const dialog = page.getByRole("dialog", { name: "End the meeting for everyone?" });
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
  await expect(page.getByRole("status").filter({ hasText: "Agent paused, captions reconnecting" })).toBeVisible();
  await page.evaluate(() => {
    window.__gateway!.connect();
  });
  await expect(page.getByText("Agent paused, captions reconnecting")).toBeHidden();
  const tokens = await page.evaluate(() => window.__gateway!.tokens);
  expect(tokens.length).toBe(before + 1);
  expect(new Set(tokens).size).toBe(tokens.length);
});
