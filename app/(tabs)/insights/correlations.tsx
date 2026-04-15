import { Stack } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { StrengthIndicator, correlationToHuman } from "@/components/ui/StrengthIndicator";
import { EmptyState } from "@/components/ui/EmptyState";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { useColorScheme } from "react-native";

import type { ISODate } from "@/lib/types";
import { getAllDays } from "@/lib/storage";
import { sliceRecordsUpTo } from "@/lib/range";
import { buildAnalyticsSummary } from "@/lib/analytics";
import { getInsightsSelectedDate, setInsightsSelectedDate } from "@/lib/insightsDate";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { formatDisplayDate } from "@/lib/date";
import { todayISO } from "@/lib/util/todayISO";

function prettyVar(k: string) {
  const map: Record<string, string> = {
    sleepHours: "sleep",
    stressIndicatorsCount: "stress indicators",
    stressCount: "stress",
    recovery: "recovery",
    lbi: "balance score",
    mood: "mood",
    energy: "energy",
    strain: "strain",
    adherenceRatio: "plan adherence",
    nextDayLbi: "next-day balance",
  };
  return map[k] ?? k;
}

export default function CorrelationsScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [date, setDate] = useState<ISODate>(todayISO());
  const [days, setDays] = useState<import("@/lib/types").DailyRecord[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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
    const all = await getAllDays();
    setDays(all);
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

    const MIN_N = 10;
    const items = (summary.correlations ?? [])
      .map((x: any) => ({ ...x, key: `${x.a}~${x.b}` }))
      .filter((x: any) => (x.n ?? 0) >= MIN_N)
      .filter((x: any) => wantedPairs.has(x.key) || wantedPairs.has(`${x.b}~${x.a}`))
      .sort((a: any, b: any) => Math.abs(b.r ?? 0) - Math.abs(a.r ?? 0))
      .slice(0, 8);

    return items;
  }, [summary]);

  return (
    <Screen title="Correlations" subtitle="How your signals relate to each other">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ gap: 12 }}>
        <InsightsDatePicker
          date={date}
          onChange={setDate}
          title="As of"
          helperText="Using the last 30 days up to this date."
        />

        {windowed.length < 10 ? (
          <GlassCard>
            <EmptyState
              icon="arrow.triangle.branch"
              title="Building your patterns"
              description={`You need at least 10 days of data to discover meaningful patterns. Current window has ${windowed.length} days.`}
            />
          </GlassCard>
        ) : curated.length === 0 ? (
          <GlassCard>
            <EmptyState
              icon="arrow.triangle.branch"
              title="No clear patterns yet"
              description="Keep logging check-ins and wearable data. Relationships will appear automatically."
            />
          </GlassCard>
        ) : (
          <>
            {/* Human-readable correlations */}
            <GlassCard padding="base">
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17, marginBottom: Spacing.sm }}>
                Key relationships
              </Text>

              {curated.map((x: any, i: number) => {
                const isExpanded = expandedIndex === i;
                const humanText = correlationToHuman(x.a, x.b, x.r ?? 0);

                return (
                  <Pressable
                    key={i}
                    onPress={() => setExpandedIndex(isExpanded ? null : i)}
                    style={{
                      paddingVertical: 12,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                    }}
                  >
                    {/* Human-readable summary */}
                    <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15, marginBottom: 6 }}>
                      {prettyVar(x.a)} & {prettyVar(x.b)}
                    </Text>
                    <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18, marginBottom: 8 }}>
                      {humanText}
                    </Text>

                    {/* Strength bar */}
                    <StrengthIndicator value={x.r ?? 0} />

                    {/* Expandable details for examiners */}
                    {isExpanded && (
                      <View
                        style={{
                          marginTop: 10,
                          padding: 12,
                          borderRadius: BorderRadius.lg,
                          backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                        }}
                      >
                        <Text style={{ color: c.text.tertiary, fontSize: 12, fontWeight: "600", marginBottom: 4 }}>
                          Statistical details
                        </Text>
                        <Text style={{ color: c.text.tertiary, fontSize: 11, lineHeight: 16 }}>
                          Method: {x.method ?? "pearson"} · r = {typeof x.r === "number" ? x.r.toFixed(3) : "—"} · n = {x.n ?? "—"}
                        </Text>
                        <Text style={{ color: c.text.tertiary, fontSize: 11, lineHeight: 16 }}>
                          95% CI [{x.ciLower != null ? x.ciLower.toFixed(2) : "—"}, {x.ciUpper != null ? x.ciUpper.toFixed(2) : "—"}]
                        </Text>
                        <Text style={{ color: c.text.tertiary, fontSize: 11, lineHeight: 16 }}>
                          FDR: {x.fdr != null ? x.fdr.toFixed(3) : "—"} · {x.significant ? "Statistically significant" : "Exploratory"}
                          {x.lag ? ` · Lag: ${x.lag}d` : ""}
                        </Text>
                      </View>
                    )}

                    <Text style={{ color: c.accent.primary, fontSize: 12, fontWeight: "600", marginTop: 6 }}>
                      {isExpanded ? "Hide details" : "Show details"}
                    </Text>
                  </Pressable>
                );
              })}
            </GlassCard>

            {/* Disclaimer */}
            <View style={{ paddingHorizontal: Spacing.sm }}>
              <Text style={{ color: c.text.tertiary, fontSize: 12, textAlign: "center", lineHeight: 16 }}>
                Correlation does not imply causation · Small samples can mislead · Use for reflection, not decisions
              </Text>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}
