import React, { useEffect, useState } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { HeatmapCalendar } from "@/components/ui/HeatmapCalendar";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { getAllDays } from "@/lib/storage";
import { setPrimaryGoals, type PrimaryGoal } from "@/lib/privacy";
import { formatDateFriendly } from "@/lib/util/formatDate";

const GOALS: PrimaryGoal[] = [
  "Sleep quality",
  "Stress recovery",
  "Consistent energy",
  "Emotional awareness",
  "Physical activity",
  "Mindful eating",
];

type Summary = {
  avgLbi: number;
  bestDate: string;
  bestScore: number;
  lowestDate: string;
  lowestScore: number;
  checkInCount: number;
  totalDays: number;
  trend: "improving" | "declining" | "steady";
};

export default function BalanceSummaryScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [heatmapData, setHeatmapData] = useState<{ date: string; value: number }[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [phase, setPhase] = useState<"summary" | "improve" | "done">("summary");
  const [selectedGoal, setSelectedGoal] = useState<PrimaryGoal | null>(null);

  useEffect(() => {
    (async () => {
      const records = await getAllDays();
      const recent = records.slice(-56); // last 8 weeks

      const withLbi = recent.filter((r) => typeof r.lbi === "number");
      setHeatmapData(withLbi.map((r) => ({ date: r.date, value: r.lbi as number })));

      if (withLbi.length === 0) return;

      const scores = withLbi.map((r) => r.lbi as number);
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      let bestIdx = 0;
      let lowestIdx = 0;
      scores.forEach((s, i) => {
        if (s > scores[bestIdx]) bestIdx = i;
        if (s < scores[lowestIdx]) lowestIdx = i;
      });

      // Trend: compare first half avg to second half avg
      const mid = Math.floor(scores.length / 2);
      const firstHalf = scores.slice(0, mid);
      const secondHalf = scores.slice(mid);
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / (firstHalf.length || 1);
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / (secondHalf.length || 1);
      const diff = avgSecond - avgFirst;
      const trend = diff > 3 ? "improving" : diff < -3 ? "declining" : "steady";

      const checkInCount = recent.filter((r) => r.checkIn != null).length;

      setSummary({
        avgLbi: avg,
        bestDate: withLbi[bestIdx].date,
        bestScore: scores[bestIdx],
        lowestDate: withLbi[lowestIdx].date,
        lowestScore: scores[lowestIdx],
        checkInCount,
        totalDays: recent.length,
        trend,
      });
    })();
  }, []);

  const trendText = summary?.trend === "improving"
    ? "Your balance has been improving — keep it up."
    : summary?.trend === "declining"
      ? "Your balance has dipped recently. Be gentle with yourself."
      : "Your balance has been steady.";

  const trendIcon = summary?.trend === "improving" ? "↑" : summary?.trend === "declining" ? "↓" : "→";

  const onSaveGoal = async () => {
    if (!selectedGoal) return;
    await setPrimaryGoals([selectedGoal]);
    setPhase("done");
  };

  return (
    <Screen scroll title="Your balance" subtitle="A summary of the last 8 weeks">
      {/* Heatmap */}
      <GlassCard padding="base" style={{ marginTop: Spacing.sm }}>
        <HeatmapCalendar
          data={heatmapData}
          weeks={8}
          onDayPress={(d) => router.push(`/day/${d}` as any)}
        />
      </GlassCard>

      {/* Summary stats */}
      {summary && (
        <GlassCard padding="base" style={{ marginTop: Spacing.sm }}>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17, marginBottom: Spacing.sm }}>
            At a glance
          </Text>

          <View style={{ gap: 10 }}>
            <StatRow label="Average balance" value={`${summary.avgLbi}`} c={c} />
            <StatRow label="Best day" value={`${formatDateFriendly(summary.bestDate)} (${summary.bestScore})`} c={c} />
            <StatRow label="Lowest day" value={`${formatDateFriendly(summary.lowestDate)} (${summary.lowestScore})`} c={c} />
            <StatRow label="Check-ins completed" value={`${summary.checkInCount} of ${summary.totalDays} days`} c={c} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: Spacing.sm, padding: 12, borderRadius: BorderRadius.lg, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)" }}>
            <Text style={{ fontSize: 20 }}>{trendIcon}</Text>
            <Text style={{ color: c.text.secondary, fontSize: 14, flex: 1 }}>{trendText}</Text>
          </View>
        </GlassCard>
      )}

      {/* Satisfaction flow */}
      {summary && phase === "summary" && (
        <GlassCard padding="base" style={{ marginTop: Spacing.sm }}>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>
            Are you happy with how your balance has been?
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: Spacing.sm }}>
            <GlassButton
              title="Yes, I'm on track"
              variant="primary"
              onPress={() => setPhase("done")}
              style={{ flex: 1 }}
            />
            <GlassButton
              title="I'd like to improve"
              variant="secondary"
              onPress={() => setPhase("improve")}
              style={{ flex: 1 }}
            />
          </View>
        </GlassCard>
      )}

      {phase === "improve" && (
        <GlassCard padding="base" style={{ marginTop: Spacing.sm }}>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>
            What would you most like to work on?
          </Text>
          <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4 }}>
            Your daily plans will focus more on your choice.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: Spacing.sm }}>
            {GOALS.map((g) => {
              const active = selectedGoal === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => setSelectedGoal(g)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: BorderRadius.full,
                    borderWidth: 1.5,
                    backgroundColor: active ? c.accent.primary : "transparent",
                    borderColor: active ? c.accent.primary : c.border.medium,
                  }}
                >
                  <Text style={{ color: active ? "#fff" : c.text.primary, fontWeight: "700", fontSize: 14 }}>
                    {g}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selectedGoal && (
            <GlassButton title="Save" variant="primary" onPress={onSaveGoal} style={{ marginTop: Spacing.sm }} />
          )}
        </GlassCard>
      )}

      {phase === "done" && (
        <GlassCard padding="base" style={{ marginTop: Spacing.sm }}>
          <Text style={{ color: c.success, fontWeight: "800", fontSize: 17 }}>
            {selectedGoal ? `Got it — your plans will focus more on ${selectedGoal.toLowerCase()}.` : "Great — keep doing what you're doing!"}
          </Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: Spacing.sm }}>
            <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>← Back to home</Text>
          </Pressable>
        </GlassCard>
      )}
    </Screen>
  );
}

function StatRow({ label, value, c }: { label: string; value: string; c: typeof Colors.light }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
      <Text style={{ color: c.text.secondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: c.text.primary, fontSize: 14, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}
