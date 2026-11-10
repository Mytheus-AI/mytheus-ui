import { LogoMark } from "@/components/Logo";

/* The drawn mark beside "Mytheus" set in the display serif. The mark draws itself on mount and
   redraws on hover of any ancestor `.group` (see `.logo-path` in globals.css). */
export function Wordmark({
  size = 24,
  className = "",
  textClassName = "text-[22px]",
}: {
  size?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className={`wordmark leading-none text-ink ${textClassName}`}>Mytheus</span>
    </span>
  );
}
