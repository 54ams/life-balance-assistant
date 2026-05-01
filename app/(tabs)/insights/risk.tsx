import React, { useCallback, useEffect, useState } from "react";
import { Stack, router, useFocusEffect } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { loadModels, predictTomorrowRisk, runModelEvaluation } from "@/lib/ml";
import type { ModelEvalSummary } from "@/lib/ml";
import { ErrorState } from "@/components/ui/error-state";

function pct(v: number | undefined): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

export default function RiskInsightsScreen() {
  const c = Colors.light;
  const [risk, setRisk] = useState<Awaited<ReturnType<typeof predictTomorrowRisk>> | null>(null);
  const [model, setModel] = useState<Awaited<ReturnType<typeof loadModels>> | null>(null);
  const [evalResult, setEvalResult] = useState<ModelEvalSummary | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const load = useCallback(() => {
    let alive = true;
    (async () => {
      const [pred, trained] = await Promise.all([predictTomorrowRisk(), loadModels()]);
      if (!alive) return;
      setRisk(pred);
      setModel(trained);

      // Try running model evaluation (needs >= 30 days)
      try {
        const evalSummary = await runModelEvaluation();
        if (alive) setEvalResult(evalSummary);
      } catch (e: any) {
        if (alive) setEvalError(e.message ?? "Insufficient data for evaluation");
      }
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
      <Screen>
        <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
        <ScreenHeader
          title="Risk outlook"
          subtitle="What tomorrow might look like"
          fallback="/insights"
        />
        <ErrorState
          title="Not ready yet"
          message="The personal model needs more matched days with wearables, check-ins, and LBI before it can estimate tomorrow's risk."
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
    <Screen>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />

      <ScreenHeader
        title="Risk outlook"
        subtitle="What tomorrow might look like"
        fallback="/insights"
      />

      <View style={{ gap: 12 }}>
        <GlassCard>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Model status</Text>
          <Text style={{ color: c.text.secondary, marginTop: 6 }}>
            Trained on {risk.rowsUsed} days (most recent day held out for prediction).
          </Text>
          <Text style={{ color: c.text.secondary, marginTop: 6 }}>
            This is a personal logistic regression model built from your data only. It uses gradient descent with L2 regularisation. It should support reflection, not decisions.
          </Text>
        </GlassCard>

        <GlassCard>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Tomorrow outlook</Text>
          <Text style={{ color: c.text.primary, marginTop: 10 }}>
            Chance your balance dips tomorrow: <Text style={{ fontWeight: "800" }}>{Math.round((risk.lbiRiskProb ?? 0) * 100)}%</Text>
          </Text>
          <Text style={{ color: c.text.primary, marginTop: 6 }}>
            Chance your recovery dips tomorrow: <Text style={{ fontWeight: "800" }}>{Math.round((risk.recoveryRiskProb ?? 0) * 100)}%</Text>
          </Text>
        </GlassCard>

        <GlassCard>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Top drivers</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {risk.topDrivers.map((driver) => (
              <Text key={driver.name} style={{ color: c.text.secondary }}>
                • {driver.name}: {driver.direction === "up" ? "higher" : "lower"} contribution ({driver.strength >= 0.6 ? "strong driver" : driver.strength >= 0.3 ? "moderate driver" : "slight driver"})
              </Text>
            ))}
          </View>
        </GlassCard>

        {/* Model Evaluation — only shown when enough data exists */}
        {evalResult ? (
          <GlassCard>
            <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Model performance</Text>
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginTop: 10 }}>
              70/30 TRAIN-TEST SPLIT
            </Text>
            <Text style={{ color: c.text.secondary, marginTop: 4, fontSize: 13 }}>
              {evalResult.trainDays} training days, {evalResult.testDays} test days (split at {evalResult.splitDate})
            </Text>

            <View style={{ marginTop: 12, gap: 6 }}>
              <Text style={{ color: c.text.primary, fontSize: 14 }}>
                Accuracy: <Text style={{ fontWeight: "700" }}>{pct(evalResult.cls.acc)}</Text>
              </Text>
              <Text style={{ color: c.text.primary, fontSize: 14 }}>
                Precision: <Text style={{ fontWeight: "700" }}>{pct(evalResult.cls.precision)}</Text>
              </Text>
              <Text style={{ color: c.text.primary, fontSize: 14 }}>
                Recall: <Text style={{ fontWeight: "700" }}>{pct(evalResult.cls.recall)}</Text>
              </Text>
              <Text style={{ color: c.text.primary, fontSize: 14 }}>
                AUC-ROC: <Text style={{ fontWeight: "700" }}>{evalResult.cls.auc != null ? evalResult.cls.auc.toFixed(2) : "—"}</Text>
              </Text>
              <Text style={{ color: c.text.primary, fontSize: 14 }}>
                Brier score: <Text style={{ fontWeight: "700" }}>{evalResult.cls.brier.toFixed(3)}</Text>
              </Text>
            </View>

            {evalResult.calibration.length > 0 && (
              <>
                <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginTop: 14 }}>
                  CALIBRATION
                </Text>
                {evalResult.calibration.map((bin, i) => (
                  <Text key={i} style={{ color: c.text.secondary, fontSize: 12, marginTop: 2 }}>
                    Predicted {pct(bin.pred)} → Observed {pct(bin.obs)} (n={bin.n})
                  </Text>
                ))}
              </>
            )}

            <Text style={{ color: c.text.tertiary, fontSize: 11, fontStyle: "italic", marginTop: 10 }}>
              These metrics evaluate how well the model generalises to unseen days. A Brier score closer to 0 and AUC closer to 1.0 indicate better performance.
            </Text>
          </GlassCard>
        ) : evalError ? (
          <GlassCard>
            <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Model evaluation</Text>
            <Text style={{ color: c.text.secondary, marginTop: 6, fontSize: 13 }}>
              {evalError}. Keep tracking to unlock a full performance report with accuracy, AUC, and calibration metrics.
            </Text>
          </GlassCard>
        ) : null}

        <GlassCard>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>How it works</Text>
          <Text style={{ color: c.text.secondary, marginTop: 6 }}>
            A logistic regression model with L2 regularisation is trained on-device using gradient descent. Features (recovery, sleep, strain, mood, stress, LBI) are z-scored against your 14-day rolling baseline.
          </Text>
          <Text style={{ color: c.text.secondary, marginTop: 6 }}>
            The model predicts whether tomorrow's LBI or recovery will drop below your baseline minus 0.75 standard deviations — framing risk as personal deviation, not absolute thresholds.
          </Text>
          <Text style={{ color: c.text.secondary, marginTop: 6 }}>
            The most recent day is always held out from training to ensure predictions are made on unseen data.
          </Text>
        </GlassCard>

        <Pressable onPress={() => router.push("/checkin/grounding" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
          <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>Try a grounding exercise →</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/insights/explain" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
          <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>See what drives your score →</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
