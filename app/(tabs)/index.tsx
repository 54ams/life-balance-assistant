import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { DriverOverlay } from "@/components/ui/DriverOverlay";
import { GlassCard } from "@/components/ui/GlassCard";
import { TransparencyDrawer } from "@/components/ui/TransparencyDrawer";
import { WeeklyStrip } from "@/components/ui/WeeklyStrip";
import { IconSymbol } from "@/components/ui/icon-symbol";

import { computeBaselineMeta } from "@/lib/baseline";
import { computeConsistency } from "@/lib/consistency";
import { getDay, getUserName, listDailyRecords, listEmotions, loadPlan } from "@/lib/storage";
import { todayISO } from "@/lib/util/todayISO";
import type { LbiOutput } from "@/lib/lbi";
import type { ISODate } from "@/lib/types";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { refreshDerivedForDate } from "@/lib/pipeline";
import { predictTomorrowRisk } from "@/lib/ml";
import { buildMissingnessSummary } from "@/lib/transparency";

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
  const [driversVisible, setDriversVisible] = useState(false);
  const [transparencyVisible, setTransparencyVisible] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [identityLine, setIdentityLine] = useState<string>("");
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [userName, setUserName] = useState("");
  const [valueAlignmentPct, setValueAlignmentPct] = useState<number | null>(null);
  const [consistencyPct, setConsistencyPct] = useState<number | null>(null);

  const headerGreeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  const loadHome = useCallback(() => {
    let alive = true;
    (async () => {
      try {
        const day = await getDay(date);
        setMissingness(buildMissingnessSummary(day));
        setCheckedInToday(!!day?.checkIn);
        if (!day?.wearable) {
          setStatus("Sync WHOOP or complete a check-in to get started.");
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
          await computeBaselineMeta(7);
          const plan = await loadPlan(date);
          setTodayPlan(plan ? { focus: plan.focus, actions: plan.actions, actionReasons: plan.actionReasons ?? [] } : null);
        }
      } catch (e: any) {
        setStatus(e?.message ?? "Unable to refresh");
      }

      const records = await listDailyRecords(14);
      setDataDates(records.filter((r) => !!r.wearable || !!r.lbi).map((r) => r.date));

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
        // Value alignment = % of days in last 7 that had an emotion logged with a value
        const uniqueDays = new Set(emos.map((e) => e.date));
        setValueAlignmentPct(Math.round((uniqueDays.size / 7) * 100));
      } else {
        setIdentityLine("");
        setValueAlignmentPct(null);
      }

      setRisk(await predictTomorrowRisk());
    })();
    return () => { alive = false; };
  }, [date]);

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

  // Delta chips from subscores
  const deltaChips = useMemo(() => {
    if (!lbi) return [];
    const chips: { label: string; delta: number; color: string }[] = [];
    const sub = lbi.subscores;
    if (typeof sub.sleep === "number") chips.push({ label: "Sleep", delta: Math.round(sub.sleep - 50), color: sub.sleep >= 50 ? c.success : c.danger });
    if (typeof sub.stress === "number") chips.push({ label: "Stress", delta: Math.round(sub.stress - 50), color: sub.stress >= 50 ? c.success : c.danger });
    if (typeof sub.recovery === "number") chips.push({ label: "Recovery", delta: Math.round(sub.recovery - 50), color: sub.recovery >= 50 ? c.success : c.danger });
    return chips;
  }, [lbi, c]);

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header row — greeting + profile avatar */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: isDark ? c.text.secondary : c.text.secondary }]}>
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

          {/* Week strip — Mon–Sun */}
          <View style={{ marginTop: Spacing.sm }}>
            <WeeklyStrip dataDates={dataDates} />
          </View>

          {/* Hero section — "Today feels..." + Large LBI score */}
          <View style={styles.heroSection}>
            {identityLine ? (
              <Text style={[styles.feelsLabel, { color: c.text.secondary }]}>{identityLine}</Text>
            ) : (
              <Text style={[styles.feelsLabel, { color: c.text.secondary }]}>Today's balance</Text>
            )}

            {/* Large score */}
            <Pressable onPress={() => setDriversVisible(true)} onLongPress={() => setTransparencyVisible(true)}>
              <Text style={[styles.heroScore, { color: c.text.primary }]}>
                {lbi ? Math.round(lbi.lbi) : "—"}
              </Text>
            </Pressable>

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

          {/* Capture Today + Reflect on Yesterday CTAs */}
          <Pressable
            onPress={() => router.push("/checkin" as any)}
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

          {/* Value Alignment & Emotional Consistency stats */}
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
                  <Text style={[styles.statLabel, { color: c.text.secondary }]}>Emotional Consistency</Text>
                  <Text style={[styles.statValue, { color: c.text.primary }]}>{consistencyPct}%</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Today's recommendation */}
          {todayPlan && (
            <GlassCard style={{ marginTop: Spacing.md }}>
              <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Today's recommendation</Text>
              <Text style={{ color: c.text.secondary, marginTop: 4, fontSize: 14 }}>{todayPlan.focus}</Text>
              <View style={{ marginTop: Spacing.sm, gap: 8 }}>
                {todayPlan.actions.map((action, i) => (
                  <View key={i} style={styles.actionItem}>
                    <View style={[styles.actionBullet, { backgroundColor: c.accent.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text.primary, fontSize: 14, fontWeight: "600" }}>{action}</Text>
                      {todayPlan.actionReasons[i] ? (
                        <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 2 }}>
                          {todayPlan.actionReasons[i]}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
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
          onPress={() => router.push("/checkin" as any)}
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
  actionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  actionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
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
