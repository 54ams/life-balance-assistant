// lib/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  DailyCheckIn,
  DailyRecord,
  ISODate,
  WearableDay,
  WearableMetrics,
  WearableSource,
  FutureEvent,
  EmotionalDiaryEntry,
} from "./types";
import { defaultValuesSet } from "./emotion";

const KEY = "life_balance_daily_records_v1";
const PLAN_KEY_PREFIX = "life_balance_plan_v1:";
const VALUES_KEY = "life_balance_values_v1";
const CONTEXT_KEY = "life_balance_context_v1";
const USER_NAME_KEY = "life_balance_user_name_v1";

type Store = Record<string, DailyRecord>;
const FUTURE_KEY = "life_balance_future_events_v1";
let writeChain: Promise<void> = Promise.resolve();

/** Backwards-compatible plan type (used by history/trends/export screens) */
export type StoredPlan = {
  date: string;
  lbi: number;
  baseline: number | null;
  confidence: "high" | "medium" | "low";
  category: "RECOVERY" | "NORMAL";
  focus: string;
  actions: string[];
  actionReasons?: string[];
  completedActions?: boolean[];
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

async function withStoreWrite(mutator: (store: Store) => void | Promise<void>) {
  writeChain = writeChain.then(async () => {
    const store = await loadStore();
    await mutator(store);
    await saveStore(store);
  });
  await writeChain;
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

export async function getCheckIn(date: ISODate): Promise<DailyCheckIn | null> {
  const store = await loadStore();
  return store[date]?.checkIn ?? null;
}

export async function upsertCheckIn(date: ISODate, checkIn: DailyCheckIn) {
  await withStoreWrite((store) => {
    const existing: DailyRecord = store[date] ?? { date, checkIn: null };
    store[date] = { ...existing, checkIn };
  });
}

export async function upsertEmotion(entry: EmotionalDiaryEntry) {
  await withStoreWrite((store) => {
    const existing: DailyRecord = store[entry.date] ?? { date: entry.date, checkIn: null };
    store[entry.date] = { ...existing, emotion: entry };
  });
}

export async function getEmotion(date: ISODate): Promise<EmotionalDiaryEntry | null> {
  const store = await loadStore();
  return store[date]?.emotion ?? null;
}

export async function upsertWearable(date: ISODate, wearable: WearableMetrics, source?: WearableSource) {
  await withStoreWrite((store) => {
    const existing: DailyRecord = store[date] ?? { date, checkIn: null };
    store[date] = { ...existing, wearable, wearableSource: source ?? existing.wearableSource };
  });
}

// ---------- Wearables (legacy bulk import) helpers ----------

/** Bulk-save wearable days (used by CSV import). */
export async function saveWearableDays(days: WearableDay[]) {
  await withStoreWrite((store) => {
    for (const d of days) {
      const existing: DailyRecord = store[d.date] ?? { date: d.date, checkIn: null };
      store[d.date] = {
        ...existing,
        wearable: d.wearable,
        wearableSource: d.source,
      };
    }
  });
}

/** Returns wearable data for a date if present. */
export async function getWearableDay(date: ISODate): Promise<WearableDay | null> {
  const day = await getDay(date);
  if (!day?.wearable) return null;
  return {
    date,
    wearable: day.wearable,
    source: (day.wearableSource ?? "whoop_export") as WearableSource,
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
      source: (d.wearableSource ?? "whoop_export") as WearableSource,
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
  await withStoreWrite((store) => {
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
  });
}

export async function clearAll() {
  const keys = await AsyncStorage.getAllKeys();
  const planKeys = keys.filter((k) => k.startsWith(PLAN_KEY_PREFIX));
  await AsyncStorage.multiRemove([KEY, FUTURE_KEY, VALUES_KEY, ...planKeys]);
}

// ---------- Backwards compatibility for old screens ----------

/** Old code expects: loadDailyRecord(date) */
export async function loadDailyRecord(date: string) {
  return getDay(date as ISODate);
}

/** Old plan API used by tabs */
export async function savePlan(plan: StoredPlan) {
  const completedActions =
    Array.isArray(plan.completedActions) && plan.completedActions.length === plan.actions.length
      ? plan.completedActions
      : plan.actions.map(() => false);
  await AsyncStorage.setItem(
    PLAN_KEY_PREFIX + plan.date,
    JSON.stringify({ ...plan, completedActions })
  );
}
export async function loadPlan(date: string): Promise<StoredPlan | null> {
  const raw = await AsyncStorage.getItem(PLAN_KEY_PREFIX + date);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredPlan;
    if (!Array.isArray(parsed.completedActions)) {
      return { ...parsed, completedActions: parsed.actions.map(() => false) };
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setPlanActionCompleted(
  date: string,
  actionIndex: number,
  completed: boolean
): Promise<StoredPlan | null> {
  const plan = await loadPlan(date);
  if (!plan) return null;
  const completedActions = [...(plan.completedActions ?? plan.actions.map(() => false))];
  if (actionIndex < 0 || actionIndex >= completedActions.length) return plan;
  completedActions[actionIndex] = completed;
  const updated = { ...plan, completedActions };
  await savePlan(updated);
  return updated;
}

export async function getPlanAdherence(date: string): Promise<number | null> {
  const plan = await loadPlan(date);
  if (!plan || !plan.actions.length) return null;
  const completed = (plan.completedActions ?? []).filter(Boolean).length;
  return completed / plan.actions.length;
}

export async function getPlanAdherenceSummary(days = 7): Promise<{
  adherencePct: number;
  streak: number;
  completedDays: number;
  totalDays: number;
}> {
  const plans = await listPlans(days);
  if (!plans.length) {
    return { adherencePct: 0, streak: 0, completedDays: 0, totalDays: 0 };
  }
  let completedDays = 0;
  for (const p of plans) {
    const done = (p.completedActions ?? []).filter(Boolean).length;
    if (p.actions.length > 0 && done === p.actions.length) completedDays += 1;
  }
  const adherencePct = plans.length ? Math.round((completedDays / plans.length) * 100) : 0;

  let streak = 0;
  const sorted = [...plans].sort((a, b) => b.date.localeCompare(a.date));
  for (const p of sorted) {
    const done = (p.completedActions ?? []).filter(Boolean).length;
    const dayComplete = p.actions.length > 0 && done === p.actions.length;
    if (!dayComplete) break;
    streak += 1;
  }

  return { adherencePct, streak, completedDays, totalDays: plans.length };
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
  const mood5 = Math.max(1, Math.min(5, Math.round(input.mood))) as 1 | 2 | 3 | 4 | 5;
  const energy5 = input.energy == null ? 3 : (Math.max(1, Math.min(5, Math.round(input.energy))) as 1 | 2 | 3 | 4 | 5);
  const stress5 = Math.max(1, Math.min(5, Math.round(input.stress))) as 1 | 2 | 3 | 4 | 5;
  const indicatorCount = stress5 === 1 ? 0 : stress5 === 2 ? 1 : stress5 === 3 ? 2 : stress5 === 4 ? 3 : 5;

  const keys: Array<keyof NonNullable<DailyCheckIn["stressIndicators"]>> = [
    "muscleTension",
    "racingThoughts",
    "irritability",
    "avoidance",
    "restlessness",
  ];

  const stressIndicators: NonNullable<DailyCheckIn["stressIndicators"]> = {
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
    mood: mood5,
    energy: energy5,
    stressLevel: stress5,
    sleepQuality: 3,
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
  await withStoreWrite((store) => {
    for (const date of Object.keys(store)) {
      if (!store[date]) continue;
      delete store[date].wearable;
      delete store[date].wearableSource;
    }
  });
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
    .map(([, v]) => {
      if (!v) return null;
      try {
        const parsed = JSON.parse(v) as StoredPlan;
        if (!Array.isArray(parsed.completedActions)) {
          return { ...parsed, completedActions: parsed.actions.map(() => false) };
        }
        return parsed;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as StoredPlan[];
  // Ensure chronological ascending
  plans.sort((a, b) => a.date.localeCompare(b.date));
  return plans;
}

export async function purgeOldData(retainDays: number): Promise<{
  recordsRemoved: number;
  plansRemoved: number;
  futureEventsRemoved: number;
}> {
  if (retainDays <= 0) return { recordsRemoved: 0, plansRemoved: 0, futureEventsRemoved: 0 };
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retainDays + 1);
  const yyyy = cutoff.getFullYear();
  const mm = String(cutoff.getMonth() + 1).padStart(2, "0");
  const dd = String(cutoff.getDate()).padStart(2, "0");
  const cutoffISO = `${yyyy}-${mm}-${dd}`;

  let recordsRemoved = 0;
  await withStoreWrite((store) => {
    for (const date of Object.keys(store)) {
      if (date < cutoffISO) {
        delete store[date];
        recordsRemoved += 1;
      }
    }
  });

  const keys = await AsyncStorage.getAllKeys();
  const oldPlanKeys = keys.filter((k) => k.startsWith(PLAN_KEY_PREFIX)).filter((k) => {
    const date = k.slice(PLAN_KEY_PREFIX.length);
    return date < cutoffISO;
  });
  if (oldPlanKeys.length) await AsyncStorage.multiRemove(oldPlanKeys);

  const rawFuture = (await AsyncStorage.getItem(FUTURE_KEY)) || "[]";
  let futureEvents: FutureEvent[] = [];
  try {
    futureEvents = JSON.parse(rawFuture) as FutureEvent[];
  } catch {
    futureEvents = [];
  }
  const keptFuture = futureEvents.filter((e) => e.dateISO >= cutoffISO);
  await AsyncStorage.setItem(FUTURE_KEY, JSON.stringify(keptFuture));

  return {
    recordsRemoved,
    plansRemoved: oldPlanKeys.length,
    futureEventsRemoved: Math.max(0, futureEvents.length - keptFuture.length),
  };
}

// --- Future events ---

export async function addFutureEvent(event: FutureEvent): Promise<void> {
  const raw = (await AsyncStorage.getItem(FUTURE_KEY)) || "[]";
  let events: FutureEvent[] = [];
  try {
    events = JSON.parse(raw) as FutureEvent[];
  } catch {
    events = [];
  }
  events.push(event);
  await AsyncStorage.setItem(FUTURE_KEY, JSON.stringify(events));
}

export async function updateFutureEvent(event: FutureEvent): Promise<void> {
  const raw = (await AsyncStorage.getItem(FUTURE_KEY)) || "[]";
  let events: FutureEvent[] = [];
  try {
    events = JSON.parse(raw) as FutureEvent[];
  } catch {
    events = [];
  }
  events = events.map((e) => (e.id === event.id ? event : e));
  await AsyncStorage.setItem(FUTURE_KEY, JSON.stringify(events));
}

export async function deleteFutureEvent(id: string): Promise<void> {
  const raw = (await AsyncStorage.getItem(FUTURE_KEY)) || "[]";
  let events: FutureEvent[] = [];
  try {
    events = JSON.parse(raw) as FutureEvent[];
  } catch {
    events = [];
  }
  events = events.filter((e) => e.id !== id);
  await AsyncStorage.setItem(FUTURE_KEY, JSON.stringify(events));
}

export async function listFutureEventsByDate(date: ISODate): Promise<FutureEvent[]> {
  const raw = (await AsyncStorage.getItem(FUTURE_KEY)) || "[]";
  let events: FutureEvent[] = [];
  try {
    events = JSON.parse(raw) as FutureEvent[];
  } catch {
    events = [];
  }
  return events.filter((e) => e.dateISO === date);
}

export async function listUpcomingEvents(today: ISODate, daysAhead = 14): Promise<FutureEvent[]> {
  const raw = (await AsyncStorage.getItem(FUTURE_KEY)) || "[]";
  let events: FutureEvent[] = [];
  try {
    events = JSON.parse(raw) as FutureEvent[];
  } catch {
    events = [];
  }
  const start = Date.parse(today);
  const end = start + daysAhead * 86400000;
  return events.filter((e) => {
    const t = Date.parse(e.dateISO);
    return t >= start && t <= end;
  });
}


export async function listDailyRecords(days?: number): Promise<DailyRecord[]> {
  const store = await loadStore();
  const all = Object.values(store).sort((a, b) => a.date.localeCompare(b.date));
  if (!days || days <= 0) return all;
  return all.slice(-days);
}

export async function listEmotions(days?: number): Promise<EmotionalDiaryEntry[]> {
  const records = await listDailyRecords();
  const emotions = records
    .map((r) => r.emotion)
    .filter(Boolean) as EmotionalDiaryEntry[];
  if (!emotions.length) return [];
  emotions.sort((a, b) => a.date.localeCompare(b.date));
  if (!days || days <= 0) return emotions;
  return emotions.slice(-days);
}

// --- Values (identity set) ---

export async function getActiveValues(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(VALUES_KEY);
  if (!raw) return defaultValuesSet();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 3 && parsed.length <= 6) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return defaultValuesSet();
}

export async function saveActiveValues(values: string[]): Promise<void> {
  const unique = Array.from(new Set(values)).slice(0, 6);
  if (unique.length < 3) throw new Error("Select at least 3 values.");
  await AsyncStorage.setItem(VALUES_KEY, JSON.stringify(unique));
}

export async function getLifeContexts(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(CONTEXT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveLifeContexts(contexts: string[]): Promise<void> {
  await AsyncStorage.setItem(CONTEXT_KEY, JSON.stringify(contexts));
}

export async function getUserName(): Promise<string> {
  return (await AsyncStorage.getItem(USER_NAME_KEY)) ?? "";
}

export async function saveUserName(name: string): Promise<void> {
  await AsyncStorage.setItem(USER_NAME_KEY, name.trim());
}
