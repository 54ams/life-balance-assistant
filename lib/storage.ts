import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const raw = await AsyncStorage.getItem(keyForDate(date));
  return raw ? (JSON.parse(raw) as DailyCheckIn) : null;
}
