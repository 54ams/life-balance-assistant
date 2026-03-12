import test from "node:test";
import assert from "node:assert/strict";

import { buildMissingnessSummary } from "@/lib/transparency";

test("missingness summary explains missing wearable data", () => {
  const out = buildMissingnessSummary({
    date: "2026-03-12",
    checkIn: {
      mood: 3,
      energy: 3,
      stressLevel: 3,
      sleepQuality: 3,
      stressIndicators: {
        muscleTension: false,
        racingThoughts: false,
        irritability: false,
        avoidance: false,
        restlessness: false,
      },
    },
  } as any);

  assert.ok(out.missing.some((x) => x.includes("Wearable")));
  assert.ok(out.confidenceEffect.includes("reduced"));
});

test("missingness summary reports complete core inputs", () => {
  const out = buildMissingnessSummary({
    date: "2026-03-12",
    wearableSource: "whoop_export",
    wearable: {
      recovery: 70,
      sleepHours: 7.5,
      strain: 11,
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
  } as any);

  assert.equal(out.missing.length, 0);
  assert.equal(out.sourceLabel, "WHOOP");
});
