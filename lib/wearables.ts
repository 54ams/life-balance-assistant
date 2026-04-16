// lib/wearables.ts
import type { WearableMetrics } from "./types";
import { isDemoEnabled } from "./demo";

/**
 * Fallback wearable data used only when no imported wearable data exists yet.
 *
 * Returns null in production paths without demo mode so callers can render
 * an empty-state UI instead of surfacing a thrown error mid-demo. Callers
 * that expect a value should check for null.
 */
export async function getTodayWearable(): Promise<WearableMetrics | null> {
  const demo = await isDemoEnabled();
  if (!demo) {
    return null;
  }
  const day = new Date().getDate();
  const offset = (day % 7) - 3;
  return {
    recovery: 62 + offset,
    sleepHours: 7.2 + offset * 0.08,
    strain: 11.2 - offset * 0.2,
  };
}
