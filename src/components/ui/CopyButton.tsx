"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { Button } from "./Button";
import { notifyError } from "@/lib/toast";

/* Copy a value to the clipboard. The button says what it copies ("Copy token", "Copy URL"), turns
   into "Copied" for two seconds, and announces it through a polite live region, so a screen
   reader user hears the result without a toast stealing focus. When the clipboard is refused (an
   insecure origin, a denied permission) it says so instead of pretending. */
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  variant = "outline",
  size = "sm",
  iconOnly = false,
  ariaLabel,
  className = "",
}: {
  value: string;
  /** visible label, also the accessible name when `iconOnly` */
  label?: string;
  copiedLabel?: string;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
  iconOnly?: boolean;
  /** a fuller accessible name when the visible label is short ("Copy" beside a snippet) */
  ariaLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      notifyError("Could not copy to the clipboard", { description: "Select the text and copy it yourself." });
    }
  };

  const Glyph = copied ? Check : Copy;
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        icon={iconOnly}
        onClick={() => void copy()}
        aria-label={copied ? (iconOnly || ariaLabel ? copiedLabel : undefined) : iconOnly ? (ariaLabel ?? label) : ariaLabel}
        className={className}
      >
        <Glyph size={16} weight={copied ? "bold" : "regular"} aria-hidden />
        {iconOnly ? null : copied ? copiedLabel : label}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
    </>
  );
}
