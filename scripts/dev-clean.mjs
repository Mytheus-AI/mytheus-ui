import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Guard against a classic Next.js footgun: running `next build`/`next start`
// leaves a *production* .next cache (it writes BUILD_ID). If `next dev` then
// runs against that same cache, the served HTML points at dev chunk URLs that
// don't exist in the production cache → 404s for main-app.js, layout.css, etc.
//
// `next dev` never writes BUILD_ID, so its presence means the cache came from a
// production build. In that case (and only then) clear .next before dev starts,
// so we never pay a recompile on a normal dev run.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nextDir = join(root, ".next");
const buildId = join(nextDir, "BUILD_ID");

if (existsSync(buildId)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log("[dev-clean] Cleared a stale production .next cache before dev.");
}
