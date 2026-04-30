// useWhoopAutoSync — fires on app open AND every time the app returns to the
// foreground. Pulls today + yesterday so the bridge always reflects the most
// meaningful WHOOP data, not whatever happened to be cached overnight.
import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { autoSyncWhoop } from "@/lib/whoopSync";

export function useWhoopAutoSync(enabled: boolean = true) {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const run = async (trigger: "app_open" | "home_focus") => {
      if (inFlight.current) return;
      inFlight.current = true;
      setSyncing(true);
      try {
        const res = await autoSyncWhoop(trigger);
        if (res.ran && res.reason === "ok") {
          setLastSyncedAt(new Date().toISOString());
          setError(null);
        } else if (res.ran && res.error) {
          setError(res.error);
        }
      } catch (err: any) {
        setError(err?.message ?? "Auto-sync failed");
      } finally {
        setSyncing(false);
        inFlight.current = false;
      }
    };

    // Initial open
    run("app_open");

    // Foreground re-entry
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") run("home_focus");
    });
    return () => sub.remove();
  }, [enabled]);

  return { syncing, lastSyncedAt, error };
}
