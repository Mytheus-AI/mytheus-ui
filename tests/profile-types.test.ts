// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  LIMITS,
  PERSONALITY_PRESETS,
  PERSONALITIES,
  agentDisplayName,
  agentSeed,
  cleanList,
  fieldFromDetail,
  fullNameFrom,
  needsNameSync,
  normalizeProfile,
  personName,
  splitItems,
  validatePersona,
  validateProfile,
} from "../src/lib/api/profile-types.ts";
import { defaultDoodleSeed, isDoodleSeed } from "../src/lib/doodle.ts";

const profile = (over: Partial<Parameters<typeof validateProfile>[0]> = {}) => ({
  role: "Product manager",
  bio: "I run billing and the payments migration.",
  skills: [] as string[],
  listen_for: [] as string[],
  ignore_topics: [] as string[],
  ...over,
});

const persona = (over: Partial<Parameters<typeof validatePersona>[0]> = {}) => ({
  agent_name: "",
  agent_avatar_seed: "",
  agent_personality: "balanced",
  agent_instructions: "",
  ...over,
});

test("cleanList trims, collapses spaces, drops empties and case-insensitive duplicates", () => {
  assert.deepEqual(cleanList(["  Billing ", "", "billing", "Q3   pricing", " ", "BILLING", "Hiring"]), [
    "Billing",
    "Q3 pricing",
    "Hiring",
  ]);
  assert.deepEqual(splitItems("a, b\nc,,"), ["a", " b", "c", "", ""]);
});

test("onboarding needs a role and at least 20 characters about the work", () => {
  const empty = validateProfile(profile({ role: "  ", bio: "" }), { onboarding: true });
  assert.equal(empty.ok, false);
  if (!empty.ok) {
    assert.ok(empty.errors.role);
    assert.ok(empty.errors.bio);
  }
  const short = validateProfile(profile({ bio: "Billing stuff" }), { onboarding: true });
  assert.equal(short.ok, false);
  if (!short.ok) assert.match(short.errors.bio ?? "", /13 so far/);

  const exactly = validateProfile(profile({ bio: "x".repeat(LIMITS.bioMinOnboarding) }), { onboarding: true });
  assert.equal(exactly.ok, true);
});

test("settings saves without a role or bio, and blanks become null", () => {
  const r = validateProfile(profile({ role: " ", bio: "  " }));
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.role, null);
    assert.equal(r.value.bio, null);
  }
});

test("role and bio lengths are capped", () => {
  const r = validateProfile(profile({ role: "r".repeat(201), bio: "b".repeat(1001) }));
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.errors.role);
    assert.ok(r.errors.bio);
  }
  assert.equal(validateProfile(profile({ role: "r".repeat(200), bio: "b".repeat(1000) })).ok, true);
});

test("list limits: 30 focus areas, 15 listen for, 15 ignore, 100 characters each", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => `topic ${i}`);
  assert.equal(validateProfile(profile({ skills: many(30), listen_for: many(15), ignore_topics: many(15).map((t) => `x ${t}`) })).ok, true);

  const over = validateProfile(profile({ skills: many(31), listen_for: many(16), ignore_topics: many(16).map((t) => `x ${t}`) }));
  assert.equal(over.ok, false);
  if (!over.ok) {
    assert.ok(over.errors.skills);
    assert.ok(over.errors.listen_for);
    assert.ok(over.errors.ignore_topics);
  }

  const long = validateProfile(profile({ listen_for: ["a".repeat(101)] }));
  assert.equal(long.ok, false);
  if (!long.ok) assert.match(long.errors.listen_for ?? "", /100 characters/);

  // duplicates do not count against the limit
  const dupes = validateProfile(profile({ listen_for: [...many(15), "TOPIC 0", "topic 1"] }));
  assert.equal(dupes.ok, true);
  if (dupes.ok) assert.equal(dupes.value.listen_for.length, 15);
});

