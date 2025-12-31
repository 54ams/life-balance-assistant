import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { buildActionPlan } from "../../lib/actions";
import { loadBaseline } from "../../lib/baseline";
import { calculateLBI } from "../../lib/lbi";
import { generateExplanation } from "../../lib/llm";
import { ensureNotificationPermissions, sendBalanceDropNow } from "../../lib/notifications";
import { isBalanceDrop } from "../../lib/rules";
import { getWearableMetricsForToday } from "../../lib/wearables";

import {
  getLastDropNotifyDate,
  loadCheckIn,
  saveDailyResult,
  savePlan,
  setLastDropNotifyDate,
  type DailyCheckIn,
  type StoredPlan,
} from "../../lib/storage";

import type { WearableMetrics } from "../../lib/types";

export default function TodayScreen() {
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [checkIn, setCheckIn] = useState<DailyCheckIn | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [wearable, setWearable] = useState<WearableMetrics>({
    recovery: 60,
    sleepHours: 9.0,
  });
  const [llmText, setLlmText] = useState<string | null>(null);

  // Reload data whenever Home tab is focused
  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        const saved = await loadCheckIn(todayKey);
        const { baseline } = await loadBaseline(todayKey, 7, 3);
        const w = await getWearableMetricsForToday();

        if (!alive) return;

        setCheckIn(saved);
        setBaseline(baseline);
        setWearable(w);
        setLlmText(null);
      })();

      return () => {
        alive = false;
      };
    }, [todayKey])
  );

  // Calculate today’s score using wearable + check-in
  const { lbi, reason } = calculateLBI({
    recovery: wearable.recovery,
    sleepHours: wearable.sleepHours,
    checkIn,
  });

  // Save today’s computed LBI so baseline/history work
  useEffect(() => {
    (async () => {
      await saveDailyResult({ date: todayKey, lbi });
    })();
  }, [todayKey, lbi]);

  const delta = baseline === null ? null : lbi - baseline;

  // Build action plan (rules engine) — memoised so it doesn't rebuild every render
  const plan = useMemo(() => {
    const p = buildActionPlan({
      date: todayKey,
      wearable,
      checkIn,
      lbi,
      baseline,
    });

    if (!p || !p.category) {
      throw new Error("ActionPlan invalid");
    }

    return p;
  }, [todayKey, wearable, checkIn, lbi, baseline]);

  // Explainability: show which signals pushed the plan into RECOVERY
  const triggers = useMemo(() => {
    const stressHigh = checkIn ? checkIn.stress >= 4 : false;
    const moodLow = checkIn ? checkIn.mood <= 2 : false;
    const recoveryLow = wearable.recovery <= 40;
    const sleepLow = wearable.sleepHours <= 6.5;
    const baselineDrop = baseline !== null ? lbi < baseline * 0.85 : false;

    const t: string[] = [];
    if (stressHigh) t.push("High stress (4–5)");
    if (moodLow) t.push("Low mood (1–2)");
    if (recoveryLow) t.push("Low recovery (≤ 40)");
    if (sleepLow) t.push("Low sleep (≤ 6.5h)");
    if (baselineDrop) t.push("Below baseline threshold (−15%+)");

    return t;
  }, [checkIn, wearable.recovery, wearable.sleepHours, baseline, lbi]);

  // ✅ Save today’s plan AFTER plan + triggers exist
 useEffect(() => {
  (async () => {
    const payload: StoredPlan = {
      date: todayKey,
      category: plan.category,
      focus: plan.focus,
      actions: plan.actions,
      triggers,
      lbi,
      baseline,
      explanation: llmText,
    };
    await savePlan(payload);
  })();
}, [todayKey, plan.category, plan.focus, plan.actions, triggers, lbi, baseline, llmText]);

  // Tone for UI based on plan category
  const planTone = plan.category === "RECOVERY" ? "#f59e0b" : "#10b981";

  // Mock LLM explanation (for viva/demo)
  useEffect(() => {
    (async () => {
      if (!plan.llmPrompt) {
        setLlmText(null);
        return;
      }
      const txt = await generateExplanation(plan.llmPrompt);
      setLlmText(txt);
    })();
  }, [plan.llmPrompt]);

  // Notify once per day if there’s a baseline drop
  useEffect(() => {
    (async () => {
      if (baseline === null) return;

      const drop = isBalanceDrop(lbi, baseline);
      if (!drop) return;

      const last = await getLastDropNotifyDate();
      if (last === todayKey) return;

      const ok = await ensureNotificationPermissions();
      if (!ok) return;

      await sendBalanceDropNow(
        plan.notifyBody ??
          "Your score is below your 7-day baseline. Consider a low-demand day: walk + early wind-down."
      );

      await setLastDropNotifyDate(todayKey);
    })();
  }, [baseline, lbi, todayKey, plan.notifyBody]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Life Balance</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Life Balance Index</Text>
        <Text style={styles.score}>{lbi}</Text>
        <Text style={styles.reason}>{reason}</Text>

        {baseline === null ? (
          <Text style={styles.baseline}>Building baseline… (need 3+ days)</Text>
        ) : (
          <Text style={styles.baseline}>
            Baseline (last 7): {baseline} • Today: {delta! >= 0 ? "+" : ""}
            {delta}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Today’s Focus</Text>

        <View style={[styles.badge, { borderColor: planTone }]}>
          <Text style={[styles.badgeText, { color: planTone }]}>{plan.category}</Text>
        </View>

        <Text style={styles.action}>{plan.focus}</Text>

        {plan.actions.map((a, i) => (
          <Text key={i} style={styles.bullet}>
            • {a}
          </Text>
        ))}

        {plan.category === "RECOVERY" && triggers.length > 0 && (
          <View style={styles.triggersBox}>
            <Text style={styles.triggersLabel}>Why recovery today</Text>
            {triggers.map((t, i) => (
              <Text key={i} style={styles.triggerItem}>
                • {t}
              </Text>
            ))}
          </View>
        )}

        {llmText && <Text style={styles.llm}>{llmText}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0f172a" },
  title: { fontSize: 28, fontWeight: "600", color: "#f8fafc", marginBottom: 24 },
  card: { backgroundColor: "#020617", padding: 20, borderRadius: 16, marginBottom: 16 },
  label: { fontSize: 14, color: "#94a3b8", marginBottom: 8 },
  score: { fontSize: 48, fontWeight: "700", color: "#38bdf8" },
  reason: { fontSize: 16, color: "#e5e7eb", marginTop: 8 },
  baseline: { marginTop: 10, color: "#94a3b8" },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  action: { fontSize: 18, fontWeight: "500", color: "#a7f3d0" },
  bullet: { color: "#e5e7eb", marginTop: 6 },
  triggersBox: { marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: "#0b1224" },
  triggersLabel: { color: "#94a3b8", marginBottom: 6, fontWeight: "600" },
  triggerItem: { color: "#e5e7eb", marginTop: 4 },
  llm: { marginTop: 12, color: "#94a3b8" },
});
