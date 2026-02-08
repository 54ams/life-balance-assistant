// lib/wearables.ts
import type { WearableMetrics } from "./types";

// For now: stub.
// Later: replace with WHOOP API / export parsing.
export async function getTodayWearable(): Promise<WearableMetrics> {
  // Replace these with real WHOOP numbers when ready
  return {
    recovery: 62,
    sleepHours: 7.4,
    strain: 11.2,
  };
}
