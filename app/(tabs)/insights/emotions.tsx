import { Stack, router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, Text, View, useColorScheme } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { MiniLineChart } from "@/components/ui/MiniLineChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { listEmotions } from "@/lib/storage";
import type { EmotionalDiaryEntry } from "@/lib/types";
import { formatDateFriendly } from "@/lib/util/formatDate";

function valenceLabel(v: number): string {
  if (v > 0.3) return "Positive";
  if (v < -0.3) return "Negative";
  return "Neutral";
}

function arousalLabel(a: number): string {
  if (a > 0.3) return "Activated";
  if (a < -0.3) return "Calm";
  return "Moderate";
}

function regulationColor(r: string, c: typeof Colors.light): string {
  if (r === "handled") return c.success;
  if (r === "manageable") return c.warning;
  return c.danger;
}

export default function EmotionHistoryScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [emotions, setEmotions] = useState<EmotionalDiaryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const emos = await listEmotions(30);
        setEmotions(emos);
      })();
    }, [])
  );

  // Chart data: valence over time (oldest first)
  const valenceChart = useMemo(() => {
    if (emotions.length < 2) return [];
    return [...emotions].reverse().map((e) => ({
      label: new Date(e.date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      value: (e.valence + 1) * 50, // map -1..1 to 0..100
    }));
  }, [emotions]);

  // Value frequency
  const valueFreq = useMemo(() => {
    const freq: Record<string, number> = {};
    emotions.forEach((e) => { freq[e.valueChosen] = (freq[e.valueChosen] ?? 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]);
  }, [emotions]);

  // Regulation distribution
  const regulationDist = useMemo(() => {
    const counts = { handled: 0, manageable: 0, overwhelmed: 0 };
    emotions.forEach((e) => { counts[e.regulation] = (counts[e.regulation] ?? 0) + 1; });
    const total = emotions.length || 1;
    return {
      handled: Math.round((counts.handled / total) * 100),
      manageable: Math.round((counts.manageable / total) * 100),
      overwhelmed: Math.round((counts.overwhelmed / total) * 100),
    };
  }, [emotions]);

  return (
    <Screen scroll>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />

      <Text style={{ fontSize: 28, fontWeight: "900", color: c.text.primary, letterSpacing: -0.3 }}>
        Emotional Journey
      </Text>
      <Text style={{ marginTop: 4, color: c.text.secondary, fontSize: 14 }}>
        Your emotional patterns over the last 30 days
      </Text>

      {emotions.length === 0 ? (
        <GlassCard style={{ marginTop: Spacing.lg }}>
          <EmptyState
            icon="heart.text.square"
            title="No emotional data yet"
            description="Complete check-ins with the emotional snapshot to see your journey here."
            actionLabel="Start Check-in"
            onAction={() => router.push("/checkin" as any)}
          />
        </GlassCard>
      ) : (
        <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
          {/* Valence trend chart */}
          {valenceChart.length >= 2 && (
            <GlassCard>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16, marginBottom: Spacing.sm }}>
                Emotional valence over time
              </Text>
              <Text style={{ color: c.text.secondary, fontSize: 12, marginBottom: Spacing.sm }}>
                Higher = more positive feelings
              </Text>
              <MiniLineChart data={valenceChart} height={100} showValues />
            </GlassCard>
          )}

          {/* Regulation distribution */}
          <GlassCard>
            <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16, marginBottom: Spacing.sm }}>
              How you've been coping
            </Text>
            <View style={{ gap: 10 }}>
              {([
                { key: "handled", label: "Handled well", pct: regulationDist.handled, color: c.success },
                { key: "manageable", label: "Manageable", pct: regulationDist.manageable, color: c.warning },
                { key: "overwhelmed", label: "Overwhelmed", pct: regulationDist.overwhelmed, color: c.danger },
              ] as const).map((item) => (
                <View key={item.key} style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: c.text.primary, fontSize: 13, fontWeight: "600" }}>{item.label}</Text>
                    <Text style={{ color: item.color, fontSize: 13, fontWeight: "800" }}>{item.pct}%</Text>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", overflow: "hidden" }}>
                    <View style={{ height: 8, borderRadius: 4, width: `${item.pct}%`, backgroundColor: item.color }} />
                  </View>
                </View>
              ))}
            </View>
          </GlassCard>

          {/* Top values */}
          {valueFreq.length > 0 && (
            <GlassCard>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16, marginBottom: Spacing.sm }}>
                Values you've shown
              </Text>
              <View style={{ gap: 8 }}>
                {valueFreq.slice(0, 6).map(([value, count], i) => {
                  const maxCount = valueFreq[0][1];
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <View key={value} style={{ gap: 4 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: c.text.primary, fontSize: 13, fontWeight: "600" }}>{value}</Text>
                        <Text style={{ color: c.text.secondary, fontSize: 12 }}>{count} days</Text>
                      </View>
                      <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", overflow: "hidden" }}>
                        <View style={{ height: 6, borderRadius: 3, width: `${pct}%`, backgroundColor: c.accent.primary, opacity: 0.5 + (pct / 200) }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </GlassCard>
          )}

          {/* Recent entries */}
          <GlassCard>
            <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16, marginBottom: Spacing.sm }}>
              Recent entries
            </Text>
            <View style={{ gap: 2 }}>
              {emotions.slice(0, 7).map((emo, i) => {
                const dateStr = formatDateFriendly(emo.date);
                return (
                  <Pressable
                    key={emo.date}
                    onPress={() => router.push(`/day/${emo.date}` as any)}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingVertical: 10,
                        borderTopWidth: i > 0 ? 1 : 0,
                        borderTopColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                      },
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    {/* Regulation dot */}
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: regulationColor(emo.regulation, c) }} />

                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text.primary, fontSize: 14, fontWeight: "600" }}>{dateStr}</Text>
                      <Text style={{ color: c.text.secondary, fontSize: 12 }}>
                        {valenceLabel(emo.valence)} · {arousalLabel(emo.arousal)} · {emo.valueChosen}
                      </Text>
                    </View>

                    {/* Mini valence indicator */}
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: emo.valence > 0.2
                          ? (isDark ? "rgba(87,214,164,0.12)" : "rgba(47,163,122,0.08)")
                          : emo.valence < -0.2
                            ? (isDark ? "rgba(255,122,134,0.12)" : "rgba(214,69,80,0.08)")
                            : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "800", color: emo.valence > 0.2 ? c.success : emo.valence < -0.2 ? c.danger : c.text.tertiary }}>
                        {emo.valence > 0.2 ? "+" : emo.valence < -0.2 ? "-" : "~"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <Pressable onPress={() => router.push("/profile/settings/values" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
            <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>Update your values →</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/checkin/grounding" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
            <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>Try a grounding exercise →</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
