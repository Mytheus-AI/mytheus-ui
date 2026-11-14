"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { confirmCheckout, startCheckout, type CheckoutInput } from "@/app/actions/billing";
import { notifyError, notifySuccess } from "@/lib/toast";

/* One purchase through Razorpay Checkout: the server opens the order (and prices it), Razorpay's
   own modal takes the payment, and the server checks the signature before anything changes. The
   modal wears the product: the coral accent, the Mytheus mark, the signed-in admin prefilled. */

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpayReply = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

let loading: Promise<RazorpayCtor> | null = null;

function loadRazorpay(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  loading ??= new Promise<RazorpayCtor>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Razorpay did not load")));
    s.onerror = () => {
      loading = null;
      reject(new Error("Razorpay could not be reached"));
    };
    document.body.appendChild(s);
  });
  return loading;
}

function accent(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--signal-line").trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v : "#d97757";
}

export function CheckoutButton({
  input,
  children,
  variant = "primary",
  size = "md",
  className = "",
  prefill,
  successMessage,
  disabled = false,
}: {
  input: CheckoutInput;
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  prefill?: { name?: string; email?: string };
  successMessage: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    setBusy(true);
    const started = await startCheckout(input);
    if (!started.ok) {
      notifyError(started.message);
      setBusy(false);
      return;
    }
    let Razorpay: RazorpayCtor;
    try {
      Razorpay = await loadRazorpay();
    } catch {
      notifyError("The payment window could not be opened. Check your connection and try again.");
      setBusy(false);
      return;
    }
    const { order } = started;
    const rzp = new Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: "Mytheus",
      description: order.description,
      image: `${window.location.origin}/logo-mark-192.png`,
      prefill: { name: prefill?.name ?? "", email: prefill?.email ?? "" },
      theme: { color: accent() },
      modal: { ondismiss: () => setBusy(false), backdropclose: false },
      handler: async (reply: RazorpayReply) => {
        const done = await confirmCheckout({
          order_id: reply.razorpay_order_id,
          payment_id: reply.razorpay_payment_id,
          signature: reply.razorpay_signature,
        });
        setBusy(false);
        if (done.ok) {
          notifySuccess(successMessage);
          router.refresh();
        } else {
          notifyError(done.message);
        }
      },
    });
    rzp.on("payment.failed", (r) => {
      notifyError(r.error?.description ? `The payment failed: ${r.error.description}` : "The payment failed. Nothing was charged.");
      setBusy(false);
    });
    rzp.open();
  };

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={pay} disabled={busy || disabled} aria-busy={busy}>
      {busy ? "Opening checkout…" : children}
    </Button>
  );
}
