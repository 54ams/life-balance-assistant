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
 * Tone adapts to user preference: Gentle (default), Direct, or Playful.
 */
export type NarrativeTone = "Gentle" | "Direct" | "Playful";

export function narrativeFor(
  physio: number | null,
  mental: number | null,
  tone: NarrativeTone = "Gentle",
): string {
  if (physio == null && mental == null) {
    if (tone === "Playful") return "The canvas is blank. Let's see what today paints.";
    if (tone === "Direct") return "No data yet. Check in to get started.";
    return "A quiet start. Let today unfold.";
  }
  if (physio == null) {
    if (tone === "Playful") return "Your body's still warming up — give it a moment.";
    if (tone === "Direct") return "Wearable data missing. Sync or enter manually.";
    return "Your body signal is still waking up.";
  }
  if (mental == null) {
    if (tone === "Playful") return "Half the picture's here. A check-in finishes it.";
    if (tone === "Direct") return "Check in to complete today's score.";
    return "A check-in will complete today's picture.";
  }

  const delta = physio - mental;
  const abs = Math.abs(delta);

  if (abs <= 10) {
    const avg = (physio + mental) / 2;
    if (avg >= 65) {
      if (tone === "Playful") return "Body and mind agree — and they're both feeling good. Nice.";
      if (tone === "Direct") return "Aligned and above average. Good day to push.";
      return "Body and mind are in step. Enjoy this.";
    }
    if (avg <= 35) {
      if (tone === "Playful") return "Both sides are saying the same thing: take it easy today.";
      if (tone === "Direct") return "Both low. Prioritise recovery.";
      return "Body and mind are both asking for care.";
    }
    if (tone === "Playful") return "Body and mind are walking in step today.";
    if (tone === "Direct") return "Aligned. Steady day ahead.";
    return "Body and mind are in step today.";
  }

  if (delta > 0) {
    if (abs >= 60) {
      if (tone === "Playful") return "Your body's way out front — mind's still looking for its shoes.";
      if (tone === "Direct") return "Large body-mind gap. Slow down, check in with yourself.";
      return "Your body and mind are far apart. Pause and reconnect.";
    }
    if (abs >= 30) {
      if (tone === "Playful") return "Your body's sprinting while your mind's still tying its shoes.";
      if (tone === "Direct") return "Body well ahead of mind. Ease mental load.";
      return "Your body is ahead. Let the mind catch up.";
    }
    if (tone === "Playful") return "Running a touch ahead of yourself — nothing dramatic.";
    if (tone === "Direct") return "Slight body-mind gap. Monitor.";
    return "Running a little ahead of yourself today.";
  }

  if (abs >= 60) {
    if (tone === "Playful") return "Major disconnect — mind and body are in different postcodes right now.";
    if (tone === "Direct") return "Large mind-body gap. Ground yourself: breathe, move, reset.";
    return "Your mind and body are far apart. Take a moment to reconnect.";
  }
  if (abs >= 30) {
    if (tone === "Playful") return "Your mind's racing ahead — time to bring the body along for the ride.";
    if (tone === "Direct") return "Mind well ahead of body. Move, hydrate, rest.";
    return "Your mind is ahead. Let the body catch up.";
  }
  if (tone === "Playful") return "Mind's slightly in the lead today. The body will catch up.";
  if (tone === "Direct") return "Small mind-body gap. Stay aware.";
  return "Your mind is a little ahead today.";
}

