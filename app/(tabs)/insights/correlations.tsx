import { Stack, router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { StrengthIndicator, correlationToHuman } from "@/components/ui/StrengthIndicator";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlipCard } from "@/components/ui/FlipCard";
import { WorkingPanel } from "@/components/ui/WorkingPanel";
import { ShowWorkingToggle } from "@/components/ui/ShowWorkingToggle";
import { useShowWorking } from "@/hooks/useShowWorking";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useColorScheme } from "react-native";

import type { ISODate } from "@/lib/types";
import { getAllDays } from "@/lib/storage";
import { sliceRecordsUpTo } from "@/lib/range";
import { buildAnalyticsSummary } from "@/lib/analytics";
import { getInsightsSelectedDate, setInsightsSelectedDate } from "@/lib/insightsDate";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
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
  const c = Colors[scheme ?? "light"];

  const [date, setDate] = useState<ISODate>(todayISO());
  const [days, setDays] = useState<import("@/lib/types").DailyRecord[]>([]);
  const working = useShowWorking(false);

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
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />

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
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>
                Key relationships
              </Text>
              <ShowWorkingToggle value={working.globalShow} onToggle={working.toggleGlobal} />
            </View>

            <View style={{ gap: 10 }}>
              {curated.map((x: any, i: number) => {
                const id = `corr-${i}`;
                const flipped = working.isFlipped(id);
                const humanText = correlationToHuman(x.a, x.b, x.r ?? 0);
                const pairLabel = `${prettyVar(x.a)} & ${prettyVar(x.b)}`;
                const strength =
                  typeof x.r === "number" ? x.r.toFixed(3) : "—";
                const ciLower = x.ciLower != null ? x.ciLower.toFixed(2) : "—";
                const ciUpper = x.ciUpper != null ? x.ciUpper.toFixed(2) : "—";
                const reliability = x.significant
                  ? "Pattern is reasonably reliable"
                  : "Early signal — keep logging to confirm";
                const lagNote = x.lag ? " · Next-day effect" : "";

                return (
                  <FlipCard
                    key={id}
                    flipped={flipped}
                    onToggle={() => working.toggleTile(id)}
                    flipDelayMs={flipped !== working.globalShow ? 0 : i * 40}
                    accessibilityLabel={`${pairLabel}. Tap to ${flipped ? "hide" : "show"} the numbers.`}
                    front={
                      <GlassCard padding="base">
                        <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15, marginBottom: 6 }}>
                          {pairLabel}
                        </Text>
                        <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18, marginBottom: 10 }}>
                          {humanText}
                        </Text>
                        <StrengthIndicator value={x.r ?? 0} />
                        <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 10, textAlign: "right", fontWeight: "600" }}>
                          Tap to show the numbers
                        </Text>
                      </GlassCard>
                    }
                    back={
                      <WorkingPanel
                        summary={`How the link between ${prettyVar(x.a)} and ${prettyVar(x.b)} was measured.`}
                        inputs={[
                          `${prettyVar(x.a)} across ${x.n ?? "—"} days`,
                          `${prettyVar(x.b)} across the same days`,
                        ]}
                        method={`We look at how your daily numbers move together over time. Stronger links mean they tend to go up and down in sync. We checked this pattern multiple times to be sure.`}
                        result={`${correlationToHuman(x.a, x.b, x.r ?? 0)} · usually between ${ciLower} and ${ciUpper}`}
                        footnote={`${reliability}${lagNote}`}
                      />
                    }
                  />
                );
              })}
            </View>

            {/* Gentle reminder */}
            <View style={{ paddingHorizontal: Spacing.sm }}>
              <Text style={{ color: c.text.tertiary, fontSize: 12, textAlign: "center", lineHeight: 16 }}>
                Two things happening together doesn't mean one caused the other · A handful of days can be misleading · Something to notice, not a rule to follow
              </Text>
            </View>
          </>
        )}

        <Pressable onPress={() => router.push("/insights/weekly" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
          <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>See your weekly patterns →</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/insights/risk" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
          <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>Check tomorrow's outlook →</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
