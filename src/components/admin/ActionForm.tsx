"use client";

import { useEffect, type ReactNode } from "react";
import { useFormState } from "react-dom";
import type { FormResult } from "@/app/actions/tenant-admin";
import { notifyError, notifySuccess } from "@/lib/toast";

/* A form bound to a `useFormState` server action that answers with `FormResult`. It posts without
   client JS (progressive enhancement); with JS, the server's answer arrives as a toast: `success`
   (the submit button's own verb, "Access saved") with the server's line under it, or the server's
   reason when it refused. The inputs and the submit button are passed in as children, so the
   surrounding page stays a server component. */
export function ActionForm({
  action,
  children,
  className = "",
  success,
}: {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  children: ReactNode;
  className?: string;
  /** the toast title on success; the server's message becomes its second line */
  success?: string;
}) {
  const [state, formAction] = useFormState(action, null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (success && success !== state.message) notifySuccess(success, { description: state.message });
      else notifySuccess(state.message);
    } else notifyError(state.message);
  }, [state, success]);
  return (
    <form action={formAction} className={className}>
      {children}
    </form>
  );
}
