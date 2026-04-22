import { Tabs, router, useSegments } from "expo-router";
import React, { useCallback, useMemo, useRef } from "react";
import { Animated, Dimensions, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

import { FloatingTabBar } from "@/components/ui/FloatingTabBar";
import { IconSymbol } from "@/components/ui/icon-symbol";

const SWIPE_ORDER = ["index", "checkin", "insights", "profile"] as const;
const SCREEN_WIDTH = Dimensions.get("window").width;
// Dead zone on left/right edges to avoid fighting with iOS system back gesture
const EDGE_DEAD_ZONE = 35;

export default function TabLayout() {
  const segments = useSegments();

  const activeRoute = useMemo(() => {
    const tabSeg = segments.find((s) => SWIPE_ORDER.includes(s as any));
    return (tabSeg as (typeof SWIPE_ORDER)[number]) ?? "index";
  }, [segments]);
  const activeRouteRef = useRef(activeRoute);
  activeRouteRef.current = activeRoute;

  // Check if user is on a nested screen (not the tab root). If so, disable
  // swipe so it doesn't interfere with stack back gestures.
  const isNested = useMemo(() => {
    // If segments has more than 2 parts (e.g. ["(tabs)", "checkin", "habits"]),
    // the user is inside a nested stack screen.
    const tabIdx = (segments as string[]).indexOf("(tabs)");
    return tabIdx >= 0 && segments.length > tabIdx + 2;
  }, [segments]);

  const nudge = useRef(new Animated.Value(0)).current;
  const bounce = useCallback((direction: 1 | -1) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const peak = direction === 1 ? -18 : 18;
    Animated.sequence([
      Animated.timing(nudge, {
        toValue: peak,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(nudge, {
        toValue: 0,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [nudge]);

  const navigateBy = useCallback((dir: 1 | -1) => {
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
  }, [bounce]);

  // Swipe gesture with protections:
  // - Wide failOffsetY so vertical scrolling works reliably
  // - Ignore swipes starting near screen edges (iOS back gesture zone)
  // - Disabled when inside a nested stack screen
  const startXRef = useRef(0);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-40, 40])
        .failOffsetY([-25, 25])
        .onBegin((e) => {
          startXRef.current = e.absoluteX;
        })
        .onEnd((e) => {
          // Don't swipe if started in edge dead zone (system gesture area)
          if (startXRef.current < EDGE_DEAD_ZONE || startXRef.current > SCREEN_WIDTH - EDGE_DEAD_ZONE) {
            return;
          }
          const { translationX, velocityX } = e;
          const strongEnough =
            Math.abs(translationX) > 90 || Math.abs(velocityX) > 800;
          if (!strongEnough) return;
          // Direction convention: finger-right (translationX > 0) moves to the
          // next tab in SWIPE_ORDER, finger-left to the previous one. Matches
          // the user's mental model where Home → Check-in is a rightward swipe.
          if (translationX > 0) navigateBy(1);
          else navigateBy(-1);
        })
        .enabled(!isNested),
    [isNested, navigateBy],
  );

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX: nudge }] },
        ]}
      >
        <Tabs
          tabBar={(props) => <FloatingTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            // Smooth fade transition between tabs instead of instant swap
            animation: "fade",
          }}
        >
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
              title: "Check in",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="square.and.pencil" color={color} />
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
            name="profile"
            options={{
              title: "Me",
              tabBarIcon: ({ color }) => (
                <IconSymbol size={24} name="person.fill" color={color} />
              ),
            }}
          />

          {/* Hidden screens — accessible via push, not tab bar */}
          <Tabs.Screen name="checkins" options={{ href: null }} />
          <Tabs.Screen name="calendar" options={{ href: null }} />
          <Tabs.Screen name="history" options={{ href: null }} />
        </Tabs>
      </Animated.View>
    </GestureDetector>
  );
}
