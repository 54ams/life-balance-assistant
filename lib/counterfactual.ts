// lib/counterfactual.ts
import type { DailyCheckIn, ISODate, WearableMetrics } from "./types";
import { calculateLBI } from "./lbi";

export type Counterfactual = {
  label: string;
  delta: number; // expected change in LBI (approx)
  detail: string;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

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
      label: "If you slept ~45 min more",
      delta: Math.round(alt - base),
      detail: "Approximate impact based on your current sleep contribution to the score.",
    });
  }

  // Reduce stress indicators by 1 (if any are selected)
  if (args.checkIn) {
    const current = Object.values(args.checkIn.stressIndicators ?? {}).filter(Boolean).length;
    if (current > 0) {
      const stressIndicators = { ...(args.checkIn.stressIndicators ?? {}) };
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
        label: "If stress indicators were 1 lower",
        delta: Math.round(alt - base),
        detail: "Shows the approximate effect of reducing acute stress signals in the check-in.",
      });
    }

    // Mood +1 step
    if (args.checkIn.mood < 4) {
      const alt = calculateLBI({
        recovery: args.wearable?.recovery ?? 50,
        sleepHours: args.wearable?.sleepHours ?? 7,
        strain: args.wearable?.strain,
        checkIn: { ...args.checkIn, mood: (args.checkIn.mood + 1) as any },
      }).lbi;

      items.push({
        label: "If mood improved by one level",
        delta: Math.round(alt - base),
        detail: "Approximate impact of mood on your score.",
      });
    }
  }

  // If we have too many, pick top 3 by absolute delta
  return items
    .filter((i) => i.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);
}
