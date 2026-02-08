import { Stack } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

import type { ISODate } from "@/lib/types";
import { getAllDays } from "@/lib/storage";
import { sliceRecordsUpTo } from "@/lib/range";
import { buildAnalyticsSummary } from "@/lib/analytics";
import { getInsightsSelectedDate, setInsightsSelectedDate } from "@/lib/insightsDate";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { formatDisplayDate } from "@/lib/date";

function prettyVar(k: string) {
  return k
    .replaceAll("sleepHours", "sleep hours")
    .replaceAll("stressCount", "stress indicators")
    .replaceAll("recovery", "recovery")
    .replaceAll("lbi", "LBI")
    .replaceAll("mood", "mood");
}

export default function CorrelationsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"] as any;

  const [date, setDate] = useState<ISODate>(new Date().toISOString().slice(0, 10) as ISODate);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<any[]>([]);

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllDays();
      setDays(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const windowed = useMemo(() => sliceRecordsUpTo(days, date, 30), [days, date]);
  const summary = useMemo(() => buildAnalyticsSummary(windowed, 30), [windowed]);

  const curated = useMemo(() => {
    const wantedPairs = new Set([
      "sleepHours~mood",
      "sleepHours~stressCount",
      "recovery~mood",
      "recovery~stressCount",
      "sleepHours~lbi",
      "recovery~lbi",
      "stressCount~lbi",
      "mood~lbi",
    ]);

    const items = (summary.correlations ?? [])
      .map((x: any) => ({ ...x, key: `${x.x}~${x.y}` }))
      .filter((x: any) => wantedPairs.has(x.key) || wantedPairs.has(`${x.y}~${x.x}`))
      .sort((a: any, b: any) => Math.abs(b.r ?? 0) - Math.abs(a.r ?? 0))
      .slice(0, 8);

    return items;
  }, [summary]);

  return (
    <Screen title="Correlations" subtitle="Guided relationships (last 30 days)">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ gap: 12 }}>
        <InsightsDatePicker
          date={date}
          onChange={setDate}
          title="As of"
          helperText="Correlations use the last 30 days up to the selected date (where data exists)."
        />

        {windowed.length < 5 ? (
          <GlassCard style={{ padding: 14 }}>
            <Text style={{ color: c.text, fontWeight: "800" }}>Not enough data yet</Text>
            <Text style={{ color: c.icon, marginTop: 6 }}>
              You need a few days of wearable + check-in data to produce meaningful correlations. Current window up to {formatDisplayDate(date)} has {windowed.length} days.
            </Text>
          </GlassCard>
        ) : null}

        <GlassCard style={{ padding: 14 }}>
          <Text style={{ color: c.text, fontWeight: "800" }}>How to read this</Text>
          <Text style={{ color: c.icon, marginTop: 6 }}>
            Correlation shows whether two variables tend to move together in your data. It does not prove causation.
          </Text>
        </GlassCard>

        {curated.length ? (
          <GlassCard style={{ padding: 14, gap: 10 }}>
            <Text style={{ color: c.text, fontWeight: "900" }}>Top relationships</Text>
            {curated.map((x: any, i: number) => (
              <View key={i} style={{ gap: 4, paddingTop: i ? 10 : 0 }}>
                <Text style={{ color: c.text, fontWeight: "800" }}>
                  {prettyVar(x.x)} ↔ {prettyVar(x.y)}
                </Text>
                <Text style={{ color: c.icon }}>
                  r={typeof x.r === "number" ? x.r.toFixed(2) : "—"} • n={x.n ?? "—"}
                </Text>
                <Text style={{ color: c.icon }}>
                  Interpretation: {Math.abs(x.r ?? 0) >= 0.4 ? "moderate/strong pattern" : "weak/noisy pattern"} in this window.
                </Text>
              </View>
            ))}
          </GlassCard>
        ) : (
          <GlassCard style={{ padding: 14 }}>
            <Text style={{ color: c.text, fontWeight: "800" }}>No guided correlations available</Text>
            <Text style={{ color: c.icon, marginTop: 6 }}>
              As you collect more wearable + check-in days, relationships will appear here automatically.
            </Text>
          </GlassCard>
        )}
      </View>
    </Screen>
  );
}
