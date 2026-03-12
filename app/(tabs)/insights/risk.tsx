import React, { useCallback, useEffect, useState } from "react";
import { Stack, useFocusEffect } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { loadModels, predictTomorrowRisk } from "@/lib/ml";
import { ErrorState } from "@/components/ui/error-state";

export default function RiskInsightsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [risk, setRisk] = useState<Awaited<ReturnType<typeof predictTomorrowRisk>> | null>(null);
  const [model, setModel] = useState<Awaited<ReturnType<typeof loadModels>> | null>(null);

  const load = useCallback(() => {
    let alive = true;
    (async () => {
      const [pred, trained] = await Promise.all([predictTomorrowRisk(), loadModels()]);
      if (!alive) return;
      setRisk(pred);
      setModel(trained);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      const cleanup = load();
      return cleanup;
    }, [load])
  );

  if (!risk?.trained) {
    return (
      <Screen title="Risk outlook" subtitle="Personal predictive model">
        <Stack.Screen options={{ headerShown: false }} />
        <ErrorState
          title="Not ready yet"
          message="The personal model needs more matched days with wearables, check-ins, and LBI before it can estimate tomorrow risk."
          bullets={[
            "Keep syncing wearables and completing daily check-ins.",
            "The model is exploratory only and based on your own data.",
            "Predictions are not medical advice.",
          ]}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Risk outlook" subtitle="Personal predictive model">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ gap: 12 }}>
        <GlassCard>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Model status</Text>
          <Text style={{ color: c.text.secondary, marginTop: 6 }}>
            Trained {model?.trainedAt ?? "—"} using {risk.rowsUsed} personal feature rows.
          </Text>
          <Text style={{ color: c.text.secondary, marginTop: 6 }}>
            This is an exploratory n-of-1 model. It should support reflection, not decisions. The daily recommendation engine remains rule-based and separately explainable.
          </Text>
        </GlassCard>

        <GlassCard>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Tomorrow outlook</Text>
          <Text style={{ color: c.text.primary, marginTop: 10 }}>
            LBI drop risk: <Text style={{ fontWeight: "800" }}>{Math.round((risk.lbiRiskProb ?? 0) * 100)}%</Text>
          </Text>
          <Text style={{ color: c.text.primary, marginTop: 6 }}>
            Recovery drop risk: <Text style={{ fontWeight: "800" }}>{Math.round((risk.recoveryRiskProb ?? 0) * 100)}%</Text>
          </Text>
        </GlassCard>

        <GlassCard>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Top drivers</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {risk.topDrivers.map((driver) => (
              <Text key={driver.name} style={{ color: c.text.secondary }}>
                • {driver.name}: {driver.direction === "up" ? "higher" : "lower"} contribution ({driver.strength.toFixed(2)})
              </Text>
            ))}
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Feature set</Text>
          <Text style={{ color: c.text.secondary, marginTop: 6 }}>
            Recovery, sleep hours, strain, mood, stress, and LBI are z-scored against rolling personal baselines before modelling.
          </Text>
        </GlassCard>
      </View>
    </Screen>
  );
}
