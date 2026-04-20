// lib/habits.ts
//
// Habit tracker with implementation intentions (Gollwitzer, 1999) and
// habit stacking (Fogg, 2019). Each habit has an IF/THEN structure:
// "IF [cue], THEN [routine]". Micro-versions allow 2-minute fallbacks
// when motivation is low.
//
// Interconnections:
//   - Habit completion correlates with check-in valence (mood)
//   - Streaks feed into the home screen engagement display
//   - Pattern interrupt system references habits as suggested actions
//   - Weekly reflection pulls habit completion rates

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyRecord, ISODate } from "./types";
import { todayISO } from "./util/todayISO";

const HABITS_KEY = "life_balance_habits_v1";

export type Habit = {
  id: string;
  name: string;
  cue: string; // "IF" — the trigger/existing routine
  routine: string; // "THEN" — the behaviour
  reward?: string; // optional: how user celebrates
  microVersion?: string; // 2-minute fallback
  stackAfter?: string; // ID of another habit to stack after
  category: HabitCategory;
  createdAt: string; // ISO datetime
  archived?: boolean;
};

export type HabitCategory =
  | "movement"
  | "mindfulness"
  | "sleep"
  | "nutrition"
  | "social"
  | "learning"
  | "creativity"
  | "self-care";

export const HABIT_CATEGORIES: { id: HabitCategory; label: string; icon: string }[] = [
  { id: "movement", label: "Movement", icon: "figure.walk" },
  { id: "mindfulness", label: "Mindfulness", icon: "brain.head.profile" },
  { id: "sleep", label: "Sleep", icon: "moon.fill" },
  { id: "nutrition", label: "Nutrition", icon: "leaf.fill" },
  { id: "social", label: "Social", icon: "person.2.fill" },
  { id: "learning", label: "Learning", icon: "book.fill" },
  { id: "creativity", label: "Creativity", icon: "paintbrush.fill" },
  { id: "self-care", label: "Self-care", icon: "heart.fill" },
];

export type HabitLog = Record<ISODate, boolean>; // date → completed

type HabitStore = {
  habits: Habit[];
  logs: Record<string, HabitLog>; // habitId → date log
};

async function load(): Promise<HabitStore> {
  try {
    const raw = await AsyncStorage.getItem(HABITS_KEY);
    if (!raw) return { habits: [], logs: {} };
    return JSON.parse(raw);
  } catch {
    return { habits: [], logs: {} };
  }
}

async function save(store: HabitStore): Promise<void> {
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(store));
}

export async function getHabits(): Promise<Habit[]> {
  const store = await load();
  return store.habits.filter((h) => !h.archived);
}

export async function getAllHabitsIncludingArchived(): Promise<Habit[]> {
  const store = await load();
  return store.habits;
}

export async function createHabit(habit: Omit<Habit, "id" | "createdAt">): Promise<Habit> {
  const store = await load();
  const newHabit: Habit = {
    ...habit,
    id: `habit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  store.habits.push(newHabit);
  await save(store);
  return newHabit;
}

export async function updateHabit(id: string, updates: Partial<Omit<Habit, "id" | "createdAt">>): Promise<void> {
  const store = await load();
  const idx = store.habits.findIndex((h) => h.id === id);
  if (idx >= 0) {
    store.habits[idx] = { ...store.habits[idx], ...updates };
    await save(store);
  }
}

export async function archiveHabit(id: string): Promise<void> {
  await updateHabit(id, { archived: true });
}

export async function logHabitCompletion(habitId: string, date: ISODate, completed: boolean): Promise<void> {
  const store = await load();
  if (!store.logs[habitId]) store.logs[habitId] = {};
  store.logs[habitId][date] = completed;
  await save(store);
}

export async function getHabitLog(habitId: string): Promise<HabitLog> {
  const store = await load();
  return store.logs[habitId] ?? {};
}

export async function getTodayProgress(): Promise<{ total: number; completed: number; habits: Array<Habit & { done: boolean }> }> {
  const store = await load();
  const today = todayISO();
  const active = store.habits.filter((h) => !h.archived);
  const completed = active.filter((h) => store.logs[h.id]?.[today] === true);
  return {
    total: active.length,
    completed: completed.length,
    habits: active.map((h) => ({ ...h, done: store.logs[h.id]?.[today] === true })),
  };
}

export function getStreak(log: HabitLog): number {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10) as ISODate;
    if (log[iso]) streak++;
    else break;
  }
  return streak;
}

export async function getLongestActiveStreak(): Promise<number> {
  const store = await load();
  const active = store.habits.filter((h) => !h.archived);
  let longest = 0;
  for (const h of active) {
    const s = getStreak(store.logs[h.id] ?? {});
    if (s > longest) longest = s;
  }
  return longest;
}

/**
 * Correlate habit completion with mood (valence from check-ins).
 * Returns a number -1..1 where positive means "days you did this habit,
 * your mood tended to be higher".
 */
export function habitMoodCorrelation(log: HabitLog, records: DailyRecord[]): number {
  const doneValences: number[] = [];
  const missValences: number[] = [];

  for (const r of records) {
    const valence = r.checkIn?.valence;
    if (valence == null) continue;
    if (log[r.date]) doneValences.push(valence);
    else missValences.push(valence);
  }

  if (doneValences.length < 3 || missValences.length < 3) return 0;

  const avgDone = doneValences.reduce((a, b) => a + b, 0) / doneValences.length;
  const avgMiss = missValences.reduce((a, b) => a + b, 0) / missValences.length;

  // Normalise to -1..1 range (valence is already -1..1, so diff is -2..2)
  return Math.max(-1, Math.min(1, (avgDone - avgMiss) / 2));
}

// Suggested starter habits based on user goals
export const STARTER_HABITS: Record<string, Omit<Habit, "id" | "createdAt">> = {
  morning_walk: {
    name: "Morning walk",
    cue: "After I finish my morning coffee",
    routine: "Walk outside for 10 minutes",
    microVersion: "Step outside and take 5 deep breaths",
    category: "movement",
  },
  gratitude: {
    name: "Gratitude moment",
    cue: "When I sit down for breakfast",
    routine: "Think of one thing I'm grateful for today",
    microVersion: "Name one good thing from yesterday",
    category: "mindfulness",
  },
  wind_down: {
    name: "Wind-down routine",
    cue: "At 9pm when my alarm goes off",
    routine: "Put phone in another room, dim lights, read for 15 min",
    microVersion: "Put phone face-down and take 3 slow breaths",
    category: "sleep",
  },
  hydration: {
    name: "Morning hydration",
    cue: "As soon as I wake up",
    routine: "Drink a full glass of water before anything else",
    microVersion: "Take 3 sips of water",
    category: "nutrition",
  },
  connection: {
    name: "Reach out",
    cue: "During my lunch break",
    routine: "Send a message to someone I care about",
    microVersion: "Think of one person I appreciate",
    category: "social",
  },
  breathwork: {
    name: "Breathing reset",
    cue: "When I feel tension building",
    routine: "Do 4-7-8 breathing for 3 rounds",
    microVersion: "Take one slow, deep breath",
    category: "mindfulness",
  },
};
