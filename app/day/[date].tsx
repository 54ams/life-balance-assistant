import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Text, View, useColorScheme } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { getDay, loadPlan, type StoredPlan } from "@/lib/storage";
import type { DailyRecord } from "@/lib/types";

export default function DayDetailsScreen() {
  const params = useLocalSearchParams();
  const dateParam = params.date;
  const date = Array.isArray(dateParam) ? dateParam[0] : dateParam;

  const scheme = useColorScheme();
  const c = scheme === "dark" ? Colors.dark : Colors.light;

  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const [record, setRecord] = useState<DailyRecord | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!date) return;
        const p = await loadPlan(date);
        const day = await getDay(date as any);
        if (!alive) return;
        setPlan(p);
        setRecord(day);
      })();
      return () => {
        alive = false;
      };
    }, [date])
  );

  const delta = useMemo(() => {
    if (!plan) return null;
    return typeof plan.baseline === "number" ? plan.lbi - plan.baseline : null;
  }, [plan]);

  const deltaText = useMemo(() => {
    if (delta == null) return "—";
    return `${delta > 0 ? "+" : ""}${delta}`;
  }, [delta]);

  const statusTone = useMemo(() => {
    if (!plan) return c.text.secondary;
    return plan.category === "RECOVERY" ? "#D64550" : "#2FA37A";
  }, [plan, c]);

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: "Day details", headerShown: false }} />

      <Text style={{ fontSize: Typography.fontSize.xxl, fontWeight: Typography.fontWeight.bold, color: c.text.primary }}>
        Day details
      </Text>
      <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
        {date ?? "No date"}
      </Text>

      {!date ? (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <Text style={{ color: c.text.primary, fontWeight: Typography.fontWeight.bold }}>
            No date provided.
          </Text>
        </GlassCard>
      ) : !plan ? (
        <View style={{ marginTop: Spacing.md, gap: Spacing.md }}>
          <GlassCard>
            <Text style={{ color: c.text.primary, fontWeight: Typography.fontWeight.bold }}>
              No saved plan found.
            </Text>
            <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
              Raw day data is still shown below.
            </Text>
          </GlassCard>

          <GlassCard>
            <Text style={{ color: c.text.secondary, fontWeight: Typography.fontWeight.bold }}>Signals</Text>
            <View style={{ marginTop: Spacing.sm, gap: Spacing.xs }}>
              <Text style={{ color: c.text.primary }}>LBI: {record?.lbi ?? "—"}</Text>
              <Text style={{ color: c.text.primary }}>
                Recovery: {record?.wearable?.recovery ?? "—"} • Sleep: {record?.wearable?.sleepHours ?? "—"} • Strain: {record?.wearable?.strain ?? "—"}
              </Text>
              <Text style={{ color: c.text.primary }}>
                Mood: {record?.checkIn?.mood ?? "—"} • Energy: {record?.checkIn?.energy ?? "—"} • Stress: {record?.checkIn?.stressLevel ?? "—"}
              </Text>
              <Text style={{ color: c.text.primary }}>
                Sleep quality: {record?.checkIn?.sleepQuality ?? "—"} • Deep work: {record?.checkIn?.deepWorkMins ?? "—"} min • Hydration: {record?.checkIn?.hydrationLitres ?? "—"} L
              </Text>
              <Text style={{ color: c.text.primary }}>
                Behaviours: caffeine after 2pm {record?.checkIn?.caffeineAfter2pm ? "yes" : "no"} • alcohol {record?.checkIn?.alcohol ? "yes" : "no"} • exercise {record?.checkIn?.exerciseDone ? "yes" : "no"}
              </Text>
            </View>
          </GlassCard>

          {record?.checkIn?.stressIndicators ? (
            <GlassCard>
              <Text style={{ color: c.text.secondary, fontWeight: Typography.fontWeight.bold }}>Stress indicators</Text>
              <Text style={{ marginTop: Spacing.xs, color: c.text.primary }}>
                {Object.entries(record.checkIn.stressIndicators)
                  .filter(([, value]) => value)
                  .map(([key]) => key)
                  .join(", ") || "None selected"}
              </Text>
            </GlassCard>
          ) : null}

          {record?.checkIn?.notes ? (
            <GlassCard>
              <Text style={{ color: c.text.secondary, fontWeight: Typography.fontWeight.bold }}>Check-in notes</Text>
              <Text style={{ marginTop: Spacing.xs, color: c.text.primary }}>{record.checkIn.notes}</Text>
            </GlassCard>
          ) : null}

          {record?.emotion ? (
            <GlassCard>
              <Text style={{ color: c.text.secondary, fontWeight: Typography.fontWeight.bold }}>Emotional snapshot</Text>
              <Text style={{ marginTop: Spacing.xs, color: c.text.primary }}>
                Valence {record.emotion.valence.toFixed(2)} • Arousal {record.emotion.arousal.toFixed(2)} • Regulation {record.emotion.regulation}
              </Text>
              <Text style={{ marginTop: Spacing.xs, color: c.text.primary }}>
                Value: {record.emotion.valueChosen}
              </Text>
              {record.emotion.contextTags.length ? (
                <Text style={{ marginTop: Spacing.xs, color: c.text.primary }}>
                  Context: {record.emotion.contextTags.join(", ")}
                </Text>
              ) : null}
              {record.emotion.reflection ? (
                <Text style={{ marginTop: Spacing.xs, color: c.text.primary }}>
                  Reflection: {record.emotion.reflection}
                </Text>
              ) : null}
            </GlassCard>
          ) : null}
        </View>
      ) : (
        <View style={{ marginTop: Spacing.md, gap: Spacing.md }}>
          <GlassCard>
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: Spacing.base,
                paddingVertical: Spacing.xs,
                borderRadius: BorderRadius.full,
                backgroundColor: c.glass.primary,
                borderWidth: 2,
                borderColor: c.glass.border,
              }}
            >
              <Text style={{ color: statusTone, fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.sm }}>
                {plan.category}
              </Text>
            </View>

            <Text style={{ marginTop: Spacing.sm, color: c.text.primary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold }}>
              {plan.focus}
            </Text>

            <Text style={{ marginTop: Spacing.sm, color: c.text.secondary, fontWeight: Typography.fontWeight.bold }}>
              Actions
            </Text>
            <View style={{ marginTop: Spacing.xs, gap: Spacing.xs }}>
              {plan.actions.map((a, i) => (
                <View key={i} style={{ gap: 2 }}>
                  <Text style={{ color: c.text.primary }}>
                    • {a}
                  </Text>
                  <Text style={{ color: c.text.secondary }}>
                    {plan.actionReasons?.[i] ?? "Linked to today's rule-based recommendation logic."}
                  </Text>
                </View>
              ))}
            </View>
          </GlassCard>

          <GlassCard>
            <Text style={{ color: c.text.secondary, fontWeight: Typography.fontWeight.bold }}>Scores</Text>
            <View style={{ marginTop: Spacing.sm, gap: Spacing.xs }}>
              <Text style={{ color: c.text.primary }}>
                LBI: <Text style={{ fontWeight: Typography.fontWeight.bold }}>{plan.lbi}</Text>
              </Text>
              <Text style={{ color: c.text.primary }}>
                Baseline (7d): <Text style={{ fontWeight: Typography.fontWeight.bold }}>{plan.baseline ?? "—"}</Text>
              </Text>
              <Text style={{ color: c.text.primary }}>
                Δ vs baseline: <Text style={{ fontWeight: Typography.fontWeight.bold, color: statusTone }}>{deltaText}</Text>
              </Text>
              <Text style={{ color: c.text.primary }}>
                Confidence: <Text style={{ fontWeight: Typography.fontWeight.bold }}>{plan.confidence ?? "—"}</Text>
              </Text>
            </View>

            <View style={{ marginTop: Spacing.sm }}>
              <GlassButton
                title="Why did I get this score?"
                variant="secondary"
                onPress={() => router.push({ pathname: "/insights/explain", params: { date } })}
              />
            </View>
          </GlassCard>

          <GlassCard>
            <Text style={{ color: c.text.secondary, fontWeight: Typography.fontWeight.bold }}>Triggers</Text>
            {plan.triggers.length === 0 ? (
              <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>No triggers recorded.</Text>
            ) : (
              <View style={{ marginTop: Spacing.xs, gap: Spacing.xs }}>
                {plan.triggers.map((t, i) => (
                  <Text key={i} style={{ color: c.text.primary }}>
                    • {t}
                  </Text>
                ))}
              </View>
            )}
          </GlassCard>

          <GlassCard>
            <Text style={{ color: c.text.secondary, fontWeight: Typography.fontWeight.bold }}>Explanation</Text>
            <Text style={{ marginTop: Spacing.xs, color: plan.explanation ? c.text.primary : c.text.secondary }}>
              {plan.explanation ?? "No explanation saved for this day."}
            </Text>
          </GlassCard>
        </View>
      )}
    </Screen>
  );
}
