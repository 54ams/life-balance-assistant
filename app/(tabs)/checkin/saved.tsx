import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { getCheckIn, getDay, listDailyRecords, upsertCheckIn } from "@/lib/storage";
import { todayISO } from "@/lib/util/todayISO";
import { mentalScore } from "@/lib/bridge";
import { resolveBody, recordsToMap, type BodyResolution } from "@/lib/bodyResolver";

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

  // Body/mind dot colours pulled from the theme so they stay legible on
  // both light and dark backgrounds.
  const physioColor = c.success;
  const mentalColor = c.accent.primary;

  const [values, setValues] = useState<{ physio: number | null; mental: number | null }>({
    physio: null,
    mental: null,
  });
  const [bodyRes, setBodyRes] = useState<BodyResolution | null>(null);
  const [feedback, setFeedback] = useState<null | "yes" | "no">(null);

  const physioX = useRef(new Animated.Value(-120)).current;
  const mentalX = useRef(new Animated.Value(120)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    (async () => {
      const today = todayISO();
      const day = await getDay(today);
      const records = await listDailyRecords(7);
      const resolved = resolveBody(today, recordsToMap(records), 2);
      setBodyRes(resolved);
      setValues({
        physio: resolved.value,
        mental: day ? mentalScore(day) : null,
      });
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("[checkin/saved] bridge values", {
          today,
          bodySource: resolved.sourceDate,
          bodyValue: resolved.value,
          bodyKind: resolved.detail?.kind ?? null,
          isStale: resolved.isStale,
          mental: day ? mentalScore(day) : null,
        });
      }
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
    // Stay on the screen. The user chooses where to go next from the
    // "What's next?" card below.
  };

  const goHome = () => {
    Haptics.selectionAsync().catch(() => {});
    router.replace({ pathname: "/", params: { refresh: "1" } } as any);
  };

  const gapLabel = (() => {
    if (values.physio == null && values.mental == null) {
      return "Thanks — your check-in is saved.";
    }
    if (values.physio == null) {
      return "We can't fully align your body and mind yet — wearable data is still syncing.";
    }
    if (values.mental == null) {
      return "Thanks — your check-in is saved.";
    }
    // Be honest when the body number is from yesterday or older — the
    // alignment between mind (logged just now) and body (older WHOOP data)
    // is a softer signal, not a clean same-day reading.
    if (bodyRes?.isStale) {
      const gap = Math.abs(values.physio - values.mental);
      const direction =
        gap <= 10
          ? "are loosely aligned"
          : values.physio > values.mental
            ? "look like body's ahead"
            : "look like mind's ahead";
      return `Mind is from now, body is from ${bodyRes.ageBucket === "yesterday" ? "yesterday" : "earlier"} — they ${direction}.`;
    }
    const gap = Math.abs(values.physio - values.mental);
    if (gap <= 10) return "Your body and mind are in step today.";
    if (values.physio > values.mental) return "Your body feels ahead of your mind. Gentle pace.";
    return "Your mind is ahead of your body. Let recovery catch up.";
  })();

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        // 120 clears the floating tab bar (height 68 + bottom inset 12 +
        // breathing room). Without this, the "Back to home" button sits
        // under the bar and looks like the nav has disappeared.
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: Spacing.base,
            paddingTop: Spacing.xl,
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

          {bodyRes && bodyRes.value != null && (
            <Text
              style={{
                color: bodyRes.isStale ? "#B8770A" : c.text.tertiary,
                fontSize: 11,
                fontWeight: "800",
                letterSpacing: 0.6,
                marginTop: 6,
              }}
            >
              {bodyRes.detail?.kind === "partial_strain"
                ? "PARTIAL · STRAIN ONLY · "
                : bodyRes.detail?.kind === "partial_recovery"
                  ? "PARTIAL · RECOVERY ONLY · "
                  : bodyRes.detail?.kind === "partial_sleep"
                    ? "PARTIAL · SLEEP ONLY · "
                    : ""}
              {bodyRes.freshnessLabel.toUpperCase()}
            </Text>
          )}

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
                  onPress={() => setFeedback("no")}
                  accessibilityRole="button"
                  accessibilityLabel="Skip reliability question"
                  style={({ pressed }) => [{ marginTop: 14 }, pressed && { opacity: 0.6 }]}
                >
                  <Text style={{ color: c.text.tertiary, fontSize: 12, fontWeight: "700" }}>
                    Skip
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          <GlassCard style={{ marginTop: Spacing.md, width: "100%" }}>
            <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>What's next?</Text>
            <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 2 }}>
              Pick something — or come back later.
            </Text>
            <View style={{ gap: 8, marginTop: Spacing.sm }}>
              <NextAction
                c={c}
                label="See what drives your score"
                onPress={() => router.push("/insights/explain" as any)}
              />
              <NextAction
                c={c}
                label="Try a grounding exercise"
                onPress={() => router.push("/checkin/grounding" as any)}
              />
              <NextAction
                c={c}
                label="Build a habit"
                onPress={() => router.push("/checkin/habits" as any)}
              />
              <NextAction
                c={c}
                label="Reframe a thought"
                onPress={() => router.push("/checkin/reframe" as any)}
              />
              <NextAction
                c={c}
                label="Review past check-ins"
                onPress={() => router.push("/checkins" as any)}
              />
            </View>
            <Pressable
              onPress={goHome}
              accessibilityRole="button"
              accessibilityLabel="Back to home"
              style={({ pressed }) => [
                {
                  marginTop: Spacing.md,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: BorderRadius.full,
                  backgroundColor: c.accent.primary,
                  alignItems: "center",
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={{ color: c.onPrimary, fontWeight: "800", fontSize: 14 }}>
                Back to home
              </Text>
            </Pressable>
          </GlassCard>
        </Animated.View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function NextAction({
  c,
  label,
  onPress,
}: {
  c: typeof Colors.light;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 12,
          borderRadius: BorderRadius.lg,
          backgroundColor: c.glass.secondary ?? c.border.light,
          borderWidth: 1,
          borderColor: c.border.light,
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14, flex: 1 }}>
        {label}
      </Text>
      <Text style={{ color: c.text.tertiary }}>›</Text>
    </Pressable>
  );
}
