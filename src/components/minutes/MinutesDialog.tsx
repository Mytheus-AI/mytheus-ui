"use client";

import { useId, useRef, type ReactNode, type RefObject } from "react";
import { X } from "@phosphor-icons/react";
import { useDialogKeys } from "@/components/meetings/useDialogKeys";

/* The dialog the share and follow-up flows open: the meetings dialog frame (`mh-new`), wider,
   with Escape to close, Tab kept inside, focus placed on open and returned to the opener by the
   caller's `onClose`. */

export function MinutesDialog({
  open,
  title,
  lead,
  onClose,
  children,
  actions,
  wide = false,
  initialFocus,
}: {
  open: boolean;
  title: string;
  lead?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
  /** CSS selector inside the dialog to focus when it opens (default: the first field). */
  initialFocus?: string;
}) {
  const ids = useId();
  const ref = useRef<HTMLDivElement>(null);
  useDialogKeys(ref as RefObject<HTMLElement>, open, onClose, () =>
    ref.current
      ?.querySelector<HTMLElement>(initialFocus ?? "input, textarea, select, button:not(.mn-dialog-x)")
      ?.focus(),
  );
  if (!open) return null;
  return (
    <div className="mh-new-layer">
      <button type="button" className="mh-new-scrim" aria-label="Close" onClick={onClose} tabIndex={-1} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-h`}
        aria-describedby={lead ? `${ids}-d` : undefined}
        className={`mh-new mn-dialog${wide ? " is-wide" : ""}`}
      >
        <div className="mh-new-head">
          <h2 id={`${ids}-h`}>{title}</h2>
          <button type="button" className="cx-icon-btn sm tap mn-dialog-x" aria-label="Close" onClick={onClose}>
            <X size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>
        {lead ? (
          <p id={`${ids}-d`} className="mn-dialog-lead">
            {lead}
          </p>
        ) : null}
        <div className="mh-new-body">{children}</div>
        {actions ? <div className="mh-new-acts">{actions}</div> : null}
      </div>
    </div>
  );
}
