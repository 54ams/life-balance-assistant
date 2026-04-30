// lib/bridge.ts
//
// Mind–Body bridge scoring helpers shared by:
//   - insights/bridge.tsx (14-day dual-track chart)
//   - Home "Today's bridge" card
//   - Post-check-in bridge animation
//
// Both scores are 0..100. null means "not enough signal".

import type { DailyRecord } from "./types";

/**
 * Body score — full when recovery + sleep are present, partial when only one
 * dimension is available, null when nothing usable. Strain by itself is
 * intentionally treated as a partial signal: it tells us the body did
 * something today, but not how recovered it is, so the score is biased
 * toward "still calibrating" rather than producing a misleadingly precise
 * number from a single channel.
 *
 * Returns the **kind** of score so the UI can label "partial body score —
 * recovery not in yet" instead of silently showing "—" while data exists.
 */
export type PhysioScore = {
  value: number;
  kind: "full" | "partial_recovery" | "partial_sleep" | "partial_strain";
  /** Which fields actually went into the number. */
  used: Array<"recovery" | "sleep" | "strain">;
};

export function physioScoreDetailed(
  d: Pick<DailyRecord, "wearable">,
): PhysioScore | null {
  const w = d.wearable;
  if (!w) return null;

  const rec = typeof w.recovery === "number" && Number.isFinite(w.recovery) ? w.recovery : null;
  const sleep = typeof w.sleepHours === "number" && Number.isFinite(w.sleepHours) ? w.sleepHours : null;
  const strain = typeof w.strain === "number" && Number.isFinite(w.strain) ? w.strain : null;

  // Full score — recovery present, optionally with sleep + strain. Recovery
  // is WHOOP's headline number (it already folds in HRV and RHR); we trust
  // it directly so the "Body" pill matches what users see in the WHOOP app.
  if (rec != null && sleep != null) {
    return {
      value: clamp01to100(rec),
      kind: "full",
      used: strain != null ? ["recovery", "sleep", "strain"] : ["recovery", "sleep"],
    };
  }

  // Partial — recovery alone. Already a 0..100 score, just label it partial.
  if (rec != null) {
    return { value: clamp01to100(rec), kind: "partial_recovery", used: ["recovery"] };
  }

  // Partial — sleep alone. Map 0..9h to 0..100.
  if (sleep != null) {
    return {
      value: clamp01to100((sleep / 9) * 100),
      kind: "partial_sleep",
      used: ["sleep"],
    };
  }

  // Partial — strain alone. WHOOP strain is 0..21; we invert so a hard day
  // reads as "body taxed" (low score) and a rest day reads "body fresh"
  // (higher score). Clearly labelled so the UI can warn it's strain-only.
  if (strain != null) {
    const stressBased = 100 - Math.min(100, (strain / 21) * 100);
    return {
      value: clamp01to100(stressBased),
      kind: "partial_strain",
      used: ["strain"],
    };
  }

  return null;
}

/** Backwards-compatible numeric API used by existing call sites. */
export function physioScore(d: Pick<DailyRecord, "wearable">): number | null {
  const detailed = physioScoreDetailed(d);
  return detailed ? detailed.value : null;
}

function clamp01to100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
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
