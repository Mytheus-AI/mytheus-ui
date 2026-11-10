"use client";

import type { ReactNode } from "react";
import { useFormState } from "react-dom";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import type { FormResult } from "@/app/actions/tenant-admin";

/* A form bound to a `useFormState` server action that answers with `FormResult`. It posts without
   client JS (progressive enhancement) and shows the server's answer next to the controls: a green
   line with a check when it worked, a red line with a warning when it did not. The inputs and the
   submit button are passed in as children, so the surrounding page stays a server component. */
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
          className={`inline-flex items-start gap-1.5 text-[14px] font-medium ${state.ok ? "text-ok" : "text-priority-high"} ${messageClassName}`}
        >
          {state.ok ? (
            <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
          )}
          <span>{state.message}</span>
        </span>
      ) : null}
    </form>
  );
}
