"use client";

import { useEffect, type RefObject } from "react";

/* Keyboard for the meetings dialogs (New meeting, Invite people): Escape closes, and Tab stays
   inside the open dialog instead of wandering into the page behind the scrim. `onOpen` runs once
   when the dialog opens, to place focus. */
export function useDialogKeys(
  ref: RefObject<HTMLElement>,
  open: boolean,
  close: () => void,
  onOpen?: () => void,
) {
  useEffect(() => {
    if (!open) return;
    onOpen?.();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const focusable = Array.from(
        ref.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // `close` and `onOpen` read state that changes while typing; re-binding on every keystroke of
    // the form is not needed, the dialog only needs these while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
