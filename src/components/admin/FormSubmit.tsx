"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

/* The submit button for server-action forms: shows the pending label while the action runs, and,
   with `confirmLabel`, asks for a second press before an irreversible submit (disconnect, remove,
   suspend). The confirm step resets after a few seconds. Without client JavaScript the form still
   submits on the first press, which is the plain-HTML fallback for a form action. */
export function FormSubmit({
  children,
  pendingLabel = "Working...",
  confirmLabel,
  variant = "outline",
  size = "sm",
  disabled,
  ariaLabel,
}: {
  children: ReactNode;
  pendingLabel?: string;
  confirmLabel?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <Button
      type="submit"
      variant={armed ? "danger" : variant}
      size={size}
      disabled={disabled || pending}
      aria-label={armed ? undefined : ariaLabel}
      onClick={(e) => {
        if (confirmLabel && !armed) {
          e.preventDefault();
          setArmed(true);
        }
      }}
    >
      {pending ? pendingLabel : armed ? confirmLabel : children}
    </Button>
  );
}
