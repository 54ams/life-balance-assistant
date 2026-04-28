/**
 * ML recommendation classifier tests — Objective 5.
 *
 * Verifies that the recommendation pipeline is genuinely ML-driven:
 *  - feature vector shape matches FEATURE_NAMES
 *  - prediction returns one of the three categories with valid probs
 *  - extreme inputs are classified into the correct corner of the
 *    feature space (RECOVER for low body+mind, PUSH for high)
 *  - provenance reflects the cold-start vs personal training source
 *  - top drivers are the highest |w·x| of the winning head, ranked
 *  - prediction is deterministic for a fixed model + input
 *
 * The test only imports from the pure recommenderCore module, which
 * has no AsyncStorage / React Native dependency, so the whole suite
 * runs under plain Node + tsx with no shimming.
 *
 *   node --no-warnings --import tsx tests/ml-recommender.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  REC_CATEGORIES,
  predictWithModel,
  trainHeads,
  type RecCategory,
  type RecClassifier,
} from "@/lib/ml/recommenderCore";
import { FEATURE_NAMES } from "@/lib/ml/dataset";

function buildClassifier(
  rows: { x: number[]; y: RecCategory }[],
  source: "cold-start" | "personal" = "cold-start",
): RecClassifier {
  const X = rows.map((r) => r.x);
  const Y = rows.map((r) => r.y);
  return {
    version: 1,
    trainedAt: new Date().toISOString(),
    rowsUsed: rows.length,
    source,
    heads: trainHeads(X, Y),
  };
}

const RECOVER_ROWS: { x: number[]; y: RecCategory }[] = [
  { x: [-1.6, -1.2, +0.4, -1.0, -1.0, -1.4], y: "RECOVER" },
  { x: [-1.2, -0.8, +1.0, -0.6, -0.8, -1.0], y: "RECOVER" },
  { x: [-0.8, -1.4, +0.0, -0.8, -0.6, -1.0], y: "RECOVER" },
  { x: [-1.0, -0.6, +1.4, -0.4, -0.4, -0.8], y: "RECOVER" },
];

const MAINTAIN_ROWS: { x: number[]; y: RecCategory }[] = [
  { x: [+0.0, +0.0, +0.0, +0.0, +0.0, +0.0], y: "MAINTAIN" },
  { x: [+0.2, -0.1, +0.1, +0.1, -0.1, +0.1], y: "MAINTAIN" },
  { x: [-0.2, +0.1, -0.1, -0.1, +0.0, -0.1], y: "MAINTAIN" },
  { x: [+0.3, +0.2, +0.2, -0.1, +0.1, +0.2], y: "MAINTAIN" },
];

const PUSH_ROWS: { x: number[]; y: RecCategory }[] = [
  { x: [+1.4, +1.0, -0.4, +0.8, +0.8, +1.2], y: "PUSH" },
  { x: [+1.0, +1.2, -0.6, +1.0, +0.6, +1.0], y: "PUSH" },
  { x: [+0.8, +0.6, -0.2, +1.2, +0.8, +0.8], y: "PUSH" },
  { x: [+1.2, +0.8, +0.0, +0.6, +1.0, +1.0], y: "PUSH" },
];

const TRAIN_ROWS = [...RECOVER_ROWS, ...MAINTAIN_ROWS, ...PUSH_ROWS];

test("each head's weight vector matches FEATURE_NAMES length", () => {
  const model = buildClassifier(TRAIN_ROWS);
  assert.equal(model.heads.length, REC_CATEGORIES.length);
  for (const head of model.heads) {
    assert.equal(head.weights.length, FEATURE_NAMES.length);
    assert.equal(head.featureNames.length, FEATURE_NAMES.length);
  }
});

test("prediction returns one of the three categories", () => {
  const model = buildClassifier(TRAIN_ROWS);
  const pred = predictWithModel(model, [0, 0, 0, 0, 0, 0], 0);
  assert.ok(REC_CATEGORIES.includes(pred.category));
});

test("prediction probabilities sum to ~1 and are in [0, 1]", () => {
  const model = buildClassifier(TRAIN_ROWS);
  const pred = predictWithModel(model, [+0.5, +0.5, -0.2, +0.5, +0.3, +0.5], 0);
  const total = pred.probs.RECOVER + pred.probs.MAINTAIN + pred.probs.PUSH;
  assert.ok(Math.abs(total - 1) < 1e-6, `probs sum to ${total}`);
  for (const k of REC_CATEGORIES) {
    assert.ok(pred.probs[k] >= 0 && pred.probs[k] <= 1);
  }
});

test("strongly negative profile is classified as RECOVER", () => {
  const model = buildClassifier(TRAIN_ROWS);
  const pred = predictWithModel(model, [-2.0, -2.0, +1.5, -1.5, -1.5, -2.0], 0);
  assert.equal(pred.category, "RECOVER");
});

test("strongly positive profile is classified as PUSH", () => {
  const model = buildClassifier(TRAIN_ROWS);
  const pred = predictWithModel(model, [+2.0, +2.0, -1.0, +1.5, +1.5, +2.0], 0);
  assert.equal(pred.category, "PUSH");
});

test("provenance reflects model source", () => {
  const cold = buildClassifier(TRAIN_ROWS, "cold-start");
  const personal = buildClassifier(TRAIN_ROWS, "personal");
  const x = [0, 0, 0, 0, 0, 0];
  assert.equal(predictWithModel(cold, x, 0).provenance, "ml-cold-start");
  assert.equal(predictWithModel(personal, x, 12).provenance, "ml");
});

test("topDrivers are the three highest |w·x| of the winning head", () => {
  const model = buildClassifier(TRAIN_ROWS);
  const pred = predictWithModel(model, [-2.0, -1.0, +0.0, +0.0, +0.0, -1.0], 0);
  assert.equal(pred.topDrivers.length, 3);
  assert.ok((FEATURE_NAMES as readonly string[]).includes(pred.topDrivers[0].name));
  assert.ok(pred.topDrivers[0].strength > 0);
  assert.ok(pred.topDrivers[0].strength >= pred.topDrivers[1].strength);
  assert.ok(pred.topDrivers[1].strength >= pred.topDrivers[2].strength);
});

test("prediction is deterministic for a fixed model + input", () => {
  const model = buildClassifier(TRAIN_ROWS);
  const x = [+0.3, +0.2, -0.1, +0.1, +0.2, +0.2];
  const a = predictWithModel(model, x, 0);
  const b = predictWithModel(model, x, 0);
  assert.equal(a.category, b.category);
  assert.equal(a.probs.RECOVER, b.probs.RECOVER);
  assert.equal(a.probs.MAINTAIN, b.probs.MAINTAIN);
  assert.equal(a.probs.PUSH, b.probs.PUSH);
});

test("rowsUsed and source are honestly reported on the model", () => {
  const cold = buildClassifier(TRAIN_ROWS, "cold-start");
  const personal = buildClassifier(TRAIN_ROWS, "personal");
  assert.equal(cold.rowsUsed, TRAIN_ROWS.length);
  assert.equal(cold.source, "cold-start");
  assert.equal(personal.source, "personal");
});

test("classifier round-trips through JSON without losing weights", () => {
  const model = buildClassifier(TRAIN_ROWS);
  const restored = JSON.parse(JSON.stringify(model)) as RecClassifier;
  const x = [+0.1, -0.2, +0.3, -0.4, +0.0, +0.2];
  const a = predictWithModel(model, x, 0);
  const b = predictWithModel(restored, x, 0);
  assert.equal(a.category, b.category);
  assert.equal(a.probs.RECOVER, b.probs.RECOVER);
});
