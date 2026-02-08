import { Screen } from "@/components/Screen";
import { TabSwipe } from "@/components/TabSwipe";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { computeBaseline, computeBaselineMeta } from "@/lib/baseline";
import { formatDisplayDate } from "@/lib/date";
import { calculateLBI, type LbiOutput } from "@/lib/lbi";
import { predictTomorrowRisk, trainIfReady } from "@/lib/ml";
import { generatePlan } from "@/lib/plan";
import { getAllDays, getDay, savePlan, upsertLBI, upsertWearable } from "@/lib/storage";
import type { ISODate } from "@/lib/types";
import { getTodayWearable } from "@/lib/wearables";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

const TAB_ORDER = ["/", "/checkin", "/insights", "/history", "/profile"] as const;

function todayISO(): ISODate {
  return new Date().toISOString().slice(0, 10) as ISODate;
}

function greetingForHour(h: number) {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function confidenceToPct(conf: LbiOutput["confidence"]) {
  if (conf === "high") return 92;
  if (conf === "medium") return 70;
  return 45;
}

export default function HomeScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [date] = useState<ISODate>(todayISO());
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");

  const [result, setResult] = useState<LbiOutput | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [baselineMeta, setBaselineMeta] = useState<{ status: "calibrating" | "stable"; daysUsed: number; targetDays: number; baseline: number | null } | null>(null);
  const [spark, setSpark] = useState<number[]>([]);
  const [risk, setRisk] = useState<Awaited<ReturnType<typeof predictTomorrowRisk>> | null>(null);

  const params = useLocalSearchParams<{ refresh?: string }>();

  const headerGreeting = useMemo(() => {
    const h = new Date().getHours();
    return greetingForHour(h);
  }, []);

  async function refresh() {
    setLoading(true);
    setStatus("");
    try {
      // Ensure wearable exists for today (either imported CSV or live stub)
      const day = await getDay(date);
      if (!day?.wearable) {
        const w = await getTodayWearable();
        await upsertWearable(date, w);
      }

      const updated = await getDay(date);
      if (!updated?.wearable) throw new Error("Wearable not available");

      const computed = calculateLBI({
        recovery: updated.wearable.recovery,
        sleepHours: updated.wearable.sleepHours,
        strain: updated.wearable.strain,
        checkIn: updated.checkIn,
      });

      setResult(computed);

      await upsertLBI(date, {
        lbi: computed.lbi,
        classification: computed.classification,
        confidence: computed.confidence,
        reason: computed.reason,
      });

      const b = await computeBaseline(7);
      setBaseline(b);
      const meta = await computeBaselineMeta(7);
      setBaselineMeta(meta);

      // Generate and persist a daily plan so History/Trends/Export have real data.
      const plan = generatePlan({
        lbi: computed.lbi,
        baseline: b,
        wearable: updated.wearable,
        checkIn: updated.checkIn,
        classification: computed.classification,
        confidence: computed.confidence,
      });

      await savePlan({
        date,
        lbi: computed.lbi,
        baseline: b ?? computed.lbi,
        category: plan.category,
        focus: plan.focus,
        actions: plan.actions,
        triggers: plan.triggers,
        explanation: plan.explanation,
        confidence: computed.confidence,
      });


// ML: train (if ready) and compute tomorrow risk (baseline-aware, on-device)
await trainIfReady();
const r = await predictTomorrowRisk();
setRisk(r);

      // Sparkline: last 7 days of LBI values (fallback to today's computed)
      const all = await getAllDays();
      const last = all
        .filter((d) => !!d.lbi)
        .slice(-7)
        .map((d) => d.lbi as number);
      const fallback = computed ? [computed.lbi] : [];
      setSpark(last.length ? last : fallback);
    } catch (e: any) {
      setStatus(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (params?.refresh) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.refresh]);

  const lbi = result?.lbi ?? 0;
  const delta = baseline == null ? null : Math.round(lbi - baseline);
  const accuracy = result ? confidenceToPct(result.confidence) : 0;

  const primaryMetric = result?.subscores.recovery ?? 0;
  const secondaryMetric = result?.subscores.mood ?? 0;
  const tertiaryMetric = result?.subscores.sleep ?? 0;

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll contentStyle={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerKicker, { color: c.muted }]}>{headerGreeting}</Text>
          <Text style={[styles.headerTitle, { color: c.text }]}>Amira</Text>
        </View>

        <Pressable
          onPress={() => router.push("/profile" as any)}
          style={({ pressed }) => [
            styles.iconButton,
            {
              backgroundColor: c.card,
              borderColor: c.border,
            },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          accessibilityLabel="Open profile"
        >
          <IconSymbol name="person.fill" size={18} color={c.text} />
        </Pressable>
      </View>

      {/* Hero LBI card */}
      <GlassCard padding={18} style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1, paddingRight: 14 }}>
            <Text style={[styles.heroTitle, { color: c.text }]}>Life Balance Index</Text>
            <Text style={[styles.heroSub, { color: c.muted }]}>Today • {formatDisplayDate(date)}</Text>

            <View style={styles.pillRow}>
              <View style={[styles.pill, { backgroundColor: c.background, borderColor: c.border }]}>
                <Text style={[styles.pillText, { color: c.text }]}>
                  {result?.classification ? result.classification.replace("-", " ") : "—"}
                </Text>
              </View>

              <View style={[styles.pill, { backgroundColor: c.background, borderColor: c.border }]}>
                <Text style={[styles.pillText, { color: c.text }]}>Accuracy {accuracy}%</Text>
              </View>
            </View>

            <Text style={[styles.reason, { color: c.muted }]} numberOfLines={2}>
              {loading ? "Updating…" : result?.reason ?? "Complete a check-in to improve accuracy."}
            </Text>
          </View>

          <ScoreCircle value={lbi} delta={delta} scheme={scheme ?? "light"} />
        </View>

        <View style={styles.metricsRow}>
          <MetricMini label="Recovery" value={primaryMetric} />
          <MetricMini label="Connection" value={secondaryMetric} />
          <MetricMini label="Purpose" value={tertiaryMetric} />
        </View>
      </GlassCard>

{/* Tomorrow risk (baseline-aware ML) */}
<GlassCard padding={14} style={styles.riskCard}>
  <Text style={[styles.riskTitle, { color: c.text }]}>Tomorrow outlook</Text>
  {!risk?.trained ? (
    <Text style={[styles.riskSub, { color: c.muted }]}>
      Personal model warming up • add more days of wearable + check-ins.
    </Text>
  ) : (
    <>
      <Text style={[styles.riskSub, { color: c.muted }]}>
        Balance risk: {Math.round((risk.lbiRiskProb ?? 0) * 100)}% • Recovery risk: {Math.round((risk.recoveryRiskProb ?? 0) * 100)}%
      </Text>
      {risk.topDrivers?.length ? (
        <Text style={[styles.riskDrivers, { color: c.muted }]}>
          Top drivers:{" "}
          {risk.topDrivers
            .map((d) => `${d.name.replace(/_z$/, "").replaceAll("_", " ")} ${d.direction === "up" ? "↑" : "↓"}`)
            .join(" • ")}
        </Text>
      ) : null}
    </>
  )}
</GlassCard>


      {/* Integration snapshot */}
      <GlassCard padding={14} style={styles.riskCard}>
        <Text style={[styles.riskTitle, { color: c.text }]}>Signal integration</Text>
        <Text style={[styles.riskSub, { color: c.muted }]}>
          {baselineMeta?.status !== "stable"
            ? `Baseline calibrating (${baselineMeta?.daysUsed ?? 0}/${baselineMeta?.targetDays ?? 7} days)`
            : `Baseline stable (${baselineMeta.daysUsed}/${baselineMeta.targetDays} days)`}
          {" • "}
          Confidence: {result?.confidence ?? "—"}
        </Text>
        <View style={{ marginTop: 10 }}>
          <Button title="Open integration" variant="secondary" onPress={() => router.push("/insights/integration" as any)} />
        </View>
      </GlassCard>



      {/* Primary action */}
      <Button
        title="Log today’s check-in"
        onPress={() => router.push("/checkin" as any)}
      />

      {/* Trends / sparkline */}
      <GlassCard padding={16}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: c.text }]}>This week</Text>
          <Text style={[styles.cardMeta, { color: c.muted }]}>Last 7 entries</Text>
        </View>
        <Sparkline values={spark} />
      </GlassCard>

      {/* Secondary cards row */}
      <View style={styles.twoColRow}>
        <GlassCard padding={16} style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Wearables</Text>
          <Text style={[styles.cardMeta, { color: c.muted }]}>Import CSV for accuracy</Text>
          <View style={{ height: 10 }} />
          <Pressable
            onPress={() => router.push("/insights" as any)}
            style={({ pressed }) => [
              styles.linkRow,
              { borderColor: c.border },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.linkText, { color: c.text }]}>Open Insights</Text>
            <IconSymbol name="chevron.right" size={16} color={c.muted} />
          </Pressable>
        </GlassCard>

        <GlassCard padding={16} style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Breathing</Text>
          <Text style={[styles.cardMeta, { color: c.muted }]}>Calm your nervous system</Text>
          <View style={{ height: 10 }} />
          <Pressable
            onPress={() => router.push("/insights" as any)}
            style={({ pressed }) => [
              styles.linkRow,
              { borderColor: c.border },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.linkText, { color: c.text }]}>Coming next</Text>
            <IconSymbol name="chevron.right" size={16} color={c.muted} />
          </Pressable>
        </GlassCard>
      </View>

      {!!status && <Text style={{ color: c.danger }}>{status}</Text>}

      {/* Small footer spacing so the last card never kisses the tab bar */}
      <View style={{ height: Platform.OS === "android" ? 16 : 8 }} />
    </Screen>
    </TabSwipe>
  );
}

