/**
 * `POST /api/capture/decisions/check`: the extension asks whether the paragraph being written goes
 * against a confirmed decision ("Decisions that follow you").
 *
 * Authenticated by the Capture link token, as the user behind it (`_lib/session.ts`); calls
 * core-api's `POST /api/v1/decisions/check` with source `extension`. Read-only: the backend keeps
 * an audit row without the text, and nothing is stored here. The extension only calls this while
 * its "Check what I write against decisions" switch is on for that site.
 *
 * Body: `{ text, site: "docs" | "gmail" | "jira", place_label? }`. Answers the backend's
 * DecisionCheckResult; 429 `RATE_LIMITED` with `retry_after`; 503 `CHECK_NOT_CONNECTED`.
 */

import { NextResponse } from "next/server";

import { parseCheckBody } from "../../_lib/decisions";
import { decisionsFailure, noStore } from "../../_lib/decisions-route";
import { gateway } from "../../_lib/gateway";
import { captureCaller, problem, readJson } from "../../_lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const caller = await captureCaller(request);
  if (caller instanceof NextResponse) return caller;

  const parsed = parseCheckBody(await readJson(request));
  if (!parsed.ok) return problem(422, parsed.code);
  try {
    return noStore(await gateway<unknown>(caller.bearer, "/api/v1/decisions/check", { method: "POST", body: parsed.value }));
  } catch (error) {
    return decisionsFailure(error);
  }
}
