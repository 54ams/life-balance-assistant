// lib/lbi.ts
import type { DailyCheckIn } from "./types";

export type LbiInput = {
  recovery: number; // 0–100
  sleepHours: number;
  strain?: number; // 0–21
  checkIn: DailyCheckIn | null;
};

export type LbiOutput = {
  lbi: number; // 0–100
  classification: "balanced" | "overloaded" | "under-recovered";
  confidence: "high" | "medium" | "low";
  reason: string;
  subscores: {
    recovery: number;
    sleep: number;
    mood: number;
    stress: number;
  };
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const roundInt = (n: number) => Math.round(n);

function moodScore(mood: 1 | 2 | 3 | 4) {
  // 1..4 -> 0..100
  return ((mood - 1) / 3) * 100;
}

function stressScoreFromIndicators(ind: DailyCheckIn["stressIndicators"]) {
  // More indicators = more stress, so we invert to score "goodness"
  const count = Object.values(ind).filter(Boolean).length; // 0..5
  return 100 - (count / 5) * 100;
}

function sleepScoreFromHours(hours: number) {
  // Simple and explainable:
  // 5h => 0, 9h => 100, clamp outside
  const h = clamp(hours, 4, 10);
  return clamp(((h - 5) / 4) * 100, 0, 100);
}

function confidenceFromCompleteness(hasCheckIn: boolean, recovery: number, sleepHours: number) {
  let c = 1.0;

  if (!hasCheckIn) c -= 0.35;
  if (sleepHours <= 0 || sleepHours > 14) c -= 0.25;
  if (recovery < 0 || recovery > 100) c -= 0.25;

  if (c >= 0.75) return "high";
  if (c >= 0.45) return "medium";
  return "low";
}

export function calculateLBI(input: LbiInput): LbiOutput {
  const recovery = clamp(input.recovery, 0, 100);
  const sleep = sleepScoreFromHours(input.sleepHours);

  const hasCheckIn = !!input.checkIn;

  const mood = input.checkIn?.mood ?? 2;
  const moodS = moodScore(mood);

  const stressS = input.checkIn?.stressIndicators
    ? stressScoreFromIndicators(input.checkIn.stressIndicators)
    : 50;

  // Objective spine (70%): Recovery + Sleep
  // Subjective (30%): Mood + Stress indicators
  const objective = 0.5 * recovery + 0.5 * sleep;
  const subjective = 0.5 * moodS + 0.5 * stressS;

  let score = 0.7 * objective + 0.3 * subjective;

  // Simple mismatch penalty (optional but strong)
  const strain = input.strain == null ? null : clamp(input.strain, 0, 21);
  if (strain != null && strain >= 15 && recovery <= 40) {
    score -= 6;
  }

  const lbi = roundInt(clamp(score, 0, 100));
  const confidence = confidenceFromCompleteness(hasCheckIn, recovery, input.sleepHours);

  // Classification rules (simple + defendable)
  let classification: LbiOutput["classification"] = "balanced";

  if (recovery <= 40 || sleep <= 35) classification = "under-recovered";
  else if (hasCheckIn) {
    const stressCount = Object.values(input.checkIn!.stressIndicators).filter(Boolean).length;
    if (stressCount >= 3 || mood <= 2) classification = "overloaded";
  }

  let reason = "Your balance looks steady today.";
  if (!hasCheckIn) reason = "Complete a check-in to improve accuracy.";
  else if (classification === "under-recovered") reason = "Low recovery and/or sleep are pulling your balance down.";
  else if (classification === "overloaded") reason = "Stress indicators and/or mood suggest mental overload.";

  return {
    lbi,
    classification,
    confidence,
    reason,
    subscores: {
      recovery: roundInt(recovery),
      sleep: roundInt(sleep),
      mood: roundInt(moodS),
      stress: roundInt(stressS),
    },
  };
}
