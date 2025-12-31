import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyCheckIn } from "./storage";
import type { WearableMetrics } from "./types";

const DEMO_ENABLED_KEY = "demo:enabled";
const DEMO_WEARABLE_KEY = "demo:wearable";
const DEMO_CHECKIN_KEY = "demo:checkin";

export async function setDemoEnabled(enabled: boolean) {
  await AsyncStorage.setItem(DEMO_ENABLED_KEY, enabled ? "1" : "0");
}

export async function isDemoEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(DEMO_ENABLED_KEY);
  return v === "1";
}

export async function setDemoWearable(w: WearableMetrics | null) {
  if (w === null) {
    await AsyncStorage.removeItem(DEMO_WEARABLE_KEY);
    return;
  }
  await AsyncStorage.setItem(DEMO_WEARABLE_KEY, JSON.stringify(w));
}

export async function getDemoWearable(): Promise<WearableMetrics | null> {
  const raw = await AsyncStorage.getItem(DEMO_WEARABLE_KEY);
  return raw ? (JSON.parse(raw) as WearableMetrics) : null;
}

export async function setDemoCheckIn(c: DailyCheckIn | null) {
  if (c === null) {
    await AsyncStorage.removeItem(DEMO_CHECKIN_KEY);
    return;
  }
  await AsyncStorage.setItem(DEMO_CHECKIN_KEY, JSON.stringify(c));
}

export async function getDemoCheckIn(): Promise<DailyCheckIn | null> {
  const raw = await AsyncStorage.getItem(DEMO_CHECKIN_KEY);
  return raw ? (JSON.parse(raw) as DailyCheckIn) : null;
}

// ✅ This is what your Settings imports
export async function clearDemoOverrides() {
  await AsyncStorage.multiRemove([DEMO_WEARABLE_KEY, DEMO_CHECKIN_KEY]);
}
