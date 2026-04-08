import test from "node:test";
import assert from "node:assert/strict";

import { buildCounterfactuals } from "@/lib/counterfactual";

const wearable = { recovery: 60, sleepHours: 7, strain: 10 };

const checkIn = {
  mood: 3 as const,
  energy: 3 as const,
  stressLevel: 3 as const,
  sleepQuality: 3 as const,
  stressIndicators: {
    muscleTension: true,
    racingThoughts: false,
    irritability: false,
    avoidance: false,
    restlessness: false,
  },
};

test("buildCounterfactuals returns at most 3 items", () => {
  const results = buildCounterfactuals({
    date: "2025-01-01" as any,
    wearable,
    checkIn,
  });
  assert.ok(results.length <= 3, "Should return at most 3 counterfactuals");
});

test("buildCounterfactuals: sleep scenario appears when wearable present", () => {
  const results = buildCounterfactuals({
    date: "2025-01-01" as any,
    wearable,
    checkIn,
  });
  // Label is "If you slept ~45 min more"
  const sleepCf = results.find((c) => c.label.toLowerCase().includes("slept"));
  assert.ok(sleepCf !== undefined, "Sleep counterfactual should be present when wearable data is provided");
});

test("buildCounterfactuals: sleep scenario absent when no wearable", () => {
  const results = buildCounterfactuals({
    date: "2025-01-01" as any,
    wearable: null,
    checkIn,
  });
  const sleepCf = results.find((c) => c.label.toLowerCase().includes("sleep"));
  assert.equal(sleepCf, undefined, "Sleep counterfactual should not appear without wearable data");
});

test("buildCounterfactuals: stress scenario appears when indicators active and no stressLevel override", () => {
  // stressScoreFromIndicators only uses indicators when stressLevel is absent.
  // Omit stressLevel so indicators drive the score and the counterfactual delta is non-zero.
  const indicatorsOnlyCheckIn = {
    mood: 3 as const,
    energy: 3 as const,
    sleepQuality: 3 as const,
    stressLevel: undefined as any,
    stressIndicators: {
      muscleTension: true,
      racingThoughts: true,
      irritability: false,
      avoidance: false,
      restlessness: false,
    },
  };
  const results = buildCounterfactuals({
    date: "2025-01-01" as any,
    wearable,
    checkIn: indicatorsOnlyCheckIn,
  });
  const stressCf = results.find((c) => c.label.toLowerCase().includes("stress"));
  assert.ok(stressCf !== undefined, "Stress counterfactual should appear when indicators drive the score");
});

test("buildCounterfactuals: stress scenario absent when no indicators active", () => {
  const noStressCheckIn = {
    ...checkIn,
    stressIndicators: {
      muscleTension: false,
      racingThoughts: false,
      irritability: false,
      avoidance: false,
      restlessness: false,
    },
  };
  const results = buildCounterfactuals({
    date: "2025-01-01" as any,
    wearable,
    checkIn: noStressCheckIn,
  });
  const stressCf = results.find((c) => c.label.toLowerCase().includes("stress"));
  assert.equal(stressCf, undefined, "Stress counterfactual should not appear when no indicators are active");
});

test("buildCounterfactuals: mood scenario appears when mood < 5", () => {
  const results = buildCounterfactuals({
    date: "2025-01-01" as any,
    wearable,
    checkIn,
  });
  const moodCf = results.find((c) => c.label.toLowerCase().includes("mood"));
  assert.ok(moodCf !== undefined, "Mood counterfactual should appear when mood is below 5");
});

test("buildCounterfactuals: mood scenario absent when mood already at 5", () => {
  const maxMoodCheckIn = { ...checkIn, mood: 5 as const };
  const results = buildCounterfactuals({
    date: "2025-01-01" as any,
    wearable,
    checkIn: maxMoodCheckIn,
  });
  const moodCf = results.find((c) => c.label.toLowerCase().includes("mood"));
  assert.equal(moodCf, undefined, "Mood counterfactual should not appear when mood is already at maximum");
});

test("buildCounterfactuals: each item has a non-empty label and detail", () => {
  const results = buildCounterfactuals({
    date: "2025-01-01" as any,
    wearable,
    checkIn,
  });
  for (const cf of results) {
    assert.ok(cf.label.length > 0, "Label should be non-empty");
    assert.ok(cf.detail.length > 0, "Detail should be non-empty");
    assert.ok(typeof cf.delta === "number", "Delta should be a number");
  }
});

test("buildCounterfactuals: deltas are non-zero (filtered)", () => {
  const results = buildCounterfactuals({
    date: "2025-01-01" as any,
    wearable,
    checkIn,
  });
  for (const cf of results) {
    assert.notEqual(cf.delta, 0, "All returned counterfactuals should have a non-zero delta");
  }
});

test("buildCounterfactuals: returns empty array when both wearable and checkIn are null", () => {
  const results = buildCounterfactuals({
    date: "2025-01-01" as any,
    wearable: null,
    checkIn: null,
  });
  assert.equal(results.length, 0, "Should return no counterfactuals when no data is provided");
});
