/**
 * `POST /api/capture/decisions/dismiss`: "Dismiss" on the extension's margin note. core-api
 * remembers it (a hash of the sentence, per person and decision), so the same sentence is not
 * flagged against that decision again, here or anywhere else.
 *
 * Body: `{ decision_id, quote }`. Answers `{ dismissed: true }`.
 */

import { NextResponse } from "next/server";

import { parseDismissBody } from "../../_lib/decisions";
import { decisionsFailure, noStore } from "../../_lib/decisions-route";
import { gateway } from "../../_lib/gateway";
import { captureCaller, problem, readJson } from "../../_lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const caller = await captureCaller(request);
  if (caller instanceof NextResponse) return caller;

  const parsed = parseDismissBody(await readJson(request));
  if (!parsed.ok) return problem(422, parsed.code);
  try {
    await gateway<unknown>(caller.bearer, `/api/v1/decisions/${parsed.value.decisionId}/check-dismissals`, {
      method: "POST",
      body: parsed.value.body,
    });
    return noStore({ dismissed: true });
  } catch (error) {
    return decisionsFailure(error);
  }
}
