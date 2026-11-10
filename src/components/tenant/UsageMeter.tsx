import { CheckCircle, Warning, WarningOctagon } from "@phosphor-icons/react/ssr";

/* One usage dimension against its plan limit: a single magnitude, so one bar in one hue (the dark
   control colour), the figure printed beside it, and the 80% and 95% alert thresholds as ticks
   with their labels underneath. Past a threshold the bar and the status line switch to the frozen
   priority language (amber attention, red act now), always with an icon and words, never colour
   alone. A dimension with no limit prints its figure and no bar. Server component. */

export const WARN = 0.8;
export const CRITICAL = 0.95;

export type Level = "ok" | "warn" | "critical" | "over";
export const levelOf = (ratio: number): Level =>
  ratio >= 1 ? "over" : ratio >= CRITICAL ? "critical" : ratio >= WARN ? "warn" : "ok";

export const formatNumber = (v: number) =>
  Number.isInteger(v) ? v.toLocaleString("en-US") : v.toLocaleString("en-US", { maximumFractionDigits: 1 });

/** 0.472 -> "47.2%", 0.5 -> "50%". */
export const formatPercent = (ratio: number) => {
  const p = Math.round(ratio * 1000) / 10;
  return `${Number.isInteger(p) ? p : p.toFixed(1)}%`;
};

const fillClass: Record<Level, string> = {
  ok: "bg-pill",
  warn: "bg-priority-medium",
  critical: "bg-priority-high",
  over: "bg-priority-high",
};

export function LevelLabel({ level, okText = "Within plan" }: { level: Level; okText?: string }) {
  if (level === "ok")
    return (
      <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-3">
        <CheckCircle size={16} weight="fill" aria-hidden />
        {okText}
      </span>
    );
  const Icon = level === "warn" ? Warning : WarningOctagon;
  const cls = level === "warn" ? "text-priority-medium" : "text-priority-high";
  const text = level === "warn" ? "Past 80% of the plan" : level === "critical" ? "Past 95% of the plan" : "Over the plan";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[14px] font-semibold ${cls}`}>
      <Icon size={16} weight="fill" aria-hidden />
      {text}
    </span>
  );
}

export function MeterBar({ label, used, included }: { label: string; used: number; included: number }) {
  const ratio = included ? used / included : 0;
  const level = levelOf(ratio);
  return (
    <div>
      <div
        className="relative h-3 rounded-full bg-bg-2"
        role="meter"
        aria-label={`${label} used`}
        aria-valuemin={0}
        aria-valuemax={included}
        aria-valuenow={Math.min(used, included)}
        aria-valuetext={`${formatNumber(used)} of ${formatNumber(included)}, ${formatPercent(ratio)}`}
      >
        <div
          className={`h-full rounded-full ${fillClass[level]} ${used > 0 ? "min-w-3" : ""}`}
          style={{ width: `${Math.min(ratio, 1) * 100}%` }}
        />
        {[WARN, CRITICAL].map((t) => (
          <span
            key={t}
            aria-hidden
            className="absolute -top-[3px] h-[18px] w-[2px] rounded-full bg-ink-4 ring-2 ring-surface"
            style={{ left: `${t * 100}%` }}
          />
        ))}
      </div>
      <div className="relative mt-1.5 h-5 text-[12.5px] font-semibold text-ink-3" aria-hidden>
        <span className="absolute left-0 top-0.5">0</span>
        {[WARN, CRITICAL].map((t) => (
          <span key={t} className="absolute top-0.5 -translate-x-1/2" style={{ left: `${t * 100}%` }}>
            {formatPercent(t)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function UsageMeter({
  label,
  unit,
  used,
  included,
}: {
  label: string;
  unit: string;
  used: number;
  /** null: the plan sets no limit for this dimension */
  included: number | null;
}) {
  if (included === null || included <= 0) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-[18px] sm:px-[22px]">
        <p className="text-[15px] font-semibold text-ink">{label}</p>
        <p className="text-[14px] tabular-nums text-ink-2">
          <span className="font-semibold text-ink">{formatNumber(used)}</span> {unit}
          <span className="ml-2 text-ink-3">No plan limit</span>
        </p>
      </div>
    );
  }
  const ratio = used / included;
  return (
    <div className="px-4 py-[18px] sm:px-[22px]">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[15px] font-semibold text-ink">{label}</p>
        <p className="text-[14px] tabular-nums text-ink-2">
          <span className="font-semibold text-ink">{formatNumber(used)}</span> of {formatNumber(included)} {unit}
          <span className="ml-2 text-ink-3">{formatPercent(ratio)}</span>
        </p>
      </div>
      <MeterBar label={label} used={used} included={included} />
      <div className="mt-1">
        <LevelLabel
          level={levelOf(ratio)}
          okText={`${formatNumber(Math.max(included - used, 0))} ${unit} left this period`}
        />
      </div>
    </div>
  );
}

/** "2026-11" -> "November 2026". */
export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}
