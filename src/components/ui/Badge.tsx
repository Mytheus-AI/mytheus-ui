import type { ReactNode } from "react";
import { Chip, type ChipTone } from "./Chip";

/* Kept for older call sites (the meeting room among them): a Badge is a Chip with the old tone
   names. New code uses `Chip` directly. */

type Tone = "default" | "success" | "warning" | "danger" | "high" | "medium" | "low";

const TONE: Record<Tone, ChipTone> = {
  default: "neutral",
  success: "ok",
  warning: "medium",
  danger: "high",
  high: "high",
  medium: "medium",
  low: "low",
};

export function Badge({ tone = "default", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <Chip tone={TONE[tone]} className={className}>
      {children}
    </Chip>
  );
}
