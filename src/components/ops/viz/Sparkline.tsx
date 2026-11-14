/* A trend line for a figure: the last points as a thin line in the de-emphasis ink, the current
   point in coral. Decorative beside a printed figure and its change, so it is hidden from
   assistive tech; the page states the numbers in text. Server-safe. */

export function Sparkline({ values, width = 116, height = 34 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const pad = 4;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const x = (i: number) => pad + (i * (width - pad * 2)) / (values.length - 1);
  const y = (v: number) => pad + (height - pad * 2) * (1 - (v - min) / (max - min || 1));
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="block shrink-0 overflow-visible">
      <path d={`${line} L${x(last)},${height - pad} L${x(0)},${height - pad} Z`} fill="var(--pill)" fillOpacity={0.06} />
      <path d={line} fill="none" stroke="var(--ink-4)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(values[last])} r={4} fill="var(--signal)" stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}
