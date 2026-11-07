import type { ReactNode } from "react";

/* A composed empty state: icon, plain headline, one specific sentence, optional action. Used where
   the screen has nothing to show yet, so a blank card never reads as broken. */
export function PanelEmpty({
  icon,
  title,
  description,
  action,
  className = "",
  role,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <div
      role={role}
      className={`flex flex-col items-center rounded-card border border-line bg-surface px-6 py-12 text-center ${className}`}
    >
      <span aria-hidden className="mb-3 text-ink-3">
        {icon}
      </span>
      <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-[44ch] text-[14px] text-ink-3">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
