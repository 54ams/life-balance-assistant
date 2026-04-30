// lib/demo.ts
import { calculateLBI } from "./lbi";
import { clearAll, upsertCheckIn, upsertLBI, upsertWearable } from "./storage";
import type { ISODate } from "./types";
import { clamp } from "./util/clamp";
// lib/demo.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyCheckIn, WearableMetrics } from "./types";

const DEMO_ENABLED_KEY = "demo_enabled_v1";
const DEMO_CHECKIN_KEY = "demo_override_checkin_v1";
const DEMO_WEARABLE_KEY = "demo_override_wearable_v1";

/**
 * Whether the user chose "exploring the demo" on first run. Distinct from
 * `demo_enabled_v1` which is the settings-level toggle — this key records
 * the examiner-mode intent so the UI can show a "Demo data" badge.
 */
export const DEMO_MODE_KEY = "demo_mode_choice_v1";
export const FIRST_RUN_DONE_KEY = "first_run_done_v1";

export type DemoModeChoice = "demo" | "fresh" | null;

export async function getDemoModeChoice(): Promise<DemoModeChoice> {
  const v = await AsyncStorage.getItem(DEMO_MODE_KEY);
  return v === "demo" || v === "fresh" ? v : null;
}

export async function setDemoModeChoice(choice: DemoModeChoice): Promise<void> {
  if (!choice) {
    await AsyncStorage.removeItem(DEMO_MODE_KEY);
  } else {
    await AsyncStorage.setItem(DEMO_MODE_KEY, choice);
  }
}

export async function getFirstRunDone(): Promise<boolean> {
  return (await AsyncStorage.getItem(FIRST_RUN_DONE_KEY)) === "1";
}

export async function setFirstRunDone(done: boolean): Promise<void> {
  if (done) await AsyncStorage.setItem(FIRST_RUN_DONE_KEY, "1");
  else await AsyncStorage.removeItem(FIRST_RUN_DONE_KEY);
}

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

/**
 * Kiosk reset — for live-viva "reset between examiners" flow.
 * Wipes all local data + onboarding/welcome/first-run flags so the next launch
 * shows the animated welcome screen again.
 */
export async function kioskReset(): Promise<void> {
  // AsyncStorage.clear() is the most exhaustive option — it ensures no stale
  // key (including ones added in future features) leaks between participants.
  // We fall back to clearAll + explicit key removals if clear() throws on this
  // platform, which keeps the examiner-between-runs reset robust.
  try {
    await AsyncStorage.clear();
  } catch {
    await clearAll();
    await AsyncStorage.multiRemove([
      "welcome_seen_v1",
      "app_consent_v1",
      "preferred_tone_v1",
      "primary_goal_v1",
      "sleep_window_v1",
      "whoop_session_token",
      "whoop_participant_id",
      "whoop_last_sync",
      "whoop_last_sync_at",
      "whoop_consent_v1",
      DEMO_MODE_KEY,
      FIRST_RUN_DONE_KEY,
      DEMO_ENABLED_KEY,
      DEMO_CHECKIN_KEY,
      DEMO_WEARABLE_KEY,
    ]);
  }
}

export async function getDemoCheckIn(): Promise<DailyCheckIn | null> {
  const raw = await AsyncStorage.getItem(DEMO_CHECKIN_KEY);
  return raw ? (JSON.parse(raw) as DailyCheckIn) : null;
}

export async function getDemoWearable(): Promise<WearableMetrics | null> {
  const raw = await AsyncStorage.getItem(DEMO_WEARABLE_KEY);
  return raw ? (JSON.parse(raw) as WearableMetrics) : null;
}

import { todayISO } from "./util/todayISO";

function isoDateNDaysAgo(n: number): ISODate {
  const d = new Date(todayISO());
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}` as ISODate;
}

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function seedDemo(days = 30) {
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

    const mood = pick([1, 2, 3, 4, 5]) as 1 | 2 | 3 | 4 | 5;
    const energy = pick([1, 2, 3, 4, 5]) as 1 | 2 | 3 | 4 | 5;

    const checkIn: DailyCheckIn = {
      mood: stressed ? (mood <= 3 ? mood : 3) as 1 | 2 | 3 | 4 | 5 : mood,
      energy,
      stressLevel: stressed ? pick([3, 4, 5]) as 3 | 4 | 5 : pick([1, 2, 3]) as 1 | 2 | 3,
      sleepQuality: pick([2, 3, 4, 5]) as 1 | 2 | 3 | 4 | 5,
      stressIndicators,
      caffeineAfter2pm: Math.random() < 0.25,
      alcohol: Math.random() < 0.15,
      exerciseDone: Math.random() < 0.5,
      deepWorkMins: pick([0, 15, 30, 60, 90, 120]),
      hydrationLitres: Math.round((Math.random() * 1.5 + 1.5) * 10) / 10,
    };
    await upsertCheckIn(date, checkIn);

    // Compute + store LBI
    const lbiRes = calculateLBI({
      recovery,
      sleepHours,
      strain,
      checkIn,
    });

    await upsertLBI(date, {
      lbi: lbiRes.lbi,
      classification: lbiRes.classification,
      confidence: lbiRes.confidence,
      reason: lbiRes.reason,
    });
  }
}
