// lib/ml/dataset.ts
import type { DailyRecord } from "../types";

export const BASELINE_WINDOW_DAYS = 14;
export const BASELINE_K = 0.75;

// Features are z-scored vs rolling baseline at time t (window ending at t).
export type FeatureRow = {
  date: string; // day t
  x: number[];
  yLbiDrop: 0 | 1; // label for day t+1
  yRecoveryDrop: 0 | 1; // label for day t+1
};

export const FEATURE_NAMES = [
  "recovery_z",
  "sleep_hours_z",
  "strain_z",
  "mood_z",
  "stress_z",
  "lbi_z",
] as const;

type FeatureName = (typeof FEATURE_NAMES)[number];

function mean(xs: number[]) {
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

function std(xs: number[]) {
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / xs.length;
  return Math.sqrt(v);
}

function clampStd(s: number) {
  return Math.max(1e-3, s);
}

function zscore(v: number, m: number, s: number) {
  return (v - m) / clampStd(s);
}

function stressToScore(r: DailyRecord): number | null {
  const ci = r.checkIn;
  if (!ci?.stressIndicators) return null;
  const vals = Object.values(ci.stressIndicators);
  const count = vals.filter(Boolean).length;
  return count / vals.length; // 0..1
}

function moodToScore(r: DailyRecord): number | null {
  const m = r.checkIn?.mood;
  return typeof m === "number" ? (m - 1) / 3 : null; // 0..1
}

function byDateAsc(a: DailyRecord, b: DailyRecord) {
  return a.date.localeCompare(b.date);
}

type StatWindow = { m: number; s: number };

function stats(values: number[]): StatWindow | null {
  if (values.length < Math.min(7, BASELINE_WINDOW_DAYS)) return null;
  const m = mean(values);
  const s = std(values);
  return { m, s: clampStd(s) };
}

/**
 * Build supervised rows for two tasks:
 * - Predict whether LBI_(t+1) drops below baseline_LBI(t) - k*std
 * - Predict whether Recovery_(t+1) drops below baseline_Recovery(t) - k*std
 *
 * Requires:
 * - wearable (recovery/sleep/strain) for t and t+1
 * - lbi for t and t+1
 * - check-in mood/stress for t (optional: if missing, row is dropped)
 */
export function buildDataset(records: DailyRecord[]): FeatureRow[] {
  const all = records
    .filter((r) => !!r.wearable && typeof r.lbi === "number")
    .slice()
    .sort(byDateAsc);

  const rows: FeatureRow[] = [];

  // Helper to pull a rolling window ending at index i (inclusive)
  const windowVals = (i: number, getter: (r: DailyRecord) => number | null): number[] => {
    const start = Math.max(0, i - (BASELINE_WINDOW_DAYS - 1));
    const vals: number[] = [];
    for (let j = start; j <= i; j++) {
      const v = getter(all[j]);
      if (typeof v === "number" && Number.isFinite(v)) vals.push(v);
    }
    return vals;
  };

  for (let i = 0; i < all.length - 1; i++) {
    const t = all[i];
    const t1 = all[i + 1];

    // Require consecutive dates? Not strictly; but labels become noisy if big gaps.
    // We'll allow up to 3 days gap.
    const gapDays = Math.round((Date.parse(t1.date) - Date.parse(t.date)) / 86400000);
    if (gapDays < 1 || gapDays > 3) continue;

    const rec_t = t.wearable!.recovery;
    const sleep_t = t.wearable!.sleepHours;
    const strain_t = t.wearable!.strain;
    const lbi_t = t.lbi as number;

    const mood_t = moodToScore(t);
    const stress_t = stressToScore(t);

    // Require mood+stress to be present to keep the model aligned to your app's purpose.
    if (mood_t == null || stress_t == null) continue;

    const lbiWindow = windowVals(i, (r) => (typeof r.lbi === "number" ? (r.lbi as number) : null));
    const recWindow = windowVals(i, (r) => (r.wearable ? r.wearable.recovery : null));
    const sleepWindow = windowVals(i, (r) => (r.wearable ? r.wearable.sleepHours : null));
    const strainWindow = windowVals(i, (r) => (r.wearable ? r.wearable.strain : null));
    const moodWindow = windowVals(i, (r) => moodToScore(r));
    const stressWindow = windowVals(i, (r) => stressToScore(r));

    const lbiStats = stats(lbiWindow);
    const recStats = stats(recWindow);
    const sleepStats = stats(sleepWindow);
    const strainStats = stats(strainWindow);
    const moodStats = stats(moodWindow);
    const stressStats = stats(stressWindow);

    if (!lbiStats || !recStats || !sleepStats || !strainStats || !moodStats || !stressStats) continue;

    const x = [
      zscore(rec_t, recStats.m, recStats.s),
      zscore(sleep_t, sleepStats.m, sleepStats.s),
      zscore(strain_t, strainStats.m, strainStats.s),
      zscore(mood_t, moodStats.m, moodStats.s),
      zscore(stress_t, stressStats.m, stressStats.s),
      zscore(lbi_t, lbiStats.m, lbiStats.s),
    ];

    const lbiDropThresh = lbiStats.m - BASELINE_K * lbiStats.s;
    const recDropThresh = recStats.m - BASELINE_K * recStats.s;

    const yLbiDrop: 0 | 1 = ((t1.lbi as number) < lbiDropThresh ? 1 : 0);
    const yRecoveryDrop: 0 | 1 = (t1.wearable!.recovery < recDropThresh ? 1 : 0);

    rows.push({ date: t.date, x, yLbiDrop, yRecoveryDrop });
  }

  return rows;
}