test("a topic cannot be both listened for and ignored", () => {
  const r = validateProfile(profile({ listen_for: ["Pricing"], ignore_topics: ["pricing"] }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.errors.ignore_topics ?? "", /"pricing" is also in listen for/);
});

test("persona: blanks mean defaults (null), limits hold, personality is one of five", () => {
  const ok = validatePersona(persona({ agent_name: "  ", agent_instructions: " " }));
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual(ok.value, {
    agent_name: null,
    agent_avatar_seed: null,
    agent_personality: "balanced",
    agent_instructions: null,
  });

  const named = validatePersona(persona({ agent_name: "  Pip   the  scribe ", agent_avatar_seed: "abcd23", agent_personality: "concise" }));
  assert.equal(named.ok, true);
  if (named.ok) {
    assert.equal(named.value.agent_name, "Pip the scribe");
    assert.equal(named.value.agent_avatar_seed, "abcd23");
  }

  const bad = validatePersona(
    persona({
      agent_name: "n".repeat(41),
      agent_avatar_seed: "Not A Seed!",
      agent_personality: "sarcastic",
      agent_instructions: "i".repeat(501),
    }),
  );
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), [
    "agent_avatar_seed",
    "agent_instructions",
    "agent_name",
    "agent_personality",
  ]);

  assert.equal(validatePersona(persona({ agent_name: "n".repeat(40), agent_instructions: "i".repeat(500) })).ok, true);
});

test("fieldFromDetail picks the field the 422 names, longest name first", () => {
  const fields = ["agent_name", "agent_instructions", "role", "bio"] as const;
  assert.equal(fieldFromDetail("agent_instructions: too long", fields), "agent_instructions");
  assert.equal(fieldFromDetail("Value error in body.agent_name", fields), "agent_name");
  assert.equal(fieldFromDetail("something else", fields), null);
});

test("agent name and face defaults match ADR-0038 D2", () => {
  assert.equal(agentDisplayName(null, "Maya Chen"), "Maya's Myte");
  assert.equal(agentDisplayName("  ", "Maya Chen"), "Maya's Myte");
  assert.equal(agentDisplayName("Pip", "Maya Chen"), "Pip");
  assert.equal(agentDisplayName(null, ""), "Your Myte");

  const id = "8a1c2f0e-1111-4222-8333-944455556666";
  assert.equal(agentSeed(null, id), defaultDoodleSeed(`agent:${id}`));
  assert.ok(isDoodleSeed(agentSeed(null, id)));
  assert.equal(agentSeed("abcd23", id), "abcd23");
  assert.equal(agentSeed("BAD!", id), defaultDoodleSeed(`agent:${id}`));
});

test("normalizeProfile fills what an older server leaves out", () => {
  const p = normalizeProfile({ id: "u1", role: "PM", skills: ["Billing"], agent_personality: "weird" as never });
  assert.deepEqual(p.listen_for, []);
  assert.deepEqual(p.ignore_topics, []);
  assert.equal(p.agent_personality, "balanced");
  assert.equal(p.agent_name, null);
  assert.equal(normalizeProfile({ id: "u1", role: "  " }).role, null);
});

test("every personality has a preset with a sample and no dashes", () => {
  assert.deepEqual(PERSONALITY_PRESETS.map((p) => p.id), [...PERSONALITIES]);
  for (const p of PERSONALITY_PRESETS) {
    assert.ok(p.sample.length > 0 && p.blurb.length > 0);
    assert.doesNotMatch(`${p.label} ${p.blurb} ${p.sample}`, /[–—]/);
  }
});

test("fullNameFrom joins first and last, collapses spaces, trims and caps at 80", () => {
  assert.equal(fullNameFrom("  Samar ", null), "Samar");
  assert.equal(fullNameFrom("Maya", "  Patel  Rao "), "Maya Patel Rao");
  assert.equal(fullNameFrom("", ""), "");
  assert.equal(fullNameFrom(null, undefined), "");
  assert.equal(fullNameFrom("a".repeat(100), null).length, LIMITS.displayName);
});

test("needsNameSync only for a real Clerk name that differs from the stored one", () => {
  assert.equal(needsNameSync("Samar", null), true);
  assert.equal(needsNameSync("Samar", "Nnm23ad071"), true);
  assert.equal(needsNameSync("Samar", "Samar"), false);
  assert.equal(needsNameSync("  Samar  ", "Samar"), false);
  // An empty Clerk name never clears what is stored.
  assert.equal(needsNameSync("", "Samar"), false);
  assert.equal(needsNameSync("   ", null), false);
});

test("personName prefers the stored name, else the fallback", () => {
  assert.equal(personName("Samar", "Nnm23ad071"), "Samar");
  assert.equal(personName("  ", "Nnm23ad071"), "Nnm23ad071");
  assert.equal(personName(null, "Maya"), "Maya");
  assert.equal(personName(undefined, "Maya"), "Maya");
});

test("normalizeProfile keeps display_name trimmed, blank as null", () => {
  assert.equal(normalizeProfile({ id: "u1", display_name: " Samar " }).display_name, "Samar");
  assert.equal(normalizeProfile({ id: "u1", display_name: "  " }).display_name, null);
  assert.equal(normalizeProfile({ id: "u1" }).display_name, null);
});
