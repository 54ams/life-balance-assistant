import { Stack, router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { useColorScheme } from "react-native";
import { computeBaseline } from "@/lib/baseline";
import { calculateLBI } from "@/lib/lbi";
import { buildDayExplain } from "@/lib/explain";
import { buildCounterfactuals } from "@/lib/counterfactual";
import { getInsightsSelectedDate, setInsightsSelectedDate } from "@/lib/insightsDate";
import { getDay, loadPlan, type StoredPlan } from "@/lib/storage";
import { formatDateLong } from "@/lib/util/formatDate";
import type { ISODate } from "@/lib/types";

function ScoreBar({ label, value, c }: { label: string; value: number; c: typeof Colors.light }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const isGood = pct >= 60;
  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "700", color: c.text.primary, fontSize: 14 }}>{label}</Text>
        <Text style={{ fontWeight: "800", color: c.text.primary, fontSize: 14 }}>{pct}/100</Text>
      </View>
      <View style={{ marginTop: 6, height: 8, borderRadius: 4, backgroundColor: c.glass.secondary, overflow: "hidden" }}>
        <View style={{ height: 8, width: `${pct}%`, borderRadius: 4, backgroundColor: isGood ? c.success : c.accent.primary }} />
      </View>
    </View>
  );
}

function driverEmoji(direction: "up" | "down", strength: string) {
  if (direction === "up") return strength === "strong" ? "Helping a lot" : strength === "moderate" ? "Helping" : "Slight boost";
  return strength === "strong" ? "Pulling down" : strength === "moderate" ? "Dragging" : "Slight dip";
}

