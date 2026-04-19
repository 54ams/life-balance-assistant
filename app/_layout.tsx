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
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { getRetentionDays, runRetentionPurgeNow, getAppConsent } from "@/lib/privacy";
import { setupNotificationDeepLink } from "@/lib/notifications";
import { hasSeenWelcome } from "@/app/welcome";
import { getFirstRunDone } from "@/lib/demo";
import { useWhoopAutoSync } from "@/hooks/useWhoopAutoSync";

SplashScreen.preventAutoHideAsync().catch(() => {});

type GateState = "loading" | "welcome" | "onboarding" | "first-run" | "ready";

export default function RootLayout() {
  const [gate, setGate] = useState<GateState>("loading");
  useWhoopAutoSync();

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
        const days = await getRetentionDays();
        if (days > 0) await runRetentionPurgeNow();
      } catch (err) {
        console.error("Retention purge failed:", (err as any)?.message ?? "unknown");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const [welcomed, consent, firstRun] = await Promise.all([
        hasSeenWelcome(),
        getAppConsent(),
        getFirstRunDone(),
      ]);
      if (!welcomed) setGate("welcome");
      else if (!consent) setGate("onboarding");
      else if (!firstRun) setGate("first-run");
      else setGate("ready");
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
        <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} initialRouteName={initialRoute}>
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
