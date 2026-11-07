import type { ReactNode } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "high" | "medium" | "low";

const toneClass: Record<Tone, string> = {
  default: "bg-bg-2 text-ink-2",
  success: "bg-[var(--ok-soft,#e4efe1)] text-[var(--ok,#3a6b34)]",
  warning: "bg-priority-medium-soft text-priority-medium",
  danger: "bg-priority-high-soft text-priority-high",
  high: "bg-priority-high-soft text-priority-high",
  medium: "bg-priority-medium-soft text-priority-medium",
  low: "bg-priority-low-soft text-priority-low",
};

export function Badge({
  tone = "default",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-[12px] font-medium tracking-tight ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
