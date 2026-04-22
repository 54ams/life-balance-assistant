import { Redirect, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_700Bold,
  CormorantGaramond_700Bold_Italic,
} from "@expo-google-fonts/cormorant-garamond";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { getRetentionDays, runRetentionPurgeNow, getAppConsent } from "@/lib/privacy";
import { setupNotificationDeepLink } from "@/lib/notifications";
import { hasSeenWelcome } from "@/app/welcome";
import { getFirstRunDone } from "@/lib/demo";
import { useWhoopAutoSync } from "@/hooks/useWhoopAutoSync";

// Ethics compliance: every cold launch (including each new QR-scan session
// in Expo Go) wipes all local state so each participant starts from a clean
// welcome screen with no prior participant's data. The promise is cached at
// module scope so Fast Refresh during a live dev session doesn't re-wipe on
// every file save — only a fresh process (which is what a new QR scan
// creates) resets this.
let ethicsResetPromise: Promise<void> | null = null;
function ensureEthicsReset(): Promise<void> {
  if (ethicsResetPromise) return ethicsResetPromise;
  ethicsResetPromise = (async () => {
    try {
      await AsyncStorage.clear();
    } catch {
      // If the storage clear fails we still want the app to render — the
      // gate logic below will fall back to "welcome" on any read error.
    }
  })();
  return ethicsResetPromise;
}

SplashScreen.preventAutoHideAsync().catch(() => {});

type GateState = "loading" | "welcome" | "onboarding" | "first-run" | "ready";

export default function RootLayout() {
  const [gate, setGate] = useState<GateState>("loading");
  // Only arm the WHOOP auto-sync once the user has actually completed the
  // gates. Before that, the ethics wipe has just cleared WHOOP session
  // tokens, so there's nothing meaningful to sync and we avoid a racy read
  // of AsyncStorage while the wipe is in flight.
  const autoSyncEnabled = gate === "ready";
  useWhoopAutoSync(autoSyncEnabled);

  const [fontsLoaded] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_700Bold,
    CormorantGaramond_700Bold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    setupNotificationDeepLink();
    (async () => {
      try {
        // Wait for the ethics wipe before running retention — otherwise the
        // purge spins up briefly on stale data, which would waste cycles and
        // could race with the wipe.
        await ensureEthicsReset();
        const days = await getRetentionDays();
        if (days > 0) await runRetentionPurgeNow();
      } catch (err) {
        console.error("Retention purge failed:", (err as any)?.message ?? "unknown");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await ensureEthicsReset();
        const [welcomed, consent, firstRun] = await Promise.all([
          hasSeenWelcome(),
          getAppConsent(),
          getFirstRunDone(),
        ]);
        if (!welcomed) setGate("welcome");
        else if (!consent) setGate("onboarding");
        else if (!firstRun) setGate("first-run");
        else setGate("ready");
      } catch {
        // On error, fall back to the safest start — welcome.
        setGate("welcome");
      }
    })();
  }, []);

  useEffect(() => {
    if (fontsLoaded && gate !== "loading") SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, gate]);

  if (!fontsLoaded || gate === "loading") {
    return <View style={{ flex: 1, backgroundColor: "#EFE8D9" }} />;
  }

  const initialRoute = gate === "ready" ? "(tabs)" : gate;

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Root stack: swipe-back is disabled so users inside the tabs can't
            accidentally return to onboarding/welcome. Individual nested stacks
            (e.g. check-in sub-pages) re-enable it locally. */}
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
            animation: "fade",
            animationDuration: 300,
          }}
          initialRouteName={initialRoute}
        >
          <Stack.Screen name="welcome" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="first-run" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        {gate !== "ready" && <Redirect href={`/${gate}` as any} />}
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
