// whoopContext.ts — this is part of the "Mind-Body Bridge" idea (H8 in the diss).
// It translates raw WHOOP numbers into life-context tags so the check-in
// can pre-populate suggestions like "poor sleep" or "well rested".
import type { WearableMetrics } from "./types";

export type WhoopContextSuggestion = {
  tagId: string;
  kind: "demand" | "resource";
  reason: string;
};

// Suggests context tags from wearable data. Users can always dismiss these —
// the point is to reduce friction, not override their judgement.
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

// One-liner shown in the check-in UI so users can see their WHOOP data at a glance.
export function wearableSummaryLine(w: WearableMetrics): string {
  const parts: string[] = [];
  parts.push(`Recovery ${Math.round(w.recovery)}%`);
  parts.push(`Sleep ${w.sleepHours.toFixed(1)}h`);
  if (w.strain != null) parts.push(`Strain ${w.strain.toFixed(1)}`);
  return parts.join("  ·  ");
}

// Traffic-light colour for recovery — matches WHOOP's own green/amber/red scheme.
export function recoveryColor(recovery: number): string {
  if (recovery >= 67) return "#34C759"; // green
  if (recovery >= 34) return "#FF9500"; // amber
  return "#FF3B30"; // red
}
