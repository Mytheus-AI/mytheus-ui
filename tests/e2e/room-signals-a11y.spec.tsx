/* Accessibility and keyboard gate for the a3 room signals (the last word, the agreement check, pick
   up where we stopped). Each surface is mounted in the app's `.mx-app` theme root, light and dark,
   with the server actions and the late-contribution route answered at the edges.

   - no axe violations (WCAG 2.0/2.1 A and AA, colour contrast included) in both themes, the open
     composer and the room's pinned thread included;
   - the Inbox settles both rows in place from the keyboard, with Undo;
   - a written late point is sent with an Idempotency-Key and shows as added;
   - the room pins the open thread, Continue from here folds it and tells the gateway. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { RoomSignalsHarness, type RoomSignalsView } from "./RoomSignalsHarness";
import { RESUME } from "./room-signals-fixture";
import { RoomHarness } from "./RoomHarness";

async function axe(page: Page, include = "main") {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include(include).analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

const VIEWS: RoomSignalsView[] = ["inbox", "after", "after-error", "agreement-owner", "agreement-member", "agreement-pending", "composer"];

for (const theme of ["light", "dark"] as const) {
  for (const view of VIEWS) {
    test(`no axe violations: ${view} (${theme})`, async ({ mount, page }) => {
      await mount(<RoomSignalsHarness view={view} theme={theme} />);
      if (view === "inbox") await expect(page.getByRole("radiogroup").first()).toBeVisible();
      expect(await axe(page)).toEqual([]);
    });
  }

  test(`no axe violations: inbox with the composer open (${theme})`, async ({ mount, page }) => {
    await mount(<RoomSignalsHarness view="inbox" theme={theme} />);
    await page.getByRole("button", { name: "Add your point" }).click();
    await expect(page.getByLabel("Your point", { exact: true })).toBeFocused();
    await page.getByRole("tab", { name: "Record" }).click();
    expect(await axe(page)).toEqual([]);
  });
}

test("the last word: write a point from the Inbox and it shows as added", async ({ mount, page }) => {
  let sent: { key: string | null; body: string | null } | null = null;
  await page.route("**/api/meetings/*/late-contributions", async (route) => {
    const req = route.request();
    const form = req.postData() ?? "";
    sent = { key: await req.headerValue("idempotency-key"), body: /enterprise tier needs/.test(form) ? "ok" : null };
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        contribution: {
          id: "c9",
          meeting_id: "m",
          user_id: "u-sarah",
          author_name: "Sarah Okafor",
          nudge_id: "n",
          decision_id: null,
          at_ms: 754000,
          body: "The enterprise tier needs a yearly price too.",
          has_audio: false,
          audio_duration_ms: null,
          created_at: "2026-11-11T12:00:00Z",
          mine: true,
        },
      }),
    });
  });
  await mount(<RoomSignalsHarness view="inbox" />);
  await page.getByRole("button", { name: "Add your point" }).click();
  // Sending nothing says why instead of sending.
  await page.getByRole("button", { name: "Add your point" }).click();
  await expect(page.getByText("Write your point, or record it.")).toBeVisible();
  await page.getByLabel("Your point", { exact: true }).fill("The enterprise tier needs a yearly price too.");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText("Your point was added to the meeting.")).toBeVisible();
  expect(sent).not.toBeNull();
  expect(sent!.key).toMatch(/^[A-Za-z0-9]{8,}$/);
  expect(sent!.body).toBe("ok");
});

test("the last word: Nothing to add, then Undo", async ({ mount, page }) => {
  await mount(<RoomSignalsHarness view="inbox" />);
  await page.getByRole("button", { name: "Nothing to add" }).click();
  await expect(page.getByText("You said you had nothing to add.")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Nothing to add" })).toBeVisible();
});

test("agreement check: arrows move, Space sends, anonymous by default, Change returns", async ({ mount, page }) => {
  await mount(<RoomSignalsHarness view="inbox" />);
  const group = page.getByRole("radiogroup");
  await expect(group.getByRole("radio")).toHaveCount(3);
  await expect(page.getByText("Anonymous by default: the owner sees totals, never who answered what.")).toBeVisible();
  await group.getByRole("radio", { name: "Support" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: "Have concerns" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByText("You answered")).toBeVisible();
  await expect(page.getByText("Anonymous", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Change" }).click();
  await expect(page.getByRole("radio", { name: "Have concerns" })).toHaveAttribute("aria-checked", "true");
});

test("agreement check: a note with your name", async ({ mount, page }) => {
  await mount(<RoomSignalsHarness view="agreement-member" />);
  await page.getByRole("button", { name: "Add a note or your name first" }).click();
  await page.getByLabel("A note for the owner (optional)").fill("Only if February renewals keep their price.");
  await page.getByText("Add my name").click();
  await expect(page.getByRole("switch", { name: "Add my name" })).toBeChecked();
  await expect(page.getByText(/goes to the decision's owner with your name/)).toBeVisible();
  await page.getByRole("radio", { name: "Have concerns" }).click();
  await expect(page.getByText("With your name", { exact: true })).toBeVisible();
  await expect(page.getByText(/Only if February renewals/)).toBeVisible();
});

test("the owner sees totals and notes, never who answered what", async ({ mount, page }) => {
  await mount(<RoomSignalsHarness view="agreement-owner" />);
  await expect(page.getByText("3 of 5 actually support this")).toBeVisible();
  await expect(page.getByRole("img", { name: "Support: 3, Have concerns: 1, Object: 0, Not answered yet: 1" })).toBeVisible();
  await expect(page.getByText("In the meeting: 2 clearly said yes, 2 hedged, 1 stayed quiet.")).toBeVisible();
  await expect(page.getByText("Unsigned, supports it")).toBeVisible();
});

test("after the meeting: remove your own late point, with Undo", async ({ mount, page }) => {
  await mount(<RoomSignalsHarness view="after" />);
  await expect(page.getByText("Weak agreement")).toBeVisible();
  await expect(page.getByText("1 late contribution")).toBeVisible();
  await page.getByRole("button", { name: "Remove your late contribution" }).click();
  await expect(page.getByText("The partner FAQ needs the new number")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("The partner FAQ needs the new number before it goes out.")).toBeVisible();
});

test("the room pins where the last meeting stopped, and Continue folds it", async ({ mount, page }) => {
  // The CT page is already loaded when the test starts: set the fixture in it before mounting.
  await page.evaluate((p) => {
    (window as unknown as { __resumeFixture: unknown }).__resumeFixture = p;
  }, RESUME);
  await mount(<RoomHarness />);
  await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
  const pin = page.getByRole("region", { name: "Raj was halfway through explaining the migration risk" });
  await expect(pin).toBeVisible();
  await expect(pin.getByText(/the old ledger and the new one disagree/)).toBeVisible();
  await pin.getByRole("button", { name: "Where it stood" }).click();
  await expect(pin.getByText(/Not before the audit closes/)).toBeVisible();
  expect(await axe(page, ".stage-bar")).toEqual([]);
  await pin.getByRole("button", { name: "Continue from here" }).click();
  await expect(pin).toHaveCount(0);
});
