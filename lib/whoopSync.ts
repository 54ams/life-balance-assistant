// whoopSync.ts — I pulled the sync logic out here so both the auto-sync hook
// and the manual WHOOP screen can reuse it without duplicating fetch/retry code.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { upsertWearable } from "./storage";
import { refreshDerivedForDate } from "./pipeline";
import type { ISODate, WearableMetrics } from "./types";

const SESSION_KEY = "whoop_session_token";
const LAST_SYNC_KEY = "whoop_last_sync";

export async function getWhoopSession(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_KEY);
}

export type SyncResult = {
  success: boolean;
  data?: WearableMetrics;
  error?: string;
};

// Fetches one day of WHOOP data, saves it locally, and recalculates LBI etc.
// I made this never throw — it always returns a result object so callers
// don't need try/catch everywhere.
export async function syncWhoopForDate(
  date: ISODate,
  sessionToken: string,
  backendUrl: string,
): Promise<SyncResult> {
  try {
    const url = `${backendUrl}/whoop/day?date=${encodeURIComponent(date)}`;
    let res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });

    // 401 means the WHOOP token expired — try a refresh and retry once
    if (res.status === 401) {
      await fetch(`${backendUrl}/whoop/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: (errJson as any)?.error || `HTTP ${res.status}` };
    }

    const json = (await res.json()) as any;
    const wearable = json?.data as WearableMetrics | null;

    if (!wearable) {
      return { success: true }; // connected but no data for this date
    }

    await upsertWearable(date, wearable, "whoop_export");
    await refreshDerivedForDate(date);
    await AsyncStorage.setItem(LAST_SYNC_KEY, date);

    return { success: true, data: wearable };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Sync failed" };
  }
}
