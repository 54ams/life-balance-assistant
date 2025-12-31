import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { loadPlan, type StoredPlan } from "../../lib/storage";

function lastNDates(n: number) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

export default function HistoryScreen() {
  const dates = useMemo(() => lastNDates(7), []);
  const [rows, setRows] = useState<StoredPlan[]>([]);
  const [missingCount, setMissingCount] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        const plans: StoredPlan[] = [];
        let missing = 0;

        for (const date of dates) {
          const p = await loadPlan(date);
          if (p) plans.push(p);
          else missing += 1;
        }

        if (!alive) return;

        plans.sort((a, b) => (a.date < b.date ? 1 : -1));
        setRows(plans);
        setMissingCount(missing);
      })();

      return () => {
        alive = false;
      };
    }, [dates])
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>History (7 days)</Text>
      <Text style={styles.muted}>
        Tip: baseline becomes more reliable after 3+ days of saved results.
      </Text>

      {missingCount > 0 && (
        <Text style={styles.muted}>
          Missing days: {missingCount} (open Home to generate plans)
        </Text>
      )}

      {rows.length === 0 ? (
        <Text style={styles.muted}>No saved plans yet — open Home for a few days.</Text>
      ) : (
        rows.map((r) => (
          <Pressable
            key={r.date}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/plan-details",
                params: { date: r.date },
              })
            }
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Text style={styles.date}>{r.date}</Text>

            <Text style={styles.row}>
              LBI: <Text style={styles.bold}>{r.lbi}</Text>{" "}
              {r.baseline !== null ? `• Baseline: ${r.baseline}` : "• Baseline: —"}
            </Text>

            <Text style={styles.badge}>
              {r.category === "RECOVERY" ? "🟠 RECOVERY" : "🟢 NORMAL"}
            </Text>

            {r.triggers.length > 0 && (
              <Text style={styles.muted}>Triggers: {r.triggers.join(", ")}</Text>
            )}
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0f172a" },
  title: { fontSize: 22, fontWeight: "700", color: "#f8fafc", marginBottom: 8 },

  card: { backgroundColor: "#020617", padding: 16, borderRadius: 14, marginBottom: 12 },
  cardPressed: { opacity: 0.8 },

  date: { color: "#94a3b8", marginBottom: 6 },
  row: { color: "#e5e7eb", marginBottom: 6 },
  bold: { fontWeight: "700" },
  badge: { color: "#f8fafc", fontWeight: "700", marginBottom: 6 },
  muted: { color: "#94a3b8", marginBottom: 8 },
});
