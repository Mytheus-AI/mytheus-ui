/* Off the record and live caption translation in the room (polish program wave 3), in a real
   browser with the gateway, Clerk and the server actions mocked at the edges:

   - the host takes the meeting off the record from the control bar: a room-wide banner says since
     when and that agents are paused, captions say they are paused, the agent chip says so, and the
     banner's "Back on the record" ends it; no axe violations in light and dark while it runs;
   - anyone else asks: the request goes through the meeting link, and the host sees who asked with
     "Go off the record" and "Not now";
   - the caption language picker opens by keyboard, is a labelled radio group, and a translated
     final replaces its line with a "Translated" marker that shows the original on press; a budget
     refusal is a calm notice; no axe violations with the picker open;
   - "What is recorded" opens your receipt in a dialog. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { RoomHarness } from "./RoomHarness";
import { MEETING_ID } from "./fixtures";

const CHUNK = "77777777-7777-4777-8777-777777777777";

async function joined(page: Page) {
  await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
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

async function pushCaption(page: Page) {
  await page.evaluate(
    ([meetingId, chunkId]) => {
      window.__gateway!.push("caption", {
        meetingId,
        payload: { chunkId, speakerId: "u-raj", startMs: 1000, endMs: 3000, text: "We close the Q3 budget at 120k.", isFinal: true, confidence: 0.97 },
      });
    },
    [MEETING_ID, CHUNK],
  );
  await expect(page.getByText("We close the Q3 budget at 120k.")).toBeVisible();
}

for (const theme of ["light", "dark"] as const) {
  test(`the host takes the meeting off the record and back (${theme})`, async ({ mount, page }) => {
    await mount(<RoomHarness theme={theme} />);
    await joined(page);
    await pushCaption(page);

    const control = page.getByRole("button", { name: "Off the record", exact: true });
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await control.focus();
    await page.keyboard.press("Enter");

    const banner = page.getByRole("status").filter({ hasText: /Off the record since/ });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Agents are paused and nothing is transcribed or kept.");
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Captions are paused. The meeting is off the record")).toBeVisible();
    await expect(page.getByText("Paused, off the record").first()).toBeVisible();
    expect(await axe(page)).toEqual([]);

    await banner.getByRole("button", { name: "Back on the record" }).click();
    await expect(banner).toBeHidden();
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("We close the Q3 budget at 120k.")).toBeVisible();
  });
}

test("a room-wide change from the gateway reaches everyone, and a joiner sees the current state", async ({ mount, page }) => {
  await mount(<RoomHarness asHost={false} />);
  await joined(page);
  await page.evaluate((meetingId) => {
    window.__gateway!.push("off-record", {
      meetingId,
      payload: { active: true, segmentId: "s1", startedAt: new Date().toISOString(), startedBy: "u-raj", byUserId: "u-raj", at: new Date().toISOString() },
    });
  }, MEETING_ID);
  const banner = page.getByRole("status").filter({ hasText: /Off the record since/ });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("Raj Patel took the meeting off the record");
  // Not the host: no way to end it from here.
  await expect(banner.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Off the record", exact: true })).toHaveAttribute("aria-disabled", "true");
});

test("anyone else asks the host, through the meeting link", async ({ mount, page }) => {
  await mount(<RoomHarness asHost={false} />);
  await joined(page);
  const ask = page.getByRole("button", { name: "Ask to go off the record" });
  await ask.click();
  await page.waitForFunction(() => window.__gatewayLog!.some((e) => e.event === "off-record-request"));
  await expect(ask).toHaveAttribute("aria-disabled", "true");
});

test("the host sees who asked, with Go off the record and Not now", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  await joined(page);
  await page.evaluate((meetingId) => {
    window.__gateway!.push("off-record-request", { meetingId, payload: { userId: "u-raj", at: new Date().toISOString() } });
  }, MEETING_ID);
  const prompt = page.getByRole("alert").filter({ hasText: "asks to go off the record" });
  await expect(prompt).toContainText("Raj Patel");
  expect(await axe(page)).toEqual([]);
  await prompt.getByRole("button", { name: "Not now" }).click();
  await page.waitForFunction(() => window.__gatewayLog!.some((e) => e.event === "off-record-answer"));
  await expect(prompt).toBeHidden();

  await page.evaluate((meetingId) => {
    window.__gateway!.push("off-record-request", { meetingId, payload: { userId: "u-raj", at: new Date().toISOString() } });
  }, MEETING_ID);
  await page.getByRole("button", { name: "Go off the record" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Off the record since/ })).toContainText("when Raj Patel asked");
});

for (const theme of ["light", "dark"] as const) {
  test(`the caption language picker and a translated line (${theme})`, async ({ mount, page }) => {
    await mount(<RoomHarness theme={theme} />);
    await joined(page);
    await pushCaption(page);

    const trigger = page.getByRole("button", { name: "Caption language: as spoken" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const group = page.getByRole("group", { name: "Caption language" });
    await expect(group.getByRole("radio", { name: /As spoken/ })).toBeChecked();
    await expect(group.getByRole("radio")).toHaveCount(13);
    expect(await axe(page)).toEqual([]);
    // Choosing closes the picker (focus returns to its button), so click rather than check.
    await group.getByRole("radio", { name: /Spanish/ }).click();
    await page.waitForFunction(() =>
      window.__gatewayLog!.some((e) => e.event === "caption-language" && (e.payload as { language?: string }).language === "es"),
    );
    await expect(page.getByRole("button", { name: "Caption language: Spanish" })).toBeVisible();

    // A translation for another language is not for this viewer; the chosen one replaces the line.
    await page.evaluate(
      ([meetingId, chunkId]) => {
        window.__gateway!.push("caption-translation", { meetingId, payload: { chunkId, language: "fr", status: "translated", text: "Nous clôturons." } });
        window.__gateway!.push("caption-translation", {
          meetingId,
          payload: { chunkId, language: "es", status: "translated", text: "Cerramos el presupuesto del tercer trimestre en 120 mil." },
        });
      },
      [MEETING_ID, CHUNK],
    );
    await expect(page.getByText("Cerramos el presupuesto del tercer trimestre en 120 mil.")).toBeVisible();
    await expect(page.getByText("Nous clôturons.")).toHaveCount(0);
    const marker = page.getByRole("button", { name: "Show what was said" });
    await expect(marker).toContainText("Translated");
    expect(await axe(page)).toEqual([]);
    await marker.click();
    await expect(page.getByText("We close the Q3 budget at 120k.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Show the translation" })).toHaveAttribute("aria-pressed", "true");

    await page.evaluate((meetingId) => {
      window.__gateway!.push("caption-translation", { meetingId, payload: { chunkId: "x", language: "es", status: "budget_denied", text: "" } });
    }, MEETING_ID);
    await expect(page.getByText(/Translation is paused: your workspace's AI budget/)).toBeVisible();
  });
}

test("What is recorded opens your receipt in a dialog", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  await joined(page);
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: /What is recorded/ }).click();
  const dialog = page.getByRole("dialog", { name: "What is recorded" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("You agreed on");
  await expect(dialog).toContainText("You can go off the record");
  expect(await axe(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
