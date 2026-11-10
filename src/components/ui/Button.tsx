import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

/* One dark primary per view. `secondary` is kept as an alias of primary for older call sites;
   `outline` is the quiet bordered button; `ghost` has no edge until hover. */
const variantClass: Record<Variant, string> = {
  primary: "border border-pill bg-pill text-pill-on hover:bg-pill-2 hover:shadow-warm-2 active:shadow-none",
  secondary: "border border-pill bg-pill text-pill-on hover:bg-pill-2 hover:shadow-warm-2 active:shadow-none",
  outline: "border border-line-2 bg-surface text-ink hover:bg-surface-2",
  ghost: "border border-transparent bg-transparent text-ink-2 hover:bg-bg-2 hover:text-ink",
  danger: "border border-priority-high bg-priority-high text-[var(--danger-on)] hover:opacity-90",
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[14px]",
  md: "h-11 px-[18px] text-[15px]",
  lg: "h-[52px] px-6 text-[16px]",
};

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-ctl font-semibold leading-none transition-[background-color,box-shadow,transform,color] duration-150 hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:opacity-50";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${base} ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={`${base} ${variantClass[variant]} ${sizeClass[size]} ${className}`}
    >
      {children}
    </Link>
  );
}
