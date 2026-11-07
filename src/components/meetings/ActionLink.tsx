import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "accent" | "dark" | "ghost";
type Size = "sm" | "md";

/* Link-styled buttons for the meeting screens. Each has hover, focus-visible (the shared
   `.mx-app :focus-visible` ring) and a pressed state. Coral is the single accent; the dark pill is
   the calm primary. Class strings are written out in full so Tailwind can see them. */
const VARIANT: Record<Variant, string> = {
  accent:
    "bg-signal-deep text-white hover:brightness-110 [.mx-app[data-theme=dark]_&]:text-bg",
  dark: "bg-pill text-white hover:opacity-90",
  ghost: "border border-line-2 bg-transparent text-ink hover:bg-surface",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-11 px-5 text-[14px]",
};

export function ActionLink({
  href,
  variant = "dark",
  size = "md",
  children,
  className = "",
  ariaLabel,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-semibold transition-[background-color,color,opacity,filter,transform] duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {children}
    </Link>
  );
}
