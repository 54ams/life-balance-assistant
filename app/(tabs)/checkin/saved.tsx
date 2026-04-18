import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { getCheckIn, getDay, upsertCheckIn } from "@/lib/storage";
import { todayISO } from "@/lib/util/todayISO";
import { mentalScore, physioScore } from "@/lib/bridge";

/**
 * Post-check-in micro-moment: a physiological dot and a mental dot start
 * apart, then glide toward each other while the label explains what the
 * bridge means. After the animation, the user can tap a single-question
 * reliability signal — "Does this feel accurate?" — which is stored on
 * the day's check-in and used later to calibrate confidence.
 *
 * The reliability signal is a deliberate micro-intervention: it asks
 * one thing at the moment attention is highest (right after submission)
 * rather than spreading validation across a longer survey. It is the
 * kind of single-item self-report that EMA research (Shiffman et al.
 * 2008) treats as a light-weight reliability anchor.
 */
export default function CheckInSavedScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const physioColor = isDark ? "#57D6A4" : "#2FA37A";
  const mentalColor = isDark ? "#A4BFB5" : "#6F9A90";

  const [values, setValues] = useState<{ physio: number | null; mental: number | null }>({
    physio: null,
    mental: null,
  });
  const [feedback, setFeedback] = useState<null | "yes" | "no">(null);

  const physioX = useRef(new Animated.Value(-120)).current;
  const mentalX = useRef(new Animated.Value(120)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    (async () => {
      const day = await getDay(todayISO());
      setValues({ physio: day ? physioScore(day) : null, mental: day ? mentalScore(day) : null });
    })();
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(physioX, {
          toValue: -18,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(mentalX, {
          toValue: 18,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.9,
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 },
      ),
    ]).start();
  }, [fadeAnim, physioX, mentalX, pulseAnim]);

  const recordFeedback = async (accurate: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    setFeedback(accurate ? "yes" : "no");
    try {
      const date = todayISO() as any;
      const existing = await getCheckIn(date);
      if (existing) {
        await upsertCheckIn(date, {
          ...existing,
          reliability: { feelsAccurate: accurate, at: new Date().toISOString() },
        });
      }
    } catch {
      // Non-fatal — the check-in itself is already saved.
    }
    // Give the user a beat to see the confirmation, then return.
    setTimeout(() => {
      router.replace({ pathname: "/", params: { refresh: "1" } } as any);
    }, 1100);
  };

  const skip = () => {
    Haptics.selectionAsync().catch(() => {});
    router.replace({ pathname: "/", params: { refresh: "1" } } as any);
  };

  const gapLabel = (() => {
    if (values.physio == null || values.mental == null) return "Thanks — your check-in is saved.";
    const gap = Math.abs(values.physio - values.mental);
    if (gap <= 10) return "Your body and mind are in step today.";
    if (values.physio > values.mental) return "Your body feels ahead of your mind. Gentle pace.";
    return "Your mind is ahead of your body. Let recovery catch up.";
  })();

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: Spacing.base,
          }}
        >
          <Text
            style={{
              color: c.text.tertiary,
              fontSize: 11,
              fontFamily: Typography.fontFamily.bold,
              letterSpacing: 1.4,
              fontWeight: "800",
            }}
          >
            CHECK-IN SAVED
          </Text>
          <Text
            style={{
              color: c.text.primary,
              fontSize: 30,
              fontFamily: Typography.fontFamily.serifItalic,
              marginTop: 4,
              textAlign: "center",
            }}
          >
            The bridge
          </Text>

          {/* Dots track */}
          <View
            style={{
              height: 140,
              width: "100%",
              marginTop: 20,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Animated.View
              style={{
                position: "absolute",
                transform: [{ translateX: physioX }, { scale: pulseAnim }],
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: physioColor + "22",
                  borderWidth: 3,
                  borderColor: physioColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "800" }}>
                  {values.physio ?? "—"}
                </Text>
              </View>
              <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "700", marginTop: 6 }}>
                Body
              </Text>
            </Animated.View>

            <Animated.View
              style={{
                position: "absolute",
                transform: [{ translateX: mentalX }, { scale: pulseAnim }],
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: mentalColor + "22",
                  borderWidth: 3,
                  borderColor: mentalColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "800" }}>
                  {values.mental ?? "—"}
                </Text>
              </View>
              <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "700", marginTop: 6 }}>
                Mind
              </Text>
            </Animated.View>
          </View>

          <Text
            style={{
              color: c.text.secondary,
              fontSize: 15,
              lineHeight: 21,
              marginTop: 20,
              textAlign: "center",
              maxWidth: 320,
              fontFamily: Typography.fontFamily.serifItalic,
            }}
          >
            {gapLabel}
          </Text>

          {/* Reliability micro-signal */}
          <View style={{ marginTop: Spacing.xl, alignItems: "center", width: "100%" }}>
            {feedback ? (
              <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 4 }}>
                {feedback === "yes"
                  ? "Thanks — we'll trust this one a bit more."
                  : "Thanks — we'll mark this one as less certain."}
              </Text>
            ) : (
              <>
                <Text
                  style={{
                    color: c.text.tertiary,
                    fontSize: 11,
                    fontFamily: Typography.fontFamily.bold,
                    letterSpacing: 1.2,
                    fontWeight: "800",
                  }}
                >
                  DOES THIS READ YOUR DAY?
                </Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <Pressable
                    onPress={() => recordFeedback(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Feels accurate"
                    style={({ pressed }) => [
                      {
                        paddingVertical: 10,
                        paddingHorizontal: 18,
                        borderRadius: BorderRadius.full,
                        backgroundColor: c.lime,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={{ color: c.accent.primary, fontWeight: "900", fontSize: 13 }}>
                      Feels right
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => recordFeedback(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Not quite"
                    style={({ pressed }) => [
                      {
                        paddingVertical: 10,
                        paddingHorizontal: 18,
                        borderRadius: BorderRadius.full,
                        borderWidth: 1,
                        borderColor: c.border.medium,
                        backgroundColor: "transparent",
                      },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 13 }}>
                      Not quite
                    </Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={skip}
                  accessibilityRole="button"
                  accessibilityLabel="Skip"
                  style={({ pressed }) => [{ marginTop: 14 }, pressed && { opacity: 0.6 }]}
                >
                  <Text style={{ color: c.text.tertiary, fontSize: 12, fontWeight: "700" }}>
                    Skip
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
