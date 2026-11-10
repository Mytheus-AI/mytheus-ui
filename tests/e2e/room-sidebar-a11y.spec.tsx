/* The calm agent sidebar's gate (polish program, Phase 1): the real <MeetingRoom /> with the
   gateway pushing what the agents would, checked in a real browser.

   - no axe violations (WCAG 2.0/2.1 A and AA, contrast included) in light and dark, with a moment
     card (decision, task and your promise from one sentence), the queue open, a question, an
     answer from the private ask box, notes under the agenda and the live transcript open;
   - one card per moment, tied to the moment: quote, speaker and meeting time; the moment opens
     the live transcript there, highlighted and focused, and Escape comes back to it;
   - an update replaces the card in place with an "Updated" mark, never a second card;
   - the Now slot shows one thing, the rest waits behind a count that opens it;
   - the ask box answers privately with sources, and nothing is sent to the room;
   - notes fold under the agenda item, saved questions are a count that opens the list. */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { RoomHarness } from "./RoomHarness";
import { MEETING_ID } from "./fixtures";

const MOMENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DECISION = "22222222-2222-4222-8222-222222222222";
const ACTION = "66666666-6666-4666-8666-666666666666";
const LONE = "77777777-7777-4777-8777-777777777777";
const QUESTION = "88888888-8888-4888-8888-888888888888";
const SAVED = "99999999-9999-4999-8999-999999999999";
const ALERT = "abababab-abab-4bab-8bab-abababababab";

const said = {
  moment_id: MOMENT,
  why: "You own the launch date, and this moves it.",
  quote: "Let's ship the beta on the second, and I'll send the pricing deck by Friday.",
  speaker_label: "Raj Patel",
  start_ms: 61_200,
  end_ms: 66_900,
};

async function ready(page: Page) {
  await page.waitForFunction(() => Boolean(window.__gateway?.meetingId));
}

async function push(page: Page, event: string, payload: unknown) {
  await page.evaluate(([e, meetingId, p]) => window.__gateway!.push(e as string, { meetingId, payload: p }), [event, MEETING_ID, payload] as const);
}

async function captions(page: Page) {
  const lines = [
    { chunkId: "c1", speakerId: "u-maya", startMs: 40_000, endMs: 45_000, text: "QA finished the regression run this morning." },
    { chunkId: "c2", speakerId: "u-raj", startMs: 61_000, endMs: 64_000, text: "Let's ship the beta on the second." },
    { chunkId: "c3", speakerId: "u-raj", startMs: 64_200, endMs: 66_800, text: "And I'll send the pricing deck by Friday." },
    { chunkId: "c4", speakerId: "u-maya", startMs: 80_000, endMs: 83_000, text: "Great, next item." },
  ];
  for (const l of lines) await push(page, "caption", { ...l, isFinal: true, confidence: 0.95 });
}

async function moment(page: Page) {
  await push(page, "agent-candidate", {
    windowId: `${MEETING_ID}:60000`,
    agent: "DecisionAgent",
    kind: "decision_candidate",
    candidates: [{ id: DECISION, content: "Ship the beta on 2 December", confidence: 0.86, rationale: "QA signed off", ...said }],
  });
  await push(page, "agent-candidate", {
    windowId: `${MEETING_ID}:60000`,
    agent: "ActionAgent",
    kind: "action_candidate",
    candidates: [{ id: ACTION, content: "Raj sends the pricing deck", confidence: 0.9, assignee_id: null, due_date: "2026-11-14", ...said }],
  });
  await push(page, "agent-note", {
    windowId: `${MEETING_ID}:60000`,
    agent: "PersonalListenerAgent",
    content: "- Beta ships on 2 December.\n- You follow up with QA.",
    confidence: 0.9,
    relevanceScore: 0.8,
    sourceChunkIds: [],
    momentId: MOMENT,
    quote: said.quote,
    speakerLabel: "Raj Patel",
    startMs: 61_200,
    commitments: [{ content: "Follow up with QA on the beta", dueHint: "Thursday", momentId: MOMENT }],
  });
}

