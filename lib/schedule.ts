// schedule.ts — recurring weekly commitments (Layer 3 in the architecture).
// I went with a simple weekly model because most students have repeating
// timetables. Doesn't need to handle one-off events — that's FutureEvent.
import AsyncStorage from "@react-native-async-storage/async-storage";

export type RecurringItem = {
  id: string;
  label: string;           // "9-5 work", "Gym", "Lectures"
  daysOfWeek: number[];    // 0=Sun, 1=Mon, ..., 6=Sat
  kind: "demand" | "resource";
};

const SCHEDULE_KEY = "life_balance_schedule_v1";

export async function getSchedule(): Promise<RecurringItem[]> {
  const raw = await AsyncStorage.getItem(SCHEDULE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RecurringItem[];
  } catch {
    return [];
  }
}

export async function saveSchedule(items: RecurringItem[]): Promise<void> {
  await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(items));
}

export async function addScheduleItem(item: RecurringItem): Promise<void> {
  const items = await getSchedule();
  items.push(item);
  await saveSchedule(items);
}

export async function removeScheduleItem(id: string): Promise<void> {
  const items = await getSchedule();
  await saveSchedule(items.filter((i) => i.id !== id));
}

// Filter to just the items that apply on a given day.
export function getScheduleForDay(items: RecurringItem[], dayOfWeek: number): RecurringItem[] {
  return items.filter((i) => i.daysOfWeek.includes(dayOfWeek));
}

// Convenience wrapper — most callers just need "what's on today?"
export async function getScheduleForToday(): Promise<RecurringItem[]> {
  const items = await getSchedule();
  const today = new Date().getDay(); // 0=Sun
  return getScheduleForDay(items, today);
}
