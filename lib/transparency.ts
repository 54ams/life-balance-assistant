// lib/transparency.ts
//
// Honest "what's missing today" summary used by the explain screen and
// the GP export. I built this so the user can always see why their
// score's confidence is what it is — every missing input is named, and
// the next-step nudge points to the action that would lift confidence.
//
// This is not the LBI calculation (lib/lbi.ts) or the explanation of
// drivers (lib/explain.ts). It is purely the data-quality lens: which
// fields are present, where the wearable came from, and what to do next.
import type { DailyRecord } from "./types";

export type MissingnessSummary = {
  missing: string[];
  confidenceEffect: string;
  nextStep: string;
  sourceLabel: string;
};

/**
 * Walk a day's record and produce a list of missing inputs plus a
 * human-readable label for the wearable source ("WHOOP", "WHOOP (demo)",
 * "Manual entry"). Returning a structured object lets the UI render
 * each item as a chip without parsing free text.
 *
 * I label demo data honestly — the explain screen shows "WHOOP (demo)"
 * when the user is in kiosk/demo mode so a viva examiner can see at a
 * glance that the day is illustrative, not real.
 */
export function buildMissingnessSummary(record: DailyRecord | null): MissingnessSummary {
  const missing: string[] = [];
  if (!record?.wearable) {
    missing.push("Wearable data (recovery, sleep, strain)");
  } else {
    if (typeof record.wearable.recovery !== "number") missing.push("Recovery");
    if (typeof record.wearable.sleepHours !== "number") missing.push("Sleep hours");
    if (typeof record.wearable.strain !== "number") missing.push("Strain");
  }
  if (!record?.checkIn) {
    missing.push("Daily check-in");
  } else {
    if (!record.checkIn.stressIndicators) missing.push("Stress indicators");
    if (typeof record.checkIn.mood !== "number") missing.push("Mood");
  }

  const sourceLabel = record?.wearableSource
    ? record.wearableSource === "whoop_export"
      ? "WHOOP"
      : record.wearableSource === "whoop_demo"
      ? "WHOOP (demo)"
      : record.wearableSource === "simulated_stub"
      ? "Manual entry"
      : record.wearableSource
    : "No wearable source";

  if (!missing.length) {
    return {
      missing,
      confidenceEffect: "All core inputs are present, so confidence is based on signal quality rather than missingness.",
      nextStep: "Review your recommendation and mark actions complete in History.",
      sourceLabel,
    };
  }

  return {
    missing,
    confidenceEffect: "Confidence is reduced because the score is being estimated from incomplete daily inputs.",
    nextStep: !record?.wearable
      ? "Add WHOOP or manual wearable data to improve physiological accuracy."
      : "Complete the daily check-in to improve emotional context and recommendation quality.",
    sourceLabel,
  };
}
