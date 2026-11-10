import type { ReactNode } from "react";
import { CheckCircle, Info, WarningCircle, WarningOctagon } from "@phosphor-icons/react/ssr";

/* A quiet inline notice that stays on the page (a read-only explanation, a limit, a partial
   failure). Not a toast: toasts answer an action and leave; a Note describes the page. `warning`
   and `error` use the frozen priority colours, `success` the ok green. */
export function Note({
  tone = "info",
  children,
  className = "",
}: {
  tone?: "info" | "warning" | "error" | "success";
  children: ReactNode;
  className?: string;
}) {
  const toneClass = {
    info: "bg-bg-2 text-ink-2",
    warning: "bg-priority-medium-soft text-priority-medium",
    error: "bg-priority-high-soft text-priority-high",
    success: "bg-ok-soft text-ok",
  }[tone];
  const Icon = { info: Info, warning: WarningCircle, error: WarningOctagon, success: CheckCircle }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`flex items-start gap-2.5 rounded-ctl px-3.5 py-3 text-[14px] leading-relaxed ${toneClass} ${className}`}
    >
      <Icon size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
