// lib/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyCheckIn, DailyRecord, ISODate, WearableDay, WearableMetrics, WearableSource } from "./types";

const KEY = "life_balance_daily_records_v1";
const PLAN_KEY_PREFIX = "life_balance_plan_v1:";
const KEY_WEARABLE_PREFIX = "life_balance_wearable_v1:";

type Store = Record<string, DailyRecord>;

/** Backwards-compatible plan type (used by history/trends/export screens) */
export type StoredPlan = {
  date: string;
  lbi: number;
  baseline: number | null;
  confidence: "high" | "medium" | "low";
  category: "RECOVERY" | "NORMAL" | "PUSH";
  focus: string;
  actions: string[];
  triggers: string[];
  explanation?: string;
};

async function loadStore(): Promise<Store> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);

    // Minimal shape check: must be a plain object (Store is Record<string, DailyRecord>)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      // quarantine the bad data so it's not silently lost
      await AsyncStorage.setItem(`${KEY}:corrupt_backup`, raw);
      return {};
    }

    return parsed as Store;
  } catch (err) {
    // quarantine the corrupt JSON then recover safely
    await AsyncStorage.setItem(`${KEY}:corrupt_backup`, raw);
    return {};
  }
}


async function saveStore(store: Store) {
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
}

// ---------- Core v2 API ----------
export async function getDay(date: ISODate): Promise<DailyRecord | null> {
  const store = await loadStore();
  return store[date] ?? null;
}

export async function getAllDays(): Promise<DailyRecord[]> {
  const store = await loadStore();
  return Object.values(store).sort((a, b) => a.date.localeCompare(b.date));
}

export async function upsertCheckIn(date: ISODate, checkIn: DailyCheckIn) {
  const store = await loadStore();
  const existing: DailyRecord = store[date] ?? { date, checkIn: null };
  store[date] = { ...existing, checkIn };
  await saveStore(store);
}

export async function upsertWearable(date: ISODate, wearable: WearableMetrics, source?: WearableSource) {
  const store = await loadStore();
  const existing: DailyRecord = store[date] ?? { date, checkIn: null };
  store[date] = { ...existing, wearable, wearableSource: source ?? existing.wearableSource };
  await saveStore(store);
}

// ---------- Wearables (CSV import) helpers ----------

/** Bulk-save wearable days (used by CSV import). */
export async function saveWearableDays(days: WearableDay[]) {
  const store = await loadStore();
  for (const d of days) {
    const existing: DailyRecord = store[d.date] ?? { date: d.date, checkIn: null };
    store[d.date] = {
      ...existing,
      wearable: d.wearable,
      wearableSource: d.source,
    };
  }
  await saveStore(store);
}

/** Returns wearable data for a date if present. */
export async function getWearableDay(date: ISODate): Promise<WearableDay | null> {
  const day = await getDay(date);
  if (!day?.wearable) return null;
  return {
    date,
    wearable: day.wearable,
    source: (day.wearableSource ?? "normalized_csv") as WearableSource,
  };
}

