// lib/demoWhoop.ts
//
// Demo WHOOP seeding for academic markers and supervisors who do not have
// access to a real WHOOP account. Injects realistic, normalized wearable
// data into the same storage path that the live WHOOP sync uses, so every
// downstream feature (LBI, plan, history, ML risk, transparency, exports)
// behaves identically — except the wearableSource is "whoop_demo", which
// is rendered as "WHOOP (demo)" so it is never confused with real data.
//
// This deliberately reuses upsertWearable + refreshDerivedForDate (the same
// pipeline whoopSync.ts calls). It does NOT replace or mock the real OAuth
// path — that code in app/(tabs)/profile/integrations/whoop.tsx and
// backend/whoop.ts is unchanged and remains the production code path for
// the viva and pilot testers with real WHOOP devices.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { upsertWearable } from "./storage";
import { refreshDerivedForDate } from "./pipeline";
import type { ISODate, WearableMetrics } from "./types";
import { todayISO } from "./util/todayISO";
import { clamp } from "./util/clamp";

export const WHOOP_DEMO_FLAG_KEY = "whoop_demo_active_v1";
const LAST_SYNC_KEY = "whoop_last_sync";

export const WHOOP_DEMO_DAYS = 30;

export type DemoWhoopResult = {
  daysSeeded: number;
  firstDate: ISODate;
  lastDate: ISODate;
};

function isoDateNDaysAgo(n: number): ISODate {
  const d = new Date(todayISO());
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}` as ISODate;
}

// Deterministic-but-realistic WHOOP-shaped pattern: recovery covaries with
// sleep duration and inverse strain, with a small day-to-day jitter so the
// trend lines look human, not flat. Same shape as the real WHOOP normalize
// step in backend/whoop.ts (recovery 0–100, sleepHours decimal, strain 0–21).
function generateDay(daysAgo: number): WearableMetrics {
  // Mild weekly cycle: weekend recovery slightly higher, mid-week strain higher.
  const weekday = (daysAgo + new Date(todayISO()).getDay()) % 7;
  const weekendBoost = weekday === 0 || weekday === 6 ? 6 : 0;

  // Pseudo-random but deterministic by daysAgo so re-seeding gives the same
  // dataset (helps when a marker re-runs the demo and expects consistency).
  const seed = (daysAgo * 9301 + 49297) % 233280;
  const rnd = (offset: number) => {
    const v = ((seed + offset) * 9301 + 49297) % 233280;
    return v / 233280;
  };

  const sleepHours = Math.round((6.0 + rnd(1) * 2.5) * 10) / 10; // 6.0–8.5
  const strain = Math.round((8 + rnd(2) * 9) * 10) / 10; // 8.0–17.0
  const recoveryBase =
    100 - (strain - 8) * 3.5 - (7.5 - sleepHours) * 8 + weekendBoost + (rnd(3) - 0.5) * 10;
  const recovery = Math.round(clamp(recoveryBase, 18, 92));

  return { recovery, sleepHours, strain };
}

/**
 * Whether the user has activated the demo WHOOP path. Used by the WHOOP
 * screen to show a "Demo data active" badge and by transparency surfaces
 * to render "WHOOP (demo)" instead of "WHOOP".
 */
export async function isDemoWhoopActive(): Promise<boolean> {
  return (await AsyncStorage.getItem(WHOOP_DEMO_FLAG_KEY)) === "1";
}

/**
 * Seed N days of demo WHOOP data through the same upsert + derive pipeline
 * the real OAuth sync uses. Marks each day with source "whoop_demo" so the
 * UI can clearly label the data and the export bundle records its provenance.
 */
export async function activateDemoWhoop(days: number = WHOOP_DEMO_DAYS): Promise<DemoWhoopResult> {
  const today = todayISO();
  let firstDate: ISODate = today as ISODate;
  let lastDate: ISODate = today as ISODate;

  for (let i = days - 1; i >= 0; i--) {
    const date = isoDateNDaysAgo(i);
    if (i === days - 1) firstDate = date;
    if (i === 0) lastDate = date;
    const wearable = generateDay(i);
    await upsertWearable(date, wearable, "whoop_demo");
    await refreshDerivedForDate(date);
  }

  await AsyncStorage.setItem(WHOOP_DEMO_FLAG_KEY, "1");
  await AsyncStorage.setItem(LAST_SYNC_KEY, today);

  return { daysSeeded: days, firstDate, lastDate };
}

/**
 * Clear the demo-active flag. Existing demo wearable rows remain on the
 * device (they're harmless and tagged whoop_demo) — the user can purge them
 * via Profile → Settings → Data → Purge now if they want a clean state.
 */
export async function deactivateDemoWhoop(): Promise<void> {
  await AsyncStorage.removeItem(WHOOP_DEMO_FLAG_KEY);
}
