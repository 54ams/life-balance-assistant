import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import * as Clipboard from "expo-clipboard";
import { loadPlan, type StoredPlan } from "../../lib/storage";

function lastNDates(n: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out.reverse();
}

export default function ExportScreen() {
  const dates = useMemo(() => lastNDates(7), []);
  const [json, setJson] = useState<string>("");

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        const rows: StoredPlan[] = [];
        for (const date of dates) {
          const p = await loadPlan(date);
          if (p) rows.push(p);
        }

        const payload = {
          exportedAt: new Date().toISOString(),
          days: rows.length,
          data: rows.map((r) => ({
            date: r.date,
            lbi: r.lbi,
            baseline: r.baseline,
            category: r.category,
            focus: r.focus,
            actions: r.actions,
            triggers: r.triggers,
            explanation: (r as any).explanation ?? null,
          })),
        };

        const text = JSON.stringify(payload, null, 2);
        if (!alive) return;
        setJson(text);
      })();

      return () => {
        alive = false;
      };
    }, [dates])
  );

const onCopy = async () => {
  if (!json) {
    Alert.alert("Nothing to copy", "No export data available yet.");
    return;
  }

  await Clipboard.setStringAsync(json);
  Alert.alert("Copied", "7-day summary copied to clipboard.");
};

 
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Export (7 days)</Text>
      <Text style={styles.muted}>
        Use this in your evaluation appendix to evidence plan outputs, triggers and changes over time.
      </Text>

      <TouchableOpacity style={styles.button} onPress={onCopy}>
        <Text style={styles.buttonText}>How to copy</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.code}>{json || "No data yet — open Home to generate and save plans."}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0f172a" },
  title: { fontSize: 22, fontWeight: "700", color: "#f8fafc", marginBottom: 8 },
  muted: { color: "#94a3b8", marginBottom: 12 },
  button: { backgroundColor: "#0b1224", padding: 14, borderRadius: 14, marginBottom: 12 },
  buttonText: { textAlign: "center", fontWeight: "700", color: "#f8fafc" },
  card: { backgroundColor: "#020617", padding: 16, borderRadius: 14, marginBottom: 24 },
  code: { color: "#e5e7eb", fontFamily: "Menlo", fontSize: 12, lineHeight: 18 },
});
