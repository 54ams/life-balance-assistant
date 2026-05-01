// lib/lbi.ts
//
// Life Balance Index (LBI) — the core scoring formula for the app.
//
// I use this file as the single, transparent rule-based calculation that
// turns a day's wearable + check-in inputs into one 0–100 score with a
// classification, confidence rating, and a plain-English reason.
//
// Why a transparent formula (not ML)?
// -----------------------------------
// The dissertation (Objective 4) commits the core score to be explainable
// and auditable. ML decides recommendations (lib/ml/recommender.ts), but
// the LBI itself is a weighted average of well-defined sub-scores so I
// can answer in the viva: "exactly how was this number produced?"
//
// Formula (defendable in viva):
//   LBI = 0.7 * objective + 0.3 * subjective
//     where objective  = 0.5 * recovery + 0.5 * sleepScore (0..100 each)
//           subjective = 0.5 * moodScore + 0.5 * stressScore
//   Penalty: −6 when high strain combines with low recovery
//   (mismatch flag — protects the user from "balanced but burning out")
//
// This file does NOT call OpenAI. The explanation in the UI comes from
// lib/explain.ts which mirrors these sub-scores so the maths stays the
// authority and the LLM only rephrases what the formula already produced.

import type { DailyCheckIn } from "./types";

// Weights and thresholds are kept in one place so I can defend each
// number in the viva and adjust them without touching call sites.
export type ModelConfig = {
  version: string;
  weights: {
    objective: number; // overall weight for wearable side (recovery + sleep)
    subjective: number; // overall weight for check-in side (mood + stress)
    recovery: number; // share of the objective half taken by recovery
    sleep: number; // share of the objective half taken by sleep
    mood: number; // share of the subjective half taken by self-reported mood
    stress: number; // share of the subjective half taken by stress signal
  };
  thresholds: {
    highStrain: number; // strain ≥ this is "hard physical day" (WHOOP scale 0–21)
    lowRecovery: number; // recovery ≤ this counts as "under-recovered"
    lowSleep: number; // sleep hours ≤ this trips the low-sleep flag
    overloadedStressCount: number; // ≥ this many stress indicators ticked → overloaded
    overloadedMood: number; // mood ≤ this on 1–5 → overloaded
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

// Map self-reported mood (1..5) onto the same 0..100 scale used by every
// other LBI sub-score so I can weight them on a like-for-like basis.
function moodScore(mood: 1 | 2 | 3 | 4 | 5) {
  return ((mood - 1) / 4) * 100;
}

// Stress scoring works in two paths:
//   1. If the user gave a 1–5 stress level, invert it (low stress = high score).
//   2. Otherwise, count how many of the stress indicators they ticked
//      (0..5) and turn that into a 100..0 score. More indicators ticked =
//      lower stress sub-score. Returning 50 when nothing is provided keeps
//      the score neutral so a missing field never silently penalises the day.
function stressScoreFromIndicators(ind?: DailyCheckIn["stressIndicators"], stressLevel?: number) {
  if (typeof stressLevel === "number") {
    return clamp(100 - ((stressLevel - 1) / 4) * 100, 0, 100);
  }
  if (!ind) return 50;
  const count = Object.values(ind).filter(Boolean).length; // 0..5
  return 100 - (count / 5) * 100;
}

// Sleep score — kept simple on purpose so it is easy to defend.
// 5h or less → 0, 9h or more → 100, linear in between. Real-world studies
// suggest a non-linear curve, but for a prototype I value explainability
// over physiological precision.
function sleepScoreFromHours(hours: number) {
  const h = clamp(hours, 4, 10);
  return clamp(((h - 5) / 4) * 100, 0, 100);
}

// Confidence is a separate signal from the score itself. I want users
// (and the viva examiner) to see when a low LBI is "real" versus simply
// the result of incomplete inputs. Each missing/implausible piece deducts
// from a 1.0 starting confidence.
function confidenceFromCompleteness(hasCheckIn: boolean, recovery: number, sleepHours: number) {
  let c = 1.0;

  if (!hasCheckIn) c -= 0.35;
  if (sleepHours <= 0 || sleepHours > 14) c -= 0.25;
  if (recovery < 0 || recovery > 100) c -= 0.25;

  if (c >= 0.75) return "high";
  if (c >= 0.45) return "medium";
  return "low";
}

/**
 * Calculate the Life Balance Index for a single day.
 *
 * I use this function as the only place the LBI score is produced.
 * It takes the day's wearable values and (optionally) a check-in, and
 * returns the score plus the four sub-scores, a confidence rating, a
 * classification (balanced / overloaded / under-recovered) and a short
 * plain-English reason that the UI can show without rephrasing.
 *
 * What happens when WHOOP data is missing?
 *   The caller is expected to pass `recovery: 0` and `sleepHours: 0`
 *   (with `checkIn` still set) — confidence drops sharply but the
 *   formula does not crash. In normal operation, when there is genuinely
 *   nothing usable, the higher-level pipeline (lib/pipeline.ts) skips
 *   the LBI for that day rather than letting it return a misleading 0.
 */
export function calculateLBI(input: LbiInput): LbiOutput {
  const config = input.config ?? DefaultModelConfig;
  const recovery = clamp(input.recovery, 0, 100);
  const sleep = sleepScoreFromHours(input.sleepHours);

  const hasCheckIn = !!input.checkIn;

  // I default mood to 3/5 ("neutral") when there is no check-in so the
  // formula has a defined value, and confidence already drops by 0.35 to
  // reflect that this number is an assumption rather than data.
  const mood = input.checkIn?.mood ?? 3;
  const moodS = moodScore(mood);

  const stressS = stressScoreFromIndicators(input.checkIn?.stressIndicators, input.checkIn?.stressLevel);

  // Objective spine (70%): Recovery + Sleep — the "body" side of the bridge.
  // Subjective (30%): Mood + Stress — the "mind" side. The 70/30 split
  // intentionally favours physiological data because it is harder to fake
  // and easier to validate, while still letting the user's experience move
  // the score.
  const objective = config.weights.recovery * recovery + config.weights.sleep * sleep;
  const subjective = config.weights.mood * moodS + config.weights.stress * stressS;

  let score = config.weights.objective * objective + config.weights.subjective * subjective;

  // Mismatch penalty: I subtract 6 when the day combines high strain with
  // low recovery. This catches the common "I trained hard and feel fine"
  // pattern that nevertheless predicts a flat-tyre tomorrow. It is small
  // enough to not dominate the score, large enough to be visible.
  const strain = input.strain == null ? null : clamp(input.strain, 0, 21);
  if (strain != null && strain >= config.thresholds.highStrain && recovery <= config.thresholds.lowRecovery) {
    score -= 6;
  }

  const lbi = roundInt(clamp(score, 0, 100));
  const confidence = confidenceFromCompleteness(hasCheckIn, recovery, input.sleepHours);

  // Classification rules — kept deliberately simple so I can name the
  // exact rule that fired in the viva. The categories drive UI tone
  // (e.g. the recovery-day card colour) but never silently change the
  // score itself.
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

  // Short reason string — the UI shows this verbatim. I write it from the
  // formula's perspective (not the LLM's) so it can never contradict the
  // numbers it accompanies.
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
