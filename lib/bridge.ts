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

/**
 * Signed gap — positive means body ahead of mind, negative means mind ahead.
 * Returns null when either score is missing.
 */
export function bridgeDelta(physio: number | null, mental: number | null): number | null {
  if (physio == null || mental == null) return null;
  return physio - mental;
}

/**
 * Short, calm narrative sentence that becomes the headline on Home.
 * Leads with the felt experience, not the number. Keeps tone non-clinical.
 */
export function narrativeFor(
  physio: number | null,
  mental: number | null,
): string {
  if (physio == null && mental == null) return "A quiet start. Let today unfold.";
  if (physio == null) return "Your body signal is still waking up.";
  if (mental == null) return "A check-in will complete today's picture.";

  const delta = physio - mental;
  const abs = Math.abs(delta);

  if (abs <= 10) {
    if ((physio + mental) / 2 >= 65) return "Body and mind are in step. Enjoy this.";
    if ((physio + mental) / 2 <= 35) return "Body and mind are both asking for care.";
    return "Body and mind are in step today.";
  }

  if (delta > 0) {
    if (abs >= 30) return "Your body is ahead. Let the mind catch up.";
    return "Running a little ahead of yourself today.";
  }

  if (abs >= 30) return "Your mind is ahead. Let the body catch up.";
  return "Your mind is a little ahead today.";
}

