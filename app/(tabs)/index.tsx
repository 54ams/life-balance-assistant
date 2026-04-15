import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { DriverOverlay } from "@/components/ui/DriverOverlay";
import { GlassCard } from "@/components/ui/GlassCard";
import { TransparencyDrawer } from "@/components/ui/TransparencyDrawer";
import { WeeklyStrip } from "@/components/ui/WeeklyStrip";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { MiniLineChart } from "@/components/ui/MiniLineChart";
import { RadarChart } from "@/components/ui/RadarChart";
import { HeatmapCalendar } from "@/components/ui/HeatmapCalendar";
import { EmptyState } from "@/components/ui/EmptyState";

import { computeBaselineMeta } from "@/lib/baseline";
import { computeConsistency } from "@/lib/consistency";
import { getAllDays, getDay, getUserName, listDailyRecords, listEmotions, loadPlan, setPlanActionCompleted, getPlanAdherenceSummary } from "@/lib/storage";
import { todayISO } from "@/lib/util/todayISO";
import type { LbiOutput } from "@/lib/lbi";
import type { ISODate } from "@/lib/types";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { refreshDerivedForDate } from "@/lib/pipeline";
import { predictTomorrowRisk } from "@/lib/ml";
import { buildMissingnessSummary } from "@/lib/transparency";
import * as Haptics from "expo-haptics";

const { width: SCREEN_W } = Dimensions.get("window");

