import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { BlurView } from "expo-blur";

import { WeeklyStrip } from "@/components/ui/WeeklyStrip";
import { LBIOrb } from "@/components/ui/LBIOrb";
import { DriverOverlay } from "@/components/ui/DriverOverlay";
import { PrimaryActionCard } from "@/components/ui/PrimaryActionCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { TransparencyDrawer } from "@/components/ui/TransparencyDrawer";
import { GlassButton } from "@/components/ui/GlassButton";

import { computeBaselineMeta, type BaselineMeta } from "@/lib/baseline";
import { getDay, listDailyRecords, listUpcomingEvents, listEmotions, loadPlan } from "@/lib/storage";
import { todayISO } from "@/lib/util/todayISO";
import type { LbiOutput } from "@/lib/lbi";
import type { ISODate } from "@/lib/types";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { refreshDerivedForDate } from "@/lib/pipeline";
import { predictTomorrowRisk } from "@/lib/ml";
import { useCallback } from "react";
import { buildMissingnessSummary } from "@/lib/transparency";

function greetingForHour(h: number) {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;

  const [date] = useState<ISODate>(todayISO());
  const [lbi, setLbi] = useState<LbiOutput | null>(null);
  const [baselineMeta, setBaselineMeta] = useState<BaselineMeta | null>(null);
  const [todayPlan, setTodayPlan] = useState<{ focus: string; actions: string[]; actionReasons: string[] } | null>(null);
  const [risk, setRisk] = useState<{
    trained: boolean;
    rowsUsed: number;
    lbiRiskProb: number | null;
    recoveryRiskProb: number | null;
    topDrivers: { name: string; direction: "up" | "down"; strength: number }[];
  } | null>(null);
  const [missingness, setMissingness] = useState<ReturnType<typeof buildMissingnessSummary> | null>(null);
  const [dataDates, setDataDates] = useState<ISODate[]>([]);
  const [eventDates, setEventDates] = useState<ISODate[]>([]);
  const [driversVisible, setDriversVisible] = useState(false);
  const [transparencyVisible, setTransparencyVisible] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [identityLine, setIdentityLine] = useState<string>("");
  const [lastWhoopSync, setLastWhoopSync] = useState<string | null>(null);

  const headerGreeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  const loadHome = useCallback(() => {
    let alive = true;
    (async () => {
      try {
        const day = await getDay(date);
        setMissingness(buildMissingnessSummary(day));
        if (!day?.wearable) {
          setStatus("Connect WHOOP to sync today's recovery, sleep, and strain.");
          setTodayPlan(null);
        } else {
          if (!day?.checkIn) {
            setStatus("Complete today's check-in to improve accuracy.");
          } else {
            setStatus("");
          }
          const derived = await refreshDerivedForDate(date);
          if (!alive) return;
          setLbi(derived.lbi);
          setBaselineMeta(await computeBaselineMeta(7));
          const plan = await loadPlan(date);
          setTodayPlan(plan ? { focus: plan.focus, actions: plan.actions, actionReasons: plan.actionReasons ?? [] } : null);
        }
      } catch (e: any) {
        setStatus(e?.message ?? "Unable to refresh");
      }

      const records = await listDailyRecords(30);
      setDataDates(records.filter((r) => !!r.wearable || !!r.lbi).map((r) => r.date));
      const upcoming = await listUpcomingEvents(date, 30);
      setEventDates(upcoming.map((e) => e.dateISO));
      const emos = await listEmotions(7);
      const lastSync = await AsyncStorage.getItem("whoop_last_sync");
      setLastWhoopSync(lastSync);
      if (emos.length) {
        const freq: Record<string, number> = {};
        emos.forEach((e) => (freq[e.valueChosen] = (freq[e.valueChosen] ?? 0) + 1));
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
        if (top) setIdentityLine(`You've shown up for ${top[0]} ${top[1]} time${top[1] === 1 ? "" : "s"} this week.`);
      } else {
        setIdentityLine("");
      }
      setRisk(await predictTomorrowRisk());
    })();
    return () => {
      alive = false;
    };
  }, [date]);

  useEffect(() => {
    const cleanup = loadHome();
    return cleanup;
  }, [loadHome]);

  useFocusEffect(
    useCallback(() => {
      const cleanup = loadHome();
      return cleanup;
    }, [loadHome])
  );

  const drivers = useMemo(() => {
    if (!lbi) return [];
    return [
      { label: "Recovery", value: `${lbi.subscores.recovery}` },
      { label: "Sleep", value: `${lbi.subscores.sleep}` },
      { label: "Mood", value: `${lbi.subscores.mood}` },
    ].slice(0, 3);
  }, [lbi]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.ambient}>
        <View style={[styles.orbBg, styles.orbBgTop, { backgroundColor: colors.accent.primaryLight }]} />
        <View style={[styles.orbBg, styles.orbBgBottom, { backgroundColor: colors.accent.primaryDark }]} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxl }}>
        <AppHeader title="Life Balance" subtitle={headerGreeting} />

        <GlassCard style={{ borderRadius: BorderRadius.xxl, marginTop: Spacing.sm }} padding="base">
          <WeeklyStrip dataDates={dataDates} events={eventDates} />
        </GlassCard>

        <View style={{ alignItems: "center", marginTop: Spacing.lg }}>
          <LBIOrb
            lbi={lbi?.lbi ?? 0}
            interpretation={lbi?.classification ?? "—"}
            confidence={lbi?.confidence ?? "low"}
            onPress={() => setDriversVisible(true)}
            onLongPress={() => setTransparencyVisible(true)}
          />
        </View>
        <DriverOverlay visible={driversVisible} onClose={() => setDriversVisible(false)} drivers={drivers} />
        <TransparencyDrawer visible={transparencyVisible} onClose={() => setTransparencyVisible(false)} />

        <GlassCard style={{ marginTop: Spacing.md }}>
          <Text style={{ color: colors.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold }}>Signal status</Text>
          <Text style={{ color: colors.text.secondary, marginTop: Spacing.xs, fontSize: Typography.fontSize.sm }}>
            {baselineMeta?.status !== "stable"
              ? `Baseline calibrating (${baselineMeta?.daysUsed ?? 0}/${baselineMeta?.targetDays ?? 7} days)`
              : `Baseline stable (${baselineMeta?.daysUsed ?? 0}/${baselineMeta?.targetDays ?? 7} days)`}
          </Text>
          <Text style={{ color: colors.text.secondary, marginTop: Spacing.xs, fontSize: Typography.fontSize.sm }}>
            Source: WHOOP • Correlation ≠ causation{lastWhoopSync ? ` • Last sync ${lastWhoopSync}` : ""}
          </Text>
          {identityLine ? <Text style={{ color: colors.text.primary, marginTop: Spacing.sm, fontWeight: Typography.fontWeight.bold }}>{identityLine}</Text> : null}
        </GlassCard>

        {missingness ? (
          <GlassCard style={{ marginTop: Spacing.md }}>
            <Text style={{ color: colors.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold }}>
              Confidence and data coverage
            </Text>
            <Text style={{ color: colors.text.secondary, marginTop: Spacing.xs }}>
              Source used today: {missingness.sourceLabel}
            </Text>
            <Text style={{ color: colors.text.secondary, marginTop: Spacing.xs }}>
              {missingness.confidenceEffect}
            </Text>
            {missingness.missing.length ? (
              <Text style={{ color: colors.text.primary, marginTop: Spacing.sm }}>
                Missing: {missingness.missing.join(", ")}
              </Text>
            ) : (
              <Text style={{ color: colors.text.primary, marginTop: Spacing.sm }}>
                No core data missing today.
              </Text>
            )}
            <Text style={{ color: colors.text.secondary, marginTop: Spacing.xs }}>
              Next best step: {missingness.nextStep}
            </Text>
          </GlassCard>
        ) : null}

        {todayPlan ? (
          <GlassCard style={{ marginTop: Spacing.md }}>
            <Text style={{ color: colors.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold }}>
              Today&apos;s rule-based recommendation
            </Text>
            <Text style={{ color: colors.text.secondary, marginTop: Spacing.xs }}>{todayPlan.focus}</Text>
            <View style={{ marginTop: Spacing.sm, gap: Spacing.xs }}>
              {todayPlan.actions.map((action, index) => (
                <View key={index} style={{ gap: 2 }}>
                  <Text style={{ color: colors.text.primary }}>
                    • {action}
                  </Text>
                  <Text style={{ color: colors.text.secondary, fontSize: Typography.fontSize.sm }}>
                    {todayPlan.actionReasons[index] ?? "Based on today's balance signals and recommendation logic."}
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>
        ) : null}

        {risk?.trained ? (
          <GlassCard style={{ marginTop: Spacing.md }}>
            <Text style={{ color: colors.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold }}>
              Tomorrow risk outlook
            </Text>
            <Text style={{ color: colors.text.secondary, marginTop: Spacing.xs }}>
              Trained on {risk.rowsUsed} personal rows. Exploratory only. This does not generate the daily plan; the plan remains rule-based and explainable.
            </Text>
            <Text style={{ color: colors.text.primary, marginTop: Spacing.sm }}>
              LBI drop risk: {risk.lbiRiskProb == null ? "—" : `${Math.round(risk.lbiRiskProb * 100)}%`}
            </Text>
            <Text style={{ color: colors.text.primary, marginTop: Spacing.xs }}>
              Recovery drop risk: {risk.recoveryRiskProb == null ? "—" : `${Math.round(risk.recoveryRiskProb * 100)}%`}
            </Text>
            {risk.topDrivers.length ? (
              <View style={{ marginTop: Spacing.sm, gap: Spacing.xs }}>
                {risk.topDrivers.map((driver) => (
                  <Text key={driver.name} style={{ color: colors.text.secondary }}>
                    • {driver.name} {driver.direction === "up" ? "increases" : "reduces"} risk contribution
                  </Text>
                ))}
              </View>
            ) : null}
          </GlassCard>
        ) : null}

        <View style={{ height: Spacing.sm }} />

        <PrimaryActionCard
          title="Reflect"
          subtitle="Log today’s check-in"
          icon="pencil.circle.fill"
          onPress={() => router.push("/checkin" as any)}
        />
        <PrimaryActionCard
          title="Insights"
          subtitle="See drivers, trends, correlations"
          icon="sparkles"
          onPress={() => router.push("/insights" as any)}
        />
        <PrimaryActionCard
          title="Plan ahead"
          subtitle="Review calendar & future contexts"
          icon="calendar"
          onPress={() => router.push("/calendar" as any)}
        />

        <GlassButton title="Capture today" onPress={() => router.push("/checkin" as any)} style={{ marginTop: Spacing.md }} />

        {status ? <Text style={{ color: colors.accent.primary, marginTop: Spacing.sm }}>{status}</Text> : null}

        <Text style={{ color: colors.text.secondary, marginTop: Spacing.md, fontSize: Typography.fontSize.sm }}>
          This prototype is observational and non-diagnostic. Confidence falls when wearable or check-in data is missing.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ambient: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  orbBg: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.16,
  },
  orbBgTop: { top: -40, right: -30 },
  orbBgBottom: { bottom: -60, left: -20 },
});
