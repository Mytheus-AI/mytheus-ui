/* Accessibility and keyboard gate for recording playback (polish wave 3): the Recording card on a
   meeting's page in every state, and the public clip player. Mounted in the app's `.mx-app` theme
   root, light and dark, with the server actions answered at the edges (playwright-ct.config.ts)
   and the recording's segment URLs served a real 12-second test video.

   - no axe violations (WCAG 2.0/2.1 A and AA, colour contrast included) in both themes;
   - the transcript seeks the player, the playing line is marked, the seek slider moves 5 s per arrow;
   - off-the-record stretches show in the transcript and in the player;
   - a clip is made from a line, checked (10 minutes, never across off the record) and saved;
   - a clip is shared (with its video) and deleted, from the keyboard;
   - 360 px wide: no horizontal page scroll. */

import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { RecordingHarness, type RecordingView } from "./RecordingHarness";

const VIDEO = fs.readFileSync(path.resolve(__dirname, "fixtures/recording.mp4"));

async function serveVideo(page: Page) {
  await page.route("https://recordings.test/**", (route) =>
    route.fulfill({ status: 200, contentType: "video/mp4", body: VIDEO, headers: { "Accept-Ranges": "bytes" } }),
  );
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).include("main").analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
}

const VIEWS: RecordingView[] = [
  "ready",
  "processing",
  "off",
  "storage",
  "consent",
  "failed",
  "not-recorded",
  "error",
  "no-transcript",
  "confidential-guest",
  "clip-video",
  "clip-words",
];

for (const theme of ["light", "dark"] as const) {
  for (const view of VIEWS) {
    test(`no axe violations: ${view} (${theme})`, async ({ mount, page }) => {
      await serveVideo(page);
      await mount(<RecordingHarness view={view} theme={theme} />);
      await expect(page.locator("main")).toBeVisible();
      expect(await axe(page)).toEqual([]);
    });
  }
}

test("every state says what is going on", async ({ mount, page }) => {
  const copy: [RecordingView, string][] = [
    ["off", "Recording is off for this workspace"],
    ["storage", "Recording is not connected yet"],
    ["consent", "No recording, because not everyone agreed"],
    ["processing", "The recording is being processed"],
    ["failed", "The recording could not be saved"],
    ["not-recorded", "This call was not recorded"],
    ["error", "The recording could not be loaded"],
  ];
  for (const [view, text] of copy) {
    const c = await mount(<RecordingHarness view={view} />);
    await expect(page.getByText(text)).toBeVisible();
    await c.unmount();
  }
});

test("the transcript seeks the player and marks the playing line", async ({ mount, page }) => {
  await serveVideo(page);
  await mount(<RecordingHarness view="ready" />);
  const seek = page.getByRole("slider", { name: "Seek" });
  await expect(seek).toBeVisible();
  await page.getByRole("button", { name: /Play from 4 seconds, Raj Patel/ }).click();
  await expect(seek).toHaveAttribute("aria-valuetext", /^4 seconds/);
  await expect(page.locator("li[aria-current='true']")).toContainText("Eighteen dollars a seat");
  // A line after the off-the-record gap plays from the second recorded stretch.
  await page.getByRole("button", { name: /Play from 31 seconds, Priya Nair/ }).click();
  await expect(seek).toHaveAttribute("aria-valuetext", /^31 seconds/);
});

