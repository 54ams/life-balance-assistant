/**
 * ML pipeline tests — validates the logistic regression, dataset building,
 * and held-out prediction logic.
 *
 *   node --no-warnings --import tsx tests/ml-pipeline.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

import { trainLogReg, predictProba } from "@/lib/ml/logreg";
import { buildDataset, FEATURE_NAMES } from "@/lib/ml/dataset";
import type { DailyRecord } from "@/lib/types";

// ---------- Logistic Regression Core ----------

test("trainLogReg produces a model with correct structure", () => {
  const X = [[1, 0], [0, 1], [1, 1], [0, 0]];
  const y = [1, 0, 1, 0];
  const model = trainLogReg(X, y, ["a", "b"], { steps: 100, lr: 0.1, l2: 0.01 });

  assert.ok(model.featureNames.length === 2);
  assert.ok(model.weights.length === 2);
  assert.ok(typeof model.bias === "number");
  assert.ok(model.trainedAt.length > 0);
});

test("predictProba returns values between 0 and 1", () => {
  const model = trainLogReg([[1], [-1], [1], [-1]], [1, 0, 1, 0], ["x"], { steps: 200 });
  const pHigh = predictProba(model, [2]);
  const pLow = predictProba(model, [-2]);

  assert.ok(pHigh >= 0 && pHigh <= 1, `pHigh=${pHigh}`);
  assert.ok(pLow >= 0 && pLow <= 1, `pLow=${pLow}`);
  assert.ok(pHigh > pLow, "positive input should have higher probability");
});

test("logistic regression learns a separable pattern", () => {
  // Clear pattern: high x1 => class 1
  const X = Array.from({ length: 40 }, (_, i) => [i < 20 ? -1 : 1]);
  const y = Array.from({ length: 40 }, (_, i) => (i < 20 ? 0 : 1));
  const model = trainLogReg(X, y, ["signal"], { steps: 500, lr: 0.1, l2: 0.01 });

  const pPos = predictProba(model, [1.5]);
  const pNeg = predictProba(model, [-1.5]);
  assert.ok(pPos > 0.7, `Should predict high for positive class, got ${pPos}`);
  assert.ok(pNeg < 0.3, `Should predict low for negative class, got ${pNeg}`);
});

test("sigmoid handles extreme values without overflow", () => {
  const model = { weights: [100], bias: 0 };
  assert.ok(predictProba(model, [100]) <= 1);
  assert.ok(predictProba(model, [-100]) >= 0);
});

test("L2 regularisation shrinks weights", () => {
  const X = [[1, 0], [0, 1], [1, 1], [0, 0]];
  const y = [1, 0, 1, 0];

  const noReg = trainLogReg(X, y, ["a", "b"], { steps: 300, lr: 0.1, l2: 0 });
  const withReg = trainLogReg(X, y, ["a", "b"], { steps: 300, lr: 0.1, l2: 0.5 });

  const normNoReg = noReg.weights.reduce((s, w) => s + w * w, 0);
  const normWithReg = withReg.weights.reduce((s, w) => s + w * w, 0);
  assert.ok(normWithReg < normNoReg, "L2 should shrink weight magnitude");
});

// ---------- Dataset Building ----------

function makeDay(i: number, daysTotal: number): DailyRecord {
  const d = new Date("2025-01-01");
  d.setDate(d.getDate() + i);
  const date = d.toISOString().slice(0, 10);

  const recovery = 40 + Math.sin(i * 0.5) * 30;
  const sleepHours = 6 + Math.cos(i * 0.3) * 1.5;
  const strain = 10 + Math.sin(i * 0.7) * 5;
  const mood = (Math.floor(recovery / 25) + 1) as 1 | 2 | 3 | 4 | 5;
  const stress = (5 - Math.floor(recovery / 25)) as 1 | 2 | 3 | 4 | 5;
  const lbi = recovery * 0.5 + (sleepHours / 9) * 50 * 0.5;

  return {
    date: date as any,
    wearable: { recovery, sleepHours, strain },
    checkIn: { mood, energy: mood, stressLevel: stress, sleepQuality: 3 },
    lbi,
  } as any;
}

test("buildDataset produces rows with correct feature count", () => {
  const days = Array.from({ length: 30 }, (_, i) => makeDay(i, 30));
  const dataset = buildDataset(days);

  assert.ok(dataset.length > 0, "Should produce some rows");
  for (const row of dataset) {
    assert.equal(row.x.length, FEATURE_NAMES.length, "Feature vector matches FEATURE_NAMES");
    assert.ok(row.yLbiDrop === 0 || row.yLbiDrop === 1, "Binary label");
    assert.ok(row.yRecoveryDrop === 0 || row.yRecoveryDrop === 1, "Binary label");
  }
});

test("buildDataset requires minimum window before producing rows", () => {
  const days = Array.from({ length: 5 }, (_, i) => makeDay(i, 5));
  const dataset = buildDataset(days);
  // With only 5 days, the stats window requires >= 7 days, so no rows should be produced
  assert.equal(dataset.length, 0, "Too few days for baseline window");
});

test("buildDataset handles missing check-in data", () => {
  const days = Array.from({ length: 25 }, (_, i) => {
    const day = makeDay(i, 25);
    if (i % 3 === 0) (day as any).checkIn = undefined; // remove some check-ins
    return day;
  });
  const dataset = buildDataset(days);
  // Should still produce rows for days with check-ins
  assert.ok(dataset.length > 0, "Should handle missing check-ins");
});

// ---------- Held-out Split Logic ----------

test("training holdout: last row should not be in training set", () => {
  const days = Array.from({ length: 30 }, (_, i) => makeDay(i, 30));
  const dataset = buildDataset(days);
  assert.ok(dataset.length >= 10, "Need enough rows for test");

  // Simulate what trainIfReady does: hold out last row
  const trainSet = dataset.slice(0, -1);
  const heldOut = dataset.at(-1)!;

  assert.ok(trainSet.length === dataset.length - 1);
  assert.ok(!trainSet.includes(heldOut), "Held-out row must not be in training set");

  // Train on trainSet, predict on heldOut
  const X = trainSet.map((r) => r.x);
  const y = trainSet.map((r) => r.yLbiDrop);
  const model = trainLogReg(X, y, [...FEATURE_NAMES], { steps: 300, lr: 0.1, l2: 0.02 });
  const prob = predictProba(model, heldOut.x);
  assert.ok(prob >= 0 && prob <= 1, "Held-out prediction in valid range");
});
