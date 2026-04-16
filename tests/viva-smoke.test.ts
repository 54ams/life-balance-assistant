/**
 * Viva smoke test — pure-logic end-to-end check.
 *
 * Asserts that the LBI + plan + fallback-reflection pipeline produces
 * sensible output across a wide range of wearable and check-in inputs
 * without throwing. Run on the morning of the viva:
 *
 *   node --no-warnings --import tsx tests/viva-smoke.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

import { calculateLBI } from "@/lib/lbi";
import { generatePlan } from "@/lib/plan";
import { templateReflection } from "@/lib/llm/fallback";

const FIXTURES: Array<{
  name: string;
  recovery: number;
  sleepHours: number;
  strain: number;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  stress: 1 | 2 | 3 | 4 | 5;
}> = [
  { name: "healthy", recovery: 82, sleepHours: 7.8, strain: 10, mood: 4, energy: 4, stress: 2 },
  { name: "overloaded", recovery: 28, sleepHours: 5.2, strain: 18, mood: 2, energy: 2, stress: 4 },
  { name: "mixed", recovery: 55, sleepHours: 6.8, strain: 13, mood: 3, energy: 3, stress: 3 },
  { name: "sleep_deprived", recovery: 60, sleepHours: 4.9, strain: 12, mood: 2, energy: 2, stress: 3 },
  { name: "high_strain", recovery: 50, sleepHours: 7.2, strain: 20, mood: 3, energy: 3, stress: 3 },
];

test("LBI pipeline produces valid output for every fixture", () => {
  for (const f of FIXTURES) {
    const lbi = calculateLBI({
      recovery: f.recovery,
      sleepHours: f.sleepHours,
      strain: f.strain,
      checkIn: {
        mood: f.mood,
        energy: f.energy,
        stressLevel: f.stress,
        sleepQuality: 3,
      },
    });

    assert.ok(lbi.lbi >= 0 && lbi.lbi <= 100, `${f.name}: LBI in range`);
    assert.ok(["balanced", "overloaded", "under-recovered"].includes(lbi.classification), `${f.name}: classification valid`);

    const plan = generatePlan({
      lbi: lbi.lbi,
      baseline: 60,
      classification: lbi.classification,
      confidence: lbi.confidence,
      wearable: { recovery: f.recovery, sleepHours: f.sleepHours, strain: f.strain },
      checkIn: { mood: f.mood, energy: f.energy, stressLevel: f.stress, sleepQuality: 3 },
      values: ["Health", "Connection", "Peace"],
      lifeContexts: [],
    });

    assert.ok(plan.actions.length >= 1, `${f.name}: plan has actions`);
    assert.ok(plan.focus.length > 0, `${f.name}: plan has focus`);
  }
});

test("template reflection is stable and non-empty across tones", () => {
  const payload = {
    valence: -0.3,
    arousal: 0.4,
    regulation: "manageable" as const,
    contextTags: ["work", "sleep"],
    valueChosen: "Peace",
    recoveryBand: "low" as const,
  };

  for (const tone of ["Gentle", "Direct", "Playful"] as const) {
    const a = templateReflection(payload, tone);
    const b = templateReflection(payload, tone);
    assert.ok(a.length > 0, `${tone}: non-empty`);
    assert.equal(a, b, `${tone}: deterministic`);
    assert.ok(a.split(/\s+/).length <= 80, `${tone}: within 80-word budget`);
  }
});

test("template reflection handles a minimal payload without throwing", () => {
  assert.doesNotThrow(() => templateReflection({}, "Gentle"));
  assert.doesNotThrow(() => templateReflection({ valence: 0.5 }, "Direct"));
  assert.doesNotThrow(() => templateReflection({ regulation: "overwhelmed" }, "Playful"));
});
