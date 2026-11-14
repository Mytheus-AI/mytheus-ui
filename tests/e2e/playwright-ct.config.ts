import path from "node:path";
import { defineConfig, devices } from "@playwright/experimental-ct-react";

/* The room's accessibility test (polish program, Phase 0): Playwright component testing mounts the
   real <MeetingRoom /> in a real browser, with no Next server, no Clerk and no backend. The only
   replacements are at the edges, by module alias: the Clerk hook (a test token), Next's Link and
   router, the server actions (canned results), and socket.io-client (an in-page gateway that acks
   joins and lets the test push events). LiveKit stays unconfigured, as in an environment without
   an SFU. Run: npm run test:a11y */

const root = path.resolve(__dirname, "../..");
// CT_PORT lets two runs share a checkout (each gets its own port, build cache and output folder).
const port = Number(process.env.CT_PORT ?? 3197);
const tag = process.env.CT_PORT ? `-${port}` : "";
const stub = (name: string) => path.resolve(__dirname, "stubs", name);

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.tsx/,
  snapshotDir: "./__snapshots__",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: path.resolve(root, "playwright-report") }]] : "list",
  outputDir: path.resolve(root, `test-results${tag}`),
  use: {
    ctTemplateDir: "./playwright",
    ctCacheDir: path.resolve(root, `node_modules/.cache/playwright-ct${tag}`),
    ctPort: port,
    viewport: { width: 1440, height: 900 },
    ctViteConfig: {
      define: {
        "process.env": JSON.stringify({ NEXT_PUBLIC_REALTIME_WS_URL: "ws://gateway.test" }),
      },
      resolve: {
        alias: [
          { find: /^@clerk\/nextjs\/errors$/, replacement: stub("clerk-errors.ts") },
          { find: "@clerk/nextjs", replacement: stub("clerk.ts") },
          { find: /^next\/link$/, replacement: stub("next-link.tsx") },
          { find: /^next\/navigation$/, replacement: stub("next-navigation.ts") },
          { find: /^next\/dynamic$/, replacement: stub("next-dynamic.tsx") },
          { find: /^socket\.io-client$/, replacement: stub("socket.io-client.ts") },
          { find: /^@\/components\/room\/actions$/, replacement: stub("room-actions.ts") },
          { find: /^@\/components\/room\/stage-actions$/, replacement: stub("stage-actions.ts") },
          { find: /^@\/app\/actions\/.*$/, replacement: stub("actions.ts") },
          { find: /^@\/components\/admin\/FormSubmit$/, replacement: stub("form-submit.tsx") },
          { find: /^@\/lib\/fonts$/, replacement: stub("fonts.ts") },
          { find: /^@\//, replacement: `${path.resolve(root, "src")}/` },
        ],
      },
    },
  },
  // CT_GL=metal (or d3d11, gl, vulkan) draws WebGL on the real GPU for screenshots and timings;
  // by default headless Chromium draws it in software (SwiftShader), which is what CI has.
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.CT_GL ? { args: [`--use-angle=${process.env.CT_GL}`, "--enable-gpu", "--ignore-gpu-blocklist"] } : {},
      },
    },
  ],
});
