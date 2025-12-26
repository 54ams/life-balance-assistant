import { useFocusEffect } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { calculateLBI } from "../../lib/lbi";
import { loadCheckIn, type DailyCheckIn } from "../../lib/storage";


export default function TodayScreen() {
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [checkIn, setCheckIn] = useState<DailyCheckIn | null>(null);

  // TEMP placeholders until WHOOP is integrated
  const recovery = 42;     // 0–100
  const sleepHours = 6.5;  // hours

 useFocusEffect(() => {
  let alive = true;

  (async () => {
    const saved = await loadCheckIn(todayKey);
    if (alive) setCheckIn(saved);
  })();

  return () => {
    alive = false;
  };
});


  const { lbi, reason } = calculateLBI({ recovery, sleepHours, checkIn });

  const focus =
    !checkIn
      ? "Do your check-in to unlock personalised actions."
      : checkIn.stress >= 4 || checkIn.mood <= 2
      ? "Low-demand day: walk + early wind-down."
      : "Normal day: train as planned + do 1 priority task.";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Life Balance</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Life Balance Index</Text>
        <Text style={styles.score}>{lbi}</Text>
        <Text style={styles.reason}>{reason}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Today’s Focus</Text>
        <Text style={styles.action}>{focus}</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0f172a",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#f8fafc",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#020617",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 8,
  },
  score: {
    fontSize: 48,
    fontWeight: "700",
    color: "#38bdf8",
  },
  reason: {
    fontSize: 16,
    color: "#e5e7eb",
    marginTop: 8,
  },
  action: {
    fontSize: 18,
    fontWeight: "500",
    color: "#a7f3d0",
  },
});
