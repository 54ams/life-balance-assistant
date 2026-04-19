// lib/counterfactual.ts
import type { DailyCheckIn, ISODate, WearableMetrics } from "./types";
import { calculateLBI } from "./lbi";

export type Counterfactual = {
  label: string;
  delta: number; // expected change in LBI (approx)
  detail: string;
};

import { clamp } from "./util/clamp";

export function buildCounterfactuals(args: {
  date: ISODate;
  wearable: WearableMetrics | null;
  checkIn: DailyCheckIn | null;
}): Counterfactual[] {
  const base = calculateLBI({
    recovery: args.wearable?.recovery ?? 50,
    sleepHours: args.wearable?.sleepHours ?? 7,
    strain: args.wearable?.strain,
    checkIn: args.checkIn,
  }).lbi;

  const items: Counterfactual[] = [];

  // Sleep +45 min (if wearable present)
  if (args.wearable) {
    const alt = calculateLBI({
      recovery: args.wearable.recovery,
      sleepHours: clamp(args.wearable.sleepHours + 0.75, 0, 12),
      strain: args.wearable.strain,
      checkIn: args.checkIn,
    }).lbi;

    items.push({
      label: "If you had slept about 45 minutes more",
      delta: Math.round(alt - base),
      detail: `Your score might have been about ${Math.abs(Math.round(alt - base))} points ${alt >= base ? "higher" : "lower"}.`,
    });
  }

  // Reduce stress indicators by 1 (if any are selected)
  if (args.checkIn) {
    const stressIndicatorsSafe = args.checkIn.stressIndicators ?? {
      muscleTension: false,
      racingThoughts: false,
      irritability: false,
      avoidance: false,
      restlessness: false,
    };
    const current = Object.values(stressIndicatorsSafe).filter(Boolean).length;
    if (current > 0) {
      const stressIndicators = { ...stressIndicatorsSafe };
      // turn off one indicator deterministically (first true)
      for (const k of Object.keys(stressIndicators)) {
        const key = k as keyof typeof stressIndicators;
        if (stressIndicators[key]) {
          stressIndicators[key] = false;
          break;
        }
      }
      const alt = calculateLBI({
        recovery: args.wearable?.recovery ?? 50,
        sleepHours: args.wearable?.sleepHours ?? 7,
        strain: args.wearable?.strain,
        checkIn: { ...args.checkIn, stressIndicators },
      }).lbi;

      items.push({
        label: "If you had one fewer stress sign",
        delta: Math.round(alt - base),
        detail: `Your score might have been about ${Math.abs(Math.round(alt - base))} points ${alt >= base ? "higher" : "lower"}.`,
      });
    }

    // Mood +1 step
    if (args.checkIn.mood < 5) {
      const alt = calculateLBI({
        recovery: args.wearable?.recovery ?? 50,
        sleepHours: args.wearable?.sleepHours ?? 7,
        strain: args.wearable?.strain,
        checkIn: { ...args.checkIn, mood: (args.checkIn.mood + 1) as any },
      }).lbi;

      items.push({
        label: "If your mood had been one level better",
        delta: Math.round(alt - base),
        detail: `Your score might have been about ${Math.abs(Math.round(alt - base))} points ${alt >= base ? "higher" : "lower"}.`,
      });
    }
  }

  // If we have too many, pick top 3 by absolute delta
  return items
    .filter((i) => i.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);
}
