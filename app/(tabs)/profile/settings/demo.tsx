import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { seedDemoData } from "@/lib/demoSeed";
import {
  clearDemoOverrides,
  isDemoEnabled,
  setDemoCheckIn,
  setDemoEnabled,
  setDemoWearable,
} from "@/lib/demo";

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

  return (
    <Screen scroll contentStyle={styles.container}>
      <Text style={[styles.title, { color: c.text }]}>Demo tools</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Seed data and simulate wearable/check-in states for your viva.</Text>

      <GlassCard>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: c.text }]}>Demo mode</Text>
            <Text style={[styles.rowSub, { color: c.muted }]}>Uses seeded data + predictable outputs.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={toggleDemo}
            disabled={saving}
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: demoOn ? c.tint : c.card, borderColor: c.border },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.pillText, { color: demoOn ? "#fff" : c.text }]}>
              {demoOn ? "On" : "Off"}
            </Text>
          </Pressable>
        </View>
      </GlassCard>

      <GlassCard style={styles.cardPad}>
        <Pressable
          onPress={onSeed}
          disabled={saving}
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: c.tint }, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>Seed 14 days demo data</Text>
        </Pressable>
        <View style={{ height: 12 }} />
        <Pressable
          onPress={async () => {
            setSaving(true);
            try {
              await setDemoWearable({ sleepHours: 7.4, recovery: 78, hrv: 58, rhr: 54 });
              Alert.alert("Done", "Set demo wearable values.");
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          style={({ pressed }) => [styles.secondaryBtn, { borderColor: c.border }, pressed && styles.pressed]}
        >
          <Text style={[styles.secondaryText, { color: c.text }]}>Set demo wearable values</Text>
        </Pressable>
        <View style={{ height: 12 }} />
        <Pressable
          onPress={async () => {
            setSaving(true);
            try {
              await setDemoCheckIn({ recovery: 7, connection: 6, purpose: 5, notes: "Demo check-in" });
              Alert.alert("Done", "Set demo check-in values.");
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
          style={({ pressed }) => [styles.secondaryBtn, { borderColor: c.border }, pressed && styles.pressed]}
        >
          <Text style={[styles.secondaryText, { color: c.text }]}>Set demo check-in values</Text>
        </Pressable>
        <View style={{ height: 12 }} />
        <Pressable
          onPress={onClearOverrides}
          disabled={saving}
          style={({ pressed }) => [styles.secondaryBtn, { borderColor: c.border }, pressed && styles.pressed]}
        >
          <Text style={[styles.secondaryText, { color: c.text }]}>Clear demo overrides</Text>
        </Pressable>
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
});
