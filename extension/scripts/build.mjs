/**
 * `npm run build`: bundles the extension into `dist/unpacked/` (load it with Chrome's "Load
 * unpacked") and packages the same files as `dist/mytheus-capture.zip` (what the dashboard's
 * /capture page offers for download).
 *
 * Configuration (environment, read at build time):
 *   MYTHEUS_DASHBOARD_ORIGIN  the dashboard the extension signs in through and calls.
 *                             Default https://dashboard.mytheus.cloud; for local development
 *                             e.g. http://localhost:3000.
 */

import { build } from "esbuild";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { createZip } from "./zip.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist", "unpacked");
const zipPath = join(root, "dist", "mytheus-capture.zip");

const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const identity = await readFile(join(root, "src", "lib", "identity.ts"), "utf8");
const publicKey = /MANIFEST_PUBLIC_KEY =\s*"([^"]+)"/.exec(identity)?.[1];
const extensionId = /EXTENSION_ID = "([a-p]{32})"/.exec(identity)?.[1];
if (!publicKey || !extensionId) throw new Error("src/lib/identity.ts is missing the key or the id");

const dashboard = new URL(process.env.MYTHEUS_DASHBOARD_ORIGIN || "https://dashboard.mytheus.cloud");
if (dashboard.protocol !== "https:" && dashboard.hostname !== "localhost" && dashboard.hostname !== "127.0.0.1") {
  throw new Error("MYTHEUS_DASHBOARD_ORIGIN must be https (http only for localhost)");
}
const origin = dashboard.origin;

// Every page Capture works on. `*.zoom.us` covers app.zoom.us and company vanity hosts.
const MEETING_MATCHES = [
  "https://meet.google.com/*",
  "https://teams.microsoft.com/*",
  "https://teams.live.com/*",
  "https://teams.cloud.microsoft/*",
  "https://*.zoom.us/wc/*",
];

const manifest = {
  manifest_version: 3,
  name: "Mytheus Capture",
  short_name: "Mytheus",
  version: pkg.version,
  description:
    "Transcribe calls on Google Meet, Microsoft Teams and Zoom (web) into Mytheus, with no bot joining.",
  key: publicKey,
  minimum_chrome_version: "116",
  icons: { 16: "icons/icon-16.png", 32: "icons/icon-32.png", 48: "icons/icon-48.png", 128: "icons/icon-128.png" },
  action: {
    default_title: "Mytheus Capture",
    default_popup: "popup.html",
    default_icon: { 16: "icons/icon-16.png", 32: "icons/icon-32.png" },
  },
  background: { service_worker: "background.js" },
  permissions: ["tabCapture", "offscreen", "storage", "activeTab"],
  host_permissions: [...MEETING_MATCHES, `${origin}/*`],
  content_scripts: [{ matches: MEETING_MATCHES, js: ["content.js"], run_at: "document_idle" }],
  // Only the dashboard's capture pages can hand the extension a link token.
  externally_connectable: { matches: [`${origin}/capture/*`] },
};

await rm(join(root, "dist"), { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: ["background", "offscreen", "popup", "content", "permissions", "worklet"].map((name) =>
    join(root, "src", `${name}.ts`),
  ),
  outdir: out,
  bundle: true,
  format: "iife",
  target: "chrome116",
  platform: "browser",
  legalComments: "none",
  logLevel: "warning",
  define: {
    __DASHBOARD_ORIGIN__: JSON.stringify(origin),
    __EXTENSION_VERSION__: JSON.stringify(pkg.version),
  },
});

await cp(join(root, "static"), out, { recursive: true });
await writeFile(join(out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

async function files(dir) {
  const result = [];
  for (const entry of (await readdir(dir)).sort()) {
    const path = join(dir, entry);
    if ((await stat(path)).isDirectory()) result.push(...(await files(path)));
    else result.push(path);
  }
  return result;
}

const entries = [];
for (const path of await files(out)) {
  entries.push({ name: relative(out, path).split("\\").join("/"), data: await readFile(path) });
}
const zip = createZip(entries);
await writeFile(zipPath, zip);
await writeFile(
  join(root, "dist", "build.json"),
  `${JSON.stringify(
    {
      version: pkg.version,
      extension_id: extensionId,
      dashboard_origin: origin,
      zip_sha256: createHash("sha256").update(zip).digest("hex"),
      zip_bytes: zip.length,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `Mytheus Capture ${pkg.version} (id ${extensionId}) for ${origin}\n` +
    `  unpacked: ${relative(process.cwd(), out)}\n  zip:      ${relative(process.cwd(), zipPath)} (${zip.length} bytes)`,
);
