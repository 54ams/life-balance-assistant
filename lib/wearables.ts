import { getDemoWearable, isDemoEnabled } from "./demo";
import type { WearableMetrics } from "./types";

// MVP: return placeholders
// Demo mode: override values for viva/testing
// Later: swap implementation to WHOOP + HealthKit
export async function getWearableMetricsForToday(): Promise<WearableMetrics> {
  // ✅ Demo override
  const demoOn = await isDemoEnabled();
  if (demoOn) {
    const demo = await getDemoWearable();
    if (demo) return demo;
  }

  // ✅ Default placeholder (current MVP behaviour)
  return {
    recovery: 60,
    sleepHours: 9.0,
  };
}
