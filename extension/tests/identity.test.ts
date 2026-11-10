import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { EXTENSION_ID, MANIFEST_PUBLIC_KEY, idFromSha256Hex } from "../src/lib/identity.ts";

test("the manifest key derives the fixed extension id the dashboard allowlists", () => {
  const der = Buffer.from(MANIFEST_PUBLIC_KEY, "base64");
  assert.equal(idFromSha256Hex(createHash("sha256").update(der).digest("hex")), EXTENSION_ID);
});
