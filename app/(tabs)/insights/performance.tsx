import React, { useEffect, useState } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { runModelEvaluation, type ModelEvalSummary } from "@/lib/ml/eval";
import { ErrorState } from "@/components/ui/error-state";

function MetricRow({ label, value, desc, c }: { label: string; value: string; desc: string; c: typeof Colors.light }) {
  return (
    <View style={{ paddingVertical: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15 }}>{label}</Text>
        <Text style={{ color: c.accent.primary, fontWeight: "900", fontSize: 18 }}>{value}</Text>
      </View>
      <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 2 }}>{desc}</Text>
    </View>
  );
}

export default function PerformanceScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
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
    <Screen scroll title="Model performance" subtitle="How well the scoring model holds up against your data">
      {error ? (
        <GlassCard padding="base">
          <ErrorState
            title={needsMoreData ? "Need more data" : "Unavailable"}
            message={error}
            bullets={
              needsMoreData
                ? [
                    "Log at least 30 days with wearable + check-in + LBI.",
                    "Ensure WHOOP sync and daily check-in completeness.",
                    "The model uses a time-split: older data trains, recent data tests.",
                  ]
                : undefined
            }
          />
        </GlassCard>
      ) : !summary ? (
        <GlassCard padding="base">
          <Text style={{ color: c.text.primary, fontSize: 14 }}>
            Evaluating… this needs at least 30 days with LBI, wearable, and check-in data.
          </Text>
        </GlassCard>
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {/* Dataset */}
          <GlassCard padding="base">
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }}>
              DATASET
            </Text>
            <Text style={{ color: c.text.primary, fontSize: 15, fontWeight: "700", marginTop: 6 }}>
              {summary.trainDays} training days · {summary.testDays} test days
            </Text>
            <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 2 }}>
              Split at {summary.splitDate}. Older data trains the model; recent data tests it.
            </Text>
          </GlassCard>

          {/* Classification metrics */}
          <GlassCard padding="base">
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 4 }}>
              CLASSIFICATION (LBI DROP)
            </Text>
            <MetricRow label="Accuracy" value={summary.cls.acc.toFixed(2)} desc="Proportion of correct predictions overall" c={c} />
            <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.03)" }} />
            <MetricRow label="Precision" value={summary.cls.precision.toFixed(2)} desc="When the model predicts a drop, how often is it right?" c={c} />
            <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.03)" }} />
            <MetricRow label="Recall" value={summary.cls.recall.toFixed(2)} desc="Of all actual drops, how many did the model catch?" c={c} />
            <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.03)" }} />
            <MetricRow label="AUC" value={summary.cls.auc != null ? summary.cls.auc.toFixed(2) : "—"} desc="Area under ROC curve — 1.0 is perfect, 0.5 is random" c={c} />
            <View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.03)" }} />
            <MetricRow label="Brier score" value={summary.cls.brier.toFixed(3)} desc="Calibration — lower is better, 0 is perfect" c={c} />
          </GlassCard>

          {/* Calibration */}
          <GlassCard padding="base">
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 4 }}>
              CALIBRATION BINS
            </Text>
            <Text style={{ color: c.text.secondary, fontSize: 12, marginBottom: 8 }}>
              Does the model's confidence match reality? Each bin compares predicted probability to observed frequency.
            </Text>
            {summary.calibration.map((b, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                <Text style={{ color: c.text.tertiary, fontSize: 12, width: 50 }}>Bin {i + 1}</Text>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.06)" }}>
                  <View style={{ width: `${Math.round(b.obs * 100)}%`, height: "100%", borderRadius: 3, backgroundColor: c.accent.primary }} />
                </View>
                <Text style={{ color: c.text.secondary, fontSize: 11, width: 90, textAlign: "right" }}>
                  pred {b.pred.toFixed(2)} → obs {b.obs.toFixed(2)}
                </Text>
                <Text style={{ color: c.text.tertiary, fontSize: 10, width: 30, textAlign: "right" }}>n={b.n}</Text>
              </View>
            ))}
          </GlassCard>

          {/* Limitations */}
          <GlassCard padding="base">
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 6 }}>
              LIMITATIONS
            </Text>
            {[
              "Small-N, single-user dataset — results may not generalise.",
              "No external validation against clinical outcomes.",
              "Model assumptions (linear boundaries) may not hold.",
              "Predictions should not be used for health decisions.",
              "Exploratory only — meant for self-reflection.",
            ].map((line, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <Text style={{ color: c.text.tertiary, fontSize: 12 }}>•</Text>
                <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18, flex: 1 }}>{line}</Text>
              </View>
            ))}
          </GlassCard>

          <Pressable onPress={() => router.push("/insights/correlations" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
            <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>See your patterns →</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
