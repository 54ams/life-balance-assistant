import React, { useCallback, useState } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { listPlans, listDailyRecords } from "@/lib/storage";
import { computeAdherenceCorrelation } from "@/lib/analytics";

type DayStatus = "completed" | "missed" | "nodata";

function computeStreak(statuses: DayStatus[]): number {
  let streak = 0;
  for (let i = statuses.length - 1; i >= 0; i--) {
    if (statuses[i] === "completed") streak++;
    else break;
  }
  return streak;
}

export default function AdherenceInsightsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [loading, setLoading] = useState(true);
  const [last7, setLast7] = useState<DayStatus[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalPlanDays, setTotalPlanDays] = useState(0);
  const [balanceDiff, setBalanceDiff] = useState<number | null>(null);
  const [hasEnoughData, setHasEnoughData] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const [plans, records] = await Promise.all([listPlans(60), listDailyRecords(60)]);
        if (!alive) return;

        // Build last 7 days status
        const today = new Date();
        const dayStatuses: DayStatus[] = [];
        const planByDate = new Map(plans.map((p) => [p.date, p]));

        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const iso = d.toISOString().slice(0, 10);
          const plan = planByDate.get(iso);
          if (!plan || plan.actions.length === 0) {
            dayStatuses.push("nodata");
          } else {
            const done = (plan.completedActions ?? []).filter(Boolean).length;
            dayStatuses.push(done > 0 ? "completed" : "missed");
          }
        }

        setLast7(dayStatuses);

        // Count completed vs total plan days
        const plansWithActions = plans.filter((p) => p.actions.length > 0);
        const completed = plansWithActions.filter((p) => {
          const done = (p.completedActions ?? []).filter(Boolean).length;
          return done > 0;
        }).length;
        setCompletedCount(completed);
        setTotalPlanDays(plansWithActions.length);

        // Compute impact (balance difference)
        const corr = computeAdherenceCorrelation(plans, records);
        if (corr && corr.r != null) {
          setHasEnoughData(true);
          // Compute average next-day balance for adherent vs non-adherent days
          const lbiByDate = new Map(
            records.filter((r) => typeof r.lbi === "number").map((r) => [r.date, r.lbi])
          );

          let adherentSum = 0, adherentN = 0;
          let nonAdherentSum = 0, nonAdherentN = 0;

          for (const plan of plansWithActions) {
            const done = (plan.completedActions ?? []).filter(Boolean).length;
            const ratio = done / plan.actions.length;
            const nextDate = new Date(plan.date + "T00:00:00");
            nextDate.setDate(nextDate.getDate() + 1);
            const nextISO = nextDate.toISOString().slice(0, 10) as string;
            const nextLbi = lbiByDate.get(nextISO as any);
            if (nextLbi == null) continue;

            if (ratio >= 0.5) {
              adherentSum += nextLbi;
              adherentN++;
            } else {
              nonAdherentSum += nextLbi;
              nonAdherentN++;
            }
          }

          if (adherentN > 0 && nonAdherentN > 0) {
            const diff = Math.round(adherentSum / adherentN - nonAdherentSum / nonAdherentN);
            setBalanceDiff(diff);
          }
        } else {
          setHasEnoughData(false);
        }

        setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const streak = computeStreak(last7);
  // Align day labels to actual weekdays
  const today = new Date();
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - 6);
  const actualDayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    return ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
  });

  return (
    <Screen scroll>
      <ScreenHeader
        title="Sticking to your plan"
        subtitle="Small steps add up. Here's how you've been doing."
        fallback="/insights"
      />

      {loading ? (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <Text style={{ color: c.text.secondary }}>Working it out...</Text>
        </GlassCard>
      ) : (
        <View style={{ gap: Spacing.md, marginTop: Spacing.md }}>
          {/* Streak / consistency card */}
          <GlassCard>
            <Text
              style={{
                fontWeight: Typography.fontWeight.bold,
                color: c.text.primary,
                fontSize: 15,
              }}
            >
              Your consistency
            </Text>
            <Text
              style={{
                marginTop: Spacing.sm,
                color: c.text.secondary,
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {totalPlanDays > 0
                ? `You've completed your plan ${completedCount} of the last ${totalPlanDays} days`
                : "No plans created yet \u2014 start one today!"}
            </Text>

            {/* Visual day row */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: Spacing.base,
                paddingHorizontal: Spacing.sm,
              }}
            >
              {last7.map((status, i) => (
                <View key={i} style={{ alignItems: "center", gap: 4 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor:
                        status === "completed"
                          ? c.success
                          : status === "missed"
                          ? "transparent"
                          : c.glass.secondary,
                      borderWidth: status === "missed" ? 2 : 0,
                      borderColor: status === "missed" ? c.warning : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  />
                  <Text style={{ color: c.text.tertiary, fontSize: 10 }}>
                    {actualDayLabels[i]}
                  </Text>
                </View>
              ))}
            </View>

            {streak > 0 && (
              <Text
                style={{
                  marginTop: Spacing.sm,
                  color: c.success,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                Keep it going! {streak} {streak === 1 ? "day" : "days"} in a row
              </Text>
            )}
          </GlassCard>

          {/* Impact card */}
          <GlassCard>
            <Text
              style={{
                fontWeight: Typography.fontWeight.bold,
                color: c.text.primary,
                fontSize: 15,
              }}
            >
              Does it make a difference?
            </Text>
            {!hasEnoughData ? (
              <Text
                style={{
                  marginTop: Spacing.sm,
                  color: c.text.secondary,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                Not enough data yet to see a pattern. Keep logging for a few more days and this will
                update automatically.
              </Text>
            ) : balanceDiff != null ? (
              <View style={{ marginTop: Spacing.sm }}>
                <Text
                  style={{
                    color: c.text.secondary,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                >
                  When you follow your plan, your balance tends to be{" "}
                  <Text style={{ fontWeight: "700", color: c.text.primary }}>
                    {balanceDiff > 0 ? `${balanceDiff} points higher` : balanceDiff < 0 ? `${Math.abs(balanceDiff)} points lower` : "about the same"}
                  </Text>{" "}
                  the next day.
                </Text>
                {/* Simple before/after visual */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: Spacing.base,
                    marginTop: Spacing.base,
                    alignItems: "flex-end",
                  }}
                >
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <View
                      style={{
                        width: "100%",
                        height: 40,
                        backgroundColor: c.glass.secondary,
                        borderRadius: 8,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: c.text.tertiary, fontWeight: "700", fontSize: 13 }}>
                        Without plan
                      </Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <View
                      style={{
                        width: "100%",
                        height: 40 + Math.min(Math.abs(balanceDiff), 20),
                        backgroundColor: balanceDiff > 0 ? c.success : c.warning,
                        borderRadius: 8,
                        justifyContent: "center",
                        alignItems: "center",
                        opacity: 0.8,
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                        With plan {balanceDiff > 0 ? `+${balanceDiff}` : balanceDiff}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <Text
                style={{
                  marginTop: Spacing.sm,
                  color: c.text.secondary,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                We can see a link between your plans and balance, but need a few more data points
                to show the difference clearly.
              </Text>
            )}
          </GlassCard>

          {/* Quick actions card */}
          <GlassCard>
            <Text
              style={{
                fontWeight: Typography.fontWeight.bold,
                color: c.text.primary,
                fontSize: 15,
                marginBottom: Spacing.sm,
              }}
            >
              Quick actions
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)" as any)}
              style={({ pressed }) => [
                {
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: c.glass.border,
                },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>
                Review today's plan {"\u2192"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/checkin" as any)}
              style={({ pressed }) => [
                {
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: c.glass.border,
                },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>
                Check in now {"\u2192"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/history" as any)}
              style={({ pressed }) => [
                { paddingVertical: 10 },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>
                See your plan history {"\u2192"}
              </Text>
            </Pressable>
          </GlassCard>
        </View>
      )}
    </Screen>
  );
}
