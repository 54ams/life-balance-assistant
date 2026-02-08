import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { loadPlan, type StoredPlan } from "@/lib/storage";

export default function PlanDetailsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"] as any;

  const params = useLocalSearchParams();
  const dateParam = params.date;
  const date = Array.isArray(dateParam) ? dateParam[0] : dateParam;

  const [plan, setPlan] = useState<StoredPlan | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!date) return;
        const p = await loadPlan(date);
        if (!alive) return;
        setPlan(p);
      })();
      return () => {
        alive = false;
      };
    }, [date])
  );

  const tone = plan?.category === "RECOVERY" ? "#f59e0b" : plan?.category === "PUSH" ? "#ef4444" : "#10b981";

  const delta = useMemo(() => {
    if (!plan) return null;
    if (typeof plan.baseline !== "number") return null;
    return plan.lbi - plan.baseline;
  }, [plan]);

  const deltaText = delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta}`;

  const deltaHint =
    delta == null
      ? "Build more history to unlock baseline insights."
      : delta <= -10
      ? "Significantly below baseline → recovery-biased day."
      : delta >= 10
      ? "Above baseline → safe to push slightly."
      : "Close to baseline → maintain steady structure.";

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: "Plan Details", headerShown: false }} />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: "900", color: c.text }}>Plan Details</Text>
          <Text style={{ marginTop: 6, color: c.muted }}>{date ?? "No date"}</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            {
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <IconSymbol name="chevron.left" size={18} color={c.text} />
        </Pressable>
      </View>

      {!date ? (
        <GlassCard style={{ marginTop: 14 }}>
          <Text style={{ color: c.text, fontWeight: "800" }}>No date provided</Text>
          <Text style={{ marginTop: 6, color: c.muted }}>Return to History and select a plan.</Text>
        </GlassCard>
      ) : null}

      {date && !plan ? (
        <GlassCard style={{ marginTop: 14 }}>
          <Text style={{ color: c.text, fontWeight: "800" }}>No saved plan found</Text>
          <Text style={{ marginTop: 6, color: c.muted }}>
            There isn’t a saved plan for this day yet. Generate one from Home or seed demo data in Settings.
          </Text>
        </GlassCard>
      ) : null}

      {plan ? (
        <>
          <GlassCard style={{ marginTop: 14 }}>
            <View
              style={{
                alignSelf: "flex-start",
                borderWidth: 1,
                borderColor: tone,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: tone, fontWeight: "800", letterSpacing: 0.3 }}>{plan.category}</Text>
            </View>

            <Text style={{ marginTop: 10, color: c.text, fontWeight: "900", fontSize: 18 }}>{plan.focus}</Text>

            <Text style={{ marginTop: 12, color: c.muted, fontWeight: "800" }}>Actions</Text>
            <View style={{ marginTop: 8, gap: 8 }}>
              {plan.actions.map((a, i) => (
                <Text key={i} style={{ color: c.text }}>
                  • {a}
                </Text>
              ))}
            </View>
          </GlassCard>

          <GlassCard style={{ marginTop: 12 }}>
            <Text style={{ color: c.text, fontWeight: "900" }}>Scores</Text>

            <View style={{ marginTop: 10, gap: 6 }}>
              <Text style={{ color: c.text }}>LBI: <Text style={{ fontWeight: "900" }}>{plan.lbi}</Text></Text>
              <Text style={{ color: c.text }}>Baseline (7d): <Text style={{ fontWeight: "900" }}>{plan.baseline ?? "—"}</Text></Text>
              <Text style={{ color: c.text }}>Δ vs baseline: <Text style={{ fontWeight: "900" }}>{deltaText}</Text></Text>
              <Text style={{ color: c.text }}>
                Confidence: <Text style={{ fontWeight: "900" }}>{(plan as any).confidence ?? "—"}</Text>
              </Text>
            </View>

            <Text style={{ marginTop: 10, color: c.muted }}>{deltaHint}</Text>
          </GlassCard>

          <GlassCard style={{ marginTop: 12 }}>
            <Text style={{ color: c.text, fontWeight: "900" }}>Triggers</Text>
            {plan.triggers.length === 0 ? (
              <Text style={{ marginTop: 8, color: c.muted }}>No triggers recorded.</Text>
            ) : (
              <View style={{ marginTop: 8, gap: 8 }}>
                {plan.triggers.map((t, i) => (
                  <Text key={i} style={{ color: c.text }}>
                    • {t}
                  </Text>
                ))}
              </View>
            )}
          </GlassCard>

          <GlassCard style={{ marginTop: 12 }}>
            <Text style={{ color: c.text, fontWeight: "900" }}>Explanation</Text>
            <Text style={{ marginTop: 8, color: c.muted }}>{plan.explanation ?? "No explanation saved for this day."}</Text>
          </GlassCard>

          <View style={{ marginTop: 14 }}>
            <Button title="Back" variant="secondary" onPress={() => router.back()} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}
