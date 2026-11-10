"use client";

import { Toaster as Sonner } from "sonner";
import { CheckCircle, Info, WarningCircle } from "@phosphor-icons/react";

/* The one toast surface (Sonner, unstyled, drawn with the app tokens so it follows light and dark
   with the rest of `.mx-app`). Mounted once by the app shell and the admin layout. Toasts answer
   an action with the button's own verb ("Decision confirmed") and offer Undo where the action can
   be undone; see `@/lib/toast`. Bottom right on desktop, full width at the bottom on phones. Toasts
   are announced politely by Sonner's live region. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      offset={24}
      mobileOffset={16}
      gap={10}
      visibleToasts={3}
      containerAriaLabel="Notifications"
      icons={{
        success: <CheckCircle size={20} weight="fill" className="text-ok" aria-hidden />,
        error: <WarningCircle size={20} weight="fill" className="text-priority-high" aria-hidden />,
        info: <Info size={20} weight="fill" className="text-priority-low" aria-hidden />,
        warning: <WarningCircle size={20} weight="fill" className="text-priority-medium" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "mx-toast flex w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-ink shadow-warm-3 sm:w-[380px]",
          content: "min-w-0 flex-1",
          title: "text-[15px] font-semibold leading-snug text-ink",
          description: "mt-0.5 text-[14px] leading-snug text-ink-3",
          icon: "flex shrink-0 items-center",
          actionButton:
            "inline-flex h-9 shrink-0 items-center rounded-ctl px-3 text-[14px] font-semibold text-signal-ink transition-colors hover:bg-signal-soft",
          cancelButton:
            "inline-flex h-9 shrink-0 items-center rounded-ctl px-3 text-[14px] font-semibold text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink",
          closeButton: "text-ink-3",
        },
      }}
    />
  );
}
