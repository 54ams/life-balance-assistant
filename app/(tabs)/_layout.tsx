import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Check-in",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="pencil.circle.fill" color={color} />
          ),
        }}
      />
<Tabs.Screen
  name="history"
  options={{
    title: "History",
    tabBarIcon: ({ color }) => <IconSymbol size={28} name="clock.fill" color={color} />,
  }}
/>
<Tabs.Screen
  name="trends"
  options={{
    title: "Trends",
    tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
  }}
/>

<Tabs.Screen
  name="plan-details"
  options={{
    href: null, // ✅ hide from tab bar
    title: "Plan Details",
  }}
/>

<Tabs.Screen
  name="export"
  options={{
    title: "Export",
    tabBarIcon: ({ color }) => <IconSymbol size={28} name="square.and.arrow.up.fill" color={color} />,
  }}
/>

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
