"use client";

import { useId, useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";

/* A side-panel section with a collapsible body, ported from the meeting design. The body stays
   mounted while collapsed (it animates `grid-template-rows`), so state inside it survives. */
export function CollapseSection({
  title,
  countChip,
  actions,
  children,
  defaultOpen = true,
  className,
}: {
  title: ReactNode;
  countChip?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <div className={className}>
      <div className="section-label" style={{ paddingBottom: 8 }}>
        <button
          type="button"
          className="collapse-toggle tap"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          <CaretDown size={12} weight="bold" className="collapse-chev" aria-hidden />
          {title}
          {countChip}
        </button>
        {actions ? <div className="label-actions">{actions}</div> : null}
      </div>
      <div className={`collapse-body${open ? "" : " is-closed"}`} id={bodyId}>
        <div className="collapse-inner">{children}</div>
      </div>
    </div>
  );
}
