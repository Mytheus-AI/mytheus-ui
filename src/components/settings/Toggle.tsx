"use client";

/* Switch used by the settings panels. Tokens only, so it reads in both themes:
   - off: an outlined track (ink-3 edge, 3:1 against the card) with an ink-3 knob on the left;
   - on: a coral track with a surface-coloured knob on the right.
   State never rests on colour alone: the knob moves. The ::before pseudo pads the hit area to
   40px without growing the visual. Motion is 200ms and disappears under reduced motion. */
export function Toggle({
  checked,
  onChange,
  labelledBy,
  describedBy,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelledBy?: string;
  describedBy?: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-[42px] shrink-0 items-center rounded-full border-2 transition-colors duration-200 ease-[var(--ease-out)] before:absolute before:-inset-2 before:content-[''] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${
        checked ? "border-signal bg-signal hover:border-signal-deep hover:bg-signal-deep" : "border-ink-3 bg-surface hover:bg-bg-2"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 rounded-full shadow-warm-1 transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none ${
          checked ? "translate-x-[20px] bg-surface" : "translate-x-[2px] bg-ink-3"
        }`}
      />
    </button>
  );
}