export default function ExplainScoreScreen() {
  const [date, setDate] = useState<ISODate | undefined>(undefined);
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  useEffect(() => {
    (async () => setDate(await getInsightsSelectedDate()))();
  }, []);

  useEffect(() => {
    if (date) setInsightsSelectedDate(date);
  }, [date]);

  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const [subscores, setSubscores] = useState<{ recovery: number; sleep: number; mood: number; stress: number } | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [lbi, setLbi] = useState<number | null>(null);
  const [dayExplain, setDayExplain] = useState<ReturnType<typeof buildDayExplain> | null>(null);
  const [counterfactuals, setCounterfactuals] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!date) return;
        const day = await getDay(date);
        setCounterfactuals(buildCounterfactuals({ date, wearable: day?.wearable ?? null, checkIn: day?.checkIn ?? null }));
        const b = await computeBaseline(7);
        const p = await loadPlan(date);
        let computedLbi = p?.lbi;
        let computedSub = null as any;
        if (day?.wearable) {
          const out = calculateLBI({ recovery: day.wearable.recovery, sleepHours: day.wearable.sleepHours, strain: day.wearable.strain, checkIn: day.checkIn });
          computedLbi = out.lbi;
          computedSub = out.subscores;
        }
        if (!alive) return;
        setPlan(p);
        setBaseline(b);
        setLbi(computedLbi ?? null);
        setSubscores(computedSub);

        const value = (computedLbi ?? p?.lbi ?? 0) as number;
        setDayExplain(buildDayExplain({ date, lbi: value, baseline: b ?? null, record: day }));
      })();
      return () => { alive = false; };
    }, [date])
  );

  const delta = dayExplain?.delta;
  const score = dayExplain?.lbi ?? plan?.lbi;

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: "Why this score", headerShown: false }} />

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ padding: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.border.medium, backgroundColor: c.glass.primary }}
        >
          <IconSymbol name="chevron.left" size={18} color={c.text.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: "900", color: c.text.primary, letterSpacing: -0.3 }}>Your score explained</Text>
          <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>
            {date ? formatDateLong(date) : ""}
          </Text>
        </View>
      </View>

      {/* Hero score */}
      <GlassCard style={{ marginTop: Spacing.base, alignItems: "center" as any }}>
        <Text style={{ fontSize: 56, fontWeight: "900", color: c.text.primary, letterSpacing: -2 }}>
          {score ?? "—"}
        </Text>
        {delta != null && delta !== 0 ? (
          <Text style={{ color: delta > 0 ? c.success : c.danger, fontWeight: "700", fontSize: 15, marginTop: 4 }}>
            {delta > 0 ? "+" : ""}{delta} compared to your baseline
          </Text>
        ) : delta === 0 ? (
          <Text style={{ color: c.text.secondary, fontSize: 14, marginTop: 4 }}>Right on your baseline</Text>
        ) : (
          <Text style={{ color: c.text.secondary, fontSize: 14, marginTop: 4 }}>Baseline not yet available</Text>
        )}
      </GlassCard>

      {date && (
        <View style={{ marginTop: Spacing.sm }}>
          <InsightsDatePicker date={date} onChange={setDate} title="Change date" helperText="See the breakdown for any past day." />
        </View>
      )}

      {/* What made up your score */}
      <GlassCard style={{ marginTop: Spacing.md }}>
        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>What made up your score</Text>
        <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4 }}>
          Your score combines how your body recovered and how you said you're feeling.
        </Text>
        {subscores ? (
          <>
            <ScoreBar label="Recovery" value={subscores.recovery} c={c} />
            <ScoreBar label="Sleep" value={subscores.sleep} c={c} />
            <ScoreBar label="Mood" value={subscores.mood} c={c} />
            <ScoreBar label="Stress" value={subscores.stress} c={c} />
          </>
        ) : (
          <Text style={{ marginTop: Spacing.sm, color: c.text.secondary }}>
            Connect your wearable to see the full breakdown.
          </Text>
        )}
      </GlassCard>

      {/* What's influencing things */}
      {(dayExplain?.drivers ?? []).length > 0 && (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>What's influencing things</Text>
          <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4 }}>
            These are the biggest factors shaping your score today.
          </Text>
          <View style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
            {(dayExplain?.drivers ?? []).map((d, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: d.direction === "up" ? c.success : c.danger }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 14 }}>
                    {d.label} — {driverEmoji(d.direction, d.strength)}
                  </Text>
                  {d.detail && <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>{d.detail}</Text>}
                </View>
              </View>
            ))}
          </View>
        </GlassCard>
      )}

      {/* Data quality */}
      <GlassCard style={{ marginTop: Spacing.md }}>
        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>How confident is this?</Text>
        <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4 }}>
          The more data you provide, the more accurate your score becomes.
        </Text>
        <View style={{ marginTop: Spacing.sm, gap: 8 }}>
          {(dayExplain?.accuracyReasons ?? []).map((r, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.ok ? c.success : c.warning }} />
              <Text style={{ color: c.text.primary, fontSize: 14, flex: 1 }}>{r.detail}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      {/* Context tags */}
      {(dayExplain?.contextTags ?? []).length > 0 && (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>Context you tagged</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: Spacing.sm }}>
            {(dayExplain?.contextTags ?? []).map((t: string) => (
              <View key={t} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: c.border.medium }}>
                <Text style={{ color: c.text.primary, fontWeight: "600", fontSize: 13 }}>{t}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      )}

      {/* What could help */}
      {counterfactuals.length > 0 && (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>What could help</Text>
          <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4 }}>
            Small changes that might shift your score, based on today's inputs.
          </Text>
          <View style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
            {counterfactuals.map((item, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <Text style={{ color: item.delta > 0 ? c.success : c.text.secondary, fontWeight: "800", fontSize: 15 }}>
                  {item.delta > 0 ? "+" : ""}{item.delta}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text.primary, fontWeight: "600", fontSize: 14 }}>{item.label}</Text>
                  <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>{item.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </GlassCard>
      )}

      {/* Disclaimer */}
      <Text style={{ color: c.text.tertiary, fontSize: 12, textAlign: "center", marginTop: Spacing.lg, lineHeight: 16 }}>
        This is observational, not diagnostic. Your score reflects the data you provide — it's a mirror, not a judgement.
      </Text>
    </Screen>
  );
}
