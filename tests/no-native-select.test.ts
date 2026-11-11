// Run: npm test
// The regression guard for the shared dropdown (components/ui/Dropdown.tsx): no native <select>
// anywhere in src. A native select opens the operating system's menu, which ignores the tokens
// (a white list with a blue highlight in the dark theme); every list choice goes through Dropdown.
// .eslintrc.json carries the same rule, so the editor says it first.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const SRC = path.resolve(import.meta.dirname, "../src");
const ALLOWED = new Set([path.join(SRC, "components/ui/Dropdown.tsx")]);
const SELECT_TAG = /<select(?=[\s>/]|$)/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(tsx|ts|jsx|js|html|mdx)$/.test(name) ? [full] : [];
  });
}

test("no native <select> in src outside the shared Dropdown", () => {
  const offenders: string[] = [];
  for (const file of files(SRC)) {
    if (ALLOWED.has(file)) continue;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (SELECT_TAG.test(line)) offenders.push(`${path.relative(SRC, file)}:${i + 1}`);
      });
  }
  assert.deepEqual(offenders, [], `Use <Dropdown> from components/ui/Dropdown instead of <select>:\n${offenders.join("\n")}`);
});

test("the guard itself catches a select tag", () => {
  assert.ok(SELECT_TAG.test('<select value="a">'));
  assert.ok(SELECT_TAG.test("<select>"));
  assert.ok(SELECT_TAG.test("      <select"));
  assert.ok(!SELECT_TAG.test("<SelectOption"));
  assert.ok(!SELECT_TAG.test("a selected option"));
});
