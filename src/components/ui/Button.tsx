import Link from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "danger-outline";
type Size = "sm" | "md" | "lg";

/* Every dark (primary) control in the app goes through this button: one dark primary per view,
   three heights only (sm 36, md 44, lg 52). `secondary` is kept as an alias of primary for older
   call sites; `outline` is the quiet bordered button; `ghost` has no edge until hover; `danger` is
   the solid destructive button and `danger-outline` its quiet form (red text and edge, a red wash
   on hover). No hover lift: feedback is the colour change, and a press settles by 2% only when
   motion is allowed. */
const variantClass: Record<Variant, string> = {
  primary: "border border-pill bg-pill text-pill-on hover:bg-pill-2",
  secondary: "border border-pill bg-pill text-pill-on hover:bg-pill-2",
  outline: "border border-line-2 bg-surface text-ink hover:bg-surface-2",
  ghost: "border border-transparent bg-transparent text-ink-2 hover:bg-bg-2 hover:text-ink",
  // The label takes the surface colour so it stays AA on the red in both themes.
  danger: "border border-priority-high bg-priority-high text-surface hover:opacity-90",
  "danger-outline":
    "border border-[color:color-mix(in_srgb,var(--priority-high)_45%,var(--line))] bg-transparent text-priority-high hover:bg-priority-high-soft",
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[14px]",
  md: "h-11 px-[18px] text-[15px]",
  lg: "h-[52px] px-6 text-[15px]",
};

/** Icon-only squares at the same three heights. */
const iconSizeClass: Record<Size, string> = {
  sm: "h-9 w-9 px-0 text-[14px]",
  md: "h-11 w-11 px-0 text-[15px]",
  lg: "h-[52px] w-[52px] px-0 text-[15px]",
};

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-ctl font-semibold leading-none transition-[background-color,color,border-color,opacity,transform] duration-150 motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  /** a square icon-only button; give it an aria-label */
  icon?: boolean;
  children: ReactNode;
  className?: string;
};

export function buttonClass({
  variant = "primary",
  size = "md",
  icon = false,
  className = "",
}: { variant?: Variant; size?: Size; icon?: boolean; className?: string } = {}) {
  return `${base} ${variantClass[variant]} ${icon ? iconSizeClass[size] : sizeClass[size]} ${className}`;
}

export const Button = forwardRef<HTMLButtonElement, CommonProps & ButtonHTMLAttributes<HTMLButtonElement>>(function Button(
  { variant = "primary", size = "md", icon = false, children, className = "", ...rest },
  ref,
) {
  return (
    <button ref={ref} className={buttonClass({ variant, size, icon, className })} {...rest}>
      {children}
    </button>
  );
});

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  icon = false,
  children,
  className = "",
  prefetch,
  ...rest
}: CommonProps & { href: string; prefetch?: boolean } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} prefetch={prefetch} className={buttonClass({ variant, size, icon, className })} {...rest}>
      {children}
    </Link>
  );
}
