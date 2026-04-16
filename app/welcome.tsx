import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Colors } from "@/constants/Colors";

const WELCOME_SEEN_KEY = "welcome_seen_v1";

/**
 * First-launch welcome screen.
 *
 * A meditative breathing circle with staggered text fade-ins. Designed
 * to set the calm, considered tone of the app before the (more practical)
 * consent/values onboarding flow.
 *
 * Animation spec:
 *   - Three concentric rings scale 1 → 1.15 → 1 over 4s (slow inhale/exhale).
 *   - Text blocks fade/slide in at staggered delays.
 *   - Haptic "soft" tick on "Begin".
 *
 * This screen is shown once. After "Begin" it sets `welcome_seen_v1=1`
 * in AsyncStorage and navigates to /onboarding.
 */
export default function WelcomeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  // Breathing loops
  const breath1 = useRef(new Animated.Value(0)).current;
  const breath2 = useRef(new Animated.Value(0)).current;
  const breath3 = useRef(new Animated.Value(0)).current;

  // Staggered text opacity
  const tagline = useRef(new Animated.Value(0)).current;
  const mark = useRef(new Animated.Value(0)).current;
  const subtitle = useRef(new Animated.Value(0)).current;
  const ethicsNote = useRef(new Animated.Value(0)).current;
  const beginBtn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breathLoop = (v: Animated.Value, delay: number) => {
      v.setValue(0);
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
    };

    breathLoop(breath1, 0).start();
    breathLoop(breath2, 400).start();
    breathLoop(breath3, 800).start();

    Animated.stagger(350, [
      Animated.timing(tagline, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(mark, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(subtitle, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(ethicsNote, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(beginBtn, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [breath1, breath2, breath3, tagline, mark, subtitle, ethicsNote, beginBtn]);

  const scaleFor = (v: Animated.Value, amount: number) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + amount] });
  const opacityFor = (v: Animated.Value, from: number, to: number) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  const handleBegin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    try {
      await AsyncStorage.setItem(WELCOME_SEEN_KEY, "1");
    } catch {
      // Non-fatal; worst case user sees the welcome again.
    }
    router.replace("/onboarding");
  };

  const ringBase = isDark ? "rgba(255,255,255,0.09)" : "rgba(107,93,211,0.15)";
  const ringInner = isDark ? "rgba(138,124,255,0.28)" : "rgba(107,93,211,0.22)";
  const markColor = isDark ? "#FFFFFF" : c.accent.primary;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.centerCol}>
          <Animated.Text
            style={[
              styles.tagline,
              {
                color: c.text.secondary,
                opacity: tagline,
                transform: [
                  {
                    translateY: tagline.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            Welcome to
          </Animated.Text>

          <View style={styles.circleWrap}>
            {/* Ring 3 — outermost, biggest breath */}
            <Animated.View
              style={[
                styles.ring,
                styles.ring3,
                {
                  borderColor: ringBase,
                  transform: [{ scale: scaleFor(breath3, 0.18) }],
                  opacity: opacityFor(breath3, 0.5, 0.9),
                },
              ]}
            />
            {/* Ring 2 */}
            <Animated.View
              style={[
                styles.ring,
                styles.ring2,
                {
                  borderColor: ringBase,
                  transform: [{ scale: scaleFor(breath2, 0.12) }],
                  opacity: opacityFor(breath2, 0.6, 0.95),
                },
              ]}
            />
            {/* Ring 1 — innermost */}
            <Animated.View
              style={[
                styles.ring,
                styles.ring1,
                {
                  borderColor: ringInner,
                  backgroundColor: isDark ? "rgba(124,111,220,0.08)" : "rgba(107,93,211,0.06)",
                  transform: [{ scale: scaleFor(breath1, 0.08) }],
                  opacity: opacityFor(breath1, 0.75, 1),
                },
              ]}
            />

            {/* LBA wordmark */}
            <Animated.Text
              style={[
                styles.mark,
                {
                  color: markColor,
                  opacity: mark,
                  transform: [{ scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
                },
              ]}
            >
              LBA
            </Animated.Text>
          </View>

          <Animated.Text
            style={[
              styles.subtitle,
              {
                color: c.text.primary,
                opacity: subtitle,
                transform: [
                  {
                    translateY: subtitle.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            Life Balance Assistant
          </Animated.Text>

          <Animated.Text
            style={[
              styles.ethics,
              {
                color: c.text.secondary,
                opacity: ethicsNote,
              },
            ]}
          >
            A calm space for mind and body.{"\n"}
            No personal data ever leaves your device.
          </Animated.Text>
        </View>

        <Animated.View
          style={{
            paddingHorizontal: 24,
            paddingBottom: 36,
            opacity: beginBtn,
            transform: [
              {
                translateY: beginBtn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          }}
        >
          <Pressable
            onPress={handleBegin}
            accessibilityRole="button"
            accessibilityLabel="Begin"
            style={({ pressed }) => [
              styles.beginBtn,
              { backgroundColor: c.accent.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.beginText}>Begin</Text>
          </Pressable>
          <Text style={[styles.hint, { color: c.text.tertiary }]}>Takes less than a minute</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

/** Returns true if the user has already seen the welcome screen. */
export async function hasSeenWelcome(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(WELCOME_SEEN_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function clearWelcomeSeen(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WELCOME_SEEN_KEY);
  } catch {
    /* noop */
  }
}

const RING_SIZE = 240;

const styles = StyleSheet.create({
  centerCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  tagline: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 28,
  },
  circleWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  ring: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  ring1: {
    width: RING_SIZE * 0.55,
    height: RING_SIZE * 0.55,
  },
  ring2: {
    width: RING_SIZE * 0.75,
    height: RING_SIZE * 0.75,
  },
  ring3: {
    width: RING_SIZE,
    height: RING_SIZE,
  },
  mark: {
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  ethics: {
    marginTop: 18,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  beginBtn: {
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  beginText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  hint: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 10,
  },
});
