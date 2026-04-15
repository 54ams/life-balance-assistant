import { useFocusEffect, router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { MiniLineChart } from "@/components/ui/MiniLineChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { listPlans } from "@/lib/storage";
import type { PlanCategory } from "@/lib/types";
import type { StoredPlan } from "@/lib/storage";

function categoryLabel(cat: PlanCategory) {
  switch (cat) {
    case "RECOVERY": return "Recovery day";
    case "NORMAL": return "Normal day";
    default: return cat;
  }
}

function trendDescription(delta: number | null): string {
  if (delta == null) return "Not enough data to compare periods yet.";
  if (delta > 5) return "Your balance is improving. Keep up the consistency.";
  if (delta > 0) return "Slight upward trend. You're on the right track.";
  if (delta > -5) return "Stable with a minor dip. Check your recent patterns.";
  return "Noticeable decline. Review your sleep and stress signals.";
}

export default function TrendsScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [days, setDays] = useState<StoredPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await listPlans(30);
      setDays(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const summary = useMemo(() => {
    if (!days.length) return null;
    const latest = days[0];
    const avg = Math.round(days.reduce((s, p) => s + (p.lbi ?? 0), 0) / days.length);
    const min = Math.min(...days.map((p) => p.lbi ?? 0));
    const max = Math.max(...days.map((p) => p.lbi ?? 0));
    return { latest, avg, min, max };
  }, [days]);

  const interpretation = useMemo(() => {
    if (days.length < 4) return null;
    const recent = days.slice(-Math.min(7, days.length));
    const previous = days.slice(Math.max(0, days.length - 14), Math.max(0, days.length - recent.length));
    const avg = (xs: StoredPlan[]) => Math.round(xs.reduce((s, p) => s + (p.lbi ?? 0), 0) / xs.length);
    const recentAvg = avg(recent);
    const previousAvg = previous.length ? avg(previous) : null;
    const delta = previousAvg == null ? null : recentAvg - previousAvg;
    const recoveryDays = recent.filter((p) => p.category === "RECOVERY").length;
    const topTrigger = Object.entries(
      recent.reduce<Record<string, number>>((acc, p) => {
        p.triggers.forEach((t) => { acc[t] = (acc[t] ?? 0) + 1; });
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1])[0];

    return { recentAvg, previousAvg, delta, recoveryDays, topTrigger };
  }, [days]);

  // Chart data — oldest to newest
  const chartData = useMemo(() => {
    if (!days.length) return [];
    return [...days]
      .reverse()
      .filter((p) => (p.lbi ?? 0) > 0)
      .map((p) => ({
        label: p.date.slice(5), // MM-DD
        value: p.lbi ?? 0,
      }));
  }, [days]);

  return (
    <Screen scroll contentStyle={{ paddingBottom: 28 }}>
      <Text style={[styles.title, { color: c.text.primary }]}>Trends</Text>
      <Text style={[styles.subtitle, { color: c.text.secondary }]}>
        {days.length > 0
          ? `${days.length} days of balance data`
          : "Your balance trajectory over time"}
      </Text>

      {loading ? (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <Text style={{ color: c.text.secondary, fontSize: 14 }}>Loading...</Text>
        </GlassCard>
      ) : !summary ? (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <EmptyState
            icon="chart.line.uptrend.xyaxis"
            title="No trend data yet"
            description="Open Home to generate a plan and save it. Your trend chart will appear here after a few days."
            actionLabel="Go to Home"
            onAction={() => router.push("/" as any)}
          />
        </GlassCard>
      ) : (
        <>
          {/* Hero stats */}
          <GlassCard style={{ marginTop: Spacing.md }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View>
                <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "600" }}>Latest score</Text>
                <Text style={{ color: c.text.primary, fontSize: 44, fontWeight: "900", marginTop: 2 }}>
                  {summary.latest.lbi}
                </Text>
                <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>
                  {categoryLabel(summary.latest.category)}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <View style={[styles.miniStat, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
                  <Text style={{ color: c.text.tertiary, fontSize: 11 }}>Average</Text>
                  <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "800" }}>{summary.avg}</Text>
                </View>
                <View style={[styles.miniStat, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
                  <Text style={{ color: c.text.tertiary, fontSize: 11 }}>Range</Text>
                  <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "800" }}>{summary.min}–{summary.max}</Text>
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Main chart */}
          {chartData.length >= 2 && (
            <GlassCard style={{ marginTop: Spacing.sm }}>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16, marginBottom: Spacing.sm }}>
                Life Balance Index
              </Text>
              <MiniLineChart data={chartData} height={110} showValues />
            </GlassCard>
          )}

          {/* Week comparison */}
          {interpretation && (
            <GlassCard style={{ marginTop: Spacing.sm }}>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>This week vs last</Text>

              {/* Visual comparison */}
              <View style={{ marginTop: Spacing.sm, gap: 10 }}>
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: c.text.secondary, fontSize: 13 }}>Recent 7 days</Text>
                    <Text style={{ color: c.text.primary, fontSize: 13, fontWeight: "800" }}>{interpretation.recentAvg}</Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", overflow: "hidden" }}>
                    <View style={{ height: 8, borderRadius: 4, width: `${Math.min(100, interpretation.recentAvg)}%`, backgroundColor: c.accent.primary }} />
                  </View>
                </View>

                {interpretation.previousAvg != null && (
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: c.text.secondary, fontSize: 13 }}>Previous period</Text>
                      <Text style={{ color: c.text.primary, fontSize: 13, fontWeight: "800" }}>{interpretation.previousAvg}</Text>
                    </View>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", overflow: "hidden" }}>
                      <View style={{ height: 8, borderRadius: 4, width: `${Math.min(100, interpretation.previousAvg)}%`, backgroundColor: c.text.tertiary, opacity: 0.5 }} />
                    </View>
                  </View>
                )}

                {interpretation.delta != null && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: BorderRadius.full,
                        backgroundColor: interpretation.delta >= 0
                          ? (isDark ? "rgba(87,214,164,0.12)" : "rgba(47,163,122,0.08)")
                          : (isDark ? "rgba(255,122,134,0.12)" : "rgba(214,69,80,0.08)"),
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "800",
                          color: interpretation.delta >= 0 ? c.success : c.danger,
                        }}
                      >
                        {interpretation.delta > 0 ? "+" : ""}{interpretation.delta} points
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Interpretation */}
              <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18, marginTop: Spacing.sm }}>
                {trendDescription(interpretation.delta)}
              </Text>
            </GlassCard>
          )}

          {/* Key signals */}
          {interpretation && (
            <GlassCard style={{ marginTop: Spacing.sm }}>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16, marginBottom: Spacing.sm }}>Key signals</Text>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[styles.signalDot, { backgroundColor: interpretation.recoveryDays > 3 ? c.warning : c.success }]} />
                  <Text style={{ color: c.text.primary, fontSize: 14, flex: 1 }}>
                    <Text style={{ fontWeight: "700" }}>{interpretation.recoveryDays}</Text> recovery days this week
                  </Text>
                </View>

                {interpretation.topTrigger && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={[styles.signalDot, { backgroundColor: c.warning }]} />
                    <Text style={{ color: c.text.primary, fontSize: 14, flex: 1 }}>
                      Top trigger: <Text style={{ fontWeight: "700" }}>{interpretation.topTrigger[0]}</Text> ({interpretation.topTrigger[1]}x)
                    </Text>
                  </View>
                )}
              </View>
            </GlassCard>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  subtitle: { marginTop: 6, marginBottom: 4, fontSize: 14 },
  miniStat: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
