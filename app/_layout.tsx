import { Redirect, Stack } from "expo-router";
import React, { useEffect } from "react";
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
import { getRetentionDays, runRetentionPurgeNow } from "@/lib/privacy";
import { setupNotificationDeepLink } from "@/lib/notifications";
import { useWhoopAutoSync } from "@/hooks/useWhoopAutoSync";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
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
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#EFE8D9" }} />;
  }

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, gestureEnabled: true, animation: "fade", animationDuration: 300 }} initialRouteName="welcome">
          <Stack.Screen name="welcome" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="first-run" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <Redirect href="/welcome" />
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
