/**
 * `POST /api/capture/decisions/reopen`: "Reopen it" on the extension's margin note. Creates a
 * reopen request on the decision through core-api; its owner sees it in their Inbox and on the
 * decision page and decides (schedule a revisit, add a follow-up, or decline). The person chose
 * this, so the place it happened (a Docs or Jira address; never a Gmail draft) goes with it.
 *
 * Body: `{ decision_id, quote, reason?, place_label?, link? }`. Answers the ReopenRequest.
 */

import { NextResponse } from "next/server";

import { parseReopenBody } from "../../_lib/decisions";
import { decisionsFailure, noStore } from "../../_lib/decisions-route";
import { gateway } from "../../_lib/gateway";
import { captureCaller, problem, readJson } from "../../_lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const caller = await captureCaller(request);
  if (caller instanceof NextResponse) return caller;

  const parsed = parseReopenBody(await readJson(request));
  if (!parsed.ok) return problem(422, parsed.code);
  try {
    const created = await gateway<unknown>(caller.bearer, `/api/v1/decisions/${parsed.value.decisionId}/reopen-requests`, {
      method: "POST",
      body: parsed.value.body,
      idempotencyKey: `ext-reopen:${parsed.value.decisionId}:${caller.link.sub}`,
    });
    return noStore(created, 201);
  } catch (error) {
    return decisionsFailure(error);
  }
}
