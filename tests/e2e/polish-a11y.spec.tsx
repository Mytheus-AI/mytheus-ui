/* The UI polish pass's accessibility gate: the shared dropdown, the raised-hands queue, the New
   meeting window and the room header (with the calm empty agenda). Real components in a real
   browser, the edges mocked as in playwright-ct.config.ts.

   - Dropdown: APG select-only combobox semantics, the whole keyboard model, typeahead, disabled
     options skipped, click outside, the hidden form input, the visible label, flipping up near
     the bottom, a native modal dialog around it (Escape closes the list, not the dialog), the
     bottom sheet on a phone, and no axe violations open, in both themes.
   - Hands: the queue in order, the host's Call on and Lower through the meeting link, the live
     region, the H shortcut and your control's raised state, and no axe violations.
   - New meeting: two columns on a wide screen, one on a phone, the footer always in view with
     the mode's action, the title error, the member picker's states, and no axe violations.
   - Room header: the in-call chip on the title's line at 1440 and 360 px with no sideways scroll;
     no agenda is one slim line with the host's Add agenda. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Locator, Page } from "@playwright/test";
import { DropdownHarness } from "./DropdownHarness";
import { NewMeetingHarness } from "./NewMeetingHarness";
import { RoomHarness } from "./RoomHarness";
import { MEETING_ID } from "./fixtures";

async function axe(page: Page) {
  // Contrast is judged at rest, after the 150 to 250 ms entrances have settled.
  await page.waitForTimeout(350);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(".mx-app").analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

async function push(page: Page, event: string, payload: unknown) {
  await page.evaluate(([e, meetingId, p]) => window.__gateway!.push(e as string, { meetingId, payload: p }), [event, MEETING_ID, payload] as const);
}

async function box(l: Locator) {
  const b = await l.boundingBox();
  if (!b) throw new Error("not on screen");
  return b;
}

/* ---------------------------------------------------------------- the dropdown */

