"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../../src/components/ui/Button";

/* FormSubmit without `useFormStatus` (React 18, which the component tests mount, does not have
   it): the same button, the same confirm step for destructive submits, no pending state. The
   form's action is a stub from stubs/actions.ts, so a submit records the call and goes nowhere. */
export function FormSubmit({
  children,
  confirmLabel,
  variant = "outline",
  size = "sm",
  disabled,
  ariaLabel,
  destructive = false,
}: {
  children: ReactNode;
  pendingLabel?: string;
  confirmLabel?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  ariaLabel?: string;
  destructive?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      type="submit"
      variant={armed ? "danger" : destructive ? "danger-outline" : variant}
      size={size}
      disabled={disabled}
      aria-label={armed ? undefined : ariaLabel}
      onClick={(e) => {
        if (confirmLabel && !armed) {
          e.preventDefault();
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
