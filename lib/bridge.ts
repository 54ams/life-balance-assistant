// lib/bridge.ts
//
// Mind–Body bridge scoring helpers shared by:
//   - insights/bridge.tsx (14-day dual-track chart)
//   - Home "Today's bridge" card
//   - Post-check-in bridge animation
//
// Both scores are 0..100. null means "not enough signal".

import type { DailyRecord } from "./types";

export function physioScore(d: Pick<DailyRecord, "wearable">): number | null {
  const rec = d.wearable?.recovery;
  if (typeof rec === "number" && Number.isFinite(rec)) return Math.max(0, Math.min(100, Math.round(rec)));
  const sleep = d.wearable?.sleepHours;
  if (typeof sleep === "number" && Number.isFinite(sleep)) {
    return Math.max(0, Math.min(100, Math.round((sleep / 9) * 100)));
  }
  return null;
}

export function mentalScore(d: Pick<DailyRecord, "checkIn">): number | null {
  const ci = (d as any).checkIn;
  if (!ci) return null;
  const mood = typeof ci.mood === "number" ? ci.mood : null;
  const energy = typeof ci.energy === "number" ? ci.energy : null;
  if (mood == null || energy == null) return null;
  const stressIndicators = ci.stressIndicators ?? {};
  const stressCount = Object.values(stressIndicators).filter((v) => v === true).length;
  const base = ((mood - 1) / 4) * 50 + ((energy - 1) / 4) * 50;
  const penalty = Math.min(40, stressCount * 8);
  return Math.max(0, Math.min(100, Math.round(base - penalty)));
}

/**
 * A small descriptor used for the Home card: how far apart are the two tracks
 * today? Useful for tone-setting the insight line.
 */
export function bridgeGap(physio: number | null, mental: number | null): number | null {
  if (physio == null || mental == null) return null;
  return Math.abs(physio - mental);
}