function greetingForHour(h: number) {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const [date] = useState<ISODate>(todayISO());
  const [lbi, setLbi] = useState<LbiOutput | null>(null);
  const [todayPlan, setTodayPlan] = useState<{ focus: string; actions: string[]; actionReasons: string[]; completedActions: boolean[] } | null>(null);
  const [adherenceSummary, setAdherenceSummary] = useState<{ streak: number; adherencePct: number } | null>(null);
  const [risk, setRisk] = useState<{
    trained: boolean;
    rowsUsed: number;
    lbiRiskProb: number | null;
    recoveryRiskProb: number | null;
    topDrivers: { name: string; direction: "up" | "down"; strength: number }[];
  } | null>(null);
  const [missingness, setMissingness] = useState<ReturnType<typeof buildMissingnessSummary> | null>(null);
  const [dataDates, setDataDates] = useState<ISODate[]>([]);
  const [driversVisible, setDriversVisible] = useState(false);
  const [transparencyVisible, setTransparencyVisible] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [identityLine, setIdentityLine] = useState<string>("");
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [userName, setUserName] = useState("");
  const [valueAlignmentPct, setValueAlignmentPct] = useState<number | null>(null);
  const [consistencyPct, setConsistencyPct] = useState<number | null>(null);
  const [weeklyLbi, setWeeklyLbi] = useState<{ label: string; value: number }[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ date: string; value: number }[]>([]);
  const [hasAnyData, setHasAnyData] = useState(true);

  // Animated score reveal
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(0.8)).current;

  const headerGreeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  const loadHome = useCallback(() => {
    let alive = true;
    (async () => {
      try {
        const day = await getDay(date);
        setMissingness(buildMissingnessSummary(day));
        setCheckedInToday(!!day?.checkIn);
        if (!day?.wearable) {
          setStatus("");
          setTodayPlan(null);
          setHasAnyData(!!day?.checkIn);
        } else {
          setHasAnyData(true);
          if (!day?.checkIn) {
            setStatus("Complete today's check-in to improve accuracy.");
          } else {
            setStatus("");
          }
          const derived = await refreshDerivedForDate(date);
          if (!alive) return;
          setLbi(derived.lbi);
          await computeBaselineMeta(7);
          const plan = await loadPlan(date);
          setTodayPlan(plan ? { focus: plan.focus, actions: plan.actions, actionReasons: plan.actionReasons ?? [], completedActions: plan.completedActions ?? plan.actions.map(() => false) } : null);

          // Animate score reveal
          Animated.parallel([
            Animated.timing(scoreAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(scoreScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
          ]).start();
        }
      } catch (e: any) {
        setStatus(e?.message ?? "Unable to refresh");
      }

      const records = await listDailyRecords(60);
      setDataDates(records.filter((r) => !!r.wearable || !!r.lbi).map((r) => r.date));

      // Build 7-day LBI chart data
      const last7 = records.slice(0, 7).reverse();
      if (last7.length >= 2) {
        setWeeklyLbi(
          last7.map((r) => ({
            label: new Date(r.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2),
            value: typeof r.lbi === "number" ? r.lbi : 0,
          })).filter((d) => d.value > 0)
        );
      }

      // Build heatmap data from all days
      const allDays = await getAllDays();
      setHeatmapData(
        allDays
          .filter((d) => typeof d.lbi === "number")
          .map((d) => ({ date: d.date, value: d.lbi as number }))
      );

      // Consistency score
      if (records.length >= 3) {
        const cOut = computeConsistency(records);
        setConsistencyPct(cOut.score);
      }

      const emos = await listEmotions(7);
      setUserName(await getUserName());

      if (emos.length) {
        const freq: Record<string, number> = {};
        emos.forEach((e) => (freq[e.valueChosen] = (freq[e.valueChosen] ?? 0) + 1));
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
        if (top) setIdentityLine(`Showing up for ${top[0]} (${top[1]}x this week)`);
        const uniqueDays = new Set(emos.map((e) => e.date));
        setValueAlignmentPct(Math.round((uniqueDays.size / 7) * 100));
      } else {
        setIdentityLine("");
        setValueAlignmentPct(null);
      }

      setRisk(await predictTomorrowRisk());
      setAdherenceSummary(await getPlanAdherenceSummary(7));
    })();
    return () => { alive = false; };
  }, [date]);

  const toggleAction = useCallback(async (index: number) => {
    if (!todayPlan) return;
    const newCompleted = [...todayPlan.completedActions];
    newCompleted[index] = !newCompleted[index];
    setTodayPlan({ ...todayPlan, completedActions: newCompleted });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setPlanActionCompleted(date, index, newCompleted[index]);
    setAdherenceSummary(await getPlanAdherenceSummary(7));
  }, [todayPlan, date]);

  useEffect(() => { return loadHome(); }, [loadHome]);
  useFocusEffect(useCallback(() => { return loadHome(); }, [loadHome]));

  const drivers = useMemo(() => {
    if (!lbi) return [];
    return [
      { label: "Recovery", value: `${lbi.subscores.recovery}` },
      { label: "Sleep", value: `${lbi.subscores.sleep}` },
      { label: "Mood", value: `${lbi.subscores.mood}` },
    ].slice(0, 3);
  }, [lbi]);

  const deltaChips = useMemo(() => {
    if (!lbi) return [];
    const chips: { label: string; delta: number; color: string }[] = [];
    const sub = lbi.subscores;
    if (typeof sub.sleep === "number") chips.push({ label: "Sleep", delta: Math.round(sub.sleep - 50), color: sub.sleep >= 50 ? c.success : c.danger });
    if (typeof sub.stress === "number") chips.push({ label: "Stress", delta: Math.round(sub.stress - 50), color: sub.stress >= 50 ? c.success : c.danger });
    if (typeof sub.recovery === "number") chips.push({ label: "Recovery", delta: Math.round(sub.recovery - 50), color: sub.recovery >= 50 ? c.success : c.danger });
    return chips;
  }, [lbi, c]);

  // Empty state — first-day guided experience
  if (!hasAnyData && !lbi) {
    return (
      <View style={{ flex: 1 }}>
        <AuroraBackground />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.greeting, { color: c.text.secondary }]}>
                  {headerGreeting}{userName ? `, ${userName}` : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/profile" as any)}
                style={[styles.avatar, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", borderColor: c.border.light }]}
              >
                <IconSymbol name="person.fill" size={18} color={c.text.secondary} />
              </Pressable>
            </View>

            <GlassCard style={{ marginTop: Spacing.xl }}>
              <EmptyState
                icon="heart.text.square"
                title="Welcome to Life Balance"
                description="Start by syncing your WHOOP data or completing your first check-in. Your personalised insights will appear here."
                actionLabel="Start Check-in"
                onAction={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/checkin" as any);
                }}
              />
            </GlassCard>

            <GlassCard style={{ marginTop: Spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.sm }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? "rgba(124,111,220,0.12)" : "rgba(107,93,211,0.08)", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name="1.circle.fill" size={18} color={c.accent.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: c.text.primary }}>Sync wearable data</Text>
                  <Text style={{ fontSize: 13, color: c.text.secondary }}>Connect WHOOP or import Apple Health</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.sm }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? "rgba(124,111,220,0.12)" : "rgba(107,93,211,0.08)", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name="2.circle.fill" size={18} color={c.accent.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: c.text.primary }}>Complete a check-in</Text>
                  <Text style={{ fontSize: 13, color: c.text.secondary }}>Log your mood, energy, sleep and stress</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? "rgba(124,111,220,0.12)" : "rgba(107,93,211,0.08)", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name="3.circle.fill" size={18} color={c.accent.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: c.text.primary }}>Get your balance score</Text>
                  <Text style={{ fontSize: 13, color: c.text.secondary }}>See personalised insights and recommendations</Text>
                </View>
              </View>
            </GlassCard>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header row */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: c.text.secondary }]}>
                {headerGreeting}{userName ? `, ${userName}` : ""}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/profile" as any)}
              style={[styles.avatar, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", borderColor: c.border.light }]}
            >
              <IconSymbol name="person.fill" size={18} color={c.text.secondary} />
            </Pressable>
          </View>

          {/* Week strip */}
          <View style={{ marginTop: Spacing.sm }}>
            <WeeklyStrip dataDates={dataDates} />
          </View>

          {/* Hero section — Animated score reveal */}
          <View style={styles.heroSection}>
            {identityLine ? (
              <Text style={[styles.feelsLabel, { color: c.text.secondary }]}>{identityLine}</Text>
            ) : (
              <Text style={[styles.feelsLabel, { color: c.text.secondary }]}>Today's balance</Text>
            )}

            <Animated.View style={{ opacity: scoreAnim, transform: [{ scale: scoreScale }] }}>
              <Pressable onPress={() => setDriversVisible(true)} onLongPress={() => setTransparencyVisible(true)}>
                <Text style={[styles.heroScore, { color: c.text.primary }]}>
                  {lbi ? Math.round(lbi.lbi) : "—"}
                </Text>
              </Pressable>
            </Animated.View>

            {/* Delta chips row */}
            {deltaChips.length > 0 && (
              <View style={styles.chipRow}>
                {deltaChips.map((chip) => (
                  <View key={chip.label} style={[styles.chip, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
                    <Text style={[styles.chipLabel, { color: c.text.secondary }]}>{chip.label}</Text>
                    <Text style={[styles.chipDelta, { color: chip.color }]}>
                      {chip.delta > 0 ? "+" : ""}{chip.delta}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <DriverOverlay visible={driversVisible} onClose={() => setDriversVisible(false)} drivers={drivers} />
          <TransparencyDrawer visible={transparencyVisible} onClose={() => setTransparencyVisible(false)} />

          {/* Status nudge */}
          {status ? (
            <GlassCard style={{ marginTop: Spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.statusDot, { backgroundColor: c.accent.primary }]} />
                <Text style={{ color: c.text.primary, flex: 1, fontSize: 14, lineHeight: 20 }}>{status}</Text>
              </View>
            </GlassCard>
          ) : null}

          {/* 7-day LBI trend chart */}
          {weeklyLbi.length >= 2 && (
            <GlassCard style={{ marginTop: Spacing.md }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm }}>
                <Text style={[styles.sectionTitle, { color: c.text.primary }]}>7-day trend</Text>
                <Pressable onPress={() => router.push("/insights/trends" as any)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: c.accent.primary }}>See all</Text>
                </Pressable>
              </View>
              <MiniLineChart data={weeklyLbi} height={90} showValues />
            </GlassCard>
          )}

          {/* Subscore breakdown */}
          {lbi && (
            <GlassCard style={{ marginTop: Spacing.md }}>
              <Text style={[styles.sectionTitle, { color: c.text.primary, marginBottom: Spacing.sm }]}>Score breakdown</Text>
              <RadarChart
                axes={[
                  { label: "Recovery", value: lbi.subscores.recovery },
                  { label: "Sleep", value: lbi.subscores.sleep },
                  { label: "Mood", value: lbi.subscores.mood },
                  { label: "Stress", value: lbi.subscores.stress },
                ]}
              />
            </GlassCard>
          )}

          {/* Capture Today + Reflect on Yesterday CTAs */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/checkin" as any);
            }}
            style={({ pressed }) => [
              styles.captureBtn,
              {
                backgroundColor: c.accent.primary,
                shadowColor: c.accent.primary,
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.captureBtnText}>
              {checkedInToday ? "Update Check-in" : "Capture Today"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yIso = yesterday.toISOString().slice(0, 10);
              router.push(`/day/${yIso}` as any);
            }}
            style={({ pressed }) => [styles.reflectLink, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.reflectText, { color: c.text.secondary }]}>Reflect on Yesterday</Text>
            <IconSymbol name="chevron.right" size={14} color={c.text.secondary} />
          </Pressable>

          {/* Value Alignment & Emotional Consistency */}
          {(valueAlignmentPct != null || consistencyPct != null) && (
            <View style={styles.statRow}>
              {valueAlignmentPct != null && (
                <Pressable
                  onPress={() => router.push("/insights" as any)}
                  style={({ pressed }) => [styles.statCard, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.65)", borderColor: c.border.light }, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.statDot, { backgroundColor: c.accent.primary }]} />
                  <Text style={[styles.statLabel, { color: c.text.secondary }]}>Value Alignment</Text>
                  <Text style={[styles.statValue, { color: c.text.primary }]}>{valueAlignmentPct}%</Text>
                </Pressable>
              )}
              {consistencyPct != null && (
                <Pressable
                  onPress={() => router.push("/insights/consistency" as any)}
                  style={({ pressed }) => [styles.statCard, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.65)", borderColor: c.border.light }, pressed && { opacity: 0.8 }]}
                >
                  <View style={[styles.statDot, { backgroundColor: c.success }]} />
                  <Text style={[styles.statLabel, { color: c.text.secondary }]}>Consistency</Text>
                  <Text style={[styles.statValue, { color: c.text.primary }]}>{consistencyPct}%</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Today's plan with interactive checklist */}
          {todayPlan && (
            <GlassCard style={{ marginTop: Spacing.md }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Today's plan</Text>
                {adherenceSummary && adherenceSummary.streak > 0 && (
                  <View style={[styles.streakBadge, { backgroundColor: isDark ? "rgba(47,163,122,0.15)" : "rgba(47,163,122,0.1)" }]}>
                    <Text style={{ color: c.success, fontSize: 12, fontWeight: "800" }}>
                      {adherenceSummary.streak}d streak
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ color: c.text.secondary, marginTop: 4, fontSize: 14 }}>{todayPlan.focus}</Text>
              <View style={{ marginTop: Spacing.sm, gap: 6 }}>
                {todayPlan.actions.map((action, i) => {
                  const done = todayPlan.completedActions[i];
                  return (
                    <Pressable
                      key={i}
                      onPress={() => toggleAction(i)}
                      style={({ pressed }) => [styles.actionCheckRow, pressed && { opacity: 0.7 }]}
                    >
                      <View style={[styles.checkbox, { borderColor: done ? c.success : c.border.heavy, backgroundColor: done ? c.success : "transparent" }]}>
                        {done && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800", lineHeight: 14 }}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: done ? c.text.secondary : c.text.primary, fontSize: 14, fontWeight: "600", textDecorationLine: done ? "line-through" : "none" }}>{action}</Text>
                        {todayPlan.actionReasons[i] ? (
                          <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 2 }}>
                            {todayPlan.actionReasons[i]}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {/* Progress bar */}
              {(() => {
                const done = todayPlan.completedActions.filter(Boolean).length;
                const total = todayPlan.actions.length;
                const pct = total > 0 ? done / total : 0;
                return (
                  <View style={{ marginTop: Spacing.sm }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                      <View style={{ height: 4, borderRadius: 2, width: `${Math.round(pct * 100)}%`, backgroundColor: pct === 1 ? c.success : c.accent.primary }} />
                    </View>
                    <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 4 }}>
                      {done}/{total} completed{pct === 1 ? " — well done!" : ""}
                    </Text>
                  </View>
                );
              })()}
            </GlassCard>
          )}

          {/* Heatmap calendar */}
          {heatmapData.length >= 3 && (
            <GlassCard style={{ marginTop: Spacing.md }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm }}>
                <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Score history</Text>
                <Pressable onPress={() => router.push("/insights/trends" as any)} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: c.accent.primary }}>Trends</Text>
                </Pressable>
              </View>
              <HeatmapCalendar
                data={heatmapData}
                weeks={6}
                onDayPress={(d) => router.push(`/day/${d}` as any)}
              />
            </GlassCard>
          )}

          {/* Risk outlook */}
          {risk?.trained && (
            <GlassCard style={{ marginTop: Spacing.md }}>
              <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Tomorrow outlook</Text>
              <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 2 }}>
                Based on {risk.rowsUsed} personal data points
              </Text>
              <View style={[styles.riskRow, { marginTop: Spacing.sm }]}>
                <RiskPill label="LBI drop" prob={risk.lbiRiskProb} c={c} isDark={isDark} />
                <RiskPill label="Recovery drop" prob={risk.recoveryRiskProb} c={c} isDark={isDark} />
              </View>
              {risk.topDrivers.length > 0 && (
                <View style={{ marginTop: 8, gap: 4 }}>
                  {risk.topDrivers.map((d) => (
                    <Text key={d.name} style={{ color: c.text.secondary, fontSize: 12 }}>
                      {d.direction === "up" ? "\u2191" : "\u2193"} {d.name}
                    </Text>
                  ))}
                </View>
              )}
            </GlassCard>
          )}

          {/* Confidence */}
          {missingness && (
            <GlassCard style={{ marginTop: Spacing.md }}>
              <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Data confidence</Text>
              <Text style={{ color: c.text.secondary, marginTop: 4, fontSize: 13, lineHeight: 18 }}>
                {missingness.confidenceEffect}
              </Text>
              <Text style={{ color: c.text.secondary, marginTop: 4, fontSize: 13 }}>
                {missingness.nextStep}
              </Text>
            </GlassCard>
          )}

          <Text style={{ color: c.text.tertiary, marginTop: Spacing.lg, fontSize: 12, textAlign: "center", lineHeight: 16 }}>
            Observational and non-diagnostic · Correlation ≠ causation
          </Text>
        </ScrollView>

        {/* Floating + (Quick Capture) button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/checkin" as any);
          }}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: c.accent.primary, shadowColor: c.accent.primary },
            pressed && { transform: [{ scale: 0.92 }] },
          ]}
        >
          <IconSymbol name="plus" size={26} color="#fff" />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

/* --- Sub-components --- */

function RiskPill({ label, prob, c, isDark }: { label: string; prob: number | null; c: typeof Colors.light; isDark: boolean }) {
  const pct = prob == null ? "—" : `${Math.round(prob * 100)}%`;
  const isHigh = prob != null && prob > 0.6;
  return (
    <View style={[styles.riskPill, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor: c.border.light }]}>
      <Text style={{ color: c.text.secondary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: isHigh ? c.danger : c.text.primary, fontSize: 18, fontWeight: "800" }}>{pct}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "600",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  heroSection: {
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  feelsLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  heroScore: {
    fontSize: 72,
    fontWeight: "900",
    letterSpacing: -3,
    lineHeight: 80,
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  chipDelta: {
    fontSize: 14,
    fontWeight: "800",
  },
  captureBtn: {
    marginTop: Spacing.lg,
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: BorderRadius.full,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  captureBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  reflectLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 4,
    marginTop: Spacing.sm,
    paddingVertical: 6,
  },
  reflectText: {
    fontSize: 14,
    fontWeight: "600",
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: Spacing.lg,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  actionCheckRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  streakBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  riskRow: {
    flexDirection: "row",
    gap: 10,
  },
  riskPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: 4,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
