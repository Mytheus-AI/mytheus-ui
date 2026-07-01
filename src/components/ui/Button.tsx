import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "bg-signal text-white hover:bg-signal-deep",
  secondary: "bg-pill text-white hover:opacity-90",
  outline: "pill-surface text-ink-2 hover:text-ink",
  ghost: "bg-transparent text-ink-2 hover:bg-bg-2",
  danger: "bg-[#b3432f] text-white hover:opacity-90",
};

const sizeClass: Record<Size, string> = {
  sm: "px-4 py-2 text-[13px]",
  md: "px-5 py-2.5 text-[14px]",
  lg: "px-7 py-3.5 text-[15px]",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium tracking-tight transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

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
