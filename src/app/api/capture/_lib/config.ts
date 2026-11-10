/**
 * Mytheus Capture's server configuration. SERVER-ONLY: read in route handlers and Server
 * Components, never in a client component (the secret must not reach the bundle).
 *
 * - `CAPTURE_TOKEN_SECRET`: signs link and capture tokens; the SAME value is set on
 *   transcription-service. Unset (or under 32 characters) leaves Capture "not connected": the
 *   page says so, and every capture route answers 503 `CAPTURE_NOT_CONFIGURED`.
 * - `CAPTURE_INGEST_URL`: the public WebSocket URL of transcription-service's `/capture/audio`,
 *   e.g. `wss://api.mytheus.cloud/capture/audio`. Handed to the extension with each session.
 * - `CAPTURE_EXTENSION_IDS`: comma-separated extension ids allowed to receive a link token.
 *   Default: the id fixed by the key in `extension/src/lib/identity.ts`.
 * - `CAPTURE_EXTENSION_ZIP`: where the packaged extension lives; default
 *   `extension/dist/mytheus-capture.zip` under the working directory (the Docker image copies
 *   it there).
 */

import path from "node:path";

import { secretUsable } from "./tokens";

/** Must equal `EXTENSION_ID` in `extension/src/lib/identity.ts` (`tests/capture.test.ts`). */
export const DEFAULT_EXTENSION_ID = "hcojignndmihgefeheffdnpaimncfglf";

export interface CaptureConfig {
  secret: string | null;
  ingestUrl: string | null;
  extensionIds: string[];
  zipPath: string;
}

function ingestUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol === "wss:" || (url.protocol === "ws:" && local)) return url.toString();
  } catch {
    // fall through
  }
  return null;
}

export function captureConfig(): CaptureConfig {
  const secret = process.env.CAPTURE_TOKEN_SECRET;
  const ids = (process.env.CAPTURE_EXTENSION_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-p]{32}$/.test(s));
  return {
    secret: secretUsable(secret) ? secret : null,
    ingestUrl: ingestUrl(process.env.CAPTURE_INGEST_URL),
    extensionIds: ids.length ? ids : [DEFAULT_EXTENSION_ID],
    zipPath:
      process.env.CAPTURE_EXTENSION_ZIP ||
      path.join(process.cwd(), "extension", "dist", "mytheus-capture.zip"),
  };
}

export function captureConfigured(config: CaptureConfig): config is CaptureConfig & {
  secret: string;
  ingestUrl: string;
} {
  return config.secret !== null && config.ingestUrl !== null;
}
