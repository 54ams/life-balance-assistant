// lib/sleepHygiene.ts
//
// Evening routine / sleep hygiene tracker.
// Based on sleep hygiene principles from Walker (2017) "Why We Sleep"
// and NICE CG191 guidelines.
//
// Interconnections:
//   - Correlates with WHOOP sleep quality data
//   - Integrates with dusk anchor (evening wind-down cue)
//   - Habits system can include sleep-related habits
//   - Weekly reflection surfaces sleep hygiene adherence
//   - Pattern interrupt can suggest sleep hygiene when sleep declining

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ISODate, WearableMetrics } from "./types";
import { todayISO } from "./util/todayISO";

const SLEEP_KEY = "life_balance_sleep_hygiene_v1";

export type SleepHygieneEntry = {
  date: ISODate;
  checklist: SleepChecklist;
  score: number; // 0-100 computed from checklist
  notes?: string;
};

export type SleepChecklist = {
  caffeineCutoff: boolean; // No caffeine after 2pm
  screenCutoff: boolean; // Screens off 30min before bed
  consistentBedtime: boolean; // Within 30min of target
  darkRoom: boolean; // Sleep environment dark
  coolRoom: boolean; // Room temp 16-19°C
  noAlcohol: boolean; // No alcohol within 3h of bed
  windDown: boolean; // Did a wind-down activity
  noLateExercise: boolean; // No vigorous exercise within 2h
};

export const CHECKLIST_ITEMS: { key: keyof SleepChecklist; label: string; tip: string }[] = [
  { key: "caffeineCutoff", label: "No caffeine after 2pm", tip: "Caffeine has a 6-hour half-life — afternoon coffee can fragment sleep" },
  { key: "screenCutoff", label: "Screens off before bed", tip: "Blue light suppresses melatonin production by up to 50%" },
  { key: "consistentBedtime", label: "Consistent bedtime", tip: "Your circadian rhythm rewards consistency — even on weekends" },
  { key: "darkRoom", label: "Dark sleep environment", tip: "Even dim light during sleep reduces melatonin and disrupts REM" },
  { key: "coolRoom", label: "Cool room (16-19°C)", tip: "Your core temperature needs to drop for sleep onset" },
  { key: "noAlcohol", label: "No alcohol near bedtime", tip: "Alcohol blocks REM sleep and fragments the second half of night" },
  { key: "windDown", label: "Wind-down routine done", tip: "A consistent pre-sleep routine signals your brain it's time to rest" },
  { key: "noLateExercise", label: "No late vigorous exercise", tip: "Exercise raises core temp — allow 2+ hours before bed to cool down" },
];

function computeScore(checklist: SleepChecklist): number {
  const items = Object.values(checklist);
  const done = items.filter(Boolean).length;
  return Math.round((done / items.length) * 100);
}

async function loadEntries(): Promise<SleepHygieneEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(SLEEP_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveEntries(entries: SleepHygieneEntry[]): Promise<void> {
  await AsyncStorage.setItem(SLEEP_KEY, JSON.stringify(entries));
}

export async function saveSleepHygiene(checklist: SleepChecklist, notes?: string): Promise<SleepHygieneEntry> {
  const entries = await loadEntries();
  const today = todayISO();
  const entry: SleepHygieneEntry = {
    date: today,
    checklist,
    score: computeScore(checklist),
    notes,
  };
  // Upsert for today
  const idx = entries.findIndex((e) => e.date === today);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  await saveEntries(entries);
  return entry;
}

export async function getTodaySleepHygiene(): Promise<SleepHygieneEntry | null> {
  const entries = await loadEntries();
  const today = todayISO();
  return entries.find((e) => e.date === today) ?? null;
}

export async function getSleepHygieneHistory(days: number = 14): Promise<SleepHygieneEntry[]> {
  const entries = await loadEntries();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  return entries.filter((e) => e.date >= cutoffISO).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Correlate sleep hygiene score with actual WHOOP sleep quality.
 * Returns a correlation-like value showing the relationship.
 */
export function hygieneVsSleepQuality(
  hygieneEntries: SleepHygieneEntry[],
  records: Array<{ date: ISODate; wearable?: WearableMetrics }>,
): { correlation: number; dataPoints: number } {
  const wearableByDate = new Map(
    records.filter((r) => r.wearable).map((r) => [r.date, r.wearable!]),
  );

  const pairs: Array<{ hygiene: number; sleep: number }> = [];
  for (const h of hygieneEntries) {
    const w = wearableByDate.get(h.date);
    if (w && w.sleepHours > 0) {
      pairs.push({ hygiene: h.score, sleep: w.sleepHours });
    }
  }

  if (pairs.length < 5) return { correlation: 0, dataPoints: pairs.length };

  // Simple Pearson correlation
  const n = pairs.length;
  const sumX = pairs.reduce((s, p) => s + p.hygiene, 0);
  const sumY = pairs.reduce((s, p) => s + p.sleep, 0);
  const sumXY = pairs.reduce((s, p) => s + p.hygiene * p.sleep, 0);
  const sumX2 = pairs.reduce((s, p) => s + p.hygiene ** 2, 0);
  const sumY2 = pairs.reduce((s, p) => s + p.sleep ** 2, 0);

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));

  return {
    correlation: den === 0 ? 0 : Math.max(-1, Math.min(1, num / den)),
    dataPoints: n,
  };
}

export function getEmptyChecklist(): SleepChecklist {
  return {
    caffeineCutoff: false,
    screenCutoff: false,
    consistentBedtime: false,
    darkRoom: false,
    coolRoom: false,
    noAlcohol: false,
    windDown: false,
    noLateExercise: false,
  };
}
