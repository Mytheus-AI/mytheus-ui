import type { ReactNode } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "high" | "medium" | "low";

const toneClass: Record<Tone, string> = {
  default: "bg-bg-2 text-ink-2",
  success: "bg-[#e4efe1] text-[#3a6b34]",
  warning: "bg-[#f7edd3] text-[#8a6a1c]",
  danger: "bg-[#f6e0da] text-[#a83f28]",
  high: "bg-[#f6e0da] text-[#a83f28]",
  medium: "bg-[#f7edd3] text-[#8a6a1c]",
  low: "bg-[#dfe9f4] text-[#2c5c8a]",
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
