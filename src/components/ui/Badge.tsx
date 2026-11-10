import type { ReactNode } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "high" | "medium" | "low";

const toneClass: Record<Tone, string> = {
  default: "bg-bg-2 text-ink-2",
  success: "bg-ok-soft text-ok",
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
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12.5px] font-semibold leading-[1.35] ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