test.describe("dropdown", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`open, it is a labelled listbox with no axe violations (${theme})`, async ({ mount, page }) => {
      await mount(<DropdownHarness theme={theme} />);
      const owner = page.getByRole("combobox", { name: "Owner" });
      await expect(owner).toHaveAttribute("aria-haspopup", "listbox");
      await expect(owner).toHaveAttribute("aria-expanded", "false");
      await expect(owner).toHaveAccessibleDescription("Who carries this item.");
      await owner.click();
      await expect(owner).toHaveAttribute("aria-expanded", "true");
      const list = page.getByRole("listbox", { name: "Owner" });
      await expect(list).toBeVisible();
      await expect(owner).toHaveAttribute("aria-controls", (await list.getAttribute("id"))!);
      await expect(list.getByRole("group", { name: "In this meeting" })).toBeVisible();
      await expect(list.getByRole("option", { name: /Pricing desk/ })).toHaveAttribute("aria-disabled", "true");
      await expect(list.getByRole("option", { name: "No owner" })).toHaveAttribute("aria-selected", "true");
      expect(await axe(page)).toEqual([]);
    });
  }

  test("the keyboard: arrows skip disabled, Home, End, typeahead, Enter, Space, Escape, Tab", async ({ mount, page }) => {
    await mount(<DropdownHarness />);
    const owner = page.getByRole("combobox", { name: "Owner" });
    await owner.focus();
    const active = async () => {
      const id = await owner.getAttribute("aria-activedescendant");
      return id ? (await page.locator(`[id="${id}"]`).textContent())?.trim() : null;
    };

    await page.keyboard.press("ArrowDown");
    await expect(owner).toHaveAttribute("aria-expanded", "true");
    expect(await active()).toBe("No owner");
    await page.keyboard.press("ArrowDown");
    expect(await active()).toMatch(/^Raj Patel/);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    expect(await active()).toBe("Peter Hall");
    await page.keyboard.press("End");
    expect(await active()).toMatch(/^Default - MacBook/);
    await page.keyboard.press("Home");
    expect(await active()).toBe("No owner");
    // Type to jump: "p" lands on Priya, "p" again skips the disabled desk to Peter.
    await page.keyboard.type("p");
    expect(await active()).toMatch(/^Priya Nair/);
    await page.waitForTimeout(700);
    await page.keyboard.type("p");
    expect(await active()).toBe("Peter Hall");
    await page.keyboard.press("Enter");
    await expect(owner).toHaveAttribute("aria-expanded", "false");
    await expect(owner).toHaveText("Peter Hall");
    await expect(owner).toBeFocused();

    // Escape closes without changing.
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Escape");
    await expect(owner).toHaveAttribute("aria-expanded", "false");
    await expect(owner).toHaveText("Peter Hall");

    // Space picks; the hidden input carries the value into the form.
    await page.keyboard.press(" ");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press(" ");
    await expect(owner).toHaveText(/Raj Patel/);
    await page.getByRole("button", { name: "Save owner" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved: u-raj");

    // Tab picks the active option and moves on.
    await owner.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Tab");
    await expect(owner).toHaveText(/Priya Nair/);
    await expect(owner).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("button", { name: "Save owner" })).toBeFocused();
  });

  test("a click outside closes it; a long label truncates with its full text as a title", async ({ mount, page }) => {
    await mount(<DropdownHarness />);
    const owner = page.getByRole("combobox", { name: "Owner" });
    await owner.click();
    await page.getByRole("option", { name: /Default - MacBook/ }).click();
    await expect(owner).toHaveAttribute("title", /far too long to fit/);
    const value = owner.locator(".dd-value");
    expect(await value.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await owner.click();
    await page.mouse.click(1200, 400);
    await expect(owner).toHaveAttribute("aria-expanded", "false");
  });

  test("near the bottom of the screen it flips up and stays in the viewport", async ({ mount, page }) => {
    await mount(<DropdownHarness />);
    const length = page.getByRole("combobox", { name: "Length" });
    await length.click();
    const list = page.getByRole("listbox", { name: "Length" });
    const t = await box(length);
    const l = await box(list);
    expect(l.y + l.height).toBeLessThanOrEqual(t.y + 1);
    expect(l.y).toBeGreaterThanOrEqual(0);
  });

  test("inside a native modal dialog: options work, Escape closes the list and not the dialog", async ({ mount, page }) => {
    await mount(<DropdownHarness />);
    await page.getByRole("button", { name: "Open the dialog" }).click();
    const dialog = page.getByRole("dialog", { name: "Plan the follow-up" });
    const length = dialog.getByRole("combobox", { name: "Follow-up length" });
    await length.click();
    await expect(page.getByRole("listbox", { name: "Follow-up length" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(length).toHaveAttribute("aria-expanded", "false");
    await expect(dialog).toBeVisible();
    await length.click();
    await page.getByRole("option", { name: "90 min" }).click();
    await expect(length).toHaveText("90 min");
    await expect(dialog).toBeVisible();
  });

  test("on a phone it opens as a bottom sheet", async ({ mount, page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mount(<DropdownHarness />);
    await page.getByRole("combobox", { name: "Owner" }).click();
    const list = page.getByRole("listbox", { name: "Owner" });
    await expect(list).toBeVisible();
    const sheet = await box(page.locator(".dd-panel.is-sheet"));
    expect(Math.round(sheet.y + sheet.height)).toBe(812);
    expect(Math.round(sheet.width)).toBe(375);
    const row = await box(list.getByRole("option", { name: "No owner" }));
    expect(row.height).toBeGreaterThanOrEqual(48);
    await list.getByRole("option", { name: /Priya Nair/ }).click();
    await expect(page.getByRole("combobox", { name: "Owner" })).toHaveText(/Priya Nair/);
  });
});

/* ---------------------------------------------------------------- raised hands */

async function joined(page: Page) {
  await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
  // The gateway's room-state (the hands queue as stored) lands just after the join.
  await page.waitForTimeout(120);
}

async function twoHands(page: Page) {
  const t = Date.now();
  await push(page, "hand", { userId: "u-raj", raised: true, at: new Date(t - 95_000).toISOString(), raisedAt: new Date(t - 95_000).toISOString(), byUserId: "u-raj", reason: "raised" });
  await push(page, "hand", { userId: "u-priya", raised: true, at: new Date(t - 20_000).toISOString(), raisedAt: new Date(t - 20_000).toISOString(), byUserId: "u-priya", reason: "raised" });
}

test.describe("hands", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`the host sees the queue in order and calls on someone (${theme})`, async ({ mount, page }) => {
      await mount(<RoomHarness theme={theme} />);
      await joined(page);
      await twoHands(page);
      // A gentle word for the host, and the live region for everyone.
      await expect(page.getByRole("status").filter({ hasText: "Priya Nair raised their hand, 2nd in line." })).toBeAttached();
      const chip = page.getByRole("button", { name: /Hands raised: 2\. Raj Patel is first/ });
      await expect(chip).toBeVisible();
      await chip.click();
      await expect(chip).toHaveAttribute("aria-expanded", "true");
      const queue = page.getByRole("region", { name: "Hands raised" });
      const rows = queue.getByRole("listitem");
      await expect(rows).toHaveCount(2);
      await expect(rows.nth(0)).toContainText("Raj Patel");
      await expect(rows.nth(0)).toContainText("Waiting 1 min");
      await expect(rows.nth(1)).toContainText("Priya Nair");
      expect(await axe(page)).toEqual([]);

      await queue.getByRole("button", { name: "Call on Raj Patel" }).click();
      await expect
        .poll(() =>
          page.evaluate(() =>
            window.__gatewayLog!.some((e) => {
              const p = e.payload as { userId?: string; reason?: string; raised?: boolean };
              return e.event === "hand" && p.userId === "u-raj" && p.reason === "called" && p.raised === false;
            }),
          ),
        )
        .toBe(true);
      await expect(page.getByRole("status").filter({ hasText: /You called on Raj Patel\. 1 hand up\./ })).toBeAttached();
      await expect(queue.getByRole("listitem")).toHaveCount(1);
      await queue.getByRole("button", { name: "Lower Priya Nair's hand" }).click();
      await expect(chip).toBeHidden();
    });
  }

  test("H raises your hand: amber control with your place, a badge on your tile, Lower from the queue", async ({ mount, page }) => {
    await mount(<RoomHarness />);
    await joined(page);
    await twoHands(page);
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("h");
    const control = page.getByRole("button", { name: "Raise hand" });
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(control).toHaveAccessibleDescription("Your hand is up, 3 in line");
    await expect(page.getByText("Hand raised. You are 3rd in line.")).toBeVisible();
    await expect(page.getByRole("group", { name: /you, .*hand raised, 3rd in line/ }).first()).toBeVisible();
    await page.getByRole("button", { name: /Hands raised: 3/ }).click();
    await page.getByRole("region", { name: "Hands raised" }).getByRole("button", { name: "Lower", exact: true }).click();
    await expect(control).toHaveAttribute("aria-pressed", "false");
  });

  test("someone who does not host sees the queue but no Call on", async ({ mount, page }) => {
    await mount(<RoomHarness asHost={false} />);
    await joined(page);
    await twoHands(page);
    await page.getByRole("button", { name: /Hands raised: 2/ }).click();
    const queue = page.getByRole("region", { name: "Hands raised" });
    await expect(queue.getByRole("listitem")).toHaveCount(2);
    await expect(queue.getByRole("button", { name: /Call on/ })).toHaveCount(0);
    // No toast for a non-host; the live region still says it.
    await expect(page.getByText("Priya Nair raised their hand, 2nd in line", { exact: true })).toHaveCount(0);
  });

  test("being called on tells you to go ahead", async ({ mount, page }) => {
    await mount(<RoomHarness asHost={false} />);
    await joined(page);
    await push(page, "hand", { userId: "u-maya", raised: true, at: new Date().toISOString(), raisedAt: new Date().toISOString(), byUserId: "u-maya", reason: "raised" });
    await push(page, "hand", { userId: "u-maya", raised: false, at: new Date().toISOString(), byUserId: "u-raj", reason: "called" });
    await expect(page.getByText("Raj Patel called on you. Go ahead.")).toBeVisible();
  });

  test("a reconnect re-reads the queue from the room state", async ({ mount, page }) => {
    await mount(<RoomHarness />);
    await joined(page);
    await twoHands(page);
    await push(page, "room-state", { locks: [], hands: [{ userId: "u-priya", at: new Date().toISOString() }] });
    await expect(page.getByRole("button", { name: /Hands raised: 1\. Priya Nair is first/ })).toBeVisible();
  });
});

/* ---------------------------------------------------------------- New meeting */

test.describe("new meeting window", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`no axe violations, open and with a dropdown open (${theme})`, async ({ mount, page }) => {
      await page.route("**/api/meeting-precheck", (r) => r.fulfill({ status: 503, body: "{}" }));
      await mount(<NewMeetingHarness theme={theme} />);
      await page.getByRole("button", { name: "New meeting" }).click();
      const dialog = page.getByRole("dialog", { name: "New meeting" });
      await expect(dialog).toBeVisible();
      await expect(page.getByLabel("Title")).toBeFocused();
      expect(await axe(page)).toEqual([]);
      await dialog.getByRole("combobox", { name: "Meeting type" }).click();
      await expect(page.getByRole("listbox", { name: "Meeting type" })).toBeVisible();
      expect(await axe(page)).toEqual([]);
    });
  }

  test("two columns on a wide screen, the footer and its action always in view", async ({ mount, page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mount(<NewMeetingHarness />);
    await page.getByRole("button", { name: "New meeting" }).click();
    const dialog = page.getByRole("dialog", { name: "New meeting" });
    const what = await box(dialog.getByRole("region", { name: "What" }));
    const people = await box(dialog.getByRole("region", { name: /People/ }));
    expect(people.x).toBeGreaterThan(what.x + what.width - 1);
    const start = dialog.getByRole("button", { name: "Start now" }).last();
    await expect(start).toBeInViewport();
    await dialog.getByRole("radio", { name: "Schedule" }).click();
    await expect(dialog.getByRole("button", { name: "Schedule", exact: true })).toBeInViewport();
    await expect(dialog.getByLabel("Date")).toBeVisible();
    // Keyboard on the When switch: arrows move between the two.
    await dialog.getByRole("radio", { name: "Schedule" }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.getByRole("radio", { name: "Start now" })).toBeFocused();
    await expect(dialog.getByRole("radio", { name: "Start now" })).toHaveAttribute("aria-checked", "true");
  });

  test("one flowing column on a phone, the footer pinned, no sideways scroll", async ({ mount, page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mount(<NewMeetingHarness />);
    await page.getByRole("button", { name: "New meeting" }).click();
    const dialog = page.getByRole("dialog", { name: "New meeting" });
    const what = await box(dialog.getByRole("region", { name: "What" }));
    const when = await box(dialog.getByRole("region", { name: "When" }));
    expect(Math.abs(what.x - when.x)).toBeLessThan(2);
    expect(when.y).toBeGreaterThan(what.y);
    await expect(dialog.getByRole("button", { name: "Start now" }).last()).toBeInViewport();
    await dialog.getByRole("checkbox", { name: /Priya Nair/ }).scrollIntoViewIfNeeded();
    await dialog.getByRole("checkbox", { name: /Priya Nair/ }).click();
    await expect(dialog.getByRole("button", { name: "Start now" }).last()).toBeInViewport();
    await expect(dialog.getByText("Starts now, 30 min, 2 people")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("a missing title is said at the footer and marked on the field; Escape in a list keeps the window", async ({ mount, page }) => {
    await mount(<NewMeetingHarness />);
    await page.getByRole("button", { name: "New meeting" }).click();
    const dialog = page.getByRole("dialog", { name: "New meeting" });
    await dialog.getByRole("button", { name: "Start now" }).last().click();
    await expect(dialog.getByRole("alert")).toHaveText("Give the meeting a title.");
    await expect(dialog.getByLabel("Title")).toHaveAttribute("aria-invalid", "true");
    await dialog.getByLabel("Title").fill("Weekly sync");
    await expect(dialog.getByRole("alert")).toHaveCount(0);

    const host = dialog.getByRole("combobox", { name: "Host" });
    await host.click();
    await page.keyboard.press("Escape");
    await expect(host).toHaveAttribute("aria-expanded", "false");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("members that could not load, and an empty workspace, each say so", async ({ mount, page }) => {
    const failed = await mount(<NewMeetingHarness members={null} templates={null} />);
    await page.getByRole("button", { name: "New meeting" }).click();
    await expect(page.getByText("Members couldn’t be loaded. You can invite people after creating it.")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Meeting type" })).toBeDisabled();
    await expect(page.getByText("Meeting types couldn't be loaded. You can still set everything by hand.")).toBeVisible();
    await failed.unmount();
    await mount(<NewMeetingHarness members={[]} />);
    await page.getByRole("button", { name: "New meeting" }).click();
    await expect(page.getByText(/No one else is in this workspace yet/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Invite people to the workspace" })).toBeVisible();
  });
});

/* ---------------------------------------------------------------- room header and empty agenda */

test.describe("room header", () => {
  for (const width of [1440, 360]) {
    test(`the in-call chip sits on the title's line at ${width} px`, async ({ mount, page }) => {
      await page.setViewportSize({ width, height: 800 });
      await mount(<RoomHarness />);
      await joined(page);
      const title = page.getByRole("heading", { level: 1, name: "Q4 launch review" });
      const chip = page.getByRole("img", { name: /^2 in call, 4 invited$/ });
      await expect(chip).toBeVisible();
      const t = await box(title);
      const c = await box(chip);
      const tMid = t.y + t.height / 2;
      expect(Math.abs(c.y + c.height / 2 - tMid)).toBeLessThan(6);
      expect(c.x).toBeGreaterThan(t.x);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(await axe(page)).toEqual([]);
    });
  }

  test("no agenda is one slim line with the host's Add agenda, which opens a dialog", async ({ mount, page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await mount(<RoomHarness emptyAgenda />);
    await joined(page);
    const line = page.locator(".sb-empty");
    await expect(line.getByText("No agenda")).toBeVisible();
    const add = page.getByRole("button", { name: "Add agenda" });
    await expect(add).toBeVisible();
    const chip = await box(line.locator(".sb-empty-chip"));
    expect(chip.height).toBeLessThanOrEqual(32);
    await add.click();
    const dialog = page.getByRole("dialog", { name: "Add an agenda" });
    await expect(dialog.getByLabel("Items")).toBeFocused();
    await dialog.getByLabel("Items").fill("Beta readiness\nLaunch date");
    await expect(dialog.getByText("2 items")).toBeVisible();
    expect(await axe(page)).toEqual([]);
    await dialog.getByRole("button", { name: "Add agenda" }).click();
    // The test server refuses the write: the reason is said in the dialog.
    await expect(dialog.getByRole("alert")).toHaveText("Not available in this test.");
  });

  test("someone who does not host sees no Add agenda", async ({ mount, page }) => {
    await mount(<RoomHarness emptyAgenda asHost={false} />);
    await joined(page);
    await expect(page.locator(".sb-empty").getByText("No agenda")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add agenda" })).toHaveCount(0);
  });
});
