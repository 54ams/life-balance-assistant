import { Redirect, Tabs, router, useSegments } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

import { FloatingTabBar } from "@/components/ui/FloatingTabBar";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { getAppConsent } from "@/lib/privacy";
import { hasSeenWelcome } from "@/app/welcome";
import { getFirstRunDone } from "@/lib/demo";

type GateState = "loading" | "welcome" | "onboarding" | "first-run" | "ok";

// Three-tab swipe ring: Home → Patterns → Check-ins. Everything else
// (profile, calendar, history, the check-in form itself) is reachable
// from inside one of these screens, not from the tab bar or swipe.
const SWIPE_ORDER = ["index", "insights", "checkins"] as const;

export default function TabLayout() {
  const [gate, setGate] = useState<GateState>("loading");
  const segments = useSegments();

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

  // Resolve the currently-focused swipe tab from the segments tree.
  const activeRoute = useMemo(() => {
    const tabSeg = segments.find((s) => SWIPE_ORDER.includes(s as any));
    return (tabSeg as (typeof SWIPE_ORDER)[number]) ?? "index";
  }, [segments]);
  const activeRouteRef = useRef(activeRoute);
  activeRouteRef.current = activeRoute;

  // Edge-bounce: when a swipe can't navigate further, nudge the content
  // and haptic-ping so it feels like a wall, not a broken gesture.
  const nudge = useRef(new Animated.Value(0)).current;
  const bounce = (direction: 1 | -1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // direction = 1 means user tried to go forward (swiped left → content
    // pulls left → negative translateX).
    const peak = direction === 1 ? -18 : 18;
    Animated.sequence([
      Animated.timing(nudge, {
        toValue: peak,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(nudge, {
        toValue: 0,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const navigateBy = (dir: 1 | -1) => {
    const cur = activeRouteRef.current;
    const idx = SWIPE_ORDER.indexOf(cur as any);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= SWIPE_ORDER.length) {
      bounce(dir);
      return;
    }
    const nextRoute = SWIPE_ORDER[nextIdx];
    Haptics.selectionAsync().catch(() => {});
    if (nextRoute === "index") router.navigate("/" as any);
    else router.navigate(`/${nextRoute}` as any);
  };

  // Horizontal pan: only engages after a clear 30px horizontal move. Vertical
  // scrolls remain owned by children because failOffsetY cancels the gesture
  // on vertical intent.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-14, 14])
        .onEnd((e) => {
          const { translationX, velocityX } = e;
          const strongEnough =
            Math.abs(translationX) > 80 || Math.abs(velocityX) > 700;
          if (!strongEnough) return;
          if (translationX < 0) navigateBy(1);
          else navigateBy(-1);
        }),
    [],
  );

  if (gate === "loading") return null;
  if (gate === "welcome") return <Redirect href="/welcome" />;
  if (gate === "onboarding") return <Redirect href="/onboarding" />;
  if (gate === "first-run") return <Redirect href="/first-run" />;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX: nudge }] },
        ]}
      >
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
            name="insights"
            options={{
              title: "Patterns",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="sparkles" color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="checkins"
            options={{
              title: "Check-ins",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="square.and.pencil" color={color} />
              ),
            }}
          />

          {/* Reachable from within the three tabs, but hidden from the tab bar. */}
          <Tabs.Screen name="checkin" options={{ href: null }} />
          <Tabs.Screen name="calendar" options={{ href: null }} />
          <Tabs.Screen name="profile" options={{ href: null }} />
          <Tabs.Screen name="history" options={{ href: null }} />
        </Tabs>
      </Animated.View>
    </GestureDetector>
  );
}
