// hooks/useWhoopAutoSync.ts — Silently syncs WHOOP data on app open.
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBackendBaseUrl } from "@/lib/backend";
import { syncWhoopForDate, getWhoopSession } from "@/lib/whoopSync";
import { todayISO } from "@/lib/util/todayISO";
import type { ISODate } from "@/lib/types";

const LAST_SYNC_KEY = "whoop_last_sync";
const CONSENT_KEY = "whoop_consent_v1";

export function useWhoopAutoSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    (async () => {
      try {
        const [session, consent, lastSync] = await Promise.all([
          getWhoopSession(),
          AsyncStorage.getItem(CONSENT_KEY),
          AsyncStorage.getItem(LAST_SYNC_KEY),
        ]);

        if (lastSync) setLastSynced(lastSync);

        // Only auto-sync if WHOOP is connected and consented
        if (!session || !consent) return;

        const backendUrl = getBackendBaseUrl();
        if (!backendUrl) return;

        // Skip if we already synced today
        const today = todayISO();
        if (lastSync === today) return;

        setSyncing(true);
        const result = await syncWhoopForDate(today as ISODate, session, backendUrl);

        if (result.success) {
          setLastSynced(today);
          setError(null);
        } else {
          setError(result.error ?? "Sync failed");
        }
      } catch (err: any) {
        setError(err?.message ?? "Auto-sync failed");
      } finally {
        setSyncing(false);
      }
    })();
  }, []);

  return { syncing, lastSynced, error };
}
