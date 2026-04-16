import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { seedDemo, setDemoEnabled, setDemoModeChoice, setFirstRunDone } from "@/lib/demo";

/**
 * First-run picker shown once, immediately after onboarding consent.
 *
 * Lets users (including viva examiners) pick between:
 *   - "Exploring the demo" → seeds 14 days of realistic data, flags the
 *     session as demo so the home screen can show a "Demo data" chip.
 *   - "Starting fresh" → no data is seeded; the app starts empty.
 *
 * This is the reproducible examiner path that keeps the demo/user-test
 * distinction visible and one tap away.
 */
export default function FirstRunScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const [busy, setBusy] = useState<"demo" | "fresh" | null>(null);

  const pickDemo = async () => {
    if (busy) return;
    setBusy("demo");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await setDemoModeChoice("demo");
      await setDemoEnabled(true);
      await seedDemo(14);
      await setFirstRunDone(true);
      router.replace("/");
    } finally {
      setBusy(null);
    }
  };

  const pickFresh = async () => {
    if (busy) return;
    setBusy("fresh");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await setDemoModeChoice("fresh");
      await setDemoEnabled(false);
      await setFirstRunDone(true);
      router.replace("/");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: 24, paddingBottom: 40 }}>
      <Text style={[styles.h1, { color: c.text.primary }]}>How will you use LBA today?</Text>
      <Text style={[styles.body, { color: c.text.secondary, marginTop: 8 }]}>
        You can change this later in Profile → Settings → Demo tools.
      </Text>

      <Pressable onPress={pickDemo} disabled={!!busy} style={[{ marginTop: 20 }, busy === "demo" && { opacity: 0.6 }]}>
        <GlassCard>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, { color: c.accent.primary }]}>Exploring the demo</Text>
            <View style={[styles.pill, { backgroundColor: c.accent.primary }]}>
              <Text style={styles.pillText}>Recommended for examiners</Text>
            </View>
          </View>
          <Text style={[styles.body, { color: c.text.secondary, marginTop: 8 }]}>
            Seeds a realistic 14-day dataset so every chart, correlation, and the Mind–Body Bridge view have something to show straight away. Everything stays on this device.
          </Text>
          <View style={styles.bulletList}>
            <Bullet c={c} text="14 days of simulated WHOOP-like recovery, sleep and strain" />
            <Bullet c={c} text="Synthetic check-ins and emotion entries" />
            <Bullet c={c} text="Shows a 'Demo data' chip in the header — always clear what's real" />
          </View>
          {busy === "demo" && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 8 }}>
              <ActivityIndicator color={c.accent.primary} />
              <Text style={{ color: c.text.secondary }}>Seeding demo data…</Text>
            </View>
          )}
        </GlassCard>
      </Pressable>

      <Pressable onPress={pickFresh} disabled={!!busy} style={[{ marginTop: 12 }, busy === "fresh" && { opacity: 0.6 }]}>
        <GlassCard>
          <Text style={[styles.cardTitle, { color: c.text.primary }]}>Starting fresh</Text>
          <Text style={[styles.body, { color: c.text.secondary, marginTop: 8 }]}>
            No seeded data. Use this if you plan to check in daily and build up your own picture. Your insights will appear as data accumulates (roughly 3–5 days for baselines).
          </Text>
        </GlassCard>
      </Pressable>

      <Text style={[styles.footnote, { color: c.text.tertiary }]}>
        Both paths use identical screens and logic — only the starting data differs.
      </Text>
    </Screen>
  );
}

function Bullet({ c, text }: { c: typeof Colors.light; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bulletDot, { backgroundColor: c.accent.primary }]} />
      <Text style={{ color: c.text.secondary, flex: 1, fontSize: 14, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  pillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  bulletList: {
    marginTop: 12,
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  footnote: {
    marginTop: 24,
    fontSize: 12,
    textAlign: "center",
  },
});
