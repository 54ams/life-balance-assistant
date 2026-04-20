// lib/energy.ts
//
// Energy management throughout the day.
// Based on Schwartz & Loehr (2003) "The Power of Full Engagement" —
// managing energy (not time) is the key to performance and wellbeing.
//
// Interconnections:
//   - Correlates with WHOOP strain + recovery
//   - Check-in arousal maps to energy level
//   - Habits scheduled around energy peaks
//   - Weekly reflection includes energy patterns
//   - Smart recommendations factor in energy state

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyRecord, ISODate } from "./types";
import { todayISO } from "./util/todayISO";

const ENERGY_KEY = "life_balance_energy_v1";

export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export type EnergyEntry = {
  date: ISODate;
  hour: number; // 0-23
  level: EnergyLevel;
  note?: string;
};

export type EnergyDay = {
  date: ISODate;
  entries: EnergyEntry[];
};

export type EnergyPattern = {
  peakHours: number[]; // hours when energy is consistently high
  dipHours: number[]; // hours when energy is consistently low
  avgByHour: Record<number, number>; // hour → average level
  consistency: number; // 0-100 how consistent the pattern is
};

const LEVEL_LABELS: Record<EnergyLevel, string> = {
  1: "Depleted",
  2: "Low",
  3: "Moderate",
  4: "Good",
  5: "Peak",
};

export function energyLabel(level: EnergyLevel): string {
  return LEVEL_LABELS[level];
}

async function loadAll(): Promise<EnergyEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(ENERGY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveAll(entries: EnergyEntry[]): Promise<void> {
  await AsyncStorage.setItem(ENERGY_KEY, JSON.stringify(entries));
}

export async function logEnergy(level: EnergyLevel, note?: string): Promise<EnergyEntry> {
  const entries = await loadAll();
  const now = new Date();
  const entry: EnergyEntry = {
    date: todayISO(),
    hour: now.getHours(),
    level,
    note,
  };
  entries.push(entry);
  await saveAll(entries);
  return entry;
}

export async function getTodayEnergy(): Promise<EnergyEntry[]> {
  const entries = await loadAll();
  const today = todayISO();
  return entries.filter((e) => e.date === today).sort((a, b) => a.hour - b.hour);
}

export async function getEnergyHistory(days: number = 14): Promise<EnergyEntry[]> {
  const entries = await loadAll();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  return entries.filter((e) => e.date >= cutoffISO);
}

/**
 * Detect recurring energy patterns from historical data.
 * Needs at least 7 days of data with 3+ entries per day.
 */
export async function detectEnergyPatterns(days: number = 14): Promise<EnergyPattern | null> {
  const entries = await getEnergyHistory(days);
  if (entries.length < 14) return null; // need sufficient data

  // Group by hour
  const byHour: Record<number, number[]> = {};
  for (const e of entries) {
    if (!byHour[e.hour]) byHour[e.hour] = [];
    byHour[e.hour].push(e.level);
  }

  // Compute averages
  const avgByHour: Record<number, number> = {};
  for (const [hour, levels] of Object.entries(byHour)) {
    avgByHour[Number(hour)] = levels.reduce((a, b) => a + b, 0) / levels.length;
  }

  // Find peaks and dips
  const sorted = Object.entries(avgByHour).sort((a, b) => Number(a[0]) - Number(b[0]));
  const peakHours = sorted.filter(([, avg]) => avg >= 4).map(([h]) => Number(h));
  const dipHours = sorted.filter(([, avg]) => avg <= 2.5).map(([h]) => Number(h));

  // Consistency: how stable are the levels at each hour?
  let totalVariance = 0;
  let hourCount = 0;
  for (const levels of Object.values(byHour)) {
    if (levels.length < 2) continue;
    const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
    const variance = levels.reduce((s, l) => s + (l - avg) ** 2, 0) / levels.length;
    totalVariance += variance;
    hourCount++;
  }
  const avgVariance = hourCount > 0 ? totalVariance / hourCount : 2;
  // Lower variance = higher consistency (scale 0-100)
  const consistency = Math.round(Math.max(0, Math.min(100, (1 - avgVariance / 4) * 100)));

  return { peakHours, dipHours, avgByHour, consistency };
}

/**
 * Suggest what to schedule at the current time based on energy patterns.
 */
export function schedulingSuggestion(patterns: EnergyPattern, currentHour: number): string {
  const level = patterns.avgByHour[currentHour];
  if (!level) return "Log your energy to build patterns";

  if (level >= 4) return "Peak energy — ideal for demanding or creative work";
  if (level >= 3) return "Good energy — tackle moderate tasks and meetings";
  if (level >= 2) return "Lower energy — routine tasks, admin, or gentle movement";
  return "Energy dip — rest, recharge, or do something enjoyable";
}