function ScoreCircle({
  value,
  delta,
  scheme,
}: {
  value: number;
  delta: number | null;
  scheme: "light" | "dark";
}) {
  const c = Colors[scheme];
  const safeValue = clamp(value, 0, 100);

  return (
    <View
      style={[
        styles.scoreOuter,
        {
          borderColor: c.border,
          backgroundColor: c.background,
        },
      ]}
    >
      <View style={[styles.scoreInner, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.scoreValue, { color: c.text }]}>{safeValue}</Text>
        <Text style={[styles.scoreLabel, { color: c.muted }]}>LBI</Text>

        {delta != null && (
          <View style={[styles.deltaPill, { backgroundColor: c.background, borderColor: c.border }]}>
            <Text style={[styles.deltaText, { color: c.text }]}>{delta > 0 ? `+${delta}` : `${delta}`}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function MetricMini({ label, value }: { label: string; value: number }) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const v = clamp(Math.round(value), 0, 100);
  return (
    <View style={[styles.metricMini, { backgroundColor: c.background, borderColor: c.border }]}>
      <Text style={[styles.metricLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: c.text }]}>{v}</Text>
    </View>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1, max - min);

  // 7 slots width
  const normalized = values.length
    ? values.map((v) => (v - min) / span)
    : [0];

  return (
    <View style={styles.sparkWrap}>
      <View style={[styles.sparkGrid, { borderColor: c.border }]} />
      <View style={styles.sparkRow}>
        {normalized.map((n, idx) => {
          const h = 8 + n * 40;
          return (
            <View key={idx} style={styles.sparkCol}>
              <View
                style={{
                  width: 8,
                  height: h,
                  borderRadius: 8,
                  backgroundColor: c.primary,
                  opacity: 0.9,
                }}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerKicker: {
    fontSize: 13,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    borderRadius: 26,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  heroSub: {
    fontSize: 12,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  reason: {
    fontSize: 13,
    marginTop: 10,
    lineHeight: 18,
  },
  scoreOuter: {
    width: 118,
    height: 118,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreInner: {
    width: 104,
    height: 104,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: -2,
  },
  deltaPill: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  metricMini: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: "600",
  },
  sparkWrap: {
    marginTop: 12,
    height: 70,
    justifyContent: "flex-end",
  },
  sparkGrid: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    borderRadius: 12,
    borderWidth: 1,
    opacity: 0.35,
  },
  sparkRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 4,
  },
  sparkCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 12,
  },
  linkRow: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "800",
  },
riskCard: {
  marginTop: 12,
},
riskTitle: {
  fontSize: 14,
  fontWeight: "700",
  marginBottom: 4,
},
riskSub: {
  fontSize: 12,
  lineHeight: 16,
},
riskDrivers: {
  marginTop: 6,
  fontSize: 12,
  lineHeight: 16,
},

});