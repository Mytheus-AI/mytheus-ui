/**
 * Build-time configuration, inlined by `scripts/build.mjs` (esbuild `define`).
 *
 * `MYTHEUS_DASHBOARD_ORIGIN` is the one Mytheus origin the extension talks to over HTTP: the
 * dashboard, where the user is signed in with Clerk. The audio WebSocket URL is not baked in:
 * the dashboard returns it with each capture session, so it changes without an extension
 * update.
 */

declare const __DASHBOARD_ORIGIN__: string;
declare const __EXTENSION_VERSION__: string;

export const DASHBOARD_ORIGIN: string =
  typeof __DASHBOARD_ORIGIN__ === "string" ? __DASHBOARD_ORIGIN__ : "https://dashboard.mytheus.cloud";

export const EXTENSION_VERSION: string =
  typeof __EXTENSION_VERSION__ === "string" ? __EXTENSION_VERSION__ : "0.0.0";
