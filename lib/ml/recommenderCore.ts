// lib/ml/recommenderCore.ts
//
// Pure (storage-free, RN-free) core of the recommendation classifier.
// Split out so unit tests can run under plain Node without pulling in
// the React Native AsyncStorage shim.

import { FEATURE_NAMES } from "./dataset";
import { predictProba, trainLogReg, type LogRegModel } from "./logreg";

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
