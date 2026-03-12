import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/Colors";
import { TAB_ORDER } from "@/constants/navigation";
import { useColorScheme } from "react-native";
import { getInsightsSelectedDate, setInsightsSelectedDate } from "@/lib/insightsDate";
import { listPlans } from "@/lib/storage";
import type { PlanCategory } from "@/lib/types";
import type { StoredPlan } from "@/lib/storage";
import type { ISODate } from "@/lib/types";
import { todayISO } from "@/lib/util/todayISO";

function categoryLabel(cat: PlanCategory) {
  switch (cat) {
    case "RECOVERY":
      return "Recovery day";
    case "NORMAL":
      return "Normal day";
    default:
      return cat;
  }
}

export default function TrendsScreen() {
  const [date, setDate] = useState<ISODate>(todayISO());

  useEffect(() => {
    (async () => {
      const saved = await getInsightsSelectedDate();
      setDate(saved);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await setInsightsSelectedDate(date);
    })();
  }, [date]);

  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  // listPlans() returns StoredPlan where baseline can be null until enough history exists.
  const [days, setDays] = useState<StoredPlan[]>([]);

  const load = useCallback(async () => {
    const d = await listPlans(7);
    setDays(d);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
        p.triggers.forEach((t) => {
          acc[t] = (acc[t] ?? 0) + 1;
        });
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1])[0];

    return { recentAvg, previousAvg, delta, recoveryDays, topTrigger };
  }, [days]);

  const bars = useMemo(() => {
    // simple normalised bar heights 0..1
    if (!days.length) return [];
    const vals = days.map((p) => p.lbi ?? 0);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = Math.max(1, max - min);
    // reverse so oldest→newest left→right
    return [...days]
      .reverse()
      .map((p) => ({
        date: p.date,
        lbi: p.lbi ?? 0,
        t: ( (p.lbi ?? 0) - min) / range,
      }));
  }, [days]);

  return (
    <Screen scroll contentStyle={{ paddingBottom: 28 }}>
      <Text style={[styles.title, { color: c.text.primary }]}>Trends (7 days)</Text>
      <Text style={[styles.subtitle, { color: c.text.secondary }]}>Visual summary of your Life Balance Index and recommended day type.</Text>

      <GlassCard>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Life Balance Index</Text>

        {!summary ? (
          <Text style={[styles.empty, { color: c.text.secondary }]}>No saved results yet. Open Home to generate a plan and save it.</Text>
        ) : (
          <>
            <View style={styles.topRow}>
              <View>
                <Text style={[styles.smallLabel, { color: c.text.secondary }]}>Latest</Text>
                <Text style={[styles.big, { color: c.text.primary }]}>{summary.latest.lbi}</Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.smallLabel, { color: c.text.secondary }]}>Recommended</Text>
                <Text style={[styles.reco, { color: c.text.primary }]}>{categoryLabel(summary.latest.category)}</Text>
                <Text style={[styles.range, { color: c.text.secondary }]}>Avg {summary.avg} • {summary.min}–{summary.max}</Text>
              </View>
            </View>

            <View style={styles.barWrap}>
              {bars.map((b) => (
                <View key={b.date} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: 10 + b.t * 56,
                          backgroundColor: c.accent.primary,
                        opacity: 0.25 + b.t * 0.75,
                      },
                    ]}
                  />
                  <Text style={[styles.barLabel, { color: c.text.secondary }]}>{b.date.slice(5)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </GlassCard>

      <GlassCard style={{ marginTop: 14 }}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>What this means</Text>
        {!interpretation ? (
          <Text style={[styles.body, { color: c.text.secondary }]}>
            Build more saved days to compare recent performance with the previous period.
          </Text>
        ) : (
          <>
            <Text style={[styles.body, { color: c.text.secondary }]}>
              Recent 7-day average: {interpretation.recentAvg}
              {interpretation.previousAvg != null
                ? ` vs previous period ${interpretation.previousAvg} (${interpretation.delta! > 0 ? "+" : ""}${interpretation.delta})`
                : "."}
            </Text>
            <Text style={[styles.body, { color: c.text.secondary }]}>
              Recovery-biased recommendation days in the recent window: {interpretation.recoveryDays}.
            </Text>
            <Text style={[styles.body, { color: c.text.secondary }]}>
              Most recurring trigger: {interpretation.topTrigger ? `${interpretation.topTrigger[0]} (${interpretation.topTrigger[1]} times)` : "none yet"}.
            </Text>
          </>
        )}
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  subtitle: { marginTop: 6, marginBottom: 16, fontSize: 14 },

  cardTitle: { fontSize: 16, fontWeight: "800" },
  empty: { marginTop: 10, fontSize: 14 },

  topRow: { marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  smallLabel: { fontSize: 12 },
  big: { fontSize: 40, fontWeight: "900", marginTop: 2 },
  reco: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  range: { fontSize: 12, marginTop: 6 },

  barWrap: { marginTop: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  barCol: { width: "13%", alignItems: "center" },
  bar: { width: "100%", borderRadius: 10 },
  barLabel: { marginTop: 8, fontSize: 11 },

  body: { marginTop: 10, fontSize: 13, lineHeight: 18 },
});
