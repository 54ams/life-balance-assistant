import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalyticsSummary } from "@/lib/analytics";

const makeDay = (date: string, lbi: number, recovery: number, sleep: number, mood: number, stressLevel: number) => ({
  date,
  lbi,
  wearable: { recovery, sleepHours: sleep },
  checkIn: { mood: mood as any, stressLevel: stressLevel as any, stressIndicators: { muscleTension: false, racingThoughts: false, irritability: false, avoidance: false, restlessness: false } },
});

test("analytics correlations include method and CI", () => {
  const days = [
    makeDay("2025-01-01", 60, 50, 7, 3, 2),
    makeDay("2025-01-02", 62, 55, 7.2, 4, 2),
    makeDay("2025-01-03", 58, 45, 6.5, 2, 4),
    makeDay("2025-01-04", 65, 60, 7.8, 4, 2),
    makeDay("2025-01-05", 55, 40, 6.0, 2, 4),
    makeDay("2025-01-06", 63, 58, 7.4, 4, 2),
    makeDay("2025-01-07", 61, 52, 7.1, 3, 3),
    makeDay("2025-01-08", 64, 59, 7.6, 4, 2),
    makeDay("2025-01-09", 57, 42, 6.3, 2, 4),
    makeDay("2025-01-10", 66, 62, 7.9, 5, 1),
  ] as any;
  const summary = buildAnalyticsSummary(days, 30);
  const first = summary.correlations[0];
  assert.ok(first.method);
  assert.notEqual(first.ciLower, undefined);
});

