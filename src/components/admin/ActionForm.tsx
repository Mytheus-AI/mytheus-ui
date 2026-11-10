"use client";

import type { ReactNode } from "react";
import { useFormState } from "react-dom";
import type { FormResult } from "@/app/actions/tenant-admin";

/* A form bound to a `useFormState` server action that answers with `FormResult`. It posts without
   client JS (progressive enhancement) and shows the server's answer next to the controls. The
   inputs and the submit button are passed in as children, so the surrounding page stays a server
   component. */
export function ActionForm({
  action,
  children,
  className = "",
  messageClassName = "",
}: {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  children: ReactNode;
  className?: string;
  messageClassName?: string;
}) {
  const [state, formAction] = useFormState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state ? (
        <span
          role={state.ok ? "status" : "alert"}
          className={`text-[13px] ${state.ok ? "text-ink-3" : "text-priority-high"} ${messageClassName}`}
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
