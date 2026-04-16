// lib/realign.ts
//
// Matched micro-intervention selector.
//
// Realign is the "one thing today" the app offers when the body and
// mind are drifting apart. The key therapeutic move: the action is
// matched to the DIRECTION of the drift, not a menu.
//
//   - body ahead of mind   → down-regulate (extended exhales)
//   - mind ahead of body   → come-into-body (grounding, outdoor breaths)
//   - both low             → minimum viable rebalance (water + breath)
//   - aligned              → noticing, no fix
//
// The "preset" key routes to the matching Breath session pattern.

import type { BridgeState } from "@/constants/Colors";
import { bridgeStateFrom } from "@/constants/Colors";

export type RealignPreset =
  | "down-regulate"
  | "come-into-body"
  | "minimum-viable"
  | "notice";

export type RealignAction = {
  show: boolean;
  preset: RealignPreset;
  /** Short imperative — single-line card title */
  title: string;
  /** One-sentence reason — the "why this, why now" */
  reason: string;
  /** Verb for the CTA ("Begin", "Notice", "Ground") */
  cta: string;
  /** Seconds — the duration displayed to the user */
  durationSec: number;
};

export function realignFor(
  physio: number | null,
  mental: number | null,
): RealignAction {
  const state: BridgeState = bridgeStateFrom(physio, mental);
  const bothLow =
    physio != null && mental != null && physio < 45 && mental < 45;

  if (bothLow) {
    return {
      show: true,
      preset: "minimum-viable",
      title: "A glass of water, three slow breaths",
      reason: "Both signals are asking for care. Start small.",
      cta: "Begin",
      durationSec: 60,
    };
  }

  if (state === "body") {
    return {
      show: true,
      preset: "down-regulate",
      title: "60 seconds of extended exhales",
      reason: "Your body is running ahead. Exhale longer than you inhale to bring the mind along.",
      cta: "Begin",
      durationSec: 60,
    };
  }

  if (state === "mind") {
    return {
      show: true,
      preset: "come-into-body",
      title: "Put the phone down. Five slow breaths.",
      reason: "Your mind is running ahead. Come back into the body for a moment.",
      cta: "Ground",
      durationSec: 60,
    };
  }

  // Aligned — don't push action. Invite noticing.
  return {
    show: false,
    preset: "notice",
    title: "Nothing to fix. Notice this.",
    reason: "Body and mind are in step. This is worth pausing for.",
    cta: "Notice",
    durationSec: 30,
  };
}

/**
 * Breath pattern (inhale, hold, exhale, hold — all in seconds) for each preset.
 * Used by the Breath session overlay.
 */
export function patternFor(preset: RealignPreset): {
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
  label: string;
} {
  switch (preset) {
    case "down-regulate":
      // 4-7-8 — classic down-regulation
      return { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0, label: "4-7-8" };
    case "come-into-body":
      // 4-4-6 — gentle grounding, slightly longer exhale
      return { inhale: 4, holdIn: 4, exhale: 6, holdOut: 2, label: "4-4-6" };
    case "minimum-viable":
      // Soft box — 4-4-4-4
      return { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4, label: "Box 4" };
    case "notice":
      // Slow natural breath — used only when the user opts into a noticing session
      return { inhale: 5, holdIn: 0, exhale: 7, holdOut: 0, label: "Slow 5-7" };
  }
}

/**
 * The measurable lift (mentalScore points) granted when the user completes
 * a full session for this preset. Tuned to be noticeable on the orb but
 * never overwhelming.
 */
export function liftForPreset(preset: RealignPreset): number {
  switch (preset) {
    case "down-regulate":
      return 8;
    case "come-into-body":
      return 8;
    case "minimum-viable":
      return 6;
    case "notice":
      return 4;
  }
}
