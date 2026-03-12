// lib/wearables.ts
import type { WearableMetrics } from "./types";
import { isDemoEnabled } from "./demo";

/**
 * Fallback wearable data used only when no imported wearable data exists yet.
 * In demo mode returns synthetic values; otherwise returns neutral defaults
 * so the LBI still computes but doesn't mislead users with fake data.
 */
export async function getTodayWearable(): Promise<WearableMetrics> {
  const demo = await isDemoEnabled();
  if (!demo) {
    // No stub in production path; caller should fetch from WHOOP instead.
    throw new Error("No wearable data available (connect WHOOP)");
  }
  const day = new Date().getDate();
  const offset = (day % 7) - 3;
  return {
    recovery: 62 + offset,
    sleepHours: 7.2 + offset * 0.08,
    strain: 11.2 - offset * 0.2,
  };
}
