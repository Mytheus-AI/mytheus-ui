"use client";

/* Switch used by the settings panels. The ::before pseudo pads the hit area to ~40px without
   growing the visual. Off state carries a visible border so it holds 3:1 against the card. */
export function Toggle({
  checked,
  onChange,
  labelledBy,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelledBy?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-[42px] shrink-0 items-center rounded-full transition-colors duration-200 before:absolute before:-inset-2 before:content-[''] hover:brightness-95 active:brightness-90 focus-visible:!rounded-full ${
        checked ? "bg-signal" : "bg-bg-3 ring-1 ring-inset ring-ink-3"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200 motion-reduce:transition-none ${
          checked ? "translate-x-[21px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}
