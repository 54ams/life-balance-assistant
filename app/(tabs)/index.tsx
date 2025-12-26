import { useFocusEffect } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { average, loadLastNDaysLbi } from "../../lib/baseline";
import { calculateLBI } from "../../lib/lbi";
import { ensureNotificationPermissions, sendBalanceDropNow } from "../../lib/notifications";
import { loadCheckIn, saveDailyResult, type DailyCheckIn } from "../../lib/storage";

export default function TodayScreen() {
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [checkIn, setCheckIn] = useState<DailyCheckIn | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);

  // TEMP placeholders until WHOOP is integrated
  const recovery = 42; // 0–100
  const sleepHours = 6.5; // hours

  // Reload check-in whenever this tab is focused
useFocusEffect(() => {
  let alive = true;

  (async () => {
    const saved = await loadCheckIn(todayKey);
    const last7 = await loadLastNDaysLbi(todayKey, 7);

    if (!alive) return;

    setCheckIn(saved);
    setBaseline(average(last7));
  })();

  return () => {
    alive = false;
  };
});


  // Calculate today’s score
  const { lbi, reason } = calculateLBI({ recovery, sleepHours, checkIn });

  // Save today’s computed LBI so we can build baseline/history
  useEffect(() => {
    (async () => {
      await saveDailyResult({ date: todayKey, lbi });
    })();
  }, [todayKey, lbi]);

  // Load baseline (average of last 7 saved days)
  useEffect(() => {
    (async () => {
      const last7 = await loadLastNDaysLbi(todayKey, 7);
      setBaseline(average(last7));
    })();
  }, [todayKey, lbi]);

  const focus =
    !checkIn
      ? "Do your check-in to unlock personalised actions."
      : checkIn.stress >= 4 || checkIn.mood <= 2
      ? "Low-demand day: walk + early wind-down."
      : "Normal day: train as planned + do 1 priority task.";

  const delta = baseline === null ? null : lbi - baseline;
useEffect(() => {
  (async () => {
    if (baseline === null) return;

    const dropThreshold = Math.round(baseline * 0.85); // 15% drop
    if (lbi < dropThreshold) {
      const ok = await ensureNotificationPermissions();
      if (!ok) return;

      await sendBalanceDropNow("Your score is below your 7-day baseline. Consider a low-demand day: 20–30 min walk + early wind-down.");
    }
  })();
}, [baseline, lbi]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Life Balance</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Life Balance Index</Text>
        <Text style={styles.score}>{lbi}</Text>
        <Text style={styles.reason}>{reason}</Text>

        {baseline !== null && delta !== null && (
          <Text style={styles.baseline}>
            Baseline (last 7): {baseline} • Today: {delta >= 0 ? "+" : ""}
            {delta}
          </Text>
        )}
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
  baseline: {
    marginTop: 10,
    color: "#94a3b8",
  },
  action: {
    fontSize: 18,
    fontWeight: "500",
    color: "#a7f3d0",
  },
});
