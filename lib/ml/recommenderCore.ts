// lib/ml/recommenderCore.ts
//
// Pure (storage-free, RN-free) core of the recommendation classifier.
// Split out so unit tests can run under plain Node without pulling in
// the React Native AsyncStorage shim.

import { FEATURE_NAMES } from "./dataset";
import { predictProba, trainLogReg, type LogRegModel } from "./logreg";
import type { DailyCheckIn, WearableMetrics } from "../types";

export type RecCategory = "RECOVER" | "MAINTAIN" | "PUSH";

export const REC_CATEGORIES: readonly RecCategory[] = [
  "RECOVER",
  "MAINTAIN",
  "PUSH",
] as const;

export type RecClassifier = {
  version: 1;
  trainedAt: string;
  rowsUsed: number;
  source: "cold-start" | "personal";
  /** One binary logreg head per class, in REC_CATEGORIES order. */
  heads: LogRegModel[];
};

export type RecPrediction = {
  category: RecCategory;
  probs: Record<RecCategory, number>;
  topDrivers: { name: string; direction: "up" | "down"; strength: number }[];
  /** Where the category came from. "ml" / "ml-cold-start" use the trained
   *  classifier; "rules" is the deterministic fallback used when no
   *  classifier is available (model load failure or brand-new user with
   *  no signals at all). */
  provenance: "ml" | "ml-cold-start" | "rules";
  personalRowsAvailable: number;
};

export const COLD_START: { x: number[]; y: RecCategory }[] = [
  { x: [-1.6, -1.2, +0.4, -1.0, -1.0, -1.4], y: "RECOVER" },
  { x: [-1.2, -0.8, +1.0, -0.6, -0.8, -1.0], y: "RECOVER" },
  { x: [-0.8, -1.4, +0.0, -0.8, -0.6, -1.0], y: "RECOVER" },
  { x: [-1.0, -0.6, +1.4, -0.4, -0.4, -0.8], y: "RECOVER" },
  { x: [+0.0, +0.0, +0.0, +0.0, +0.0, +0.0], y: "MAINTAIN" },
  { x: [+0.2, -0.1, +0.1, +0.1, -0.1, +0.1], y: "MAINTAIN" },
  { x: [-0.2, +0.1, -0.1, -0.1, +0.0, -0.1], y: "MAINTAIN" },
  { x: [+0.3, +0.2, +0.2, -0.1, +0.1, +0.2], y: "MAINTAIN" },
  { x: [+1.4, +1.0, -0.4, +0.8, +0.8, +1.2], y: "PUSH" },
  { x: [+1.0, +1.2, -0.6, +1.0, +0.6, +1.0], y: "PUSH" },
  { x: [+0.8, +0.6, -0.2, +1.2, +0.8, +0.8], y: "PUSH" },
  { x: [+1.2, +0.8, +0.0, +0.6, +1.0, +1.0], y: "PUSH" },
];

function oneHot(category: RecCategory, target: RecCategory): number {
  return category === target ? 1 : 0;
}

function softmax(scores: number[]): number[] {
  const m = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - m));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

export function trainHeads(X: number[][], Y: RecCategory[]): LogRegModel[] {
  return REC_CATEGORIES.map((cls) => {
    const y = Y.map((label) => oneHot(label, cls));
    return trainLogReg(X, y, [...FEATURE_NAMES], {
      steps: 900,
      lr: 0.12,
      l2: 0.04,
    });
  });
}

export function predictWithModel(
  model: RecClassifier,
  x: number[],
  personalRowsAvailable: number,
): RecPrediction {
  const sigmoids = model.heads.map((h) => predictProba(h, x));
  const probs = softmax(sigmoids.map((p) => Math.log(Math.max(1e-6, p))));

  let bestIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIdx]) bestIdx = i;
  }
  const category = REC_CATEGORIES[bestIdx];

  const winningHead = model.heads[bestIdx];
  const contribs = winningHead.weights.map((w, i) => ({
    name: winningHead.featureNames[i],
    v: w * x[i],
  }));
  contribs.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const topDrivers = contribs.slice(0, 3).map((c) => ({
    name: c.name,
    direction: c.v >= 0 ? ("up" as const) : ("down" as const),
    strength: Math.abs(c.v),
  }));

  return {
    category,
    probs: {
      RECOVER: probs[0],
      MAINTAIN: probs[1],
      PUSH: probs[2],
    },
    topDrivers,
    provenance: model.source === "personal" ? "ml" : "ml-cold-start",
    personalRowsAvailable,
  };
}

