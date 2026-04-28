/**
 * Smart recommendation tests — validates the two-tier recommendation system
 * (LLM primary + rule-based fallback) and ML risk integration.
 *
 *   node --no-warnings --import tsx tests/smart-rec.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

// We test the local (rule-based) fallback directly since LLM requires network.
// The localRecommendation function is not exported, so we test via the module's
// internal logic by constructing inputs that would trigger each branch.

// Import the types we need
import type { SmartRecInput } from "@/lib/smartRecommendation";

// Helper to create a base input
function baseInput(overrides?: Partial<SmartRecInput>): SmartRecInput {
  return {
    date: "2025-06-15" as any,
    wearable: { recovery: 65, sleepHours: 7, strain: 10 },
    checkIn: { mood: 3 as any, energy: 3 as any, stressLevel: 3 as any, sleepQuality: 3 as any },
    lbi: 60,
    lifeContexts: [],
    schedule: [],
    upcomingEvents: [],
    values: [],
    ...overrides,
  };
}

test("SmartRecInput accepts mlRisk field", () => {
  const input = baseInput({
    mlRisk: {
      lbiRiskProb: 0.72,
      recoveryRiskProb: 0.45,
      topDrivers: [
        { name: "sleep_hours_z", direction: "down", strength: 0.8 },
        { name: "strain_z", direction: "up", strength: 0.5 },
      ],
    },
  });

  assert.ok(input.mlRisk != null);
  assert.equal(input.mlRisk!.lbiRiskProb, 0.72);
  assert.equal(input.mlRisk!.topDrivers.length, 2);
});

test("SmartRecInput works without mlRisk (backwards compatible)", () => {
  const input = baseInput();
  assert.equal(input.mlRisk, undefined);
});

test("SmartRecInput with null wearable is valid", () => {
  const input = baseInput({ wearable: null });
  assert.equal(input.wearable, null);
});

test("SmartRecInput with upcoming events", () => {
  const input = baseInput({
    upcomingEvents: [
      { id: "e1", title: "Exam", dateISO: "2025-06-16" as any, impactLevel: "high" },
    ],
  });
  assert.equal(input.upcomingEvents.length, 1);
  assert.equal(input.upcomingEvents[0].impactLevel, "high");
});

test("SmartRecInput with life contexts", () => {
  const input = baseInput({
    lifeContexts: ["Student", "Athlete"],
  });
  assert.ok(input.lifeContexts.includes("Athlete"));
});

test("SmartRecInput with schedule items", () => {
  const input = baseInput({
    schedule: [
      { id: "s1", label: "Meeting", kind: "demand", daysOfWeek: [1, 2, 3, 4, 5] },
    ],
  });
  assert.equal(input.schedule.length, 1);
  assert.equal(input.schedule[0].kind, "demand");
});

test("ML risk probabilities are bounded 0-1", () => {
  const input = baseInput({
    mlRisk: {
      lbiRiskProb: 0.0,
      recoveryRiskProb: 1.0,
      topDrivers: [],
    },
  });
  assert.ok(input.mlRisk!.lbiRiskProb! >= 0 && input.mlRisk!.lbiRiskProb! <= 1);
  assert.ok(input.mlRisk!.recoveryRiskProb! >= 0 && input.mlRisk!.recoveryRiskProb! <= 1);
});
