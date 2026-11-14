/* The ask box, layout option A (November 2026): a full-width field, one toolbar row (the scope as
   a single button with a menu and a clear; attach, mic and send as equal 32 px buttons), on /ask,
   in the ⌘J sheet and at phone width, in light and dark. Keyboard: Tab order, the menu button
   pattern, Escape returns focus. Axe (WCAG 2 A and AA).

     npm run test:a11y -- composer
     COMPOSER_SHOTS=/some/dir npm run test:a11y -- composer   (also writes screenshots) */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/experimental-ct-react";
import { AskMyteHarness } from "./AskMyteHarness";
import { ANSWER_EVENTS, sse } from "./ask-myte-fixture";
import { fakeMic } from "./mic-fake";

test.describe.configure({ timeout: 60_000 });

const SHOTS = process.env.COMPOSER_SHOTS;

async function mockStream(page: Page) {
  const bodies: { question: string; scope: { kind: string; person_id: string | null } }[] = [];
  await page.route("**/api/ask-myte", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream; charset=utf-8" }, body: sse(ANSWER_EVENTS) });
  });
  return bodies;
}

async function axe(page: Page) {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

/** One row: every control in the toolbar sits on the same line, and the row is one control tall. */
async function oneRow(composer: Locator) {
  const toolbar = composer.locator("[data-composer-toolbar]");
  const box = await toolbar.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(34);
  const tops = await toolbar.locator("button:visible").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  // the right-hand buttons: equal 32 px discs
  const sizes = await toolbar.locator('button[aria-label="Send"], button[aria-label="Ask by voice"], button[aria-label="Attach a text file"]').evaluateAll((els) =>
    els.map((e) => `${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`),
  );
  expect(sizes).toEqual(["32x32", "32x32", "32x32"]);
}

async function noSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

async function shot(target: Page | Locator, name: string) {
  if (!SHOTS) return;
  const page = "page" in target ? target.page() : target;
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  await target.screenshot({ path: `${SHOTS}/${name}.png` });
}

for (const theme of ["light", "dark"] as const) {
  test(`page (${theme}): one toolbar row, quiet send that explains itself, dark send with text`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await fakeMic(page);
    await mount(<AskMyteHarness theme={theme} />);
    const composer = page.locator('[data-composer="page"]');
    const box = page.getByRole("textbox", { name: "Ask Pip" });
    await expect(box).toHaveAttribute("placeholder", "Ask Pip anything…");
    await expect(composer.getByRole("button", { name: /^Look in: All of Mytheus/ })).toBeVisible();
    await oneRow(composer);
    await shot(composer, `composer-page-${theme}`);
    await axe(page);

    // Empty: Send is quiet but pressable, and says why it did nothing.
    const send = composer.getByRole("button", { name: "Send" });
    await expect(send).toBeEnabled();
    await expect(send).not.toHaveAttribute("data-ready", "");
    await send.click();
    await expect(page.getByRole("status").filter({ hasText: "Type a question first" })).toBeVisible();
    await expect(box).toBeFocused();
    await page.keyboard.type("What do I owe this week?");
    await expect(send).toHaveAttribute("data-ready", "");
    await expect(page.getByRole("status").filter({ hasText: "Type a question first" })).toHaveCount(0);
    await shot(composer, `composer-page-typed-${theme}`);
    await axe(page);
  });

  test(`sheet (${theme}): page-scoped as This meeting, clear goes back to all, nothing wraps`, async ({ mount, page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await fakeMic(page);
    await mount(<AskMyteHarness view="sheet" theme={theme} />);
    await page.getByRole("button", { name: "Ask about this meeting" }).click();
    const sheet = page.getByRole("dialog", { name: "Ask Pip" });
    const composer = sheet.locator('[data-composer="sheet"]');
    const scopeBtn = composer.getByRole("button", { name: /^Look in: This meeting: Feature Update - Backend/ });
    await expect(scopeBtn).toHaveText("This meeting");
    await expect(sheet.getByRole("textbox", { name: "Ask Pip" })).toHaveAttribute("placeholder", "Ask about Feature Update - Backend…");
    await oneRow(composer);
    await shot(sheet, `composer-sheet-${theme}`);
    await axe(page);
    await composer.getByRole("button", { name: /^Clear This meeting/ }).click();
    await expect(composer.getByRole("button", { name: /^Look in: All of Mytheus/ })).toBeFocused();
    await expect(sheet.getByRole("textbox", { name: "Ask Pip" })).toHaveAttribute("placeholder", "Ask Pip anything…");
    await oneRow(composer);
  });
}

test("phone width (390): one row, no sideways scroll, a long person name truncates", async ({ mount, page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fakeMic(page);
  await mount(<AskMyteHarness />);
  const composer = page.locator('[data-composer="page"]');
  await oneRow(composer);
  await noSideScroll(page);
  await shot(page, "composer-phone");
  // Scoped to a person at phone width: still one row.
  await composer.getByRole("button", { name: /^Look in:/ }).click();
  await page.getByRole("menuitemradio", { name: "A person" }).click();
  await page.getByRole("combobox", { name: "Search people" }).fill("Samar");
  await page.keyboard.press("Enter");
  await expect(composer.getByRole("button", { name: /^Look in: Person: Samar Rihan/ })).toHaveText("Samar Rihan");
  await oneRow(composer);
  await noSideScroll(page);
  await shot(page, "composer-phone-person");
  await axe(page);
});

test("scope menu: keyboard only, a check on the current scope, Escape returns focus, a person scope sends", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fakeMic(page);
  const bodies = await mockStream(page);
  await mount(<AskMyteHarness />);
  const composer = page.locator('[data-composer="page"]');
  const box = page.getByRole("textbox", { name: "Ask Pip" });
  const scopeBtn = composer.getByRole("button", { name: /^Look in:/ });

  // Tab order: the field, the scope, attach (not a tab stop: the file input is hidden), mic, send.
  await box.focus();
  await page.keyboard.press("Tab");
  await expect(scopeBtn).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(composer.getByRole("button", { name: "Attach a text file" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(composer.getByRole("button", { name: "Ask by voice" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(composer.getByRole("button", { name: "Send" })).toBeFocused();

  // Enter opens the menu on the current choice, checked.
  await scopeBtn.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu", { name: "Where to look" });
  await expect(menu).toBeVisible();
  await expect(scopeBtn).toHaveAttribute("aria-expanded", "true");
  const all = menu.getByRole("menuitemradio", { name: "All of Mytheus" });
  await expect(all).toBeFocused();
  await expect(all).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitemradio", { name: "A meeting" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(menu.getByRole("menuitemradio", { name: "As of a date" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(all).toBeFocused();
  await shot(page, "composer-menu-open");
  await axe(page);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(scopeBtn).toBeFocused();

  // Space opens it too; a person, picked from its picker.
  await page.keyboard.press("Space");
  await expect(menu).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  const picker = page.getByRole("dialog", { name: "Ask about a person" });
  await expect(picker).toBeVisible();
  await page.keyboard.type("Samar");
  await page.keyboard.press("Enter");
  await expect(picker).toHaveCount(0);
  await expect(box).toBeFocused();
  await expect(scopeBtn).toHaveText("Samar Rihan");
  await expect(box).toHaveAttribute("placeholder", "Ask about Samar Rihan…");
  await oneRow(composer);
  await shot(composer, "composer-person");

  // The menu shows the person scope checked.
  await scopeBtn.click();
  await expect(menu.getByRole("menuitemradio", { name: "A person" })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");

  await box.fill("What does Samar owe me?");
  await page.keyboard.press("Enter");
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]!.scope.kind).toBe("person");
  expect(bodies[0]!.scope.person_id).toBe("55555555-5555-4555-8555-555555555555");

  // The clear goes back to everything.
  await composer.getByRole("button", { name: /^Clear Samar Rihan/ }).click();
  await expect(scopeBtn).toHaveText("All of Mytheus");
  await expect(box).toHaveAttribute("placeholder", "Ask a follow-up…");
});

test("attachments sit above the field, not in the toolbar", async ({ mount, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await fakeMic(page);
  await mount(<AskMyteHarness />);
  await page.locator('input[type="file"]').setInputFiles({ name: "pricing-notes.md", mimeType: "text/markdown", buffer: Buffer.from("# Pricing\nNew tiers on 1 December.") });
  const chips = page.getByRole("list", { name: "Attached to this question" });
  await expect(chips.getByText("pricing-notes.md")).toBeVisible();
  const chipBox = await chips.boundingBox();
  const fieldBox = await page.getByRole("textbox", { name: "Ask Pip" }).boundingBox();
  expect(chipBox!.y + chipBox!.height).toBeLessThanOrEqual(fieldBox!.y + 1);
  await oneRow(page.locator('[data-composer="page"]'));
});
