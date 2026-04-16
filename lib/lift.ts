// lib/lift.ts
//
// Transient "you moved the needle" lift store.
//
// When the user completes a therapeutic micro-action (breath, anchor,
// realign, grounding scan) we record an entry here. The active lift is
// the sum of entries whose timestamp is within a decay window. It's
// added to today's mentalScore on Home so the orb visibly shifts hue
// right after the ritual — the "felt efficacy" mechanism.
//
// No privacy concerns: values are tiny integers + timestamps, no text.

import AsyncStorage from "@react-native-async-storage/async-storage";

const LIFT_KEY = "mind_body_lift_v1";
const DECAY_MS = 30 * 60 * 1000; // 30-minute decay window
const MAX_LIFT = 20;

export type LiftKind = "breath" | "anchor" | "realign" | "grounding";

type LiftEntry = {
  ts: number;
  kind: LiftKind;
  value: number; // points added to mentalScore for the decay window
};

async function readAll(): Promise<LiftEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LIFT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeAll(entries: LiftEntry[]): Promise<void> {
  await AsyncStorage.setItem(LIFT_KEY, JSON.stringify(entries));
}

/**
 * Record a completed micro-action. Returns the new active lift so the
 * caller can immediately trigger a ripple and re-render.
 */
export async function recordLift(kind: LiftKind, value: number): Promise<number> {
  const now = Date.now();
  const entries = await readAll();
  entries.push({ ts: now, kind, value: Math.max(1, Math.min(value, MAX_LIFT)) });
  // Keep the store small — drop entries older than 24h.
  const trimmed = entries.filter((e) => now - e.ts < 24 * 60 * 60 * 1000);
  await writeAll(trimmed);
  return getActiveLiftSync(trimmed, now);
}

/**
 * Active lift: sum of non-decayed entries, linear decay within the window,
 * capped at MAX_LIFT so a ritual spree can't run the number into orbit.
 */
export async function getActiveLift(): Promise<number> {
  const entries = await readAll();
  return getActiveLiftSync(entries, Date.now());
}

function getActiveLiftSync(entries: LiftEntry[], now: number): number {
  let total = 0;
  for (const e of entries) {
    const age = now - e.ts;
    if (age < 0 || age > DECAY_MS) continue;
    const remaining = 1 - age / DECAY_MS;
    total += e.value * remaining;
  }
  return Math.min(MAX_LIFT, Math.round(total));
}

/** Dev / demo helper. Clears all lift entries. */
export async function clearLift(): Promise<void> {
  await AsyncStorage.removeItem(LIFT_KEY);
}
