// lib/baseline.ts
//
// Personal baseline statistics for the user.
//
// I use this file to compute the rolling median + IQR of the user's own
// LBI, recovery, sleep, strain, mood and stress over the last `targetDays`
// days. The baseline is what makes the score *personal* — the home screen
// "calibrating" banner reads from it, the explain screen compares today
// vs baseline, and the ML recommender uses similar windowed statistics
// to z-score features.
//
// Status field: "calibrating" until I have at least `targetDays` days
// with an LBI AND that window is stable (IQR / |median| < 0.35). Until
// then, the home screen tells the user the score will read more
// reliably soon — important so early-day "low" scores are not
// misinterpreted as a real decline.

import { getAllDays } from "./storage";
import type { DailyRecord, WearableMetrics } from "./types";

type Stat = { median: number | null; iqr: number | null; n: number; coverage: number; stable?: boolean };

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[m - 1] + sorted[m]) / 2;
  return sorted[m];
}

function iqr(xs: number[]): number | null {
  if (xs.length < 4) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const q1 = sorted[Math.floor((sorted.length - 1) * 0.25)];
  const q3 = sorted[Math.floor((sorted.length - 1) * 0.75)];
  return q3 - q1;
}

function stat(values: number[], window: number): Stat {
  const valid = values.filter((v) => Number.isFinite(v));
  const med = median(valid);
  const spread = iqr(valid);
  const coverage = window === 0 ? 0 : Math.round((valid.length / window) * 100);
  const stable = med != null && spread != null ? spread / (Math.abs(med) || 1) < 0.35 : undefined;
  return { median: med ?? null, iqr: spread ?? null, n: valid.length, coverage, stable };
}

export type BaselineMeta = {
  baseline: Stat;
  recovery: Stat;
  sleepHours: Stat;
  strain: Stat;
  mood: Stat;
  stress: Stat;
  daysUsed: number;
  targetDays: number;
  status: "calibrating" | "stable";
};

function collectMetric(
  all: DailyRecord[],
  key: keyof WearableMetrics | "lbi",
  getter?: (r: DailyRecord) => number | undefined
) {
  if (getter) return all.map(getter).filter((v) => typeof v === "number") as number[];
  if (key === "lbi") return all.map((r) => r.lbi).filter((v) => typeof v === "number") as number[];
  return all
    .map((r) => (r.wearable ? (r.wearable as any)[key] : undefined))
    .filter((v) => typeof v === "number") as number[];
}

export async function computeBaseline(targetDays = 7, records?: DailyRecord[]) {
  const all = records ?? (await getAllDays());
  const recent = all.slice(-targetDays);

  const lbiVals = collectMetric(recent, "lbi");
  return stat(lbiVals, targetDays).median;
}

export async function computeBaselineMeta(targetDays = 7, records?: DailyRecord[]): Promise<BaselineMeta> {
  const all = records ?? (await getAllDays());
  const recent = all.slice(-targetDays);

  const lbiVals = collectMetric(recent, "lbi");
  const recVals = collectMetric(recent, "recovery");
  const sleepVals = collectMetric(recent, "sleepHours");
  const strainVals = collectMetric(recent, "strain");
  const moodVals = collectMetric(recent, "lbi", (r) => (r.checkIn ? (r.checkIn.mood - 1) / 4 : undefined));
  const stressVals = collectMetric(recent, "lbi", (r) =>
    r.checkIn?.stressLevel ? (r.checkIn.stressLevel - 1) / 4 : undefined
  );

  const baseline = stat(lbiVals, targetDays);
  const recovery = stat(recVals, targetDays);
  const sleepHours = stat(sleepVals, targetDays);
  const strain = stat(strainVals, targetDays);
  const mood = stat(moodVals, targetDays);
  const stress = stat(stressVals, targetDays);

  const daysUsed = lbiVals.length;
  const status: BaselineMeta["status"] = daysUsed >= targetDays && baseline.stable ? "stable" : "calibrating";

  return { baseline, recovery, sleepHours, strain, mood, stress, daysUsed, targetDays, status };
}
