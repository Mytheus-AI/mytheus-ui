"use server";

import { revalidatePath } from "next/cache";
import { ApiError, api } from "@/lib/api/client";
import type { CheckoutOrder, CheckoutResult } from "@/lib/api/billing";
import { isUuid } from "@/lib/tenant-admin";

/* Razorpay checkout from the Plans page. The server prices every purchase; the browser only says
   what was picked, then hands back what Razorpay returned so the server can check its signature.
   Both calls are admin-only at billing-metering-service. */

export type CheckoutInput =
  | { kind: "plan"; plan_code: "pro" | "ultra" | "payg" }
  | { kind: "credits"; packs: number }
  | { kind: "settlement"; settlement_id: string };

function message(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return "Your session expired. Sign in again.";
    if (err.status === 403) return "Only workspace admins can change the plan or buy credits.";
    if (err.code === "PROVIDER_NOT_CONFIGURED") return "Payments are not set up on this server yet.";
    if (err.status === 409 || err.status === 422) return err.message || fallback;
    if (err.status === 404) return "That is no longer available. Refresh the page.";
  }
  return fallback;
}

function valid(input: CheckoutInput): boolean {
  if (input.kind === "plan") return ["pro", "ultra", "payg"].includes(input.plan_code);
  if (input.kind === "credits") return Number.isInteger(input.packs) && input.packs >= 1 && input.packs <= 50;
  return isUuid(input.settlement_id);
}

export async function startCheckout(input: CheckoutInput): Promise<{ ok: true; order: CheckoutOrder } | { ok: false; message: string }> {
  if (!valid(input)) return { ok: false, message: "That choice is not valid." };
  try {
    return { ok: true, order: await api<CheckoutOrder>("/billing/checkout", { method: "POST", body: input }) };
  } catch (err) {
    return { ok: false, message: message(err, "The payment could not be started. Try again in a moment.") };
  }
}

export async function confirmCheckout(paid: {
  order_id: string;
  payment_id: string;
  signature: string;
}): Promise<{ ok: true; result: CheckoutResult } | { ok: false; message: string }> {
  const clean = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= 128 ? v : null);
  const order_id = clean(paid.order_id);
  const payment_id = clean(paid.payment_id);
  const signature = clean(paid.signature);
  if (!order_id || !payment_id || !signature) return { ok: false, message: "The payment reply was incomplete." };
  try {
    const result = await api<CheckoutResult>("/billing/checkout/verify", {
      method: "POST",
      body: { order_id, payment_id, signature },
    });
    // The plan, the allowance and the AI-paused banner all change at once.
    revalidatePath("/", "layout");
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      message: message(
        err,
        `Razorpay took the payment but Mytheus could not confirm it. Nothing was applied yet; contact support with payment ${payment_id}.`,
      ),
    };
  }
}
