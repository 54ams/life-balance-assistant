import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { DefaultModelConfig } from "@/lib/lbi";
import { runSensitivity, stabilityScore } from "@/lib/lbiSensitivity";
import { useMemo } from "react";

export default function ModelSettingsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const sensitivity = useMemo(() => runSensitivity({ recovery: 60, sleepHours: 7, strain: 10, checkIn: null }, 0.1, 10), []);
  const stability = stabilityScore(sensitivity.map((s) => s.lbi));

  return (
    <Screen scroll title="Scoring model" subtitle="Weights, thresholds, and sensitivity">
      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Model version {DefaultModelConfig.version}</Text>
        <Text style={{ color: c.text.secondary, marginTop: 6 }}>
          Rule-based LBI model combining wearable (objective) and check-in (subjective) signals. Configure in code via DefaultModelConfig.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.subtitle, { color: c.text.primary }]}>Weights</Text>
        {Object.entries(DefaultModelConfig.weights).map(([k, v]) => (
          <Row key={k} label={k} value={v} color={c.text.primary} />
        ))}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.subtitle, { color: c.text.primary }]}>Thresholds</Text>
        {Object.entries(DefaultModelConfig.thresholds).map(([k, v]) => (
          <Row key={k} label={k} value={v} color={c.text.primary} />
        ))}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.subtitle, { color: c.text.primary }]}>Sensitivity (±10% weights)</Text>
        <Text style={{ color: c.text.secondary, marginTop: 6 }}>Stability (SD of LBI across samples): {stability.toFixed(2)}</Text>
        {sensitivity.slice(0, 5).map((s, i) => (
          <Text key={i} style={{ color: c.text.secondary }}>
            {s.config.version}: LBI {s.lbi}
          </Text>
        ))}
      </GlassCard>
    </Screen>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.row}>
      <Text style={{ color, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 16, fontWeight: "800" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
});

