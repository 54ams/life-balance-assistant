import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDemoCheckIn, isDemoEnabled } from "./demo";

export type DailyCheckIn = {
  date: string; // YYYY-MM-DD
  mood: 1 | 2 | 3 | 4 | 5;
  stress: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  notes?: string;
};
export type DailyResult = {
  date: string; // YYYY-MM-DD
  lbi: number;  // 0-100
};
const resultKeyForDate = (date: string) => `result:${date}`;

export async function saveDailyResult(result: DailyResult) {
  await AsyncStorage.setItem(resultKeyForDate(result.date), JSON.stringify(result));
}

export async function loadDailyResult(date: string): Promise<DailyResult | null> {
  const raw = await AsyncStorage.getItem(resultKeyForDate(date));
  return raw ? (JSON.parse(raw) as DailyResult) : null;
}

const keyForDate = (date: string) => `checkin:${date}`;

export async function saveCheckIn(data: DailyCheckIn) {
  await AsyncStorage.setItem(keyForDate(data.date), JSON.stringify(data));
}

export async function loadCheckIn(date: string): Promise<DailyCheckIn | null> {
 const demoOn = await isDemoEnabled();
if (demoOn) {
  const demo = await getDemoCheckIn();
  if (demo) return demo;
}
  const raw = await AsyncStorage.getItem(keyForDate(date));
  return raw ? (JSON.parse(raw) as DailyCheckIn) : null;
}
const LAST_DROP_NOTIFY_KEY = "last_drop_notify_date";

export async function getLastDropNotifyDate(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_DROP_NOTIFY_KEY);
}

export async function setLastDropNotifyDate(dateKey: string): Promise<void> {
  await AsyncStorage.setItem(LAST_DROP_NOTIFY_KEY, dateKey);
}
export type StoredPlan = {
  date: string;
  category: "RECOVERY" | "NORMAL";
  focus: string;
  actions: string[];
  triggers: string[];
  lbi: number;
  baseline: number | null;
  explanation?: string | null;
};

const PLAN_KEY = (date: string) => `plan:${date}`;

export async function savePlan(plan: StoredPlan) {
  await AsyncStorage.setItem(PLAN_KEY(plan.date), JSON.stringify(plan));
}

export async function loadPlan(date: string): Promise<StoredPlan | null> {
  const raw = await AsyncStorage.getItem(PLAN_KEY(date));
  return raw ? (JSON.parse(raw) as StoredPlan) : null;
}
