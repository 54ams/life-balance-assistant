// lib/integration.ts
import type { DailyCheckIn, WearableMetrics } from "./types";
import type { LbiOutput } from "./lbi";

export type SignalKey =
  | "wearable_recovery"
  | "wearable_sleep"
  | "wearable_strain"
  | "checkin_mood"
  | "checkin_stress";

export type IntegrationSummary = {
  usedSignals: { key: SignalKey; label: string; source: "wearable" | "check-in"; weightPct: number }[];
  missingSignals: { key: SignalKey; label: string; source: "wearable" | "check-in" }[];
  coveragePct: number; // 0–100
  mentalContributionPct: number; // 0–100
  physiologicalContributionPct: number; // 0–100
  notes: string[];
};

const WEIGHTS: Record<SignalKey, number> = {
  wearable_recovery: 0.40,
  wearable_sleep: 0.25,
  wearable_strain: 0.10,
  checkin_mood: 0.15,
  checkin_stress: 0.10,
};

const LABELS: Record<SignalKey, { label: string; source: "wearable" | "check-in" }> = {
  wearable_recovery: { label: "Recovery", source: "wearable" },
  wearable_sleep: { label: "Sleep", source: "wearable" },
  wearable_strain: { label: "Strain / activity", source: "wearable" },
  checkin_mood: { label: "Mood", source: "check-in" },
  checkin_stress: { label: "Stress indicators", source: "check-in" },
};

export function computeIntegrationSummary(input: {
  checkIn: DailyCheckIn | null;
  wearable: WearableMetrics | null;
  lbi?: LbiOutput | null;
}): IntegrationSummary {
  const { checkIn, wearable, lbi } = input;

  const w = wearable;

  const present: Record<SignalKey, boolean> = {
    wearable_recovery: typeof w?.recovery === "number",
    wearable_sleep: typeof w?.sleepHours === "number",
    wearable_strain: typeof w?.strain === "number",
    checkin_mood: !!checkIn?.mood,
    checkin_stress: !!checkIn && !!checkIn.stressIndicators,
  };

  const usedSignals: IntegrationSummary["usedSignals"] = [];
  const missingSignals: IntegrationSummary["missingSignals"] = [];
  (Object.keys(present) as SignalKey[]).forEach((k) => {
    const meta = LABELS[k];
    if (present[k]) {
      usedSignals.push({
        key: k,
        label: meta.label,
        source: meta.source,
        weightPct: Math.round(WEIGHTS[k] * 100),
      });
    } else {
      missingSignals.push({ key: k, label: meta.label, source: meta.source });
    }
  });

  const totalWeight = (Object.keys(WEIGHTS) as SignalKey[]).reduce((s, k) => s + WEIGHTS[k], 0);
  const usedWeight = usedSignals.reduce((s, u) => s + WEIGHTS[u.key], 0);
  const coveragePct = Math.round((usedWeight / totalWeight) * 100);

  const physiologicalWeight = (["wearable_recovery", "wearable_sleep", "wearable_strain"] as SignalKey[])
    .filter((k) => present[k])
    .reduce((s, k) => s + WEIGHTS[k], 0);
  const mentalWeight = (["checkin_mood", "checkin_stress"] as SignalKey[])
    .filter((k) => present[k])
    .reduce((s, k) => s + WEIGHTS[k], 0);

  const denom = physiologicalWeight + mentalWeight || 1;
  const physiologicalContributionPct = Math.round((physiologicalWeight / denom) * 100);
  const mentalContributionPct = Math.round((mentalWeight / denom) * 100);

  const notes: string[] = [];
  if (!w) notes.push("No wearable data detected for this day.");
  if (!checkIn) notes.push("No check-in detected for this day.");
  if (lbi?.confidence === "low") notes.push("Low confidence: missing signals reduce interpretation strength.");

  return { usedSignals, missingSignals, coveragePct, mentalContributionPct, physiologicalContributionPct, notes };
}
