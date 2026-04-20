/**
 * Derive tests — validates the Russell circumplex mapping and
 * cognitive load scoring (theory-grounded affect derivation).
 *
 *   node --no-warnings --import tsx tests/derive.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

import { deriveLegacyScales, cognitiveLoadFromInputs, cognitiveLoadScore } from "@/lib/derive";

// ---------- deriveLegacyScales ----------

test("positive valence maps to high mood", () => {
  const result = deriveLegacyScales({ valence: 0.8, arousal: 0 });
  assert.ok(result.mood >= 4, `Expected mood >= 4, got ${result.mood}`);
});

test("negative valence maps to low mood", () => {
  const result = deriveLegacyScales({ valence: -0.8, arousal: 0 });
  assert.ok(result.mood <= 2, `Expected mood <= 2, got ${result.mood}`);
});

test("neutral valence maps to mood 3", () => {
  const result = deriveLegacyScales({ valence: 0, arousal: 0 });
  assert.equal(result.mood, 3);
});

test("high arousal maps to high energy", () => {
  const result = deriveLegacyScales({ valence: 0, arousal: 0.9 });
  assert.ok(result.energy >= 4, `Expected energy >= 4, got ${result.energy}`);
});

test("low arousal maps to low energy", () => {
  const result = deriveLegacyScales({ valence: 0, arousal: -0.9 });
  assert.ok(result.energy <= 2, `Expected energy <= 2, got ${result.energy}`);
});

test("negative valence + high arousal = high stress (stress quadrant)", () => {
  const result = deriveLegacyScales({ valence: -0.8, arousal: 0.8 });
  assert.ok(result.stressLevel >= 4, `Expected stress >= 4, got ${result.stressLevel}`);
});

test("positive valence + low arousal = low stress (calm happy)", () => {
  const result = deriveLegacyScales({ valence: 0.8, arousal: -0.5 });
  assert.ok(result.stressLevel <= 3, `Expected stress <= 3, got ${result.stressLevel}`);
});

test("negative valence + low arousal = moderate stress (sad but calm)", () => {
  // Sadness without activation shouldn't register as high stress
  const result = deriveLegacyScales({ valence: -0.8, arousal: -0.5 });
  assert.ok(result.stressLevel <= 3, `Sad+calm should not be high stress, got ${result.stressLevel}`);
});

test("deriveLegacyScales defaults missing valence/arousal to 0", () => {
  const result = deriveLegacyScales({});
  assert.equal(result.mood, 3);
  assert.equal(result.energy, 3);
});

test("sleepQuality falls back to 3 when not provided", () => {
  const result = deriveLegacyScales({ valence: 0.5, arousal: 0.5 });
  assert.equal(result.sleepQuality, 3);
});

test("sleepQuality uses fallback when provided", () => {
  const result = deriveLegacyScales({ valence: 0.5, fallback: { sleepQuality: 5 } });
  assert.equal(result.sleepQuality, 5);
});

// ---------- cognitiveLoadFromInputs ----------

test("high arousal + negative valence + demand = high cognitive load", () => {
  const load = cognitiveLoadFromInputs({
    valence: -0.8,
    arousal: 0.8,
    lifeContext: [
      { id: "deadline", kind: "demand" },
      { id: "exam", kind: "demand" },
    ] as any,
  });
  assert.ok(load > 0.6, `Expected high load, got ${load}`);
});

test("low arousal + positive valence = low cognitive load", () => {
  const load = cognitiveLoadFromInputs({
    valence: 0.7,
    arousal: -0.5,
  });
  assert.ok(load < 0.4, `Expected low load, got ${load}`);
});

test("cognitive load is bounded 0-1", () => {
  const extreme = cognitiveLoadFromInputs({ valence: -1, arousal: 1 });
  assert.ok(extreme >= 0 && extreme <= 1);
  const calm = cognitiveLoadFromInputs({ valence: 1, arousal: -1 });
  assert.ok(calm >= 0 && calm <= 1);
});

// ---------- cognitiveLoadScore (stored day) ----------

test("cognitiveLoadScore returns null without check-in", () => {
  assert.equal(cognitiveLoadScore({ checkIn: undefined } as any), null);
});

test("cognitiveLoadScore uses legacy fallback for old records", () => {
  const score = cognitiveLoadScore({
    checkIn: {
      mood: 2,
      energy: 2,
      stressLevel: 4,
      sleepQuality: 3,
      stressIndicators: { muscleTension: true, racingThoughts: true },
    },
  } as any);
  assert.ok(score != null);
  assert.ok(score! >= 0 && score! <= 100);
  assert.ok(score! > 40, `High stress + low energy should give high load, got ${score}`);
});

test("cognitiveLoadScore uses canvas when available", () => {
  const score = cognitiveLoadScore({
    checkIn: {
      mood: 3,
      energy: 3,
      stressLevel: 3,
      sleepQuality: 3,
      valence: -0.7,
      arousal: 0.6,
    },
  } as any);
  assert.ok(score != null);
  assert.ok(score! > 30, `Negative valence + high arousal should yield load > 30, got ${score}`);
});
