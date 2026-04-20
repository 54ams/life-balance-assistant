// lib/weeklyReflection.ts
//
// Structured end-of-week reflection based on Gibbs' (1988) reflective cycle.
// Helps users consolidate learning, celebrate wins, and set intentions.
//
// Interconnections:
//   - Auto-populates with data from check-ins, habits, sleep hygiene
//   - Feeds insights (weekly patterns, consistency)
//   - Surfaces in GP export as "user-flagged concerns"
//   - Home screen shows weekly digest card Sun-Mon

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyRecord, ISODate } from "./types";
import { getTodayProgress, getHabits, getHabitLog, getStreak } from "./habits";
import { getSleepHygieneHistory } from "./sleepHygiene";
import { getReframeCount } from "./reframing";

const WEEKLY_KEY = "life_balance_weekly_reflection_v1";

export type WeeklyReflection = {
  id: string;
  weekStartDate: ISODate; // Monday of the week
  completedAt: string; // ISO datetime when user finished
  wins: string[]; // What went well (user-written)
  lessons: string[]; // What I learned
  challenges: string[]; // What was hard
  adjustments: string[]; // What I'll change next week
  gratitude: string; // One thing grateful for
  nextWeekIntention: string; // Primary focus for next week
  dataSummary: WeekDataSummary; // Auto-generated from data
};

export type WeekDataSummary = {
  avgValence: number | null; // average mood valence
  checkInCount: number;
  habitsCompletionRate: number; // 0-100
  avgSleepHygiene: number; // 0-100
  reframeCount: number;
  longestStreak: number;
  bestDay: ISODate | null;
  worstDay: ISODate | null;
  trendDirection: "improving" | "stable" | "declining";
};

async function loadAll(): Promise<WeeklyReflection[]> {
  try {
    const raw = await AsyncStorage.getItem(WEEKLY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveAll(reflections: WeeklyReflection[]): Promise<void> {
  await AsyncStorage.setItem(WEEKLY_KEY, JSON.stringify(reflections));
}

/**
 * Get the Monday ISO date for the week containing `date`.
 */
export function getWeekStart(date: Date = new Date()): ISODate {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().slice(0, 10) as ISODate;
}

/**
 * Auto-generate the data summary for a given week from records.
 */
export async function generateWeekSummary(
  records: DailyRecord[],
  weekStart: ISODate,
): Promise<WeekDataSummary> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndISO = weekEnd.toISOString().slice(0, 10);

  const weekRecords = records.filter((r) => r.date >= weekStart && r.date < weekEndISO);

  // Valence
  const valences = weekRecords
    .filter((r) => r.checkIn?.valence != null)
    .map((r) => r.checkIn!.valence!);
  const avgValence = valences.length > 0 ? valences.reduce((a, b) => a + b, 0) / valences.length : null;

  // Best/worst day
  let bestDay: ISODate | null = null;
  let worstDay: ISODate | null = null;
  let bestVal = -Infinity;
  let worstVal = Infinity;
  for (const r of weekRecords) {
    const v = r.checkIn?.valence;
    if (v != null) {
      if (v > bestVal) { bestVal = v; bestDay = r.date; }
      if (v < worstVal) { worstVal = v; worstDay = r.date; }
    }
  }

  // Trend
  const firstHalf = valences.slice(0, Math.floor(valences.length / 2));
  const secondHalf = valences.slice(Math.floor(valences.length / 2));
  const avgFirst = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
  const avgSecond = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
  const trendDirection = avgSecond > avgFirst + 0.1 ? "improving" : avgSecond < avgFirst - 0.1 ? "declining" : "stable";

  // Habits
  const habits = await getHabits();
  let totalCompletions = 0;
  let totalPossible = 0;
  let longestStreak = 0;
  for (const h of habits) {
    const log = await getHabitLog(h.id);
    const streak = getStreak(log);
    if (streak > longestStreak) longestStreak = streak;
    for (const r of weekRecords) {
      totalPossible++;
      if (log[r.date]) totalCompletions++;
    }
  }

  // Sleep hygiene
  const sleepEntries = await getSleepHygieneHistory(7);
  const weekSleep = sleepEntries.filter((e) => e.date >= weekStart && e.date < weekEndISO);
  const avgSleepHygiene = weekSleep.length > 0
    ? Math.round(weekSleep.reduce((s, e) => s + e.score, 0) / weekSleep.length)
    : 0;

  // Reframes
  const reframeCount = await getReframeCount(7);

  return {
    avgValence,
    checkInCount: weekRecords.filter((r) => r.checkIn).length,
    habitsCompletionRate: totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0,
    avgSleepHygiene,
    reframeCount,
    longestStreak,
    bestDay,
    worstDay,
    trendDirection,
  };
}

export async function saveWeeklyReflection(
  data: Omit<WeeklyReflection, "id" | "completedAt">,
): Promise<WeeklyReflection> {
  const all = await loadAll();
  const entry: WeeklyReflection = {
    ...data,
    id: `week_${data.weekStartDate}_${Date.now()}`,
    completedAt: new Date().toISOString(),
  };
  // Replace if same week
  const idx = all.findIndex((r) => r.weekStartDate === data.weekStartDate);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  await saveAll(all);
  return entry;
}

export async function getWeeklyReflection(weekStart: ISODate): Promise<WeeklyReflection | null> {
  const all = await loadAll();
  return all.find((r) => r.weekStartDate === weekStart) ?? null;
}

export async function getRecentReflections(count: number = 4): Promise<WeeklyReflection[]> {
  const all = await loadAll();
  return all.sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate)).slice(0, count);
}

/**
 * Is it time to show the weekly reflection prompt?
 * Show on Sunday evening (after 5pm) or Monday (if not yet done).
 */
export async function shouldPromptWeeklyReflection(): Promise<boolean> {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon
  const hour = now.getHours();

  if (day === 0 && hour >= 17) {
    // Sunday evening
    const weekStart = getWeekStart(now);
    const existing = await getWeeklyReflection(weekStart);
    return !existing;
  }
  if (day === 1 && hour < 12) {
    // Monday morning
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weekStart = getWeekStart(lastWeek);
    const existing = await getWeeklyReflection(weekStart);
    return !existing;
  }
  return false;
}
