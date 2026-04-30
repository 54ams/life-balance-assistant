// whoopSync.ts — pulled out so the auto-sync hook, the manual WHOOP screen,
// the home screen and the check-in screen can all reuse the same fetch/retry
// logic without duplicating it. WHOOP cycles don't always align to local
// midnight (recovery for "today" frequently lands a few hours into the user's
// morning), so we sync today AND yesterday and let the bridge logic decide
// which day's data to display.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { upsertWearable } from "./storage";
import { refreshDerivedForDate } from "./pipeline";
import { getBackendBaseUrl } from "./backend";
import { todayISO } from "./util/todayISO";
import type { ISODate, WearableMetrics } from "./types";

const SESSION_KEY = "whoop_session_token";
const LAST_SYNC_KEY = "whoop_last_sync";
const LAST_SYNC_AT_KEY = "whoop_last_sync_at";
const CONSENT_KEY = "whoop_consent_v1";
// Soft TTL — within this window we skip re-hitting the network from auto
// triggers (home focus, check-in open). Manual sync always bypasses.
const AUTO_SYNC_TTL_MS = 5 * 60 * 1000;

export async function getWhoopSession(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_KEY);
}

export type SyncResult = {
  success: boolean;
  data?: WearableMetrics;
  error?: string;
};

export type AutoSyncTrigger =
  | "app_open"
  | "home_focus"
  | "checkin_open"
  | "checkin_save"
  | "manual";

/** Lightweight dev-only logger. Strips PII — never logs token, code, body. */
function log(tag: string, payload: Record<string, unknown>) {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[whoopSync] ${tag}`, payload);
  }
}

// Fetches one day of WHOOP data, saves it locally, and recalculates derived
// values. Never throws — always returns a result object so callers don't
// need try/catch everywhere.
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
      log("noData", { date });
      return { success: true }; // connected but no data for this date
    }

    log("saved", {
      date,
      recovery: wearable.recovery ?? null,
      sleepHours: wearable.sleepHours ?? null,
      strain: wearable.strain ?? null,
    });

    await upsertWearable(date, wearable, "whoop_export");
    await refreshDerivedForDate(date);
    await AsyncStorage.setItem(LAST_SYNC_KEY, date);
    await AsyncStorage.setItem(LAST_SYNC_AT_KEY, new Date().toISOString());

    return { success: true, data: wearable };
  } catch (err: any) {
    return { success: false, error: err?.message ?? "Sync failed" };
  }
}

export type AutoSyncResult = {
  ran: boolean;
  reason?: "no_session" | "no_consent" | "no_backend" | "throttled" | "ok" | "error";
  syncedDates?: ISODate[];
  error?: string;
};

/**
 * The single entry-point used by the home screen, the check-in screen and the
 * pre-save hook. Pulls today + yesterday so the bridge can show the most
 * meaningful day even if today's WHOOP cycle hasn't closed yet. Throttled by
 * `AUTO_SYNC_TTL_MS` unless `force` is set.
 */
export async function autoSyncWhoop(
  trigger: AutoSyncTrigger,
  opts: { force?: boolean } = {},
): Promise<AutoSyncResult> {
  const [session, consent, lastSyncAt] = await Promise.all([
    getWhoopSession(),
    AsyncStorage.getItem(CONSENT_KEY),
    AsyncStorage.getItem(LAST_SYNC_AT_KEY),
  ]);

  if (!session) {
    log("skip", { trigger, reason: "no_session" });
    return { ran: false, reason: "no_session" };
  }
  if (!consent) {
    log("skip", { trigger, reason: "no_consent" });
    return { ran: false, reason: "no_consent" };
  }

  const backendUrl = getBackendBaseUrl();
  if (!backendUrl) {
    log("skip", { trigger, reason: "no_backend" });
    return { ran: false, reason: "no_backend" };
  }

  if (!opts.force && lastSyncAt) {
    const ageMs = Date.now() - new Date(lastSyncAt).getTime();
    if (Number.isFinite(ageMs) && ageMs < AUTO_SYNC_TTL_MS) {
      log("skip", { trigger, reason: "throttled", ageMs });
      return { ran: false, reason: "throttled" };
    }
  }

  const today = todayISO();
  // Yesterday in local time — WHOOP recovery for the morning of "today" is
  // sometimes still attached to yesterday's cycle until the user takes off
  // the band, so we sync both and pick the freshest later.
  const y = new Date(`${today}T12:00:00`);
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}` as ISODate;

  log("start", { trigger, today, yesterday });

  const synced: ISODate[] = [];
  for (const d of [yesterday, today] as ISODate[]) {
    const res = await syncWhoopForDate(d, session, backendUrl);
    if (res.success) synced.push(d);
    else log("syncError", { date: d, error: res.error });
  }

  log("done", { trigger, synced });

  return synced.length > 0
    ? { ran: true, reason: "ok", syncedDates: synced }
    : { ran: true, reason: "error", error: "No days synced" };
}
