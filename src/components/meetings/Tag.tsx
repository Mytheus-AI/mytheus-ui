import type { ReactNode } from "react";

/* The meeting design's tag pill (ported from the prototype's components/Tag.tsx). Styled by the
   .tag rules in meeting.css, so it only renders inside the .mx-meet scope. */
export function Tag({
  variant = "neutral",
  dot = false,
  children,
}: {
  variant?: "green" | "brown" | "orange" | "neutral";
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`tag tag-${variant}`}>
      {dot && <span className="tag-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
