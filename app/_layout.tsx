import { Redirect, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
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
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { getRetentionDays, runRetentionPurgeNow, getAppConsent } from "@/lib/privacy";
import { setupNotificationDeepLink } from "@/lib/notifications";
import { hasSeenWelcome } from "@/app/welcome";
import { getFirstRunDone } from "@/lib/demo";
import { useWhoopAutoSync } from "@/hooks/useWhoopAutoSync";

SplashScreen.preventAutoHideAsync().catch(() => {});

type GateState = "loading" | "welcome" | "onboarding" | "first-run" | "ready";

// Routes that must bypass the onboarding/welcome gate. The WHOOP OAuth
// callback has to be reachable directly via URL so the WHOOP redirect can
// complete the token exchange — otherwise the user gets bounced to /welcome
// the moment they land on /whoop-auth?code=… and the code is lost.
function isUngatedWebRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location?.pathname || "";
  return path === "/whoop-auth" || path.startsWith("/whoop-auth/");
}

export default function RootLayout() {
  const [gate, setGate] = useState<GateState>("loading");
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
    // Pre-load icon font so MaterialIcons renders glyphs (not "?" boxes) on
    // first paint on web. Native auto-loads via the Expo asset registry.
    ...MaterialIcons.font,
  });

  useEffect(() => {
    setupNotificationDeepLink();
    (async () => {
      try {
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
        // The WHOOP OAuth callback must run regardless of onboarding state,
        // otherwise the redirect from WHOOP loses the ?code= and the user
        // gets bounced to /welcome on web.
        if (isUngatedWebRoute()) {
          setGate("ready");
          return;
        }
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

  const onWhoopCallback = isUngatedWebRoute();
  const initialRoute = onWhoopCallback ? "whoop-auth" : gate === "ready" ? "(tabs)" : gate;

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
          <Stack.Screen name="whoop-auth" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        {gate !== "ready" && !onWhoopCallback && <Redirect href={`/${gate}` as any} />}
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
