import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { recordLift } from "@/lib/lift";
import { useReduceMotion } from "@/hooks/useReduceMotion";

/**
 * 30-second somatic grounding scan.
 *
 * An alternative, body-first path to the slider check-in. The user is
 * guided through three brief zones of attention (feet, shoulders, breath),
 * each held for ~10s with a soft expanding focus ring. At the end, they
 * pick how the scan landed from three chips — that choice grants a
 * matching mentalScore lift via lib/lift, so the ritual is felt on the orb.
 *
 * This does not replace the main check-in; it sits alongside it as a
 * lower-friction, somatic alternative.
 */
const ZONES = [
  {
    label: "Your feet",
    prompt: "Notice where they meet the ground. Weight, temperature, texture.",
  },
  {
    label: "Your shoulders",
    prompt: "Let them drop. Unclench the jaw. Soften the brow.",
  },
  {
    label: "Your breath",
    prompt: "No changes. Just notice it arriving and leaving.",
  },
] as const;

const ZONE_DURATION_MS = 10_000;

type Outcome = "settled" | "same" | "activated";

export default function GroundingScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const reduceMotion = useReduceMotion();

  const [stage, setStage] = useState<"intro" | "scan" | "end">("intro");
  const [zoneIdx, setZoneIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (stage !== "scan") return;
    ring.setValue(0);
    const anim = reduceMotion
      ? Animated.timing(ring, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      : Animated.timing(ring, {
          toValue: 1,
          duration: ZONE_DURATION_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        });
    anim.start();
    const t = setTimeout(() => {
      Haptics.selectionAsync().catch(() => {});
      if (zoneIdx + 1 < ZONES.length) {
        setZoneIdx((i) => i + 1);
      } else {
        setStage("end");
      }
    }, reduceMotion ? 500 : ZONE_DURATION_MS);
    return () => {
      clearTimeout(t);
      anim.stop();
    };
  }, [stage, zoneIdx, reduceMotion, ring]);

  const begin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setZoneIdx(0);
    setStage("scan");
  };

  const finish = async (outcome: Outcome) => {
    if (saving) return;
    setSaving(true);
    const pts = outcome === "settled" ? 6 : outcome === "same" ? 3 : 2;
    try {
      await recordLift("grounding", pts);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } finally {
      setSaving(false);
      router.replace("/" as any);
    }
  };

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.1] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 0.85, 0.25] });

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground state="neutral" intensity="calm" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [
              styles.backBtn,
              { borderColor: c.border.medium, backgroundColor: c.glass.primary },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <IconSymbol name="chevron.left" size={18} color={c.text.primary} />
          </Pressable>
          <Text style={[styles.eyebrow, { color: c.text.tertiary }]}>GROUNDING · 30s</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {stage === "intro" && (
            <View style={{ alignItems: "center", gap: Spacing.md }}>
              <Text style={[styles.headline, { color: c.text.primary }]}>
                A body-first check-in.
              </Text>
              <Text style={[styles.sub, { color: c.text.secondary }]}>
                No sliders. Three places to notice, about ten seconds each.
                Use this when words feel heavy.
              </Text>
              <Pressable
                onPress={begin}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: c.accent.primary, opacity: pressed ? 0.9 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Begin grounding"
              >
                <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>Begin</Text>
              </Pressable>
            </View>
          )}

          {stage === "scan" && (
            <View style={{ alignItems: "center", gap: Spacing.md }}>
              <Text style={[styles.zoneCount, { color: c.text.tertiary }]}>
                {zoneIdx + 1} of {ZONES.length}
              </Text>
              <View style={{ alignItems: "center", justifyContent: "center", height: 260 }}>
                <Animated.View
                  style={{
                    width: 220,
                    height: 220,
                    borderRadius: 110,
                    borderWidth: 2,
                    borderColor: c.accent.primary,
                    opacity: ringOpacity,
                    transform: [{ scale: ringScale }],
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 24,
                  }}
                >
                  <Text style={[styles.zoneLabel, { color: c.text.primary }]}>
                    {ZONES[zoneIdx].label}
                  </Text>
                  <Text style={[styles.zonePrompt, { color: c.text.secondary }]}>
                    {ZONES[zoneIdx].prompt}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={{ color: c.text.tertiary, fontSize: 13 }}>End early</Text>
              </Pressable>
            </View>
          )}

          {stage === "end" && (
            <View style={{ alignItems: "center", gap: Spacing.md }}>
              <Text style={[styles.headline, { color: c.text.primary }]}>How did that land?</Text>
              <Text style={[styles.sub, { color: c.text.secondary }]}>
                One word. No wrong answer.
              </Text>
              <View style={styles.outcomeRow}>
                {([
                  { key: "settled", label: "Softer" },
                  { key: "same", label: "About the same" },
                  { key: "activated", label: "A bit more aware" },
                ] as const).map((o) => (
                  <Pressable
                    key={o.key}
                    onPress={() => finish(o.key)}
                    disabled={saving}
                    style={({ pressed }) => [
                      styles.outcomeChip,
                      { borderColor: c.border.medium, backgroundColor: c.glass.secondary },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={{ color: c.text.primary, fontSize: 14, fontWeight: "700" }}>
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  headline: {
    fontSize: 26,
    fontWeight: "300",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  primaryBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  zoneCount: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "800",
  },
  zoneLabel: {
    fontSize: 24,
    fontWeight: "300",
    letterSpacing: -0.3,
  },
  zonePrompt: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 240,
  },
  outcomeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: Spacing.sm,
  },
  outcomeChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
});
