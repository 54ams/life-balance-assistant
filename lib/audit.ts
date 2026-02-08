// lib/audit.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  // expects prefix like "checkin:" and key like "checkin:2026-01-01"
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

  // ⚠️ Adjust these prefixes if your storage.ts uses different ones.
  // These match the common pattern you’ve been using: checkin:, result:, plan:, wearable:
  const prefixes = {
    checkIn: "checkin:",
    result: "result:",
    plan: "plan:",
    wearable: "wearable:",
  } as const;

  const checkInKeys = allKeys.filter((k) => k.startsWith(prefixes.checkIn));
  const resultKeys = allKeys.filter((k) => k.startsWith(prefixes.result));
  const planKeys = allKeys.filter((k) => k.startsWith(prefixes.plan));
  const wearableKeys = allKeys.filter((k) => k.startsWith(prefixes.wearable));

  const checkInDates = sortDatesDesc(
    checkInKeys.map((k) => dateFromKey(prefixes.checkIn, k)).filter(Boolean) as string[]
  );
  const resultDates = sortDatesDesc(
    resultKeys.map((k) => dateFromKey(prefixes.result, k)).filter(Boolean) as string[]
  );
  const planDates = sortDatesDesc(
    planKeys.map((k) => dateFromKey(prefixes.plan, k)).filter(Boolean) as string[]
  );
  const wearableDates = sortDatesDesc(
    wearableKeys.map((k) => dateFromKey(prefixes.wearable, k)).filter(Boolean) as string[]
  );

  const latestCheckInKey = checkInDates[0] ? `${prefixes.checkIn}${checkInDates[0]}` : undefined;
  const latestResultKey = resultDates[0] ? `${prefixes.result}${resultDates[0]}` : undefined;
  const latestPlanKey = planDates[0] ? `${prefixes.plan}${planDates[0]}` : undefined;
  const latestWearableKey = wearableDates[0] ? `${prefixes.wearable}${wearableDates[0]}` : undefined;

  return {
    nowISO: new Date().toISOString(),
    counts: {
      checkIns: checkInKeys.length,
      results: resultKeys.length,
      plans: planKeys.length,
      wearables: wearableKeys.length,
    },
    latest: {
      checkInDate: checkInDates[0],
      resultDate: resultDates[0],
      planDate: planDates[0],
      wearableDate: wearableDates[0],
    },
    keys: {
      checkInKeys: checkInKeys.slice(0, 50),
      resultKeys: resultKeys.slice(0, 50),
      planKeys: planKeys.slice(0, 50),
      wearableKeys: wearableKeys.slice(0, 50),
    },
    sample: {
      latestCheckIn: await loadJSON(latestCheckInKey),
      latestResult: await loadJSON(latestResultKey),
      latestPlan: await loadJSON(latestPlanKey),
      latestWearable: await loadJSON(latestWearableKey),
    },
  };
}
