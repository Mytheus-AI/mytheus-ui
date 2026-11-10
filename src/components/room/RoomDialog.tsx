"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/* A modal dialog for the room (End for everyone's confirm step), on the native <dialog>: the
   browser makes the rest of the page inert, traps focus inside, closes on Escape and returns focus
   to whatever opened it. */

export function RoomDialog({
  open,
  onClose,
  title,
  children,
  tone = "default",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === "function") el.showModal();
      else el.setAttribute("open", "");
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`room-dialog${tone === "danger" ? " is-danger" : ""}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {open ? (
        <>
          <h2 id={titleId}>{title}</h2>
          {children}
        </>
      ) : null}
    </dialog>
  );
}
