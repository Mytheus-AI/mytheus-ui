// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { breadcrumbFor } from "../src/components/app/breadcrumbs.ts";

const ID = "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

test("top-level pages have no breadcrumb", () => {
  assert.equal(breadcrumbFor("/meetings"), null);
  assert.equal(breadcrumbFor("/meetings/new"), null);
  assert.equal(breadcrumbFor("/dashboard", "Anything", "Anything"), null);
});

test("a meeting's own page is named by the meeting", () => {
  assert.deepEqual(breadcrumbFor(`/meetings/${ID}`, null, "Weekly sync"), [
    { label: "Meetings", href: "/meetings" },
    { label: "Weekly sync" },
  ]);
  assert.deepEqual(breadcrumbFor(`/meetings/${ID}/`, null, null), [{ label: "Meetings", href: "/meetings" }, { label: "Meeting" }]);
});

test("a meeting's sub-pages read Meetings, the meeting, the page", () => {
  for (const [leaf, label] of [
    ["transcript", "Transcript"],
    ["catch-up", "Catch-up"],
    ["collaborations", "Myte collaboration"],
    ["record", "What is recorded"],
  ]) {
    assert.deepEqual(breadcrumbFor(`/meetings/${ID}/${leaf}`, null, "Weekly sync"), [
      { label: "Meetings", href: "/meetings" },
      { label: "Weekly sync", href: `/meetings/${ID}` },
      { label },
    ]);
  }
  // Before the meeting's title arrives (or when it cannot be read), the step is a plain noun.
  assert.deepEqual(breadcrumbFor(`/meetings/${ID}/transcript`), [
    { label: "Meetings", href: "/meetings" },
    { label: "Meeting", href: `/meetings/${ID}` },
    { label: "Transcript" },
  ]);
});

test("a decision under a meeting carries its own wording last", () => {
  assert.deepEqual(breadcrumbFor(`/meetings/${ID}/decisions/abc`, "Ship the beta on 2 December", "Weekly sync"), [
    { label: "Meetings", href: "/meetings" },
    { label: "Weekly sync", href: `/meetings/${ID}` },
    { label: "Ship the beta on 2 December" },
  ]);
  assert.deepEqual(breadcrumbFor(`/meetings/${ID}/decisions/abc`)?.at(-1), { label: "Decision" });
});

test("other detail pages are unchanged", () => {
  assert.deepEqual(breadcrumbFor("/people/u-1", "Maya Chen"), [{ label: "People", href: "/people" }, { label: "Maya Chen" }]);
});
