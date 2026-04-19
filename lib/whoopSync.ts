// lib/whoopSync.ts — Shared WHOOP sync logic used by both the auto-sync hook and the manual WHOOP screen.
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

/**
 * Sync a single day's WHOOP data from the backend, persist it locally,
 * and re-run the derived pipeline (LBI, plan, etc.).
 *
 * Returns a result object — never throws.
 */
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

    // If 401, try refreshing the token and retry once
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
