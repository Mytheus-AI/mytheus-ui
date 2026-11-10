/* Visual check for the room's CSS (not a gate): mounts the room harness in its main states and
   saves full-page PNGs at 1600, 1024 and 360 px wide, light and dark, so a stylesheet change can be
   compared before and after. Skipped unless ROOM_SHOTS_DIR is set:

     ROOM_SHOTS_DIR=/tmp/room-before npm run test:a11y -- room-shots

   Timers in the room tick, so compare by eye or with a tolerant pixel diff. */

import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import path from "node:path";
import { RoomHarness } from "./RoomHarness";
import { MEETING_ID } from "./fixtures";

const DIR = process.env.ROOM_SHOTS_DIR;

async function push(page: Page, event: string, payload: unknown) {
  await page.evaluate(([e, meetingId, p]) => window.__gateway!.push(e as string, { meetingId, payload: p }), [event, MEETING_ID, payload] as const);
}

const said = {
  moment_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  why: "You own the launch date, and this moves it.",
  quote: "Let's ship the beta on the second, and I'll send the pricing deck by Friday.",
  speaker_label: "Raj Patel",
  start_ms: 61_200,
  end_ms: 66_900,
};

async function live(page: Page) {
  await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
  const lines = [
    { chunkId: "c1", speakerId: "u-maya", startMs: 40_000, endMs: 45_000, text: "QA finished the regression run this morning." },
    { chunkId: "c2", speakerId: "u-raj", startMs: 61_000, endMs: 64_000, text: "Let's ship the beta on the second." },
    { chunkId: "c3", speakerId: "u-raj", startMs: 64_200, endMs: 66_800, text: "And I'll send the pricing deck by Friday." },
  ];
  for (const l of lines) await push(page, "caption", { ...l, isFinal: true, confidence: 0.95 });
  await push(page, "agent-candidate", {
    windowId: `${MEETING_ID}:60000`,
    agent: "DecisionAgent",
    kind: "decision_candidate",
    candidates: [{ id: "22222222-2222-4222-8222-222222222222", content: "Ship the beta on 2 December", confidence: 0.86, rationale: "QA signed off", ...said }],
  });
  await push(page, "agent-candidate", {
    windowId: `${MEETING_ID}:60000`,
    agent: "ActionAgent",
    kind: "action_candidate",
    candidates: [{ id: "66666666-6666-4666-8666-666666666666", content: "Raj sends the pricing deck", confidence: 0.9, assignee_id: null, due_date: "2026-11-14", ...said }],
  });
  await push(page, "agent-note", {
    windowId: `${MEETING_ID}:60000`,
    agent: "PersonalListenerAgent",
    content: "- Beta ships on 2 December.\n- You follow up with QA.",
    confidence: 0.9,
    relevanceScore: 0.8,
    sourceChunkIds: [],
    momentId: said.moment_id,
    quote: said.quote,
    speakerLabel: "Raj Patel",
    startMs: 61_200,
    commitments: [{ content: "Follow up with QA on the beta", dueHint: "Thursday", momentId: said.moment_id }],
  });
  await push(page, "agent-suggestion", {
    windowId: `${MEETING_ID}:90000`,
    agent: "QuestionAgent",
    kind: "suggestion",
    suggestions: [{ id: "88888888-8888-4888-8888-888888888888", question: "Who signs off on the new date?", priority: 3, confidence: 0.8, why: "Nobody owns the sign-off yet.", start_ms: 90_000 }],
  });
  await push(page, "agent-alert", {
    id: "abababab-abab-4bab-8bab-abababababab",
    meetingId: MEETING_ID,
    alertType: "workload",
    priority: 2,
    title: "Raj has 6 open tasks due this week",
    body: "Adding the pricing deck makes 7.",
    confidence: 0.8,
    rationale: null,
    subject: null,
    related: [],
    link: null,
    createdAt: "2026-11-11T10:01:00Z",
  });
  await expect(page.getByText("Ship the beta on 2 December").first()).toBeAttached();
}

/* At phone width the side panel is folded away: open it first when a state needs a tab. */
async function tab(page: Page, name: RegExp) {
  const t = page.getByRole("tab", { name });
  if (!(await t.isVisible())) await page.getByRole("button", { name: "Side panel" }).first().click({ timeout: 4000 });
  await t.click({ timeout: 4000 });
}

type State = { name: string; act?: (page: Page) => Promise<void> };

const states: State[] = [
  { name: "agent" },
  { name: "queue-open", act: async (page) => page.locator("#cx-tp-agent").getByRole("button", { name: /more waiting/ }).click({ timeout: 4000 }) },
  {
    name: "catchup-open",
    act: async (page) => {
      const line = page.getByRole("region", { name: "What you missed" });
      await line.getByRole("button", { name: /Show|Hide/ }).click();
    },
  },
  { name: "chat", act: async (page) => tab(page, /Chat/) },
  { name: "people", act: async (page) => tab(page, /People/) },
  {
    name: "transcript",
    act: async (page) => {
      const panel = page.locator("#cx-tp-agent");
      await panel.getByRole("button", { name: /more waiting/ }).click({ timeout: 4000 });
      await panel.getByRole("button", { name: /Open the transcript at 1:01/ }).first().click({ timeout: 4000 });
    },
  },
  { name: "more-menu", act: async (page) => page.getByRole("button", { name: "More options" }).click() },
  {
    name: "wrapup",
    act: async (page) => {
      await page.getByRole("button", { name: "Leave or end the meeting" }).click();
      await page.getByRole("button", { name: /End for everyone/ }).click();
    },
  },
];

const widths = [1600, 1024, 360];

for (const theme of ["light", "dark"] as const) {
  for (const width of widths) {
    for (const s of states) {
      test(`room shot ${s.name} ${width} ${theme}`, async ({ mount, page }) => {
        test.skip(!DIR, "set ROOM_SHOTS_DIR to save room screenshots");
        await page.setViewportSize({ width, height: 900 });
        await mount(<RoomHarness theme={theme} />);
        await live(page);
        if (s.act) {
          try {
            await s.act(page);
          } catch {
            // A state that is not reachable at this width (a panel folded away) is still shot as is.
          }
        }
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(DIR!, `${s.name}-${width}-${theme}.png`), fullPage: true, animations: "disabled" });
      });
    }
  }
}