/** Returns all stored wearable days (sorted). */
export async function getWearableDays(): Promise<WearableDay[]> {
  const all = await getAllDays();
  return all
    .filter((d) => !!d.wearable)
    .map((d) => ({
      date: d.date,
      wearable: d.wearable as WearableMetrics,
      source: (d.wearableSource ?? "normalized_csv") as WearableSource,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function upsertLBI(
  date: ISODate,
  payload: {
    lbi: number;
    classification: NonNullable<DailyRecord["lbiMeta"]>["classification"];
    confidence: NonNullable<DailyRecord["lbiMeta"]>["confidence"];
    reason: string;
  }
) {
  const store = await loadStore();
  const existing: DailyRecord = store[date] ?? { date, checkIn: null };
  store[date] = {
    ...existing,
    lbi: payload.lbi,
    lbiMeta: {
      classification: payload.classification,
      confidence: payload.confidence,
      reason: payload.reason,
    },
  };
  await saveStore(store);
}

export async function clearAll() {
  await AsyncStorage.removeItem(KEY);
}

// ---------- Backwards compatibility for old screens ----------

/** Old code expects: loadDailyRecord(date) */
export async function loadDailyRecord(date: string) {
  return getDay(date as ISODate);
}

/** Old plan API used by tabs */
export async function savePlan(plan: StoredPlan) {
  await AsyncStorage.setItem(PLAN_KEY_PREFIX + plan.date, JSON.stringify(plan));
}
export async function loadPlan(date: string): Promise<StoredPlan | null> {
  const raw = await AsyncStorage.getItem(PLAN_KEY_PREFIX + date);
  return raw ? (JSON.parse(raw) as StoredPlan) : null;
}

/**
 * Old Explore screen calls saveCheckIn({date, mood, stress, ...})
 * New API is upsertCheckIn(date, DailyCheckIn)
 * This supports BOTH call styles.
 */
type LegacyCheckInObject = {
  date: string;
  mood: number; // 1–5
  stress: number; // 1–5
  energy?: number;
  notes?: string;
};

function legacyToNewCheckIn(input: LegacyCheckInObject): DailyCheckIn {
  // mood 1–5 -> 1–4
  const mood5 = Math.max(1, Math.min(5, Math.round(input.mood)));
  const mood4 = (mood5 <= 2 ? 1 : mood5 === 3 ? 2 : mood5 === 4 ? 3 : 4) as 1 | 2 | 3 | 4;

  // stress 1–5 -> number of indicators (0..5)
  const stress5 = Math.max(1, Math.min(5, Math.round(input.stress)));
  const indicatorCount =
    stress5 === 1 ? 0 : stress5 === 2 ? 1 : stress5 === 3 ? 2 : stress5 === 4 ? 3 : 5;

  const keys: Array<keyof DailyCheckIn["stressIndicators"]> = [
    "muscleTension",
    "racingThoughts",
    "irritability",
    "avoidance",
    "restlessness",
  ];

  const stressIndicators: DailyCheckIn["stressIndicators"] = {
    muscleTension: false,
    racingThoughts: false,
    irritability: false,
    avoidance: false,
    restlessness: false,
  };

  for (let i = 0; i < indicatorCount; i++) {
    stressIndicators[keys[i]] = true;
  }

  return {
    mood: mood4,
    energy:
      input.energy == null
        ? undefined
        : (Math.max(1, Math.min(4, Math.round(input.energy))) as 1 | 2 | 3 | 4),
    stressIndicators,
    notes: input.notes,
  };
}

// Overloads to satisfy TS everywhere
export async function saveCheckIn(date: string, checkIn: DailyCheckIn): Promise<void>;
export async function saveCheckIn(payload: LegacyCheckInObject): Promise<void>;
export async function saveCheckIn(a: any, b?: any) {
  // Called like saveCheckIn({date, mood, stress, ...})
  if (typeof a === "object" && a?.date && b == null) {
    const date = a.date as string;
    const normalized = legacyToNewCheckIn(a as LegacyCheckInObject);
    await upsertCheckIn(date as ISODate, normalized);
    return;
  }

  // Called like saveCheckIn(date, checkIn)
  const date = a as string;
  const checkIn = b as DailyCheckIn;
  await upsertCheckIn(date as ISODate, checkIn);
}

// Convenience helpers for settings / demo.
export async function clearAllPlans(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const planKeys = keys.filter((k) => k.startsWith(PLAN_KEY_PREFIX));
  if (planKeys.length) await AsyncStorage.multiRemove(planKeys);
}

export async function clearAllWearables(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const wearableKeys = keys.filter((k) => k.startsWith(KEY_WEARABLE_PREFIX));
  if (wearableKeys.length) await AsyncStorage.multiRemove(wearableKeys);
}

/** List the most recent saved plans (used by Trends + Export). */
export async function listPlans(days: number): Promise<StoredPlan[]> {
  const keys = await AsyncStorage.getAllKeys();
  const planKeys = keys
    .filter((k) => k.startsWith(PLAN_KEY_PREFIX))
    .sort()
    .slice(-days);
  if (!planKeys.length) return [];
  const pairs = await AsyncStorage.multiGet(planKeys);
  const plans = pairs
    .map(([, v]) => (v ? (JSON.parse(v) as StoredPlan) : null))
    .filter(Boolean) as StoredPlan[];
  // Ensure chronological ascending
  plans.sort((a, b) => a.date.localeCompare(b.date));
  return plans;
}


export async function listDailyRecords(days?: number): Promise<DailyRecord[]> {
  const store = await loadStore();
  const all = Object.values(store).sort((a, b) => a.date.localeCompare(b.date));
  if (!days || days <= 0) return all;
  return all.slice(-days);
}
