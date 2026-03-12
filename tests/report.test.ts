import test from "node:test";
import assert from "node:assert/strict";

import { analyticsToMarkdown, buildAnalyticsSummary } from "@/lib/analytics";

test("analyticsToMarkdown includes expected sections for report export", () => {
  const days = [
    {
      date: "2026-03-01",
      lbi: 60,
      wearable: { recovery: 55, sleepHours: 7.1, strain: 11 },
      checkIn: {
        mood: 3,
        energy: 3,
        stressLevel: 2,
        sleepQuality: 3,
        stressIndicators: {
          muscleTension: false,
          racingThoughts: false,
          irritability: false,
          avoidance: false,
          restlessness: false,
        },
      },
    },
    {
      date: "2026-03-02",
      lbi: 64,
      wearable: { recovery: 61, sleepHours: 7.5, strain: 10 },
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
    },
  ] as any;

  const markdown = analyticsToMarkdown(buildAnalyticsSummary(days, 30));
  assert.ok(markdown.includes("# Analytics summary"));
  assert.ok(markdown.includes("## Descriptives"));
  assert.ok(markdown.includes("## Highlights"));
});
