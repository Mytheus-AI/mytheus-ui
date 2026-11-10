import type { HTMLAttributes } from "react";

/* A surface. Priority is shown by a Badge or an icon on the content (frozen colour language: red =
   act now, yellow = attention, blue = info), never by a coloured edge bar. */
export function Card({
  className = "",
  children,
  ...rest
}: {
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`relative overflow-hidden rounded-card border border-line bg-surface p-5 shadow-warm-1 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
