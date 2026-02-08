import type { DailyRecord, ISODate } from "./types";
import { listDailyRecords, listPlans } from "./storage";
import { listSusSubmissions } from "./evaluation/storage";
import { susSubmissionsToCsv } from "./evaluation/export";

function esc(v: string): string {
  if (v.includes('"') || v.includes(",") || v.includes("\n")) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

type ExportPayload = {
  exportedAt: string;
  days: number;
  records: DailyRecord[];
  plans: any[];
  sus: any[];
};

/** Full research export as JSON (records + plans + SUS). */
export async function exportResearchJson(days: number): Promise<string> {
  const [records, plans, sus] = await Promise.all([
    listDailyRecords(days),
    listPlans(days),
    listSusSubmissions(),
  ]);

  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    days,
    records,
    plans,
    sus,
  };

  return JSON.stringify(payload, null, 2);
}

/** Flat daily CSV for analysis (one row per date). */
export async function exportDailyCsv(days: number): Promise<string> {
  const [records, plans] = await Promise.all([listDailyRecords(days), listPlans(days)]);
  const planByDate = new Map<string, any>(plans.map((p: any) => [p.date, p]));

  const header = [
    "date",
    "wearableSource",
    "recovery",
    "sleepHours",
    "strain",
    "hrv",
    "rhr",
    "mood",
    "energy",
    "stress_muscleTension",
    "stress_racingThoughts",
    "stress_irritability",
    "stress_avoidance",
    "stress_restlessness",
    "caffeineAfter2pm",
    "alcohol",
    "deepWorkMins",
    "notes",
    "lbi",
    "baseline",
    "confidence",
  ].join(",");

  const lines = records.map((r) => {
    const w = r.wearable ?? null;
    const ci = r.checkIn ?? null;
    const st = ci?.stressIndicators ?? null;
    const p = planByDate.get(r.date) ?? null;

    const row = [
      r.date,
      r.wearableSource ?? "",
      w?.recovery != null ? String(w.recovery) : "",
      w?.sleepHours != null ? String(w.sleepHours) : "",
      w?.strain != null ? String(w.strain) : "",
      w?.hrv != null ? String(w.hrv) : "",
      w?.rhr != null ? String(w.rhr) : "",
      ci?.mood != null ? String(ci.mood) : "",
      ci?.energy != null ? String(ci.energy) : "",
      st?.muscleTension ? "1" : "0",
      st?.racingThoughts ? "1" : "0",
      st?.irritability ? "1" : "0",
      st?.avoidance ? "1" : "0",
      st?.restlessness ? "1" : "0",
      ci?.caffeineAfter2pm ? "1" : "0",
      ci?.alcohol ? "1" : "0",
      ci?.deepWorkMins != null ? String(ci.deepWorkMins) : "",
      ci?.notes ?? "",
      p?.lbi != null ? String(p.lbi) : "",
      p?.baseline != null ? String(p.baseline) : "",
      p?.confidence ?? "",
    ];

    return row.map((v) => esc(String(v ?? ""))).join(",");
  });

  return [header, ...lines].join("\n");
}

/** SUS-only CSV (handy for appendix) */
export async function exportSusCsv(): Promise<string> {
  const subs = await listSusSubmissions();
  return susSubmissionsToCsv(subs);
}