// -----------------------------------------------------------------
// Degraded feature builder — used when buildDataset() cannot produce a
// row because wearable data is partial or the rolling baseline window
// has not filled yet. We cannot z-score against a personal baseline, so
// we fall back to "absolute → standardised" mappings: each signal is
// rescaled into roughly the [-2, +2] range a z-score would land in for
// a typical user. Missing signals contribute 0 (their feature drops
// out). The returned vector still matches FEATURE_NAMES so any trained
// model can score it.
// -----------------------------------------------------------------

const FEATURE_PRESENCE_NAMES = [...FEATURE_NAMES] as const;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function recoveryToZ(r: number | null | undefined): number {
  if (typeof r !== "number" || !Number.isFinite(r)) return 0;
  // 50% recovery is "neutral"; ±20 percentage points = ±1 σ approx.
  return clamp((r - 50) / 20, -3, 3);
}

function sleepToZ(h: number | null | undefined): number {
  if (typeof h !== "number" || !Number.isFinite(h)) return 0;
  // 7.5h is "neutral"; 1.5h either way ~ 1 σ.
  return clamp((h - 7.5) / 1.5, -3, 3);
}

function strainToZ(s: number | null | undefined): number {
  if (typeof s !== "number" || !Number.isFinite(s)) return 0;
  // WHOOP strain 0-21; 10 is "neutral", 5 ~ 1 σ.
  return clamp((s - 10) / 5, -3, 3);
}

function moodToZ(m: number | null | undefined): number {
  if (typeof m !== "number" || !Number.isFinite(m)) return 0;
  // 1..5 self-report; 3 is neutral, ±1 step ~ 1 σ.
  return clamp((m - 3) / 1, -3, 3);
}

function stressToZ(s: number | null | undefined): number {
  // Higher stress = lower "stress_z" so the sign convention matches
  // dataset.ts (stressToScore there is 0..1 ascending in stress, then
  // z-scored so high stress is positive). We replicate that here.
  if (typeof s !== "number" || !Number.isFinite(s)) return 0;
  return clamp((s - 3) / 1, -3, 3);
}

function lbiToZ(lbi: number | null | undefined): number {
  if (typeof lbi !== "number" || !Number.isFinite(lbi)) return 0;
  // LBI 0-100; 60 is the rough "balanced" centre, 15 points ~ 1 σ.
  return clamp((lbi - 60) / 15, -3, 3);
}

export type DegradedSignals = {
  wearable?: WearableMetrics | null;
  checkIn?: DailyCheckIn | null;
  lbi?: number | null;
};

/**
 * Build a feature vector when buildDataset() cannot. Signals that are
 * not available contribute 0 (the model's bias term still applies).
 *
 * Returns the vector plus the names of features that were actually
 * populated — used downstream to build honest "top drivers" and to
 * decide whether the prediction is informative enough to surface.
 */
export function buildDegradedFeatures(s: DegradedSignals): {
  x: number[];
  populated: string[];
} {
  const w = s.wearable ?? null;
  const ci = s.checkIn ?? null;

  const x = [
    recoveryToZ(w?.recovery),
    sleepToZ(w?.sleepHours),
    strainToZ(w?.strain),
    moodToZ(ci?.mood),
    stressToZ(ci?.stressLevel),
    lbiToZ(s.lbi),
  ];

  const populated: string[] = [];
  if (typeof w?.recovery === "number" && Number.isFinite(w.recovery)) populated.push("recovery_z");
  if (typeof w?.sleepHours === "number" && Number.isFinite(w.sleepHours)) populated.push("sleep_hours_z");
  if (typeof w?.strain === "number" && Number.isFinite(w.strain)) populated.push("strain_z");
  if (typeof ci?.mood === "number" && Number.isFinite(ci.mood)) populated.push("mood_z");
  if (typeof ci?.stressLevel === "number" && Number.isFinite(ci.stressLevel)) populated.push("stress_z");
  if (typeof s.lbi === "number" && Number.isFinite(s.lbi)) populated.push("lbi_z");

  return { x, populated };
}

