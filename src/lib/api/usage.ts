/**
 * Usage and agent budget. Plan 7-9 §3.1 step 8 / §3.4 step 3: `GET /usage` on
 * `billing-metering-service` (RBAC `admin`): the live `agent_budgets` row, the plan, and this
 * period's `usage_aggregates`.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { ApiError, api } from "@/lib/api/client";
import type { components as BillingSchemas } from "@/lib/api/generated/billing-metering-service";

export type UsageOut = BillingSchemas["schemas"]["UsageOut"];

/**
 * The real usage, or why there is none:
 * - `unconfigured`: no `API_GATEWAY_URL` in this environment, so the page shows sample figures;
 * - `forbidden`: the server says this user is not an admin (the page says so, it does not guess).
 * Any other server answer is thrown, so a real failure is not dressed up as sample data.
 */
export async function fetchUsage(): Promise<
  { kind: "live"; usage: UsageOut } | { kind: "unconfigured" } | { kind: "forbidden" }
> {
  try {
    return { kind: "live", usage: await api<UsageOut>("/usage") };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 403) return { kind: "forbidden" };
      throw error;
    }
    return { kind: "unconfigured" };
  }
}
