// lib/gpExport.ts
//
// "Show Your GP" export — generates a clean, appointment-ready summary
// of the user's wellbeing data for the last 4 weeks.
//
// Output is HTML that can be rendered to PDF via expo-print and shared.
// No raw data dumps — this is designed to be useful in a 10-minute
// consultation slot.
//
// Disclaimer: Not a clinical assessment. Self-reported + wearable data.

import type { DailyRecord, ISODate } from "./types";
import { getReframes } from "./reframing";
import { getRecentReflections } from "./weeklyReflection";
import { getSleepHygieneHistory } from "./sleepHygiene";

export type GPExportData = {
  dateRange: { from: ISODate; to: ISODate };
  summary: {
    avgMood: number | null;
    moodTrend: "improving" | "stable" | "declining";
    avgSleepHours: number | null;
    avgRecovery: number | null;
    checkInDays: number;
    totalDays: number;
  };
  concerns: string[]; // from weekly reflections "challenges"
  sleepPattern: string;
  moodPattern: string;
  selfCareActions: string[];
  disclaimer: string;
};

export async function generateGPExportData(
  records: DailyRecord[],
  days: number = 28,
): Promise<GPExportData> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = cutoff.toISOString().slice(0, 10) as ISODate;
  const today = new Date().toISOString().slice(0, 10) as ISODate;

  const relevant = records
    .filter((r) => r.date >= cutoffISO)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Mood
  const moods = relevant.filter((r) => r.checkIn?.valence != null).map((r) => r.checkIn!.valence!);
  const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null;

  const firstHalf = moods.slice(0, Math.floor(moods.length / 2));
  const secondHalf = moods.slice(Math.floor(moods.length / 2));
  const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
  const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
  const moodTrend: "improving" | "stable" | "declining" =
    avgSecond > avgFirst + 0.1 ? "improving" : avgSecond < avgFirst - 0.1 ? "declining" : "stable";

  // Sleep
  const sleepDays = relevant.filter((r) => r.wearable?.sleepHours);
  const avgSleep = sleepDays.length > 0
    ? sleepDays.reduce((s, r) => s + r.wearable!.sleepHours, 0) / sleepDays.length
    : null;

  // Recovery
  const recDays = relevant.filter((r) => r.wearable?.recovery != null);
  const avgRecovery = recDays.length > 0
    ? Math.round(recDays.reduce((s, r) => s + r.wearable!.recovery, 0) / recDays.length)
    : null;

  // Concerns from weekly reflections
  const reflections = await getRecentReflections(4);
  const concerns = reflections.flatMap((r) => r.challenges).filter(Boolean).slice(0, 5);

  // Sleep pattern description
  let sleepPattern = "Insufficient data";
  if (avgSleep != null) {
    if (avgSleep >= 7.5) sleepPattern = `Averaging ${avgSleep.toFixed(1)} hours — within healthy range`;
    else if (avgSleep >= 6.5) sleepPattern = `Averaging ${avgSleep.toFixed(1)} hours — slightly below recommended 7-9 hours`;
    else sleepPattern = `Averaging ${avgSleep.toFixed(1)} hours — significantly below recommended range`;
  }

  // Mood pattern
  let moodPattern = "Insufficient data";
  if (avgMood != null) {
    const moodWord = avgMood > 0.3 ? "positive" : avgMood > -0.1 ? "mixed" : "low";
    moodPattern = `Self-reported mood has been predominantly ${moodWord} (trend: ${moodTrend})`;
  }

  // Self-care actions (what they're already doing)
  const selfCare: string[] = [];
  const reframes = await getReframes(28);
  if (reframes.length > 0) selfCare.push(`Using thought reframing (${reframes.length} entries)`);
  const sleepHygiene = await getSleepHygieneHistory(28);
  if (sleepHygiene.length > 0) {
    const avgScore = sleepHygiene.reduce((s, e) => s + e.score, 0) / sleepHygiene.length;
    selfCare.push(`Tracking sleep hygiene (avg score: ${Math.round(avgScore)}%)`);
  }
  const checkIns = relevant.filter((r) => r.checkIn).length;
  if (checkIns > 0) selfCare.push(`Regular mood check-ins (${checkIns} in past ${days} days)`);

  return {
    dateRange: { from: cutoffISO, to: today },
    summary: {
      avgMood,
      moodTrend,
      avgSleepHours: avgSleep ? Math.round(avgSleep * 10) / 10 : null,
      avgRecovery,
      checkInDays: checkIns,
      totalDays: days,
    },
    concerns,
    sleepPattern,
    moodPattern,
    selfCareActions: selfCare,
    disclaimer: "This summary was generated from self-reported wellbeing data and wearable device metrics. It is not a clinical assessment or diagnosis. The data reflects the user's subjective experience and automated physiological measurements.",
  };
}

/**
 * Generate shareable HTML for the GP export.
 */
export function generateGPExportHTML(data: GPExportData, userName?: string): string {
  const name = userName || "Patient";
  const moodEmoji = data.summary.moodTrend === "improving" ? "↗" : data.summary.moodTrend === "declining" ? "↘" : "→";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Wellbeing Summary — ${name}</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a; }
    h1 { font-size: 22px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
    h2 { font-size: 16px; color: #374151; margin-top: 24px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
    .stat { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .stat-label { color: #6b7280; }
    .stat-value { font-weight: 600; }
    .concern { background: #fef3c7; padding: 8px 12px; border-radius: 6px; margin: 4px 0; font-size: 14px; }
    .action { background: #ecfdf5; padding: 8px 12px; border-radius: 6px; margin: 4px 0; font-size: 14px; }
    .disclaimer { background: #f9fafb; padding: 12px; border-radius: 8px; font-size: 11px; color: #6b7280; margin-top: 24px; border: 1px solid #e5e7eb; }
    .footer { text-align: center; color: #9ca3af; font-size: 10px; margin-top: 16px; }
  </style>
</head>
<body>
  <h1>Wellbeing Summary</h1>
  <p class="meta">${name} · ${data.dateRange.from} to ${data.dateRange.to} (${data.summary.totalDays} days)</p>

  <h2>Overview</h2>
  <div class="stat"><span class="stat-label">Check-in days</span><span class="stat-value">${data.summary.checkInDays}/${data.summary.totalDays}</span></div>
  <div class="stat"><span class="stat-label">Mood trend</span><span class="stat-value">${moodEmoji} ${data.summary.moodTrend}</span></div>
  <div class="stat"><span class="stat-label">Avg sleep</span><span class="stat-value">${data.summary.avgSleepHours ?? "—"} hrs</span></div>
  <div class="stat"><span class="stat-label">Avg recovery</span><span class="stat-value">${data.summary.avgRecovery ?? "—"}%</span></div>

  <h2>Mood Pattern</h2>
  <p style="font-size: 14px;">${data.moodPattern}</p>

  <h2>Sleep Pattern</h2>
  <p style="font-size: 14px;">${data.sleepPattern}</p>

  ${data.concerns.length > 0 ? `
  <h2>Self-Reported Concerns</h2>
  ${data.concerns.map((c) => `<div class="concern">${c}</div>`).join("\n  ")}
  ` : ""}

  ${data.selfCareActions.length > 0 ? `
  <h2>Self-Care Actions Being Taken</h2>
  ${data.selfCareActions.map((a) => `<div class="action">${a}</div>`).join("\n  ")}
  ` : ""}

  <div class="disclaimer">
    <strong>Disclaimer:</strong> ${data.disclaimer}
  </div>
  <p class="footer">Generated by Life Balance App</p>
</body>
</html>`;
}
