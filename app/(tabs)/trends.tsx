import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { loadPlan, type StoredPlan } from "../../lib/storage";

function lastNDates(n: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out.reverse(); // oldest → newest (better for charts)
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export default function TrendsScreen() {
  const dates = useMemo(() => lastNDates(7), []);
  const [rows, setRows] = useState<StoredPlan[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        const plans: StoredPlan[] = [];
        for (const date of dates) {
          const p = await loadPlan(date);
          if (p) plans.push(p);
        }
        if (!alive) return;

        // Ensure same order as dates array
        plans.sort((a, b) => (a.date > b.date ? 1 : -1));
        setRows(plans);
      })();

      return () => {
        alive = false;
      };
    }, [dates])
  );

  const stats = useMemo(() => {
    if (rows.length === 0) return null;

    const values = rows.map((r) => r.lbi);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { min, max };
  }, [rows]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Trends (7 days)</Text>
      <Text style={styles.muted}>
        Visual summary of your Life Balance Index and recommended day type.
      </Text>

      {rows.length === 0 ? (
        <Text style={styles.muted}>No saved plans yet — open Home for a few days.</Text>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Life Balance Index</Text>

          {rows.map((r) => {
            const range = (stats?.max ?? 100) - (stats?.min ?? 0) || 1;
            const pct = clamp01((r.lbi - (stats?.min ?? 0)) / range);
            const widthPct = Math.max(0.05, pct); // keep visible

            const barColor = r.category === "RECOVERY" ? "#f59e0b" : "#10b981";

            return (
              <View key={r.date} style={styles.row}>
                <Text style={styles.date}>{r.date.slice(5)}</Text>

                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${widthPct * 100}%`, backgroundColor: barColor },
                    ]}
                  />
                </View>

                <Text style={styles.value}>{r.lbi}</Text>
              </View>
            );
          })}

          <Text style={styles.legend}>
            🟠 RECOVERY day recommended • 🟢 NORMAL day recommended
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0f172a" },
  title: { fontSize: 22, fontWeight: "700", color: "#f8fafc", marginBottom: 8 },
  muted: { color: "#94a3b8", marginBottom: 12 },
  card: { backgroundColor: "#020617", padding: 16, borderRadius: 14, marginBottom: 12 },
  sectionTitle: { color: "#f8fafc", fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  date: { width: 46, color: "#94a3b8" },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: "#0b1224",
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 999 },
  value: { width: 42, textAlign: "right", color: "#e5e7eb", fontWeight: "700" },
  legend: { marginTop: 12, color: "#94a3b8" },
});
