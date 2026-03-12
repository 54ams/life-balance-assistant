// lib/audit.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyRecord } from "./types";

type AuditCounts = {
  checkIns: number;
  results: number;
  plans: number;
  wearables: number;
};

export type AuditSnapshot = {
  nowISO: string;
  counts: AuditCounts;
  latest: {
    checkInDate?: string;
    resultDate?: string;
    planDate?: string;
    wearableDate?: string;
  };
  keys: {
    checkInKeys: string[];
    resultKeys: string[];
    planKeys: string[];
    wearableKeys: string[];
  };
  sample: {
    latestCheckIn?: unknown;
    latestResult?: unknown;
    latestPlan?: unknown;
    latestWearable?: unknown;
  };
};

function dateFromKey(prefix: string, key: string) {
  if (!key.startsWith(prefix)) return null;
  return key.slice(prefix.length);
}

function sortDatesDesc(dates: string[]) {
  return [...dates].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
}

async function loadJSON(key?: string) {
  if (!key) return undefined;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function getAuditSnapshot(): Promise<AuditSnapshot> {
  const allKeys = await AsyncStorage.getAllKeys();
  const DAILY_KEY = "life_balance_daily_records_v1";
  const PLAN_PREFIX = "life_balance_plan_v1:";

  const planKeys = allKeys.filter((k) => k.startsWith(PLAN_PREFIX));
  const dailyRaw = await AsyncStorage.getItem(DAILY_KEY);
  let store: Record<string, DailyRecord> = {};
  if (dailyRaw) {
    try {
      store = JSON.parse(dailyRaw) as Record<string, DailyRecord>;
    } catch {
      store = {};
    }
  }
  const dailyRecords = Object.values(store);
  const checkInDates = sortDatesDesc(dailyRecords.filter((r) => !!r.checkIn).map((r) => r.date));
  const resultDates = sortDatesDesc(dailyRecords.filter((r) => typeof r.lbi === "number").map((r) => r.date));
  const wearableDates = sortDatesDesc(dailyRecords.filter((r) => !!r.wearable).map((r) => r.date));
  const planDates = sortDatesDesc(
    planKeys.map((k) => dateFromKey(PLAN_PREFIX, k)).filter(Boolean) as string[]
  );

  const latestPlanKey = planDates[0] ? `${PLAN_PREFIX}${planDates[0]}` : undefined;
  const latestCheckIn = checkInDates[0] ? store[checkInDates[0]]?.checkIn : undefined;
  const latestResult = resultDates[0] ? store[resultDates[0]] : undefined;
  const latestWearable = wearableDates[0] ? store[wearableDates[0]]?.wearable : undefined;

  return {
    nowISO: new Date().toISOString(),
    counts: {
      checkIns: checkInDates.length,
      results: resultDates.length,
      plans: planKeys.length,
      wearables: wearableDates.length,
    },
    latest: {
      checkInDate: checkInDates[0],
      resultDate: resultDates[0],
      planDate: planDates[0],
      wearableDate: wearableDates[0],
    },
    keys: {
      checkInKeys: checkInDates.slice(0, 50),
      resultKeys: resultDates.slice(0, 50),
      planKeys: planKeys.slice(0, 50),
      wearableKeys: wearableDates.slice(0, 50),
    },
    sample: {
      latestCheckIn,
      latestResult,
      latestPlan: await loadJSON(latestPlanKey),
      latestWearable,
    },
  };
}