async function everything(page: Page) {
  await ready(page);
  await captions(page);
  await moment(page);
  await push(page, "agent-candidate", {
    windowId: `${MEETING_ID}:90000`,
    agent: "DecisionAgent",
    kind: "decision_candidate",
    candidates: [{ id: LONE, content: "Keep the Pro price at 25 dollars", confidence: 0.8, rationale: null }],
  });
  await push(page, "agent-suggestion", {
    windowId: `${MEETING_ID}:90000`,
    agent: "QuestionAgent",
    kind: "suggestion",
    suggestions: [{ id: QUESTION, question: "Who signs off on the new date?", priority: 3, confidence: 0.8, why: "Nobody owns the sign-off yet.", start_ms: 90_000 }],
  });
  await push(page, "agent-alert", {
    id: ALERT,
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

const agent = (page: Page) => page.locator("#cx-tp-agent");

for (const theme of ["light", "dark"] as const) {
  test(`no axe violations in the calm sidebar (${theme})`, async ({ mount, page }) => {
    await mount(<RoomHarness theme={theme} />);
    await everything(page);
    const panel = agent(page);
    await expect(panel.getByText("Raj has 6 open tasks due this week")).toBeVisible();

    // The queue open, a private answer, then axe.
    await panel.getByRole("button", { name: /more waiting/ }).click();
    await panel.getByRole("textbox", { name: "Ask your agent privately" }).fill("When does the beta ship?");
    await panel.getByRole("button", { name: "Ask your agent", exact: true }).click();
    await expect(panel.getByText(/Launch moved to 2 December/)).toBeVisible();
    expect(await axe(page)).toEqual([]);

    // And with the live transcript open at the moment.
    await panel.getByRole("button", { name: /Open the transcript at 1:01/ }).first().click();
    await expect(panel.getByRole("heading", { name: "Live transcript" })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
}

test("one card per moment, tied to the words, opening the live transcript there", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  await ready(page);
  await captions(page);
  await moment(page);
  const panel = agent(page);

  // One card holds the decision, the task, your promise and your note.
  const card = panel.locator("article.is-moment");
  await expect(card).toHaveCount(1);
  await expect(card.getByRole("heading", { name: "Decision and task" }).or(card.getByText("Decision and task"))).toBeVisible();
  await expect(card.getByText("Ship the beta on 2 December")).toBeVisible();
  await expect(card.getByText("Raj sends the pricing deck")).toBeVisible();
  await expect(card.getByText("Follow up with QA on the beta")).toBeVisible();
  await expect(card.getByText(said.quote)).toBeVisible();
  await expect(card.getByText("Raj Patel")).toBeVisible();
  await expect(card.getByText("1:01")).toBeVisible();
  await expect(card.getByText(said.why)).toBeVisible();
  // Each part keeps its own actions.
  await expect(card.getByRole("button", { name: "Confirm" })).toHaveCount(2);
  await expect(card.getByRole("button", { name: "Keep promise" })).toBeVisible();

  // The moment opens the live transcript, highlighted, focused; Escape comes back.
  const open = card.getByRole("button", { name: /Open the transcript at 1:01/ });
  await open.click();
  const lines = panel.getByRole("list", { name: "Transcript lines" });
  await expect(lines).toBeVisible();
  const hit = lines.locator('li[aria-current="true"]');
  await expect(hit).toHaveCount(2);
  await expect(hit.first()).toContainText("Let's ship the beta on the second.");
  await expect(hit.first()).toBeFocused();
  await expect(panel.locator("article.is-moment")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(lines).toBeHidden();
  await expect(open).toBeFocused();

  // Confirming the task closes the promise from the same moment: it is a task now.
  await card.getByRole("listitem").filter({ hasText: "Raj sends the pricing deck" }).getByRole("button", { name: "Confirm" }).click();
  await expect(card.getByText("Tracked as a task now")).toBeVisible();
});

test("an update replaces the card in place, never a second card", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  await ready(page);
  await push(page, "agent-candidate", {
    windowId: `${MEETING_ID}:60000`,
    agent: "DecisionAgent",
    kind: "decision_candidate",
    candidates: [{ id: LONE, content: "Ship the beta on 2 December", confidence: 0.86, rationale: null, start_ms: 61_200 }],
  });
  const panel = agent(page);
  await expect(panel.getByText("Ship the beta on 2 December")).toBeVisible();
  // A card from before quotes still has its time, and opens the transcript there.
  await expect(panel.getByRole("button", { name: /Open the transcript at 1:01/ })).toBeVisible();
  await push(page, "agent-candidate", {
    windowId: `${MEETING_ID}:70000`,
    agent: "DecisionAgent",
    kind: "decision_candidate",
    candidates: [{ id: LONE, content: "Ship the beta on 3 December", confidence: 0.9, rationale: null, updates_candidate_id: LONE, start_ms: 71_000 }],
  });
  await expect(panel.getByText("Ship the beta on 3 December")).toBeVisible();
  await expect(panel.getByText("Ship the beta on 2 December")).toHaveCount(0);
  await expect(panel.getByText("Updated", { exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Confirm" })).toHaveCount(1);
});

test("the Now slot shows one thing; the rest waits behind a count", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  await everything(page);
  const panel = agent(page);
  const now = panel.getByRole("group", { name: "Now" });
  // The amber alert is the most important; everything else waits.
  await expect(now.getByText("Raj has 6 open tasks due this week")).toBeVisible();
  await expect(now.getByText("Keep the Pro price at 25 dollars")).toHaveCount(0);
  const more = panel.getByRole("button", { name: "3 more waiting" });
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(panel.getByText("Keep the Pro price at 25 dollars")).toBeHidden();
  await more.click();
  await expect(panel.getByRole("button", { name: "Hide the queue" })).toHaveAttribute("aria-expanded", "true");
  await expect(panel.getByText("Keep the Pro price at 25 dollars")).toBeVisible();
  await expect(panel.getByText("Who signs off on the new date?")).toBeVisible();
  await expect(panel.getByText("Nobody owns the sign-off yet.")).toBeVisible();
});

test("asking your agent is private, answered with sources, and can be retried", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  await ready(page);
  const panel = agent(page);
  await expect(panel.getByText("Only you").first()).toBeVisible();
  const box = panel.getByRole("textbox", { name: "Ask your agent privately" });
  await box.fill("What did we decide about pricing?");
  await box.press("Enter");
  await expect(panel.getByText(/Pricing stays at 25 dollars/)).toBeVisible();
  const sources = panel.getByRole("list", { name: "Sources" });
  await expect(sources.getByRole("link", { name: /Confirmed decision/ })).toHaveAttribute(
    "href",
    `/meetings/${MEETING_ID}/decisions/33333333-3333-4333-8333-333333333333`,
  );
  await expect(sources.getByRole("link", { name: /Pricing review/ })).toBeVisible();
  // A marker jumps to its source.
  await panel.getByRole("button", { name: "Source 2" }).click();
  await expect(sources.getByRole("listitem").nth(1)).toBeFocused();
  // A failure says so and offers Retry, which answers.
  await box.fill("Are we offline?");
  await box.press("Enter");
  const retry = panel.getByRole("button", { name: "Try again" });
  await expect(panel.getByText("Your agent could not answer just now. Try again in a moment.").first()).toBeVisible();
  await retry.click();
  await expect(retry).toHaveCount(0);
  await expect(panel.getByRole("list", { name: "Sources" })).toHaveCount(2);

  // Nothing was sent to the room.
  const sent = await page.evaluate(() => (window.__gatewayLog ?? []).map((e) => e.event));
  expect(sent.filter((e) => e !== "join")).toEqual([]);
});

test("notes fold under the agenda item; saved questions are a count that opens the list", async ({ mount, page }) => {
  await mount(<RoomHarness />);
  await ready(page);
  await push(page, "agent-note", {
    windowId: `${MEETING_ID}:30000`,
    agent: "PersonalListenerAgent",
    content: "- QA signed off on the beta.",
    confidence: 0.9,
    relevanceScore: 0.8,
    sourceChunkIds: [],
  });
  const panel = agent(page);
  const item = panel.getByRole("button", { name: /^Beta readiness Now/ });
  await expect(item).toHaveAttribute("aria-expanded", "true");
  await expect(panel.getByRole("list", { name: "Notes on Beta readiness" }).getByText("QA signed off on the beta.")).toBeVisible();
  await item.click();
  await expect(item).toHaveAttribute("aria-expanded", "false");
  await expect(panel.getByText("QA signed off on the beta.")).toBeHidden();

  // A saved question (from the re-hydrate of an earlier meeting would look the same).
  await push(page, "agent-suggestion", {
    windowId: `${MEETING_ID}:30000`,
    agent: "QuestionAgent",
    kind: "suggestion",
    suggestions: [{ id: SAVED, question: "Is the date in the release notes?", priority: 3, confidence: 0.8 }],
  });
  await expect(panel.getByText("Is the date in the release notes?")).toBeVisible();
  const save = panel.getByRole("button", { name: "Save for later" });
  await save.click();
  const fold = panel.getByRole("button", { name: /Saved questions/ });
  await expect(fold).toHaveAttribute("aria-expanded", "false");
  await expect(fold).toContainText("1");
  await fold.click();
  await expect(fold).toHaveAttribute("aria-expanded", "true");
  await expect(panel.locator(`#${await fold.getAttribute("aria-controls")}`).getByText("Is the date in the release notes?")).toBeVisible();
});
