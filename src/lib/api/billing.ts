/**
 * Plans, checkout and the AI-paused state (billing-metering-service).
 *
 * - `GET /plans` (any member): the catalog.
 * - `GET /billing/status` (any member): the plan and whether AI is paused; usage for admins.
 * - `POST /billing/checkout` and `/billing/checkout/verify` (admin): the Razorpay purchase, called
 *   from `app/actions/billing.ts`.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { cache } from "react";
import { apiSafe } from "@/lib/api/client";
import type { components as BillingSchemas } from "@/lib/api/generated/billing-metering-service";

export type PlanOut = BillingSchemas["schemas"]["PlanOut"];
export type BillingStatus = BillingSchemas["schemas"]["BillingStatus"];
export type CheckoutOrder = BillingSchemas["schemas"]["CheckoutOrder"];
export type CheckoutResult = BillingSchemas["schemas"]["CheckoutResult"];

/** The plan catalog, or null when billing did not answer. */
export async function fetchPlans(): Promise<PlanOut[] | null> {
  const res = await apiSafe<PlanOut[]>("/plans");
  return res.ok ? res.data : null;
}

/** Once per request: the shell banner and a page that both ask share the one read. */
export const fetchBillingStatus = cache(async (): Promise<BillingStatus | null> => {
  const res = await apiSafe<BillingStatus>("/billing/status");
  return res.ok ? res.data : null;
});