// -----------------------------------------------------------------
// Deterministic-rules fallback. Used only when *no* model can be
// loaded or trained (e.g. AsyncStorage corrupt, training threw, model
// file unreadable). The category choice still reflects the user's
// signals — we pick the corner of the feature space they sit in — but
// it is not a learned decision boundary, so provenance is "rules".
// This guarantees the app always produces a category if any signal
// exists, never a hard error.
// -----------------------------------------------------------------

/**
 * Pure orchestration helper. Decides, given (a) whether buildDataset
 * produced a row, (b) whether a trained model was loaded, and (c) what
 * raw signals exist for "today", which tier of the fallback to use.
 *
 * This is the same control flow as predictRecommendationCategory()
 * minus AsyncStorage / getAllDays so it can be unit-tested in plain
 * Node. See recommender.ts for the production wrapper.
 */
export function pickPrediction(args: {
  datasetLastX: number[] | null;
  model: RecClassifier | null;
  personalRowsAvailable: number;
  todaySignals: DegradedSignals | null;
}): RecPrediction | null {
  const { datasetLastX, model, personalRowsAvailable, todaySignals } = args;

  // Tier 1: proper supervised feature row + a trained model.
  if (datasetLastX && model) {
    return predictWithModel(model, datasetLastX, personalRowsAvailable);
  }

  if (!todaySignals) return null;

  const { x, populated } = buildDegradedFeatures(todaySignals);
  if (populated.length === 0) return null;

  // Tier 2: degraded vector, trained model.
  if (model) {
    return predictWithModel(model, x, personalRowsAvailable);
  }

  // Tier 3: rules fallback.
  return rulesCategory(todaySignals);
}

export function rulesCategory(s: DegradedSignals): RecPrediction | null {
  const { x, populated } = buildDegradedFeatures(s);
  if (populated.length === 0) return null;

  // Mind side: mood positive, stress negative (high stress drags down).
  // Body side: recovery + sleep positive, strain negative.
  // LBI feeds both. Same sign convention as the trained model so a
  // rules-based fallback agrees with ML on uncontroversial cases.
  const [recZ, sleepZ, strainZ, moodZ, stressZ, lbiZ] = x;
  const bodySignal = recZ + sleepZ - 0.5 * strainZ;
  const mindSignal = moodZ - stressZ;
  const totalSignal = bodySignal + mindSignal + 0.5 * lbiZ;

  let category: RecCategory;
  if (totalSignal <= -1.0) category = "RECOVER";
  else if (totalSignal >= +1.0) category = "PUSH";
  else category = "MAINTAIN";

  // Surface drivers that are actually populated — never invent a driver
  // for a missing signal.
  const drivers = FEATURE_PRESENCE_NAMES.map((name, i) => ({
    name,
    v: populated.includes(name) ? x[i] : 0,
  }))
    .filter((d) => d.v !== 0)
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .slice(0, 3)
    .map((d) => ({
      name: d.name,
      direction: d.v >= 0 ? ("up" as const) : ("down" as const),
      strength: Math.abs(d.v),
    }));

  // Soft probabilities for transparency. Distance to the ±1 thresholds.
  const t = totalSignal;
  const recoverProb = clamp((-(t) + 1) / 2, 0, 1);
  const pushProb = clamp((t + 1) / 2, 0, 1);
  const maintainProb = clamp(1 - Math.abs(t), 0, 1);
  const norm = recoverProb + pushProb + maintainProb || 1;

  return {
    category,
    probs: {
      RECOVER: recoverProb / norm,
      MAINTAIN: maintainProb / norm,
      PUSH: pushProb / norm,
    },
    topDrivers: drivers,
    provenance: "rules",
    personalRowsAvailable: 0,
  };
}
