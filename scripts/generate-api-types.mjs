/**
 * Generate this app's wire types from `mytheus-backend`'s emitted OpenAPI documents.
 *
 *   node scripts/generate-api-types.mjs            # write src/lib/api/generated/
 *   node scripts/generate-api-types.mjs --check    # fail if the committed output is stale
 *
 * WHY THIS EXISTS. Until now every wire type in this app was hand-written, in three separate
 * places (`lib/api/types.ts`, the `ErrorCode` union in `lib/api/client.ts`, and the inline
 * interfaces in `lib/api/transcript.ts`). Hand-kept types do not fail when the server changes;
 * they go quietly wrong. That already happened: the `ErrorCode` union listed 15 of the 17 codes
 * the server emits, and the two it was missing - `CONSENT_REQUIRED` and `NOT_A_PARTICIPANT` -
 * are exactly the two outcomes the meeting-join path has to keep apart.
 *
 * WHY IT ONLY BECAME SAFE NOW. Plan 1-2 deliberately refused to generate a client, because the
 * specs were hand-written and generating from them would have encoded drift rather than
 * prevented it. ADR-0022 made each service emit its document from its FastAPI app, so the specs
 * are now derived from the running code rather than maintained alongside it.
 *
 * WHY THE OUTPUT IS COMMITTED. This app must build with no sibling checkout: CI, the Docker
 * build and a fresh clone all compile without `mytheus-backend` on disk. Committing the output
 * buys that, and `--check` is what stops a committed copy from silently becoming a second
 * source of truth - the same regenerate-and-compare shape `mytheus-backend` uses on the specs.
 *
 * The generated directory is written whole on every run and must never be hand-edited; the
 * shape this app actually consumes is assembled in `lib/api/types.ts`.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const OUT_DIR = join(REPO, "src", "lib", "api", "generated");

/**
 * Where `mytheus-backend/design/openapi` lives.
 *
 * There is no single right answer to hard-code. The program's convention is sibling checkouts,
 * but on a real workstation the clones sit under wrapper directories with legacy inner names
 * (recorded as gap 33), so the sibling path is not reliably the sibling path. Rather than guess
 * wrong and silently generate from nothing, this tries the known layouts and then FAILS with
 * the list it tried, in the same spirit as `API_GATEWAY_URL` refusing to default.
 */
const CANDIDATES = [
  join(REPO, "..", "..", "mytheus-backend", "design", "openapi"),
  join(REPO, "..", "..", "Mytheus-backend", "reprise-backend", "design", "openapi"),
  join(REPO, "..", "mytheus-backend", "design", "openapi"),
];

function specDir() {
  // An explicit override is used or it fails. It deliberately does NOT fall back to the
  // guesses below: someone who names a directory and silently gets a different one is worse
  // off than someone who gets an error, because the generated output would look fine and
  // describe the wrong server. Found by running this path rather than reading it.
  const override = process.env.MYTHEUS_OPENAPI_DIR;
  if (override) {
    const dir = resolve(override);
    if (existsSync(dir)) return dir;
    console.error(`MYTHEUS_OPENAPI_DIR is set to ${dir}, which does not exist.`);
    process.exit(2);
  }
  for (const candidate of CANDIDATES) {
    const dir = resolve(candidate);
    if (existsSync(dir)) return dir;
  }
  console.error(
    "Could not find mytheus-backend's emitted OpenAPI documents.\n" +
      "Set MYTHEUS_OPENAPI_DIR to the directory holding them, or check out mytheus-backend " +
      "beside this repo.\nTried:\n" +
      CANDIDATES.map((c) => `  ${resolve(c)}`).join("\n"),
  );
  process.exit(2);
}

/** LF everywhere, so a byte comparison is about content and not about the platform. */
function normalise(text) {
  return text.replace(/\r\n/g, "\n");
}

const BANNER = [
  "/**",
  " * GENERATED FILE - DO NOT EDIT.",
  " *",
  " * Emitted from mytheus-backend's OpenAPI document by `npm run generate:api`, which is in",
  " * turn emitted from that service's FastAPI app (ADR-0022). Change the server, regenerate.",
  " * `npm run generate:api:check` fails the build when this file and the spec disagree, so a",
  " * hand edit here is reverted by the next run and blocks CI until then.",
  " */",
  "",
].join("\n");

function generate(dir) {
  const specs = readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort();
  if (specs.length === 0) {
    console.error(`No .yaml documents in ${dir}`);
    process.exit(2);
  }

  const files = new Map();
  for (const spec of specs) {
    // --root-types gives each schema a named alias, so a consumer can write
    // `components["schemas"]["Meeting"]` or the shorter exported name.
    const stdout = execFileSync(
      process.execPath,
      [join(REPO, "node_modules", "openapi-typescript", "bin", "cli.js"), join(dir, spec)],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    // Normalised to LF, and that is load-bearing rather than tidiness. The generator emits
    // CRLF on Windows and LF on Linux, so `--check` compares bytes that differ by platform
    // and not by content: it would be red for one developer and green in CI, on identical
    // input. `mytheus-realtime` lost a whole lint gate to this exact class (Plan 3-4 gap 14),
    // so it is fixed here in the comparison rather than left to a `.gitattributes` that only
    // governs what git writes. The `.gitattributes` is present too, to stop a checkout
    // undoing this.
    files.set(spec.replace(/\.yaml$/, ".ts"), (BANNER + stdout).replace(/\r\n/g, "\n"));
  }
  return files;
}

function readExisting() {
  if (!existsSync(OUT_DIR)) return new Map();
  return new Map(
    readdirSync(OUT_DIR)
      .filter((f) => f.endsWith(".ts"))
      // Normalised on read for the same reason it is normalised on write: the comparison
      // must be about content, not about which platform last touched the working tree.
      .map((f) => [f, normalise(readFileSync(join(OUT_DIR, f), "utf8"))]),
  );
}

const check = process.argv.includes("--check");
const dir = specDir();
const generated = generate(dir);

if (check) {
  const existing = readExisting();
  const problems = [];
  for (const [name, content] of generated) {
    if (!existing.has(name)) problems.push(`${name}: missing from the committed output`);
    else if (existing.get(name) !== content) problems.push(`${name}: differs from the spec`);
  }
  for (const name of existing.keys()) {
    if (!generated.has(name)) problems.push(`${name}: committed but no longer emitted`);
  }
  if (problems.length) {
    console.error(
      "Generated API types are stale:\n" +
        problems.map((p) => `  ${p}`).join("\n") +
        "\n\nRun `npm run generate:api` and commit the result.",
    );
    process.exit(1);
  }
  console.log(`Generated API types match ${dir}`);
  process.exit(0);
}

// Written whole so a spec that stops being emitted cannot leave a stale module behind for an
// import to keep resolving against.
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
for (const [name, content] of generated) {
  writeFileSync(join(OUT_DIR, name), content, "utf8");
  console.log(`wrote src/lib/api/generated/${name}`);
}
console.log(`from ${dir}`);
