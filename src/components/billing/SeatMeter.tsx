/* Seat usage bar. Server component. State is a text line as well as colour: amber from 80%,
   red from 95%, using the frozen priority language. */
export function SeatMeter({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const tone = pct >= 95 ? "high" : pct >= 80 ? "medium" : "ok";
  const remaining = Math.max(0, total - used);

  const fill = { high: "bg-priority-high", medium: "bg-priority-medium", ok: "bg-pill" }[tone];
  const stateClass = {
    high: "font-semibold text-priority-high",
    medium: "font-semibold text-priority-medium",
    ok: "text-ink-3",
  }[tone];
  const stateText =
    tone === "high"
      ? "Almost out of seats"
      : tone === "medium"
        ? "Seats are running low"
        : remaining === 1
          ? "1 seat available"
          : `${remaining} seats available`;

  return (
    <div className="px-4 py-[18px] sm:px-[22px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[14px] font-semibold text-ink">
          {used} of {total} seats used
        </p>
        <p className="text-[13.5px] text-ink-2">{pct}%</p>
      </div>
      <div
        role="progressbar"
        aria-label="Seats used"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={used}
        aria-valuetext={`${used} of ${total} seats used`}
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-bg-2"
      >
        <div
          className={`h-full rounded-full ${fill} transition-[width] duration-500 motion-reduce:transition-none`}
          style={{ width: `${pct}%`, minWidth: used > 0 ? 12 : 0 }}
        />
      </div>
      <p className={`mt-2 text-[13px] ${stateClass}`}>{stateText}</p>
    </div>
  );
}
