import { test } from "node:test";
import assert from "node:assert/strict";

import { detectMeeting, titleFromTab } from "../src/lib/meeting-url.ts";

test("Google Meet: a call URL is a meeting, with its code", () => {
  const m = detectMeeting("https://meet.google.com/abc-defg-hij?authuser=1");
  assert.deepEqual(m, { source: "meet", label: "Google Meet", inCall: true, code: "abc-defg-hij" });
});

test("Google Meet: landing, new and lookalike paths are not meetings", () => {
  for (const url of [
    "https://meet.google.com/",
    "https://meet.google.com/landing",
    "https://meet.google.com/new",
    "https://meet.google.com/abc-defg-hijk",
    "https://meet.google.com.evil.example/abc-defg-hij",
    "http://meet.google.com/abc-defg-hij",
  ]) {
    assert.equal(detectMeeting(url), null, url);
  }
});

test("Teams: every Teams web host is supported; a join URL reads as in a call", () => {
  for (const host of ["teams.microsoft.com", "teams.live.com", "teams.cloud.microsoft"]) {
    const app = detectMeeting(`https://${host}/v2/`);
    assert.equal(app?.source, "teams", host);
    assert.equal(app?.inCall, false, host);
  }
  const join = detectMeeting(
    "https://teams.microsoft.com/l/meetup-join/19%3ameeting_abc%40thread.v2/0?context=%7b%7d",
  );
  assert.equal(join?.inCall, true);
  assert.equal(detectMeeting("https://teams.live.com/meet/9312345678901?p=abc")?.inCall, true);
  assert.equal(detectMeeting("https://teams.microsoft.com.evil.example/v2/"), null);
});

test("Zoom: only the web client is a meeting, on app.zoom.us and vanity hosts", () => {
  assert.deepEqual(detectMeeting("https://app.zoom.us/wc/84512345678/join?fromPWA=1"), {
    source: "zoom",
    label: "Zoom",
    inCall: true,
    code: "84512345678",
  });
  assert.equal(detectMeeting("https://acme.zoom.us/wc/join/84512345678")?.code, "84512345678");
  assert.equal(detectMeeting("https://app.zoom.us/wc/home")?.source, "zoom");
  assert.equal(detectMeeting("https://zoom.us/j/84512345678"), null, "the launcher page is not the web client");
  assert.equal(detectMeeting("https://app.zoom.us/profile"), null);
  assert.equal(detectMeeting("https://notzoom.us/wc/84512345678"), null);
});

test("anything else, and garbage, is not a meeting", () => {
  for (const url of [undefined, null, "", "not a url", "chrome://extensions", "https://example.com/abc-defg-hij"]) {
    assert.equal(detectMeeting(url), null, String(url));
  }
});

test("titles: product names, codes and counters are stripped; a real name is kept", () => {
  const meet = detectMeeting("https://meet.google.com/abc-defg-hij")!;
  assert.equal(titleFromTab("Meet - abc-defg-hij", meet), "");
  assert.equal(titleFromTab("Meet: Weekly product sync", meet), "Weekly product sync");
  assert.equal(titleFromTab("Weekly product sync - Google Meet", meet), "Weekly product sync");
  assert.equal(titleFromTab("Google Meet", meet), "");

  const teams = detectMeeting("https://teams.microsoft.com/v2/")!;
  assert.equal(titleFromTab("(3) Chat | Microsoft Teams", teams), "");
  assert.equal(titleFromTab("Q4 planning with Acme | Microsoft Teams", teams), "Q4 planning with Acme");

  const zoom = detectMeeting("https://app.zoom.us/wc/84512345678/join")!;
  assert.equal(titleFromTab("Zoom Meeting", zoom), "");
  assert.equal(titleFromTab("84512345678", zoom), "");
  assert.equal(titleFromTab(undefined, zoom), "");
  assert.equal(titleFromTab("x".repeat(300), zoom).length, 120);
});
