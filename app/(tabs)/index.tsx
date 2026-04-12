import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { LBIOrb } from "@/components/ui/LBIOrb";
import { DriverOverlay } from "@/components/ui/DriverOverlay";
import { GlassCard } from "@/components/ui/GlassCard";
import { TransparencyDrawer } from "@/components/ui/TransparencyDrawer";
import { GlassButton } from "@/components/ui/GlassButton";
import { IconSymbol } from "@/components/ui/icon-symbol";

import { computeBaselineMeta, type BaselineMeta } from "@/lib/baseline";
import { getDay, listDailyRecords, listEmotions, loadPlan } from "@/lib/storage";
import { todayISO } from "@/lib/util/todayISO";
import type { LbiOutput } from "@/lib/lbi";
import type { ISODate } from "@/lib/types";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { refreshDerivedForDate } from "@/lib/pipeline";
import { predictTomorrowRisk } from "@/lib/ml";
import { buildMissingnessSummary } from "@/lib/transparency";

function greetingForHour(h: number) {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const c = colorScheme === "dark" ? Colors.dark : Colors.light;

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
  const [driversVisible, setDriversVisible] = useState(false);
  const [transparencyVisible, setTransparencyVisible] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [identityLine, setIdentityLine] = useState<string>("");
  const [lastWhoopSync, setLastWhoopSync] = useState<string | null>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);

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
          setBaselineMeta(await computeBaselineMeta(7));
          const plan = await loadPlan(date);
          setTodayPlan(plan ? { focus: plan.focus, actions: plan.actions, actionReasons: plan.actionReasons ?? [] } : null);
        }
      } catch (e: any) {
        setStatus(e?.message ?? "Unable to refresh");
      }

      const records = await listDailyRecords(14);
      setDataDates(records.filter((r) => !!r.wearable || !!r.lbi).map((r) => r.date));
      const emos = await listEmotions(7);
      const lastSync = await AsyncStorage.getItem("whoop_last_sync");
      setLastWhoopSync(lastSync);
      if (emos.length) {
        const freq: Record<string, number> = {};
        emos.forEach((e) => (freq[e.valueChosen] = (freq[e.valueChosen] ?? 0) + 1));
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
        if (top) setIdentityLine(`Showing up for ${top[0]} (${top[1]}x this week)`);
      } else {
        setIdentityLine("");
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

  const recentDays = useMemo(() => {
    const arr: { date: string; hasData: boolean }[] = [];
    const now = new Date(date);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const iso = d.toISOString().slice(0, 10) as ISODate;
      arr.push({ date: iso, hasData: dataDates.includes(iso) });
    }
    return arr;
  }, [date, dataDates]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Ambient background orbs */}
      <View style={styles.ambient}>
        <View style={[styles.orbBg, styles.orbBgTop, { backgroundColor: c.accent.primaryLight }]} />
        <View style={[styles.orbBg, styles.orbBgBottom, { backgroundColor: c.accent.primaryDark }]} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: c.text.secondary }]}>{headerGreeting}</Text>
            <Text style={[styles.title, { color: c.text.primary }]}>Life Balance</Text>
          </View>
          <Pressable
            onPress={() => router.push("/profile" as any)}
            style={[styles.avatar, { backgroundColor: c.glass.primary, borderColor: c.border.medium }]}
          >
            <IconSymbol name="person.fill" size={18} color={c.text.secondary} />
          </Pressable>
        </View>

        {/* Week strip */}
        <View style={styles.weekRow}>
          {recentDays.map((d) => {
            const isToday = d.date === date;
            return (
              <Pressable
                key={d.date}
                onPress={() => router.push(`/day/${d.date}` as any)}
                style={[
                  styles.weekDay,
                  {
                    backgroundColor: isToday ? c.accent.primary : d.hasData ? c.glass.secondary : "transparent",
                    borderColor: isToday ? c.accent.primary : c.border.light,
                  },
                ]}
              >
                <Text style={{ color: isToday ? "#fff" : c.text.secondary, fontSize: 11, fontWeight: "600" }}>
                  {formatDay(d.date).split(" ")[0]}
                </Text>
                <Text style={{ color: isToday ? "#fff" : c.text.primary, fontSize: 15, fontWeight: "800" }}>
                  {d.date.slice(8, 10)}
                </Text>
                {d.hasData && !isToday && <View style={[styles.weekDot, { backgroundColor: c.accent.primary }]} />}
              </Pressable>
            );
          })}
        </View>

        {/* LBI Orb section */}
        <View style={{ alignItems: "center", marginTop: Spacing.lg }}>
          <LBIOrb
            lbi={lbi?.lbi ?? 0}
            interpretation={lbi?.classification ?? "No data yet"}
            confidence={lbi?.confidence ?? "low"}
            onPress={() => setDriversVisible(true)}
            onLongPress={() => setTransparencyVisible(true)}
          />
          {identityLine ? (
            <View style={[styles.identityPill, { backgroundColor: c.glass.primary, borderColor: c.border.light }]}>
              <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 13 }}>{identityLine}</Text>
            </View>
          ) : null}
        </View>

        <DriverOverlay visible={driversVisible} onClose={() => setDriversVisible(false)} drivers={drivers} />
        <TransparencyDrawer visible={transparencyVisible} onClose={() => setTransparencyVisible(false)} />

        {/* Status nudge */}
        {status ? (
          <GlassCard style={{ marginTop: Spacing.base }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={[styles.statusDot, { backgroundColor: c.accent.primary }]} />
              <Text style={{ color: c.text.primary, flex: 1, fontSize: 14, lineHeight: 20 }}>{status}</Text>
            </View>
          </GlassCard>
        ) : null}

        {/* Quick actions */}
        <View style={[styles.actionsRow, { marginTop: Spacing.base }]}>
          <ActionCard
            title="Check-in"
            icon="pencil.circle.fill"
            done={checkedInToday}
            c={c}
            onPress={() => router.push("/checkin" as any)}
          />
          <ActionCard
            title="Insights"
            icon="sparkles"
            c={c}
            onPress={() => router.push("/insights" as any)}
          />
          <ActionCard
            title="Calendar"
            icon="calendar"
            c={c}
            onPress={() => router.push("/calendar" as any)}
          />
        </View>

        {/* Signal overview */}
        {(baselineMeta || lastWhoopSync) && (
          <GlassCard style={{ marginTop: Spacing.md }}>
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Signal status</Text>
            <View style={{ gap: 6, marginTop: 8 }}>
              <SignalRow
                label="Baseline"
                value={baselineMeta?.status !== "stable"
                  ? `Calibrating (${baselineMeta?.daysUsed ?? 0}/${baselineMeta?.targetDays ?? 7})`
                  : `Stable (${baselineMeta?.daysUsed ?? 0} days)`}
                c={c}
              />
              <SignalRow label="Source" value={`WHOOP${lastWhoopSync ? ` · ${lastWhoopSync}` : ""}`} c={c} />
              {missingness?.missing.length ? (
                <SignalRow label="Missing" value={missingness.missing.join(", ")} c={c} />
              ) : null}
            </View>
          </GlassCard>
        )}

        {/* Today's plan */}
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
              Based on {risk.rowsUsed} personal data points · Exploratory
            </Text>
            <View style={[styles.riskRow, { marginTop: Spacing.sm }]}>
              <RiskPill label="LBI drop" prob={risk.lbiRiskProb} c={c} />
              <RiskPill label="Recovery drop" prob={risk.recoveryRiskProb} c={c} />
            </View>
            {risk.topDrivers.length > 0 && (
              <View style={{ marginTop: 8, gap: 4 }}>
                {risk.topDrivers.map((d) => (
                  <Text key={d.name} style={{ color: c.text.secondary, fontSize: 12 }}>
                    {d.direction === "up" ? "↑" : "↓"} {d.name}
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
    </SafeAreaView>
  );
}

/* --- Sub-components --- */

function ActionCard({ title, icon, done, c, onPress }: {
  title: string; icon: any; done?: boolean; c: typeof Colors.light; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <GlassCard style={styles.actionCard} padding="sm">
        <View style={[styles.actionIcon, { backgroundColor: done ? c.accent.primary : c.glass.secondary }]}>
          <IconSymbol name={icon} size={18} color={done ? "#fff" : c.text.primary} />
        </View>
        <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 13, marginTop: 6 }}>{title}</Text>
        {done && <Text style={{ color: c.accent.primary, fontSize: 11, fontWeight: "600" }}>Done</Text>}
      </GlassCard>
    </Pressable>
  );
}

function SignalRow({ label, value, c }: { label: string; value: string; c: typeof Colors.light }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: c.text.secondary, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: c.text.primary, fontSize: 13, fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

function RiskPill({ label, prob, c }: { label: string; prob: number | null; c: typeof Colors.light }) {
  const pct = prob == null ? "—" : `${Math.round(prob * 100)}%`;
  const isHigh = prob != null && prob > 0.6;
  return (
    <View style={[styles.riskPill, { backgroundColor: c.glass.secondary, borderColor: c.border.light }]}>
      <Text style={{ color: c.text.secondary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: isHigh ? c.danger : c.text.primary, fontSize: 18, fontWeight: "800" }}>{pct}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ambient: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  orbBg: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.12,
  },
  orbBgTop: { top: -60, right: -50 },
  orbBgBottom: { bottom: -80, left: -40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  weekRow: {
    flexDirection: "row",
    gap: 6,
  },
  weekDay: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 2,
  },
  weekDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  identityPill: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionCard: {
    alignItems: "center",
    width: (Dimensions.get("window").width - 32 - 20) / 3,
    paddingVertical: 14,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
});
