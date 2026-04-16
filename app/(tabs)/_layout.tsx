import { Redirect, Tabs } from "expo-router";
import React, { useEffect, useState } from "react";

import { FloatingTabBar } from "@/components/ui/FloatingTabBar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getAppConsent } from "@/lib/privacy";
import { hasSeenWelcome } from "@/app/welcome";
import { getFirstRunDone } from "@/lib/demo";

type GateState = "loading" | "welcome" | "onboarding" | "first-run" | "ok";

export default function TabLayout() {
  const [gate, setGate] = useState<GateState>("loading");

  useEffect(() => {
    (async () => {
      const [consent, welcomed, firstRun] = await Promise.all([
        getAppConsent(),
        hasSeenWelcome(),
        getFirstRunDone(),
      ]);
      if (!welcomed) setGate("welcome");
      else if (!consent) setGate("onboarding");
      else if (!firstRun) setGate("first-run");
      else setGate("ok");
    })();
  }, []);

  if (gate === "loading") return null;
  if (gate === "welcome") return <Redirect href="/welcome" />;
  if (gate === "onboarding") return <Redirect href="/onboarding" />;
  if (gate === "first-run") return <Redirect href="/first-run" />;

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="checkin"
        options={{
          title: "Check-in",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="pencil.circle.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="sparkles" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="calendar" color={color} />
          ),
        }}
      />

      {/* Profile is accessed from home screen avatar, not the tab bar */}
      <Tabs.Screen
        name="profile"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="history"
        options={{ href: null }}
      />
    </Tabs>
  );
}
