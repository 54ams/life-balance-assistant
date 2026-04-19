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
 * Two options:
 *   - "Exploring the demo" → seeds 14 days of realistic data, flags the
 *     session as demo so the home screen can show a "Demo data" chip.
 *   - "Starting fresh" → no data is seeded; the app starts empty.
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
      <Text style={[styles.h1, { color: c.text.primary }]}>How would you like to start?</Text>
      <Text style={[styles.body, { color: c.text.secondary, marginTop: 8 }]}>
        You can change this any time in Profile → Settings → Demo tools.
      </Text>

      <Pressable onPress={pickDemo} disabled={!!busy} style={[{ marginTop: 20 }, busy === "demo" && { opacity: 0.6 }]}>
        <GlassCard>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, { color: c.accent.primary }]}>Have a look around first</Text>
            <View style={[styles.pill, { backgroundColor: c.accent.primary }]}>
              <Text style={styles.pillText}>Recommended for a first look</Text>
            </View>
          </View>
          <Text style={[styles.body, { color: c.text.secondary, marginTop: 8 }]}>
            Loads two weeks of example data so every screen has something to show straight away. Everything stays on this device.
          </Text>
          <View style={styles.bulletList}>
            <Bullet c={c} text="14 days of pretend wearable numbers — recovery, sleep, and strain" />
            <Bullet c={c} text="Made-up check-ins and emotion notes, so charts aren't empty" />
            <Bullet c={c} text="A little 'Demo data' tag on the home screen so you always know it's not real" />
          </View>
          {busy === "demo" && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, gap: 8 }}>
              <ActivityIndicator color={c.accent.primary} />
              <Text style={{ color: c.text.secondary }}>Loading example data…</Text>
            </View>
          )}
        </GlassCard>
      </Pressable>

      <Pressable onPress={pickFresh} disabled={!!busy} style={[{ marginTop: 12 }, busy === "fresh" && { opacity: 0.6 }]}>
        <GlassCard>
          <Text style={[styles.cardTitle, { color: c.text.primary }]}>Start with a blank slate</Text>
          <Text style={[styles.body, { color: c.text.secondary, marginTop: 8 }]}>
            No example data — just you. Check in each day and the app will start spotting patterns after about 3–5 days.
          </Text>
        </GlassCard>
      </Pressable>

      <Pressable
        onPress={() => router.push("/profile/integrations/whoop" as any)}
        disabled={!!busy}
        style={{ marginTop: 20 }}
      >
        <GlassCard>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.accent.primary + "15", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 18 }}>⌚</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: c.text.primary, fontSize: 17 }]}>Connect your WHOOP</Text>
              <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>
                Bring in recovery, sleep, and strain data. You can also do this later.
              </Text>
            </View>
            <Text style={{ color: c.text.tertiary, fontSize: 18 }}>›</Text>
          </View>
        </GlassCard>
      </Pressable>

      <Text style={[styles.footnote, { color: c.text.tertiary }]}>
        You'll see the same screens either way — only the starting data is different.
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
