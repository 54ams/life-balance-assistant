// lib/anchors.ts
//
// Dawn + dusk anchor words — tiny 10-second bookend rituals.
//
//   - Dawn: one word for the day ("patience", "move", "listen"…)
//   - Dusk: one word to let go ("finally", "enough", "done"…)
//
// Anchors are opt-in, never blocking. They show up as small dots on
// the 7-day ribbon and grant a small mentalScore lift via `lib/lift.ts`
// so the user *feels* the ritual had weight.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ISODate } from "./types";
import { todayISO } from "./util/todayISO";

const ANCHOR_KEY = "anchors_v1";

export type AnchorKind = "dawn" | "dusk";

export type AnchorRecord = {
  date: ISODate;
  dawn?: { word: string; ts: number };
  dusk?: { word: string; ts: number };
};

export const DAWN_WORDS = [
  "patience",
  "move",
  "listen",
  "begin",
  "open",
  "trust",
  "soft",
  "steady",
] as const;

export const DUSK_WORDS = [
  "enough",
  "done",
  "release",
  "rest",
  "thank you",
  "finally",
  "close",
  "quiet",
] as const;

type Store = Record<ISODate, AnchorRecord>;

async function readStore(): Promise<Store> {
  try {
    const raw = await AsyncStorage.getItem(ANCHOR_KEY);
    if (!raw) return {};
    const s = JSON.parse(raw);
    return s && typeof s === "object" ? (s as Store) : {};
  } catch {
    return {};
  }
}

async function writeStore(s: Store): Promise<void> {
  await AsyncStorage.setItem(ANCHOR_KEY, JSON.stringify(s));
}

export async function getAnchorsForDate(date: ISODate = todayISO()): Promise<AnchorRecord> {
  const s = await readStore();
  return s[date] ?? { date };
}

export async function saveAnchor(kind: AnchorKind, word: string, date: ISODate = todayISO()): Promise<AnchorRecord> {
  const trimmed = word.trim().slice(0, 18);
  if (!trimmed) return getAnchorsForDate(date);
  const s = await readStore();
  const cur = s[date] ?? { date };
  const next: AnchorRecord = {
    ...cur,
    [kind]: { word: trimmed, ts: Date.now() },
  };
  s[date] = next;
  await writeStore(s);
  return next;
}

export async function listAnchors(lastNDays = 14): Promise<AnchorRecord[]> {
  const s = await readStore();
  return Object.values(s)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, lastNDays);
}

/** Whether we're in a "dawn" window (before 11:00 local) for today. */
export function isDawnWindow(now = new Date()): boolean {
  return now.getHours() < 11;
}

/** Whether we're in a "dusk" window (after 18:00 local) for today. */
export function isDuskWindow(now = new Date()): boolean {
  return now.getHours() >= 18;
}
