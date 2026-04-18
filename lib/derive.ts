// lib/derive.ts
//
// Bridge between the new canvas-based check-in and the legacy 1–5
// scales that the rest of the app still uses (LBI, Mind–Body Bridge
// mental score, history cards).
//
// Why this lives in its own file:
//   - It is small enough to test in isolation.
//   - It has to produce *defensible* numbers for the dissertation: the
//     viva can ask "how does the 1–5 mood field get populated when the
//     user never sees one?". Answer: affect theory.
//
// The mapping:
//   mood       ← valence  (Russell 1980: valence is pleasantness)
//   energy     ← arousal  (Russell 1980: arousal is activation)
//   stressLevel ← weighted mix of (unpleasantness × activation) and
//                 tag-based demand pressure (Lazarus & Folkman 1984).
//                 "Negative + activated" is the canonical stress
//                 quadrant; demand-heavy life context amplifies it.
//   sleepQuality ← not derivable from affect. Falls back to a neutral
//                 3 if we have no other signal; wearable sleep fills
//                 this in elsewhere in the pipeline.

import type { DailyCheckIn, DailyRecord } from "./types";
import { demandPressure } from "./lifeContext";

type Level = 1 | 2 | 3 | 4 | 5;

/** Clamp a number into [a, b]. */
const clamp = (n: number, a: number, b: number) =>
  Math.min(b, Math.max(a, n));

/**
 * Map a signed signal in [-1, 1] onto the 1..5 scale. The app's legacy
 * scales treat 3 as neutral, 5 as "most", 1 as "least".
 *   pos = 1  →  5
 *   pos = 0  →  3
 *   pos =-1  →  1
 */
function signedToFive(pos: number): Level {
  const x = clamp(pos, -1, 1);
  return (Math.round(3 + x * 2) as Level);
}

/**
 * Derive the legacy 1–5 fields from the new canvas + tag inputs.
 * Only overwrites fields the caller didn't already provide, so the
 * UI can still let the user nudge any value by hand if they want to.
 */
export function deriveLegacyScales(input: {
  valence?: number;
  arousal?: number;
  lifeContext?: DailyCheckIn["lifeContext"];
  fallback?: Partial<Pick<DailyCheckIn, "mood" | "energy" | "stressLevel" | "sleepQuality">>;
}): Pick<DailyCheckIn, "mood" | "energy" | "stressLevel" | "sleepQuality"> {
  const valence = input.valence ?? 0;
  const arousal = input.arousal ?? 0;

  // Mood from valence.
  const mood = signedToFive(valence);

  // Energy from arousal.
  const energy = signedToFive(arousal);

  // Stress: blend the "negative × activated" stress quadrant with
  // tag-based demand pressure. Both components live in [-1, 1] roughly;
  // we average them then map to 1..5.
  //
  // affectStress  = -valence * max(arousal, 0)   — only activated
  //   negative states count as stress (a sad+calm state reads as low
  //   energy, not high stress).
  const affectStress = clamp(-valence * Math.max(arousal, 0), -1, 1);
  const demand = demandPressure(input.lifeContext); // -1..1
  const stressSignal = clamp((affectStress + demand) / 2, -1, 1);
  const stressLevel = signedToFive(stressSignal);

  // Sleep quality: not derivable from affect alone.
  const sleepQuality: Level =
    (input.fallback?.sleepQuality as Level | undefined) ?? 3;

  return { mood, energy, stressLevel, sleepQuality };
}

/**
 * Cognitive-load signal (0..1). Feeds the Mind–Body Bridge third track.
 *
 * Rationale (Thayer & Lane neurovisceral integration): cognitive load
 * is the appraisal-driven prefrontal pressure that anticipates or
 * outruns the physiological response. It rises with:
 *   - number of demand tags  (Lazarus appraisal)
 *   - activation             (arousal component of circumplex)
 *   - unpleasant valence     (negative appraisal)
 *
 * Kept simple on purpose — the point is to surface a *lead-lag* with
 * physiological recovery, not to be a perfect cognitive index.
 */
export function cognitiveLoadFromInputs(input: {
  valence?: number;
  arousal?: number;
  lifeContext?: DailyCheckIn["lifeContext"];
}): number {
  const valence = input.valence ?? 0;
  const arousal = input.arousal ?? 0;
  const demand = demandPressure(input.lifeContext); // -1..1

  // Three components, each 0..1.
  const arousalTerm = clamp((arousal + 1) / 2, 0, 1); // high arousal → high load
  const valenceTerm = clamp(-valence, 0, 1); // unpleasant adds load, pleasant contributes 0
  const demandTerm = clamp((demand + 1) / 2, 0, 1); // more demands → more load

  // Weighted: arousal and demand carry most of the signal; valence
  // tints it.
  const load = 0.4 * arousalTerm + 0.4 * demandTerm + 0.2 * valenceTerm;
  return clamp(load, 0, 1);
}

/**
 * Cognitive-load score for a stored day, scaled 0..100 to match the
 * Bridge chart's y axis. Uses the new canvas + tag fields when
 * present, and falls back to the legacy stress indicators + 1–5
 * scales so older records still produce a usable track.
 *
 * Returns null if the day has no check-in to speak of.
 */
export function cognitiveLoadScore(r: Pick<DailyRecord, "checkIn">): number | null {
  const ci = r.checkIn;
  if (!ci) return null;

  const hasNew = typeof ci.valence === "number" || typeof ci.arousal === "number" || !!ci.lifeContext?.length;
  if (hasNew) {
    const load = cognitiveLoadFromInputs({
      valence: ci.valence,
      arousal: ci.arousal,
      lifeContext: ci.lifeContext,
    });
    return Math.round(load * 100);
  }

  // Legacy fallback: translate stress + (5 - energy) + indicator count
  // into the same 0..1 space.
  const stressFrac = (ci.stressLevel - 1) / 4; // 1..5 → 0..1
  const lowEnergyFrac = (5 - ci.energy) / 4; // 5..1 → 0..1
  const indicators = ci.stressIndicators
    ? Object.values(ci.stressIndicators).filter(Boolean).length / 5
    : 0;
  const legacy = clamp(0.45 * stressFrac + 0.3 * lowEnergyFrac + 0.25 * indicators, 0, 1);
  return Math.round(legacy * 100);
}
