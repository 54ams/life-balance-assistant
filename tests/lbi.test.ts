/**
 * LBI calculation edge cases and boundary tests.
 *
 *   node --no-warnings --import tsx tests/lbi.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

import { calculateLBI } from "@/lib/lbi";

test("healthy day produces balanced classification", () => {
  const result = calculateLBI({
    recovery: 80,
    sleepHours: 8,
    strain: 10,
    checkIn: { mood: 4, energy: 4, stressLevel: 2, sleepQuality: 4 },
  });
  assert.equal(result.classification, "balanced");
  assert.ok(result.lbi >= 60, `Expected high LBI, got ${result.lbi}`);
});

test("low recovery triggers under-recovered", () => {
  const result = calculateLBI({
    recovery: 25,
    sleepHours: 5.5,
    strain: 8,
    checkIn: { mood: 3, energy: 3, stressLevel: 3, sleepQuality: 3 },
  });
  assert.equal(result.classification, "under-recovered");
});

test("high strain + low recovery applies mismatch penalty", () => {
  const withPenalty = calculateLBI({
    recovery: 30,
    sleepHours: 6,
    strain: 18,
    checkIn: { mood: 3, energy: 3, stressLevel: 3, sleepQuality: 3 },
  });
  const withoutPenalty = calculateLBI({
    recovery: 30,
    sleepHours: 6,
    strain: 8, // low strain, no penalty
    checkIn: { mood: 3, energy: 3, stressLevel: 3, sleepQuality: 3 },
  });
  assert.ok(withPenalty.lbi < withoutPenalty.lbi, "Mismatch penalty should reduce LBI");
});

test("LBI is always clamped between 0 and 100", () => {
  // Extreme bad
  const worst = calculateLBI({
    recovery: 0,
    sleepHours: 3,
    strain: 21,
    checkIn: { mood: 1, energy: 1, stressLevel: 5, sleepQuality: 1 },
  });
  assert.ok(worst.lbi >= 0, `LBI should be >= 0, got ${worst.lbi}`);

  // Extreme good
  const best = calculateLBI({
    recovery: 100,
    sleepHours: 10,
    strain: 3,
    checkIn: { mood: 5, energy: 5, stressLevel: 1, sleepQuality: 5 },
  });
  assert.ok(best.lbi <= 100, `LBI should be <= 100, got ${best.lbi}`);
});

test("LBI works without check-in (wearable only)", () => {
  const result = calculateLBI({
    recovery: 65,
    sleepHours: 7,
    strain: 12,
    checkIn: null,
  });
  assert.ok(result.lbi >= 0 && result.lbi <= 100);
  assert.ok(result.confidence === "low" || result.confidence === "medium", `Confidence without check-in should be low or medium, got ${result.confidence}`);
});

test("LBI subscores are present and valid", () => {
  const result = calculateLBI({
    recovery: 70,
    sleepHours: 7.5,
    strain: 11,
    checkIn: { mood: 4, energy: 4, stressLevel: 2, sleepQuality: 4 },
  });
  assert.ok(result.subscores != null);
  assert.ok(result.subscores.recovery >= 0 && result.subscores.recovery <= 100);
  assert.ok(result.subscores.sleep >= 0 && result.subscores.sleep <= 100);
});

test("high stress indicators trigger overloaded classification", () => {
  const result = calculateLBI({
    recovery: 60,
    sleepHours: 7,
    strain: 10,
    checkIn: {
      mood: 2,
      energy: 2,
      stressLevel: 5,
      sleepQuality: 2,
      stressIndicators: {
        muscleTension: true,
        racingThoughts: true,
        irritability: true,
        avoidance: true,
        restlessness: true,
      },
    },
  });
  assert.equal(result.classification, "overloaded");
});

test("70/30 weighting: wearable dominates score", () => {
  // Good wearable, bad mood
  const goodBody = calculateLBI({
    recovery: 90,
    sleepHours: 9,
    strain: 8,
    checkIn: { mood: 1, energy: 1, stressLevel: 5, sleepQuality: 2 },
  });
  // Bad wearable, good mood
  const goodMind = calculateLBI({
    recovery: 20,
    sleepHours: 5,
    strain: 8,
    checkIn: { mood: 5, energy: 5, stressLevel: 1, sleepQuality: 5 },
  });
  // With 70/30 weighting, good wearable should produce higher LBI
  assert.ok(goodBody.lbi > goodMind.lbi, "Wearable (70%) should dominate over mood (30%)");
});
