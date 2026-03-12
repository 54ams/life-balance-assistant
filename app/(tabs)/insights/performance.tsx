import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { runModelEvaluation, type ModelEvalSummary } from "@/lib/ml/eval";
import { ErrorState } from "@/components/ui/error-state";

export default function PerformanceScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [summary, setSummary] = useState<ModelEvalSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await runModelEvaluation();
        setSummary(s);
      } catch (e: any) {
        setError(e?.message ?? "Unable to evaluate model.");
      }
    })();
  }, []);

  const needsMoreData = !!error && error.toLowerCase().includes("30");

  return (
    <Screen scroll title="Model performance" subtitle="Time-split validation and calibration">
      {error ? (
        <ErrorState
          title={needsMoreData ? "Need more data" : "Unavailable"}
          message={error}
          bullets={
            needsMoreData
              ? [
                  "Log at least 30 days with wearable + check-in + LBI.",
                  "Ensure WHOOP sync + daily check-in completeness.",
                  "Try again after data coverage improves.",
                ]
              : undefined
          }
        />
      ) : !summary ? (
        <GlassCard style={{ padding: 14 }}>
          <Text style={{ color: c.text.primary }}>Evaluating… needs ≥30 days with LBI + wearable + check-in.</Text>
        </GlassCard>
      ) : (
        <View style={{ gap: Spacing.sm }}>
          <GlassCard padding="base">
            <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: Typography.fontSize.lg }}>Dataset</Text>
            <Text style={{ color: c.text.secondary, marginTop: Spacing.xs }}>
              Train {summary.trainDays} days • Test {summary.testDays} days • Split {summary.splitDate}
            </Text>
          </GlassCard>

          <GlassCard padding="base">
            <Text style={{ color: c.text.primary, fontWeight: "800" }}>Classification (LBI drop)</Text>
            <Text style={{ color: c.text.secondary, marginTop: Spacing.xs }}>
              Acc {summary.cls.acc.toFixed(2)} • Prec {summary.cls.precision.toFixed(2)} • Recall {summary.cls.recall.toFixed(2)} • AUC{" "}
              {summary.cls.auc != null ? summary.cls.auc.toFixed(2) : "—"} • Brier {summary.cls.brier.toFixed(3)}
            </Text>
          </GlassCard>

          <GlassCard padding="base">
            <Text style={{ color: c.text.primary, fontWeight: "800" }}>Calibration</Text>
            {summary.calibration.map((b, i) => (
              <Text key={i} style={{ color: c.text.secondary }}>
                Bin {i + 1}: pred {b.pred.toFixed(2)} → obs {b.obs.toFixed(2)} (n={b.n})
              </Text>
            ))}
          </GlassCard>

          <GlassCard padding="base">
            <Text style={{ color: c.text.primary, fontWeight: "800" }}>Limitations</Text>
            <Text style={{ color: c.text.secondary, marginTop: Spacing.xs }}>
              Small-N, single-user dataset; exploratory only; no external validation; model assumptions may not hold; predictions should not be used for health decisions.
            </Text>
          </GlassCard>
        </View>
      )}
    </Screen>
  );
}
