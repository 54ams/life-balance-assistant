import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { seedDemoData } from "@/lib/demoSeed";
import {
  clearDemoOverrides,
  isDemoEnabled,
  setDemoCheckIn,
  setDemoEnabled,
  setDemoWearable,
} from "@/lib/demo";
import { SCENARIOS, seedScenario, type ScenarioKey } from "@/lib/demoScenarios";

export default function DemoToolsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [demoOn, setDemoOn] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const on = await isDemoEnabled();
      setDemoOn(on);
    })();
  }, []);

  const toggleDemo = async () => {
    setSaving(true);
    try {
      await setDemoEnabled(!demoOn);
      setDemoOn(!demoOn);
    } finally {
      setSaving(false);
    }
  };

  const onSeed = async () => {
    setSaving(true);
    try {
      await seedDemoData(14);
      Alert.alert("Done", "Seeded 14 days of demo data.");
    } finally {
      setSaving(false);
    }
  };

  const onClearOverrides = async () => {
    setSaving(true);
    try {
      await clearDemoOverrides();
      Alert.alert("Done", "Cleared demo overrides.");
    } finally {
      setSaving(false);
    }
  };

  const onSeedScenario = async (key: ScenarioKey, title: string) => {
    setSaving(true);
    try {
      await seedScenario(key);
      Alert.alert("Scenario loaded", `Seeded 14 days for "${title}". Open Home to see the arc.`);
    } catch (err) {
      Alert.alert("Couldn't seed scenario", (err as any)?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll contentStyle={styles.container}>
      <Text style={[styles.title, { color: c.text.primary }]}>Demo tools</Text>
      <Text style={[styles.sub, { color: c.text.secondary }]}>Load example data so you can see how the app looks once a few days are filled in.</Text>

      <GlassCard>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: c.text.primary }]}>Demo mode</Text>
            <Text style={[styles.rowSub, { color: c.text.secondary }]}>Uses seeded data + predictable outputs.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={toggleDemo}
            disabled={saving}
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: demoOn ? c.accent.primary : c.glass.primary, borderColor: c.border.medium },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.pillText, { color: demoOn ? c.onPrimary : c.text.primary }]}>
              {demoOn ? "On" : "Off"}
            </Text>
          </Pressable>
        </View>
      </GlassCard>

      <GlassCard style={styles.cardPad}>
        <Pressable
          onPress={onSeed}
          disabled={saving}
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: c.accent.primary }, pressed && styles.pressed]}
        >
          <Text style={[styles.primaryText, { color: c.onPrimary }]}>Seed 14 days demo data</Text>
        </Pressable>
        <View style={{ height: 12 }} />
        <Pressable
          onPress={async () => {
            setSaving(true);
            try {
              await setDemoWearable({ sleepHours: 7.4, recovery: 78, hrv: 58, restingHR: 54 });
              Alert.alert("Done", "Set demo wearable values.");
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          style={({ pressed }) => [styles.secondaryBtn, { borderColor: c.border.medium }, pressed && styles.pressed]}
        >
          <Text style={[styles.secondaryText, { color: c.text.primary }]}>Set demo wearable values</Text>
        </Pressable>
        <View style={{ height: 12 }} />
        <Pressable
          onPress={async () => {
            setSaving(true);
            try {
              await setDemoCheckIn({
                mood: 3,
                energy: 3,
                stressLevel: 3,
                sleepQuality: 3,
                stressIndicators: {
                  muscleTension: false,
                  racingThoughts: false,
                  irritability: false,
                  avoidance: false,
                  restlessness: false,
                },
                caffeineAfter2pm: false,
                alcohol: false,
                exerciseDone: true,
                deepWorkMins: 45,
                hydrationLitres: 2,
                notes: "Demo check-in",
              });
              Alert.alert("Done", "Set demo check-in values.");
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          style={({ pressed }) => [styles.secondaryBtn, { borderColor: c.border.medium }, pressed && styles.pressed]}
        >
          <Text style={[styles.secondaryText, { color: c.text.primary }]}>Set demo check-in values</Text>
        </Pressable>
        <View style={{ height: 12 }} />
        <Pressable
          onPress={onClearOverrides}
          disabled={saving}
          style={({ pressed }) => [styles.secondaryBtn, { borderColor: c.border.medium }, pressed && styles.pressed]}
        >
          <Text style={[styles.secondaryText, { color: c.text.primary }]}>Clear demo overrides</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.cardPad}>
        <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Scenario presets</Text>
        <Text style={[styles.sectionSub, { color: c.text.secondary }]}>
          Each option clears your current data and replaces it with 14 days of example data telling a different story. Handy for exploring what the app looks like in different situations.
        </Text>
        <View style={{ height: 12 }} />
        {SCENARIOS.map((s, idx) => (
          <View key={s.key}>
            {idx > 0 && <View style={{ height: 10 }} />}
            <Pressable
              onPress={() => onSeedScenario(s.key, s.title)}
              disabled={saving}
              style={({ pressed }) => [
                styles.scenarioBtn,
                { borderColor: c.border.medium },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.scenarioTitle, { color: c.text.primary }]}>{s.title}</Text>
              <Text style={[styles.scenarioBlurb, { color: c.text.secondary }]}>{s.blurb}</Text>
            </Pressable>
          </View>
        ))}
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 28, fontWeight: "800" },
  sub: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { fontSize: 16, fontWeight: "700" },
  rowSub: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
  },
  pillText: { fontSize: 13, fontWeight: "700" },
  cardPad: { padding: 16 },
  primaryBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  secondaryText: { fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.85 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  sectionSub: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  scenarioBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "flex-start",
  },
  scenarioTitle: { fontSize: 15, fontWeight: "800" },
  scenarioBlurb: { marginTop: 4, fontSize: 12, lineHeight: 16 },
});
