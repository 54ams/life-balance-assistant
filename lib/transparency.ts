import type { DailyRecord } from "./types";

export type MissingnessSummary = {
  missing: string[];
  confidenceEffect: string;
  nextStep: string;
  sourceLabel: string;
};

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
