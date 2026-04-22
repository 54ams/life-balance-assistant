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
  const sleep = w.sleepHours != null && Number.isFinite(w.sleepHours) ? w.sleepHours : null;
  const recovery = w.recovery != null && Number.isFinite(w.recovery) ? w.recovery : null;
  const strain = w.strain != null && Number.isFinite(w.strain) ? w.strain : null;

  if (sleep != null && sleep < 6) {
    suggestions.push({
      tagId: "poor_sleep",
      kind: "demand",
      reason: `Short sleep last night (${sleep.toFixed(1)}h)`,
    });
  }

  if (strain != null && strain >= 15) {
    suggestions.push({
      tagId: "movement",
      kind: "resource",
      reason: `Heavy workout today (strain ${strain.toFixed(1)})`,
    });
  }

  if (recovery != null && recovery < 35) {
    suggestions.push({
      tagId: "illness",
      kind: "demand",
      reason: `Low recovery (${Math.round(recovery)}%) — body needs slack`,
    });
  } else if (recovery != null && recovery > 75 && sleep != null && sleep >= 7) {
    suggestions.push({
      tagId: "rest",
      kind: "resource",
      reason: `Well rested today (recovery ${Math.round(recovery)}%)`,
    });
  }

  return suggestions;
}

// One-liner shown in the check-in UI so users can see their WHOOP data at a glance.
// Each metric is independently null-guarded — WHOOP can return partial data
// (e.g. recovery but no sleep yet, or sleep without strain).
export function wearableSummaryLine(w: WearableMetrics): string {
  const parts: string[] = [];
  if (w.recovery != null && Number.isFinite(w.recovery)) {
    parts.push(`Recovery ${Math.round(w.recovery)}%`);
  }
  if (w.sleepHours != null && Number.isFinite(w.sleepHours)) {
    parts.push(`Sleep ${w.sleepHours.toFixed(1)}h`);
  }
  if (w.strain != null && Number.isFinite(w.strain)) {
    parts.push(`Strain ${w.strain.toFixed(1)}`);
  }
  return parts.length ? parts.join("  ·  ") : "No wearable data yet today";
}

// Traffic-light colour for recovery — matches WHOOP's own green/amber/red scheme.
// Accepts null/undefined so callers can pass raw WHOOP fields without guarding.
export function recoveryColor(recovery: number | null | undefined): string {
  if (recovery == null || !Number.isFinite(recovery)) return "#9CA3AF"; // neutral grey
  if (recovery >= 67) return "#34C759"; // green
  if (recovery >= 34) return "#FF9500"; // amber
  return "#FF3B30"; // red
}
