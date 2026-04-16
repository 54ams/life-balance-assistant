import { Stack } from "expo-router";
import React from "react";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { useEffect } from "react";
import { getRetentionDays, runRetentionPurgeNow } from "@/lib/privacy";

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      try {
        const days = await getRetentionDays();
        if (days > 0) await runRetentionPurgeNow();
      } catch (err) {
        console.error("Retention purge failed:", (err as any)?.message ?? "unknown");
      }
    })();
  }, []);

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="first-run" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
