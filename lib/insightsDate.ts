// lib/insightsDate.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ISODate } from "./types";
const KEY = "life_balance_insights_selected_date_v1";

export async function getInsightsSelectedDate(): Promise<ISODate> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw as ISODate;
const d = new Date();
const y = d.getUTCFullYear();
const m = String(d.getUTCMonth() + 1).padStart(2, "0");
const day = String(d.getUTCDate()).padStart(2, "0");
return `${y}-${m}-${day}` as ISODate;
}

export async function setInsightsSelectedDate(date: ISODate): Promise<void> {
  await AsyncStorage.setItem(KEY, date);
}