test("the seek slider moves 5 seconds per arrow and the player has named controls", async ({ mount, page }) => {
  await serveVideo(page);
  await mount(<RecordingHarness view="ready" />);
  const seek = page.getByRole("slider", { name: "Seek" });
  await seek.focus();
  await page.keyboard.press("ArrowRight");
  await expect(seek).toHaveAttribute("aria-valuetext", /^5 seconds/);
  await page.keyboard.press("ArrowRight");
  await expect(seek).toHaveAttribute("aria-valuetext", /^10 seconds/);
  await page.keyboard.press("ArrowLeft");
  await expect(seek).toHaveAttribute("aria-valuetext", /^5 seconds/);
  for (const name of ["Play", "Back 10 seconds", "Forward 10 seconds", "Captions", "Full screen"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("combobox", { name: "Playback speed" })).toBeVisible();
  const captions = page.getByRole("button", { name: "Captions", exact: true });
  await expect(captions).toHaveAttribute("aria-pressed", "true");
  await captions.press("Enter");
  await expect(captions).toHaveAttribute("aria-pressed", "false");
});

test("off the record shows in the transcript and the player", async ({ mount, page }) => {
  await serveVideo(page);
  await mount(<RecordingHarness view="ready" />);
  await expect(page.getByText("Nothing from this stretch was kept.")).toBeVisible();
  await expect(page.getByText(/Off the record from 0:12 to 0:30/)).toBeVisible();
});

test("make a clip from a line, with the rules checked as you type", async ({ mount, page }) => {
  await serveVideo(page);
  await mount(<RecordingHarness view="ready" />);
  await page.getByRole("button", { name: /Clip this line, 8 seconds/ }).click();
  const title = page.getByLabel("Title");
  await expect(title).toBeFocused();
  await expect(title).toHaveValue("Agreed. Priya, can you draft the announcement");
  const end = page.getByLabel("End", { exact: true });
  await end.fill("0:40");
  await expect(page.getByText("A clip cannot include a part of the meeting that was off the record.").first()).toBeVisible();
  await end.fill("11:00");
  await expect(page.getByText("A clip can be at most 10 minutes long.").first()).toBeVisible();
  await end.fill("0:11");
  await expect(page.getByText("3 s clip")).toBeVisible();
  await title.fill("Who drafts the announcement");
  await page.getByRole("button", { name: "Save clip" }).click();
  await expect(page.getByText("Clip saved")).toBeVisible();
  await expect(page.getByText("Who drafts the announcement")).toBeVisible();
});

test("Escape cancels a new clip", async ({ mount, page }) => {
  await serveVideo(page);
  await mount(<RecordingHarness view="off" />);
  await page.getByRole("button", { name: "New clip" }).click();
  await expect(page.getByLabel("Title")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "New clip" })).toHaveCount(0);
});

test("share a clip with its video, then delete it, from the keyboard", async ({ mount, page }) => {
  await serveVideo(page);
  await mount(<RecordingHarness view="ready" />);
  const share = page.getByRole("button", { name: "Share Team plan price" });
  await share.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Share this clip" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("With video")).toBeVisible();
  const withVideo = dialog.getByRole("checkbox", { name: /Include the video/ });
  await expect(withVideo).toBeEnabled();
  await withVideo.check();
  await dialog.getByRole("button", { name: "Create link" }).click();
  await expect(page.getByText("Clip link created")).toBeVisible();
  await expect(dialog.getByText("app.example/s/clip-token-abc")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(share).toBeFocused();

  await page.getByRole("button", { name: "Delete Team plan price" }).click();
  await expect(page.getByRole("button", { name: "Keep" })).toBeFocused();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Clip deleted")).toBeVisible();
  await expect(page.getByText("No clips yet.")).toBeVisible();
});

test("a confidential meeting's clips are shared only by the host", async ({ mount, page }) => {
  await mount(<RecordingHarness view="confidential-guest" />);
  await page.getByRole("button", { name: "Share Team plan price" }).click();
  await expect(page.getByText("Only its host can share clips from it.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create link" })).toHaveCount(0);
});

test("the public clip player seeks from a line and says when there is no video", async ({ mount, page }) => {
  await serveVideo(page);
  const c = await mount(<RecordingHarness view="clip-video" />);
  await page.getByRole("button", { name: /Play from 4 seconds, Someone/ }).click();
  await expect(page.locator("li[aria-current='true']")).toContainText("Agreed. Priya");
  await c.unmount();
  await mount(<RecordingHarness view="clip-words" />);
  await expect(page.getByText("The video for this clip is not available")).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0);
});

for (const width of [360, 768, 1600]) {
  test(`no horizontal scroll at ${width}px`, async ({ mount, page }) => {
    await serveVideo(page);
    await page.setViewportSize({ width, height: 900 });
    await mount(<RecordingHarness view="ready" />);
    await page.getByRole("button", { name: /Clip this line, 8 seconds/ }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
