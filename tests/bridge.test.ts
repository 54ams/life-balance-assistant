/**
 * Bridge scoring tests — validates the Mind-Body Bridge (H8 novelty claim).
 *
 *   node --no-warnings --import tsx tests/bridge.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";

import { physioScore, mentalScore, bridgeGap, bridgeDelta, narrativeFor } from "@/lib/bridge";

// ---------- physioScore ----------

test("physioScore uses recovery when available", () => {
  assert.equal(physioScore({ wearable: { recovery: 72, sleepHours: 7, strain: 10 } }), 72);
});

test("physioScore clamps recovery to 0-100", () => {
  assert.equal(physioScore({ wearable: { recovery: 105, sleepHours: 7, strain: 10 } }), 100);
  assert.equal(physioScore({ wearable: { recovery: -5, sleepHours: 7, strain: 10 } }), 0);
});

test("physioScore falls back to sleep when recovery is missing", () => {
  const score = physioScore({ wearable: { recovery: undefined as any, sleepHours: 9, strain: 5 } });
  assert.equal(score, 100); // 9/9 * 100
});

test("physioScore returns null when no wearable", () => {
  assert.equal(physioScore({ wearable: undefined }), null);
});

// ---------- mentalScore ----------

test("mentalScore combines mood and energy", () => {
  const score = mentalScore({ checkIn: { mood: 5, energy: 5 } } as any);
  assert.equal(score, 100); // (4/4)*50 + (4/4)*50
});

test("mentalScore applies stress indicator penalty", () => {
  const withStress = mentalScore({
    checkIn: {
      mood: 5,
      energy: 5,
      stressIndicators: { muscleTension: true, racingThoughts: true, irritability: false },
    },
  } as any);
  // Base 100 - penalty (2 * 8 = 16) = 84
  assert.equal(withStress, 84);
});

test("mentalScore caps stress penalty at 40", () => {
  const manyStress = mentalScore({
    checkIn: {
      mood: 5,
      energy: 5,
      stressIndicators: {
        muscleTension: true,
        racingThoughts: true,
        irritability: true,
        avoidance: true,
        restlessness: true,
        other: true, // 6 indicators
      },
    },
  } as any);
  // Base 100 - penalty min(48, 40) = 60
  assert.equal(manyStress, 60);
});

test("mentalScore returns null without check-in", () => {
  assert.equal(mentalScore({ checkIn: undefined } as any), null);
});

test("mentalScore returns null if mood or energy missing", () => {
  assert.equal(mentalScore({ checkIn: { mood: 3 } } as any), null);
  assert.equal(mentalScore({ checkIn: { energy: 3 } } as any), null);
});

// ---------- bridgeGap / bridgeDelta ----------

test("bridgeGap returns absolute difference", () => {
  assert.equal(bridgeGap(80, 50), 30);
  assert.equal(bridgeGap(30, 70), 40);
});

test("bridgeDelta returns signed difference (body - mind)", () => {
  assert.equal(bridgeDelta(80, 50), 30);  // body ahead
  assert.equal(bridgeDelta(30, 70), -40); // mind ahead
});

test("bridgeGap and bridgeDelta return null when data missing", () => {
  assert.equal(bridgeGap(null, 50), null);
  assert.equal(bridgeGap(80, null), null);
  assert.equal(bridgeDelta(null, null), null);
});

// ---------- narrativeFor ----------

test("narrativeFor aligned high scores (all tones)", () => {
  for (const tone of ["Gentle", "Direct", "Playful"] as const) {
    const n = narrativeFor(75, 70, tone);
    assert.ok(n.length > 0, `${tone}: non-empty`);
  }
});

test("narrativeFor aligned low scores mentions care", () => {
  const n = narrativeFor(20, 25, "Gentle");
  assert.ok(n.includes("care") || n.includes("asking"), "low aligned mentions care");
});

test("narrativeFor large body-ahead gap", () => {
  const n = narrativeFor(90, 25, "Direct");
  assert.ok(n.toLowerCase().includes("gap") || n.toLowerCase().includes("slow"), "large gap mentioned");
});

test("narrativeFor large mind-ahead gap", () => {
  const n = narrativeFor(20, 85, "Direct");
  assert.ok(n.toLowerCase().includes("gap") || n.toLowerCase().includes("ground"), "mind-body gap");
});

test("narrativeFor handles missing data gracefully", () => {
  assert.ok(narrativeFor(null, null, "Gentle").length > 0);
  assert.ok(narrativeFor(70, null, "Direct").length > 0);
  assert.ok(narrativeFor(null, 60, "Playful").length > 0);
});
