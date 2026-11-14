/** How fast the Myte speaks, kept on this device (core-api stores no speed for it). Pure. */

export const SPEED_KEY = "mytheus.myte-voice.speed";
export const DEFAULT_SPEED = 1;
export const SPEED_STEPS = [0.8, 0.9, 1, 1.1, 1.2] as const;

export function nearestStep(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_SPEED;
  return SPEED_STEPS.reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), DEFAULT_SPEED as number);
}

export function speedName(v: number): string {
  if (v <= 0.8) return "Slowest";
  if (v < 1) return "Slower";
  if (v === 1) return "Normal";
  if (v < 1.2) return "Faster";
  return "Fastest";
}
