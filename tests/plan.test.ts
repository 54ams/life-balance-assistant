import test from "node:test";
import assert from "node:assert/strict";

import { generatePlan } from "@/lib/plan";

test("generatePlan creates recovery-biased plan when signals are poor", () => {
  const out = generatePlan({
    lbi: 38,
    baseline: 60,
    classification: "under-recovered",
    confidence: "medium",
    wearable: {
      recovery: 32,
      sleepHours: 5.8,
      strain: 17,
    },
    checkIn: {
      mood: 2,
      energy: 2,
      stressLevel: 4,
      sleepQuality: 2,
      stressIndicators: {
        muscleTension: true,
        racingThoughts: true,
        irritability: true,
        avoidance: false,
        restlessness: false,
      },
    },
  });

  assert.equal(out.category, "RECOVERY");
  assert.equal(out.actions.length, 3);
  assert.equal(out.actionReasons.length, 3);
  assert.ok(out.explanation.includes("recovery score is low"));
});

test("generatePlan keeps action list capped for cognitive load", () => {
  const out = generatePlan({
    lbi: 72,
    baseline: 58,
    classification: "balanced",
    confidence: "high",
    wearable: {
      recovery: 78,
      sleepHours: 7.8,
      strain: 10,
    },
    checkIn: {
      mood: 4,
      energy: 4,
      stressLevel: 2,
      sleepQuality: 4,
      stressIndicators: {
        muscleTension: false,
        racingThoughts: false,
        irritability: false,
        avoidance: false,
        restlessness: false,
      },
    },
  });

  assert.equal(out.category, "NORMAL");
  assert.equal(out.actions.length, 3);
  assert.ok(out.triggers.length <= 3);
});
