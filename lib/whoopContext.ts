// lib/whoopContext.ts — Derive life-context tag suggestions from WHOOP wearable data.
import type { WearableMetrics } from "./types";

export type WhoopContextSuggestion = {
  tagId: string;
  kind: "demand" | "resource";
  reason: string;
};

/**
 * Given today's wearable data, suggest life-context tags that should be
 * pre-populated in the check-in flow. Users can dismiss these.
 */
export function suggestContextFromWearable(w: WearableMetrics): WhoopContextSuggestion[] {
  const suggestions: WhoopContextSuggestion[] = [];

  if (w.sleepHours < 6) {
    suggestions.push({
      tagId: "poor_sleep",
      kind: "demand",
      reason: `Short sleep last night (${w.sleepHours}h)`,
    });
  }

  if ((w.strain ?? 0) >= 15) {
    suggestions.push({
      tagId: "movement",
      kind: "resource",
      reason: `Heavy workout today (strain ${(w.strain ?? 0).toFixed(1)})`,
    });
  }

  if (w.recovery < 35) {
    suggestions.push({
      tagId: "illness",
      kind: "demand",
      reason: `Low recovery (${Math.round(w.recovery)}%) — body needs slack`,
    });
  } else if (w.recovery > 75 && w.sleepHours >= 7) {
    suggestions.push({
      tagId: "rest",
      kind: "resource",
      reason: `Well rested today (recovery ${Math.round(w.recovery)}%)`,
    });
  }

  return suggestions;
}

/**
 * Build a one-line summary of today's WHOOP data for display in the check-in.
 */
export function wearableSummaryLine(w: WearableMetrics): string {
  const parts: string[] = [];
  parts.push(`Recovery ${Math.round(w.recovery)}%`);
  parts.push(`Sleep ${w.sleepHours.toFixed(1)}h`);
  if (w.strain != null) parts.push(`Strain ${w.strain.toFixed(1)}`);
  return parts.join("  ·  ");
}

/**
 * Return a colour hint for the recovery score.
 */
export function recoveryColor(recovery: number): string {
  if (recovery >= 67) return "#34C759"; // green
  if (recovery >= 34) return "#FF9500"; // amber
  return "#FF3B30"; // red
}
