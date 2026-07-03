import type { HTMLAttributes } from "react";

/* Frozen priority color language: red = act now, yellow = attention,
   blue = info. The priorityStrip renders as a thin left-edge bar; a "high"
   strip pins above other cards in a list regardless of arrival order. */
const stripClass: Record<"high" | "medium" | "low", string> = {
  high: "before:bg-priority-high",
  medium: "before:bg-priority-medium",
  low: "before:bg-priority-low",
};

export function Card({
  priorityStrip,
  className = "",
  children,
  ...rest
}: {
  priorityStrip?: "high" | "medium" | "low";
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`relative overflow-hidden rounded-card border border-line bg-surface p-5 ${
        priorityStrip
          ? `pl-6 before:absolute before:inset-y-0 before:left-0 before:w-1.5 ${stripClass[priorityStrip]}`
          : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
