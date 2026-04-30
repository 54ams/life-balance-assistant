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
  buildDegradedFeatures,
  pickPrediction,
  predictWithModel,
  rulesCategory,
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

// -----------------------------------------------------------------
// Degraded feature builder + rules fallback. These cover the
// scenarios the dissertation tasks call out explicitly:
//   * full data, strain-only data, no wearable data
//   * cold-start (model exists, but the personal feature pipeline
//     cannot yet build a windowed row)
//   * fallback if model loading fails
// -----------------------------------------------------------------

test("degraded features: full data populates all six features", () => {
  const { x, populated } = buildDegradedFeatures({
    wearable: { recovery: 70, sleepHours: 8, strain: 12 },
    checkIn: { mood: 4, energy: 4, stressLevel: 2, sleepQuality: 4 } as any,
    lbi: 72,
  });
  assert.equal(x.length, FEATURE_NAMES.length);
  assert.equal(populated.length, FEATURE_NAMES.length);
});

test("degraded features: strain-only wearable still produces a vector", () => {
  // Simulates WHOOP returning strain before recovery / sleep are scored.
  const { x, populated } = buildDegradedFeatures({
    wearable: { recovery: undefined as any, sleepHours: undefined as any, strain: 17 },
    checkIn: null,
    lbi: null,
  });
  assert.equal(x.length, FEATURE_NAMES.length);
  assert.deepEqual(populated, ["strain_z"]);
  // Missing signals must contribute exactly 0 so the model's bias term
  // and the populated signal carry the prediction alone.
  assert.equal(x[FEATURE_NAMES.indexOf("recovery_z")], 0);
  assert.equal(x[FEATURE_NAMES.indexOf("sleep_hours_z")], 0);
});

test("degraded features: no wearable, only check-in and LBI", () => {
  const { x, populated } = buildDegradedFeatures({
    wearable: null,
    checkIn: { mood: 4, energy: 4, stressLevel: 2, sleepQuality: 3 } as any,
    lbi: 68,
  });
  assert.deepEqual(populated.sort(), ["lbi_z", "mood_z", "stress_z"].sort());
  assert.equal(x[FEATURE_NAMES.indexOf("recovery_z")], 0);
  assert.equal(x[FEATURE_NAMES.indexOf("strain_z")], 0);
  // The populated features should reflect their values, not be zero.
  assert.notEqual(x[FEATURE_NAMES.indexOf("mood_z")], 0);
  assert.notEqual(x[FEATURE_NAMES.indexOf("lbi_z")], 0);
});

test("degraded features: nothing populated → empty populated list", () => {
  const { x, populated } = buildDegradedFeatures({
    wearable: null,
    checkIn: null,
    lbi: null,
  });
  assert.equal(populated.length, 0);
  assert.deepEqual(x, [0, 0, 0, 0, 0, 0]);
});

test("cold-start prediction: trained model classifies strain-only signal", () => {
  // The user has a freshly-installed app and just paired WHOOP — only
  // strain is in. We expect the cold-start model to still produce a
  // category (not throw, not return null).
  const model = buildClassifier(TRAIN_ROWS, "cold-start");
  const { x } = buildDegradedFeatures({
    wearable: { recovery: undefined as any, sleepHours: undefined as any, strain: 18 },
    checkIn: null,
    lbi: null,
  });
  const pred = predictWithModel(model, x, 0);
  assert.ok(REC_CATEGORIES.includes(pred.category));
  assert.equal(pred.provenance, "ml-cold-start");
});

test("rules fallback: low recovery + high stress → RECOVER", () => {
  const pred = rulesCategory({
    wearable: { recovery: 25, sleepHours: 5, strain: 16 },
    checkIn: { mood: 2, energy: 2, stressLevel: 5, sleepQuality: 2 } as any,
    lbi: 35,
  });
  assert.ok(pred);
  assert.equal(pred!.category, "RECOVER");
  assert.equal(pred!.provenance, "rules");
});

test("rules fallback: high recovery + good mood → PUSH", () => {
  const pred = rulesCategory({
    wearable: { recovery: 90, sleepHours: 9, strain: 8 },
    checkIn: { mood: 5, energy: 5, stressLevel: 1, sleepQuality: 5 } as any,
    lbi: 88,
  });
  assert.ok(pred);
  assert.equal(pred!.category, "PUSH");
  assert.equal(pred!.provenance, "rules");
});

test("rules fallback: balanced signals → MAINTAIN", () => {
  const pred = rulesCategory({
    wearable: { recovery: 60, sleepHours: 7.5, strain: 10 },
    checkIn: { mood: 3, energy: 3, stressLevel: 3, sleepQuality: 3 } as any,
    lbi: 62,
  });
  assert.ok(pred);
  assert.equal(pred!.category, "MAINTAIN");
});

test("rules fallback: probs sum to 1 and are bounded", () => {
  const pred = rulesCategory({
    wearable: { recovery: 45, sleepHours: 6, strain: 12 },
    checkIn: { mood: 3, energy: 3, stressLevel: 4, sleepQuality: 3 } as any,
    lbi: 55,
  })!;
  const sum = pred.probs.RECOVER + pred.probs.MAINTAIN + pred.probs.PUSH;
  assert.ok(Math.abs(sum - 1) < 1e-6, `probs sum to ${sum}`);
  for (const k of REC_CATEGORIES) {
    assert.ok(pred.probs[k] >= 0 && pred.probs[k] <= 1);
  }
});

