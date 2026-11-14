/* The plans a workspace can be on, as the screens describe them. Pure: no server import.

   Prices and allowances are the server's (`GET /plans`, billing-metering-service); this file
   only names them, says what each is for and formats numbers. Two figures are mirrored here
   because no endpoint returns them yet; keep them equal to
   `services/billing_metering_service/payments.py` (`CREDIT_PACK_*`) and `payg.py`
   (`PAYG_CENTS_PER_MILLION`). */

export type PlanCode = "free" | "pro" | "ultra" | "payg" | "unlimited" | "enterprise";

/** What customers can pick; staff also have Unlimited (ops console only). */
export const CUSTOMER_PLANS: PlanCode[] = ["free", "pro", "ultra", "payg"];
export const STAFF_PLANS: PlanCode[] = ["free", "pro", "ultra", "payg", "unlimited"];

export const CREDIT_PACK_TOKENS = 100_000;
export const CREDIT_PACK_CENTS = 1_000;
export const PAYG_CENTS_PER_MILLION = 10_000;

/** A cap at or above this is "no cap" (Pay as you go, Unlimited: 10^15 on the server). */
const NO_CAP = 1e14;

export function isNoCap(tokens: number | null | undefined): boolean {
  return typeof tokens === "number" && tokens >= NO_CAP;
}

export const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  ultra: "Ultra",
  payg: "Pay as you go",
  unlimited: "Unlimited",
  enterprise: "Enterprise",
};

export function planLabel(code: string | null | undefined): string {
  if (!code) return "Unknown";
  return PLAN_LABEL[code] ?? code.charAt(0).toUpperCase() + code.slice(1);
}

export const PLAN_BLURB: Record<string, string> = {
  free: "Try every Myte with a small monthly allowance.",
  pro: "For a team that meets every day.",
  ultra: "For a company that runs on its meetings.",
  payg: "No cap. A deposit up front, settled on what you use.",
  unlimited: "Staff only, for testing. No cap and no charge.",
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function dollars(cents: number, exact = false): string {
  return (exact || cents % 100 !== 0 ? usd2 : usd).format(cents / 100);
}

export function tokensShort(n: number): string {
  return isNoCap(n) ? "No cap" : compact.format(n);
}
