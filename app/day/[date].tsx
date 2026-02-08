import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { loadPlan, type StoredPlan } from "@/lib/storage";

export default function DayDetailsScreen() {
  const params = useLocalSearchParams();
  const dateParam = params.date;
  const date = Array.isArray(dateParam) ? dateParam[0] : dateParam;

  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"] as any;

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

  const delta = useMemo(() => {
    if (!plan) return null;
    return typeof plan.baseline === "number" ? plan.lbi - plan.baseline : null;
  }, [plan]);

  const deltaText = useMemo(() => {
    if (delta == null) return "—";
    return `${delta > 0 ? "+" : ""}${delta}`;
  }, [delta]);

  const statusTone = useMemo(() => {
    if (!plan) return c.muted;
    return plan.category === "RECOVERY" ? c.warning : c.success;
  }, [plan, c]);

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: "Day details", headerShown: false }} />

      <Text style={{ fontSize: 26, fontWeight: "800", color: c.text }}>
        Day details
      </Text>
      <Text style={{ marginTop: 6, color: c.muted }}>
        {date ?? "No date"}
      </Text>

      {!date ? (
        <GlassCard style={{ marginTop: 16 }}>
          <Text style={{ color: c.text, fontWeight: "700" }}>
            No date provided.
          </Text>
        </GlassCard>
      ) : !plan ? (
        <GlassCard style={{ marginTop: 16 }}>
          <Text style={{ color: c.text, fontWeight: "700" }}>
            No saved plan found.
          </Text>
          <Text style={{ marginTop: 6, color: c.muted }}>
            Open Home for this date to generate and save a plan.
          </Text>
        </GlassCard>
      ) : (
        <View style={{ marginTop: 16, gap: 12 }}>
          <GlassCard>
            <View
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor:
                  scheme === "dark" ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.45)",
                borderWidth: 1,
                borderColor: c.glassBorder ?? c.border,
              }}
            >
              <Text style={{ color: statusTone, fontWeight: "800", fontSize: 12 }}>
                {plan.category}
              </Text>
            </View>

            <Text style={{ marginTop: 10, color: c.text, fontSize: 18, fontWeight: "800" }}>
              {plan.focus}
            </Text>

            <Text style={{ marginTop: 10, color: c.muted, fontWeight: "800" }}>
              Actions
            </Text>
            <View style={{ marginTop: 6, gap: 6 }}>
              {plan.actions.map((a, i) => (
                <Text key={i} style={{ color: c.text }}>
                  • {a}
                </Text>
              ))}
            </View>
          </GlassCard>

          <GlassCard>
            <Text style={{ color: c.muted, fontWeight: "800" }}>Scores</Text>
            <View style={{ marginTop: 10, gap: 6 }}>
              <Text style={{ color: c.text }}>
                LBI: <Text style={{ fontWeight: "900" }}>{plan.lbi}</Text>
              </Text>
              <Text style={{ color: c.text }}>
                Baseline (7d):{" "}
                <Text style={{ fontWeight: "900" }}>{plan.baseline ?? "—"}</Text>
              </Text>
              <Text style={{ color: c.text }}>
                Δ vs baseline: <Text style={{ fontWeight: "900" }}>{deltaText}</Text>
              </Text>
              <Text style={{ color: c.text }}>
                Confidence:{" "}
                <Text style={{ fontWeight: "900" }}>{(plan as any).confidence ?? "—"}</Text>
              </Text>
            </View>

            <View style={{ marginTop: 12 }}>
              <Button
                title="Why did I get this score?"
                variant="secondary"
                onPress={() =>
                  router.push({ pathname: "/insights/explain", params: { date } })
                }
              />
            </View>
          </GlassCard>

          <GlassCard>
            <Text style={{ color: c.muted, fontWeight: "800" }}>Triggers</Text>
            {plan.triggers.length === 0 ? (
              <Text style={{ marginTop: 8, color: c.muted }}>No triggers recorded.</Text>
            ) : (
              <View style={{ marginTop: 8, gap: 6 }}>
                {plan.triggers.map((t, i) => (
                  <Text key={i} style={{ color: c.text }}>
                    • {t}
                  </Text>
                ))}
              </View>
            )}
          </GlassCard>

          <GlassCard>
            <Text style={{ color: c.muted, fontWeight: "800" }}>Explanation</Text>
            <Text style={{ marginTop: 8, color: plan.explanation ? c.text : c.muted }}>
              {plan.explanation ?? "No explanation saved for this day."}
            </Text>
          </GlassCard>
        </View>
      )}
    </Screen>
  );
}
