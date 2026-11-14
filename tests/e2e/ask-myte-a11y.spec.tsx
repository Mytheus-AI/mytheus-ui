/* Ask Myte (ADR-0047): the /ask page and the ⌘J sheet, keyboard only, in light and dark, at desktop
   and phone width, with axe (WCAG 2 A and AA, contrast included). The stream route is mocked with
   `page.route`; server actions come from stubs/actions.ts.

     npm run test:a11y -- ask-myte-a11y
     ASK_SHOTS=/some/dir npm run test:a11y -- ask-myte-a11y   (also writes screenshots) */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/experimental-ct-react";
import { AskMyteHarness } from "./AskMyteHarness";
import { ANSWER_EVENTS, sse } from "./ask-myte-fixture";
import type { StreamEvent } from "../../src/lib/ask-myte/types";

test.describe.configure({ timeout: 90_000 });

const SHOTS = process.env.ASK_SHOTS;

async function mockStream(page: Page, events: StreamEvent[] = ANSWER_EVENTS) {
  const bodies: unknown[] = [];
  await page.route("**/api/ask-myte", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream; charset=utf-8" }, body: sse(events) });
  });
  return bodies;
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  test(`empty page (${theme}): the Myte greets you, six starters, no axe violations`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mount(<AskMyteHarness theme={theme} />);
    await expect(page.getByRole("heading", { name: "Hi Sushan, it's Pip. What should I find?" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Ask one of these" }).getByRole("button")).toHaveCount(6);
    await expect(page.getByRole("navigation", { name: "Your questions" }).first().getByRole("heading", { name: "Pinned" })).toBeVisible();
    await axe(page);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/ask-empty-${theme}.png` });
  });

  test(`answer (${theme}): keyboard only, from question to sources to a confirmed proposal`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const bodies = await mockStream(page);
    await mount(<AskMyteHarness theme={theme} />);

    const box = page.getByRole("textbox", { name: "Ask Pip" });
    await box.focus();
    await page.keyboard.type("What did we decide in Feature Update - Backend, and is anything on me?");
    await page.keyboard.press("Enter");

    const answer = page.getByRole("article", { name: "Pip's answer" });
    await expect(answer.getByText("One thing is on you")).toBeVisible();
    expect((bodies[0] as { question: string; scope: { kind: string } }).scope.kind).toBe("all");
    // signed in character
    await expect(answer.getByText("your Myte", { exact: false }).first()).toBeVisible();
    await expect(answer.getByRole("button", { name: /^Source 1: Transcript/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Who else was in that meeting?" })).toBeVisible();
    await expect(answer.getByRole("region", { name: "Confirmed decision" })).toBeVisible();
    // the polite announcement carries the answer
    await expect(page.getByRole("status").filter({ hasText: "Pip answered" })).toHaveCount(1);

    // 1-9 open a source while the answer has focus
    await answer.focus();
    await page.keyboard.press("2");
    const source = page.locator('[data-source="2"]').first();
    await expect(source).toBeVisible();
    await expect(source).toBeFocused();

    if (SHOTS) await page.screenshot({ path: `${SHOTS}/ask-answer-${theme}.png` });
    await axe(page);

    // confirm the proposal from the keyboard
    await page.getByRole("button", { name: "Close sources" }).first().click();
    const confirm = answer.getByRole("button", { name: "Confirm", exact: true });
    await confirm.focus();
    await page.keyboard.press("Enter");
    await expect(answer.getByText("Task added.")).toBeVisible();
    const confirmed = await page.evaluate(() => (window as unknown as { __askConfirmed?: unknown[] }).__askConfirmed?.length ?? 0);
    expect(confirmed).toBe(1);
  });
}

test("deep-linked thread: history, signature, feedback state", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mount(<AskMyteHarness thread />);
  await expect(page.getByRole("heading", { level: 1, name: "Backend update: what we decided" })).toBeVisible();
  await expect(page.getByText("You asked:")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Helpful", pressed: true })).toBeVisible();
  await page.getByRole("button", { name: "Not helpful" }).click();
  await page.getByRole("button", { name: "Missing something" }).click();
  const fb = await page.evaluate(() => (window as unknown as { __askFeedback?: { reason: string }[] }).__askFeedback?.[0]?.reason);
  expect(fb).toBe("Missing something");
});

test("failure states speak in character: budget", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockStream(page, [{ event: "error", data: { reason: "budget", message: "Answers come back on Dec 1." } }]);
  await mount(<AskMyteHarness />);
  await page.getByRole("button", { name: /What do I owe this week/ }).click();
  const answer = page.getByRole("article", { name: "Pip's answer" });
  await expect(answer.getByText("Your workspace reached its AI limit.")).toBeVisible();
  await expect(answer.getByText("Answers come back on Dec 1.")).toBeVisible();
});

test("not connected names who can fix it", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockStream(page, [{ event: "error", data: { reason: "not_connected", message: "" } }]);
  await mount(<AskMyteHarness />);
  await page.getByRole("button", { name: /Can I take on a Friday deadline/ }).click();
  await expect(page.getByRole("article", { name: "Pip's answer" }).getByText("I'm not connected on this workspace yet.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Workspace" })).toBeVisible();
});

test("phone width: no sideways scroll, history opens as a drawer", async ({ mount, page }) => {
  await page.setViewportSize({ width: 400, height: 860 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockStream(page);
  await mount(<AskMyteHarness />);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ask-phone-empty.png` });
  await page.getByRole("button", { name: "Your questions" }).click();
  const drawer = page.getByRole("dialog", { name: "Your questions" });
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await page.getByRole("button", { name: /Prep me for Test/ }).click();
  await expect(page.getByRole("article", { name: "Pip's answer" }).getByText("One thing is on you")).toBeVisible();
  const after = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(after).toBeLessThanOrEqual(0);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ask-phone-answer.png`, fullPage: true });
  await axe(page);
});

for (const theme of ["light", "dark"] as const) {
  test(`sheet (${theme}): Ctrl+J opens it, focus is trapped, Esc closes and focus returns`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockStream(page);
    await mount(<AskMyteHarness view="sheet" theme={theme} />);

    // the entry point opens it scoped to the meeting
    const about = page.getByRole("button", { name: "Ask about this meeting" });
    await about.focus();
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: "Ask Pip" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("This meeting: Feature Update - Backend")).toBeVisible();
    await expect(sheet.getByRole("textbox", { name: "Ask Pip" })).toBeFocused();
    await expect(sheet.getByRole("button", { name: "What are the open questions?" }).or(sheet.getByRole("button", { name: /Prep me for Test/ }))).toBeVisible();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/ask-sheet-${theme}.png` });
    await axe(page);

    // Tab never leaves the sheet
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const inside = await sheet.evaluate((el) => el.contains(document.activeElement));
      expect(inside).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(about).toBeFocused();

    // Ctrl+J toggles it from anywhere
    await page.keyboard.press("Control+j");
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Control+j");
    await expect(sheet).toBeHidden();
  });
}

test("sheet: a question streams in, scoped to the page", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const bodies = await mockStream(page);
  await mount(<AskMyteHarness view="sheet" />);
  await page.getByRole("button", { name: "Ask about this meeting" }).click();
  const sheet = page.getByRole("dialog", { name: "Ask Pip" });
  await sheet.getByRole("textbox", { name: "Ask Pip" }).fill("What are the open questions?");
  await page.keyboard.press("Enter");
  await expect(sheet.getByRole("article", { name: "Pip's answer" }).getByText("One thing is on you")).toBeVisible();
  const body = bodies[0] as { scope: { kind: string; meeting_id: string }; page: { kind: string } };
  expect(body.scope.kind).toBe("meeting");
  expect(body.page.kind).toBe("meeting");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/ask-sheet-answer.png` });
});
