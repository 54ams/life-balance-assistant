// lib/demo.ts
import { calculateLBI } from "./lbi";
import { clearAll, upsertCheckIn, upsertLBI, upsertWearable } from "./storage";
import type { ISODate } from "./types";
// lib/demo.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyCheckIn, WearableMetrics } from "./types";

const DEMO_ENABLED_KEY = "demo_enabled_v1";
const DEMO_CHECKIN_KEY = "demo_override_checkin_v1";
const DEMO_WEARABLE_KEY = "demo_override_wearable_v1";

export async function isDemoEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(DEMO_ENABLED_KEY);
  return v === "1";
}

export async function setDemoEnabled(on: boolean) {
  await AsyncStorage.setItem(DEMO_ENABLED_KEY, on ? "1" : "0");
}

export async function setDemoCheckIn(checkIn: DailyCheckIn) {
  await AsyncStorage.setItem(DEMO_CHECKIN_KEY, JSON.stringify(checkIn));
}

export async function setDemoWearable(wearable: WearableMetrics) {
  await AsyncStorage.setItem(DEMO_WEARABLE_KEY, JSON.stringify(wearable));
}

export async function clearDemoOverrides() {
  await AsyncStorage.multiRemove([DEMO_CHECKIN_KEY, DEMO_WEARABLE_KEY]);
}

export async function getDemoCheckIn(): Promise<DailyCheckIn | null> {
  const raw = await AsyncStorage.getItem(DEMO_CHECKIN_KEY);
  return raw ? (JSON.parse(raw) as DailyCheckIn) : null;
}

export async function getDemoWearable(): Promise<WearableMetrics | null> {
  const raw = await AsyncStorage.getItem(DEMO_WEARABLE_KEY);
  return raw ? (JSON.parse(raw) as WearableMetrics) : null;
}

function isoDateNDaysAgo(n: number): ISODate {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10) as ISODate;
}

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function seedDemo(days = 14) {
  await clearAll();

  for (let i = days - 1; i >= 0; i--) {
    const date = isoDateNDaysAgo(i);

    // Simulated WHOOP-like patterns: recovery tends to drop after high strain / poor sleep
    const sleepHours = Math.round(randBetween(5.2, 8.8) * 10) / 10;
    const strain = Math.round(randBetween(6, 18) * 10) / 10;
    const recovery = Math.round(clamp(100 - (strain - 8) * 4 - (7.5 - sleepHours) * 10 + randBetween(-8, 8), 5, 95));

    await upsertWearable(date, {
      recovery,
      sleepHours,
      strain,
    });

    // Check-in (biased reduced): indicators
    const stressed = recovery < 45 || sleepHours < 6.3 || strain > 14;
    const stressIndicators = {
      muscleTension: stressed ? Math.random() < 0.6 : Math.random() < 0.2,
      racingThoughts: stressed ? Math.random() < 0.5 : Math.random() < 0.15,
      irritability: stressed ? Math.random() < 0.45 : Math.random() < 0.15,
      avoidance: stressed ? Math.random() < 0.4 : Math.random() < 0.12,
      restlessness: stressed ? Math.random() < 0.5 : Math.random() < 0.18,
    };

    const mood = pick([1, 2, 3, 4]) as 1 | 2 | 3 | 4;
    const energy = pick([1, 2, 3, 4]) as 1 | 2 | 3 | 4;

    await upsertCheckIn(date, {
      mood: stressed ? (mood <= 3 ? mood : 3) as 1 | 2 | 3 | 4 : mood,
      energy,
      stressIndicators,
      caffeineAfter2pm: Math.random() < 0.25,
      alcohol: Math.random() < 0.15,
      deepWorkMins: pick([0, 15, 30, 60, 90, 120]),
    });

    // Compute + store LBI
    const lbiRes = calculateLBI({
      recovery,
      sleepHours,
      strain,
      checkIn: {
        mood: stressed ? (mood <= 3 ? mood : 3) as 1 | 2 | 3 | 4 : mood,
        energy,
        stressIndicators,
        caffeineAfter2pm: Math.random() < 0.25,
        alcohol: Math.random() < 0.15,
        deepWorkMins: pick([0, 15, 30, 60, 90, 120]),
      },
    });

    await upsertLBI(date, {
      lbi: lbiRes.lbi,
      classification: lbiRes.classification,
      confidence: lbiRes.confidence,
      reason: lbiRes.reason,
    });
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
