import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { loadPlan, type StoredPlan } from "../../lib/storage";

export default function PlanDetailsScreen() {
  const params = useLocalSearchParams();
  const dateParam = params.date;
  const date = Array.isArray(dateParam) ? dateParam[0] : dateParam;

  const [plan, setPlan] = useState<StoredPlan | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        if (!date) return;

        const p = await loadPlan(date);
        if (!alive) return;
        setPlan(p);
      })();

      return () => {
        alive = false;
      };
    }, [date])
  );


  if (!date) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Plan Details</Text>
        <Text style={styles.muted}>No date provided.</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Plan Details</Text>
        <Text style={styles.muted}>No saved plan found for {date}.</Text>
      </View>
    );
  }

  const tone = plan.category === "RECOVERY" ? "#f59e0b" : "#10b981";

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Plan Details</Text>
      <Text style={styles.date}>{plan.date}</Text>

      <View style={styles.card}>
        <View style={[styles.badge, { borderColor: tone }]}>
          <Text style={[styles.badgeText, { color: tone }]}>{plan.category}</Text>
        </View>

        <Text style={styles.focus}>{plan.focus}</Text>

        <Text style={styles.sectionTitle}>Actions</Text>
        {plan.actions.map((a, i) => (
          <Text key={i} style={styles.bullet}>
            • {a}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Scores</Text>
        <Text style={styles.row}>
          LBI: <Text style={styles.bold}>{plan.lbi}</Text>
        </Text>
        <Text style={styles.row}>
          Baseline: <Text style={styles.bold}>{plan.baseline ?? "—"}</Text>
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Why this plan</Text>
        {plan.triggers.length === 0 ? (
          <Text style={styles.muted}>No triggers recorded.</Text>
        ) : (
          plan.triggers.map((t, i) => (
            <Text key={i} style={styles.bullet}>
              • {t}
            </Text>
          ))
        )}
      </View>


        <View style={styles.card}>
        <Text style={styles.sectionTitle}>Explanation</Text>
        {plan.explanation ? (
            <Text style={styles.row}>{plan.explanation}</Text>
        ) : (
            <Text style={styles.muted}>No explanation saved for this day.</Text>
        )}
        </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0f172a" },
  title: { fontSize: 22, fontWeight: "700", color: "#f8fafc", marginBottom: 4 },
  date: { color: "#94a3b8", marginBottom: 16 },
  card: { backgroundColor: "#020617", padding: 16, borderRadius: 14, marginBottom: 12 },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  focus: { fontSize: 18, fontWeight: "600", color: "#e5e7eb", marginBottom: 12 },
  sectionTitle: { color: "#94a3b8", fontWeight: "700", marginBottom: 8 },
  bullet: { color: "#e5e7eb", marginTop: 6 },
  row: { color: "#e5e7eb", marginTop: 6 },
  bold: { fontWeight: "700" },
  muted: { color: "#94a3b8" },
});