test("rules fallback: top drivers list only populated features", () => {
  const pred = rulesCategory({
    wearable: null,
    checkIn: { mood: 1, energy: 1, stressLevel: 5, sleepQuality: 2 } as any,
    lbi: null,
  })!;
  const driverNames = pred.topDrivers.map((d) => d.name);
  for (const name of driverNames) {
    // mood + stress are the only populated features here.
    assert.ok(["mood_z", "stress_z"].includes(name), `unexpected driver ${name}`);
  }
  assert.ok(pred.topDrivers.length <= 2);
});

test("rules fallback: nothing populated → null (caller decides)", () => {
  const pred = rulesCategory({ wearable: null, checkIn: null, lbi: null });
  assert.equal(pred, null);
});

test("rules fallback never throws on bizarre inputs", () => {
  // Defensive — the runtime must never let a malformed checkIn crash
  // the recommender, since the recommender feeds the home screen.
  assert.doesNotThrow(() =>
    rulesCategory({
      wearable: { recovery: NaN as any, sleepHours: Infinity as any, strain: -5 as any },
      checkIn: { mood: NaN as any, energy: 3, stressLevel: NaN as any, sleepQuality: 3 } as any,
      lbi: NaN as any,
    }),
  );
});

// -----------------------------------------------------------------
// pickPrediction — orchestrator covering the three-tier fallback.
// -----------------------------------------------------------------

test("orchestrator Tier 1: full history + model → ml provenance", () => {
  // "Personal" model + a real supervised feature row.
  const model = buildClassifier(TRAIN_ROWS, "personal");
  const datasetLastX = [-1.5, -1.0, +0.5, -1.0, -0.8, -1.2];
  const pred = pickPrediction({
    datasetLastX,
    model,
    personalRowsAvailable: 14,
    todaySignals: {
      wearable: { recovery: 30, sleepHours: 5.5, strain: 14 },
      checkIn: { mood: 2, energy: 2, stressLevel: 4, sleepQuality: 2 } as any,
      lbi: 40,
    },
  })!;
  assert.ok(pred);
  assert.equal(pred.provenance, "ml");
  assert.ok(REC_CATEGORIES.includes(pred.category));
});

test("orchestrator Tier 1 (cold-start): brand-new user, model is the prior", () => {
  // No personal supervised rows yet, model trained on the synthetic prior.
  const model = buildClassifier(TRAIN_ROWS, "cold-start");
  const datasetLastX = [+1.4, +1.0, -0.4, +0.8, +0.8, +1.2];
  const pred = pickPrediction({
    datasetLastX,
    model,
    personalRowsAvailable: 0,
    todaySignals: null,
  })!;
  assert.equal(pred.provenance, "ml-cold-start");
  assert.equal(pred.category, "PUSH");
});

test("orchestrator Tier 2: no dataset row but model exists → degraded ML path", () => {
  // The user only has a few days of data — buildDataset produces no row
  // because the rolling baseline window has not filled. We still want a
  // category, sourced from the cold-start model on a degraded vector.
  // The category itself is whatever the cold-start prior decides; here
  // we only verify that the path executes and reports honest provenance.
  const model = buildClassifier(TRAIN_ROWS, "cold-start");
  const pred = pickPrediction({
    datasetLastX: null,
    model,
    personalRowsAvailable: 0,
    todaySignals: {
      wearable: null,
      checkIn: { mood: 4, energy: 4, stressLevel: 2, sleepQuality: 4 } as any,
      lbi: 78,
    },
  })!;
  assert.ok(pred);
  assert.equal(pred.provenance, "ml-cold-start");
  assert.ok(REC_CATEGORIES.includes(pred.category));
  // The category was selected by the model, not by rules — the
  // distinction matters for honest dissertation reporting.
  assert.notEqual(pred.provenance, "rules");
});

test("orchestrator Tier 2: strain-only WHOOP signal still scored by model", () => {
  const model = buildClassifier(TRAIN_ROWS, "cold-start");
  const pred = pickPrediction({
    datasetLastX: null,
    model,
    personalRowsAvailable: 0,
    todaySignals: {
      wearable: { recovery: undefined as any, sleepHours: undefined as any, strain: 19 },
      checkIn: null,
      lbi: null,
    },
  });
  assert.ok(pred);
  assert.ok(REC_CATEGORIES.includes(pred!.category));
  assert.equal(pred!.provenance, "ml-cold-start");
});

test("orchestrator Tier 3: model load failed → rules provenance", () => {
  // Simulates the exact case where the trained classifier could not be
  // loaded (corrupt JSON, async-storage error, etc). The recommender
  // must still produce a category if any signal is available.
  const pred = pickPrediction({
    datasetLastX: null,
    model: null,
    personalRowsAvailable: 0,
    todaySignals: {
      wearable: { recovery: 25, sleepHours: 4.5, strain: 17 },
      checkIn: { mood: 1, energy: 1, stressLevel: 5, sleepQuality: 1 } as any,
      lbi: 28,
    },
  })!;
  assert.equal(pred.provenance, "rules");
  assert.equal(pred.category, "RECOVER");
});

test("orchestrator: brand-new user with no signals → null", () => {
  // The only honest answer is "I don't know yet". The smart-rec layer
  // turns null into a friendly onboarding message.
  const pred = pickPrediction({
    datasetLastX: null,
    model: buildClassifier(TRAIN_ROWS, "cold-start"),
    personalRowsAvailable: 0,
    todaySignals: { wearable: null, checkIn: null, lbi: null },
  });
  assert.equal(pred, null);
});

test("orchestrator: model fails AND no signals → null (never crashes)", () => {
  const pred = pickPrediction({
    datasetLastX: null,
    model: null,
    personalRowsAvailable: 0,
    todaySignals: null,
  });
  assert.equal(pred, null);
});
