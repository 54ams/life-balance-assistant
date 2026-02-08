// lib/consistency.ts
import type { DailyRecord } from "./types";

export type ConsistencyOutput = {
  score: number; // 0–100
  components: {
    sleepConsistency: number;
    recoveryConsistency: number;
    moodStability: number;
    checkInRegularity: number;
    wearableRegularity: number;
  };
  notes: string[];
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function mean(xs: number[]) {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function sd(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

// map a standard deviation to 0–100 (lower sd => higher score)
function varianceToScore(sdVal: number, maxSd: number) {
  if (maxSd <= 0) return 50;
  const x = clamp(sdVal / maxSd, 0, 1);
  return Math.round(100 * (1 - x));
}

export function computeConsistency(records: DailyRecord[]): ConsistencyOutput {
  const last = records.slice().sort((a, b) => a.date.localeCompare(b.date));
  const n = last.length;

  const sleep = last.map((r) => r.wearable?.sleepHours).filter((v): v is number => typeof v === "number");
  const recovery = last.map((r) => r.wearable?.recovery).filter((v): v is number => typeof v === "number");
  const mood = last.map((r) => r.checkIn?.mood).filter((v): v is number => typeof v === "number");

  const sleepSd = sd(sleep);
  const recoverySd = sd(recovery);
  const moodSd = sd(mood);

  const checkInCount = last.filter((r) => !!r.checkIn).length;
  const wearableCount = last.filter((r) => !!r.wearable).length;

  const components = {
    sleepConsistency: varianceToScore(sleepSd, 1.5), // ~1.5h sd = low consistency
    recoveryConsistency: varianceToScore(recoverySd, 20), // ~20 points sd = low consistency
    moodStability: varianceToScore(moodSd, 1.2), // on a 1–4 scale
    checkInRegularity: n ? Math.round((checkInCount / n) * 100) : 0,
    wearableRegularity: n ? Math.round((wearableCount / n) * 100) : 0,
  };

  // Weighted total
  const score = Math.round(
    0.25 * components.sleepConsistency +
      0.25 * components.recoveryConsistency +
      0.20 * components.moodStability +
      0.15 * components.checkInRegularity +
      0.15 * components.wearableRegularity
  );

  const notes: string[] = [];
  if (n < 7) notes.push("Consistency is most meaningful with at least 7 days of data.");
  if (components.checkInRegularity < 60) notes.push("Check-ins are missing often; stability estimates are less reliable.");
  if (components.wearableRegularity < 60) notes.push("Wearable days are missing often; sleep/recovery consistency may be biased.");

  return { score: clamp(score, 0, 100), components, notes };
}
