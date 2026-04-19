// lib/lbi.ts
import type { DailyCheckIn } from "./types";

export type ModelConfig = {
  version: string;
  weights: {
    objective: number; // weight for wearable
    subjective: number; // weight for check-in
    recovery: number;
    sleep: number;
    mood: number;
    stress: number;
  };
  thresholds: {
    highStrain: number;
    lowRecovery: number;
    lowSleep: number;
    overloadedStressCount: number;
    overloadedMood: number;
  };
};

export const DefaultModelConfig: ModelConfig = {
  version: "1.0",
  weights: {
    objective: 0.7,
    subjective: 0.3,
    recovery: 0.5,
    sleep: 0.5,
    mood: 0.5,
    stress: 0.5,
  },
  thresholds: {
    highStrain: 15,
    lowRecovery: 40,
    lowSleep: 6,
    overloadedStressCount: 3,
    overloadedMood: 2,
  },
};

export type LbiInput = {
  recovery: number; // 0–100
  sleepHours: number;
  strain?: number; // 0–21
  checkIn: DailyCheckIn | null;
  config?: ModelConfig;
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

import { clamp } from "./util/clamp";

const roundInt = (n: number) => Math.round(n);

function moodScore(mood: 1 | 2 | 3 | 4 | 5) {
  // 1..5 -> 0..100
  return ((mood - 1) / 4) * 100;
}

function stressScoreFromIndicators(ind?: DailyCheckIn["stressIndicators"], stressLevel?: number) {
  if (typeof stressLevel === "number") {
    // 1 (low) => 100, 5 (high) => 0
    return clamp(100 - ((stressLevel - 1) / 4) * 100, 0, 100);
  }
  // More indicators = more stress, so we invert to score "goodness"
  if (!ind) return 50;
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
  const config = input.config ?? DefaultModelConfig;
  const recovery = clamp(input.recovery, 0, 100);
  const sleep = sleepScoreFromHours(input.sleepHours);

  const hasCheckIn = !!input.checkIn;

  const mood = input.checkIn?.mood ?? 3;
  const moodS = moodScore(mood);

  const stressS = stressScoreFromIndicators(input.checkIn?.stressIndicators, input.checkIn?.stressLevel);

  // Objective spine (70%): Recovery + Sleep
  // Subjective (30%): Mood + Stress indicators
  const objective = config.weights.recovery * recovery + config.weights.sleep * sleep;
  const subjective = config.weights.mood * moodS + config.weights.stress * stressS;

  let score = config.weights.objective * objective + config.weights.subjective * subjective;

  // Simple mismatch penalty (optional but strong)
  const strain = input.strain == null ? null : clamp(input.strain, 0, 21);
  if (strain != null && strain >= config.thresholds.highStrain && recovery <= config.thresholds.lowRecovery) {
    score -= 6;
  }

  const lbi = roundInt(clamp(score, 0, 100));
  const confidence = confidenceFromCompleteness(hasCheckIn, recovery, input.sleepHours);

  // Classification rules (simple + defendable)
  let classification: LbiOutput["classification"] = "balanced";

  if (recovery <= config.thresholds.lowRecovery || sleep <= 35) classification = "under-recovered";
  else if (hasCheckIn) {
    const stressCount = input.checkIn?.stressIndicators ? Object.values(input.checkIn!.stressIndicators).filter(Boolean).length : 0;
    const stressLevel = input.checkIn?.stressLevel ?? 3;
    if (
      stressCount >= config.thresholds.overloadedStressCount ||
      stressLevel >= config.thresholds.overloadedMood + 1 ||
      mood <= config.thresholds.overloadedMood
    )
      classification = "overloaded";
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
