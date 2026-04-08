import React, { useCallback, useState } from "react";
import { Text, View, useColorScheme } from "react-native";
import { useFocusEffect } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { listPlans, listDailyRecords } from "@/lib/storage";
import { computeAdherenceCorrelation, type CorrelationRow } from "@/lib/analytics";

function rLabel(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.6) return "strong";
  if (abs >= 0.4) return "moderate";
  if (abs >= 0.2) return "weak";
  return "negligible";
}

export default function AdherenceInsightsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [corr, setCorr] = useState<CorrelationRow | null | undefined>(undefined);
  const [pairCount, setPairCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [plans, records] = await Promise.all([listPlans(60), listDailyRecords(60)]);
        if (!alive) return;
        setPairCount(plans.filter((p) => p.actions.length > 0).length);
        setCorr(computeAdherenceCorrelation(plans, records));
      })();
      return () => { alive = false; };
    }, [])
  );

  const hasResult = corr !== undefined && corr !== null;

  return (
    <Screen scroll>
      <Text style={{ fontSize: Typography.fontSize.xxl, fontWeight: Typography.fontWeight.bold, color: c.text.primary }}>
        Adherence &amp; next-day LBI
      </Text>
      <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
        Hypothesis H3 — exploratory. Does completing planned actions associate with a higher LBI the following day?
      </Text>

      <GlassCard style={{ marginTop: Spacing.md }}>
        <Text style={{ fontWeight: Typography.fontWeight.bold, color: c.text.primary }}>How this works</Text>
        <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
          For each day you had a plan, we compute an adherence ratio (actions completed ÷ actions total). We then look at your LBI the next day. A Spearman correlation tests whether higher adherence is associated with a higher next-day LBI.
        </Text>
        <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
          This is observational only. Correlation ≠ causation. Confidence is low with small samples.
        </Text>
      </GlassCard>

      <GlassCard style={{ marginTop: Spacing.md }}>
        <Text style={{ fontWeight: Typography.fontWeight.bold, color: c.text.primary }}>Result</Text>

        {corr === undefined ? (
          <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>Loading…</Text>
        ) : corr === null ? (
          <>
            <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
              Not enough paired observations yet (need ≥ 3 days with a plan and a next-day LBI).
            </Text>
            <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
              Plans with actions logged so far: {pairCount}. Mark actions complete and sync more data days to unlock this analysis.
            </Text>
          </>
        ) : (
          <View style={{ gap: Spacing.xs, marginTop: Spacing.xs }}>
            <Text style={{ color: c.text.primary }}>
              Spearman r ={" "}
              <Text style={{ fontWeight: Typography.fontWeight.bold }}>
                {corr.r != null ? corr.r.toFixed(3) : "—"}
              </Text>
              {corr.r != null ? ` (${rLabel(corr.r)} ${corr.r >= 0 ? "positive" : "negative"})` : ""}
            </Text>
            <Text style={{ color: c.text.primary }}>
              Pairs (n):{" "}
              <Text style={{ fontWeight: Typography.fontWeight.bold }}>{corr.n}</Text>
            </Text>
            {corr.ciLower != null && corr.ciUpper != null ? (
              <Text style={{ color: c.text.primary }}>
                95% bootstrap CI:{" "}
                <Text style={{ fontWeight: Typography.fontWeight.bold }}>
                  [{corr.ciLower.toFixed(3)}, {corr.ciUpper.toFixed(3)}]
                </Text>
              </Text>
            ) : null}
            {corr.p != null ? (
              <Text style={{ color: c.text.primary }}>
                Permutation p-value:{" "}
                <Text style={{ fontWeight: Typography.fontWeight.bold }}>{corr.p.toFixed(3)}</Text>
              </Text>
            ) : null}
          </View>
        )}
      </GlassCard>

      {hasResult ? (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <Text style={{ fontWeight: Typography.fontWeight.bold, color: c.text.primary }}>Interpretation</Text>
          <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
            {corr!.r != null && Math.abs(corr!.r) >= 0.2
              ? `A ${rLabel(corr!.r)} ${corr!.r >= 0 ? "positive" : "negative"} association was found between action adherence and next-day LBI (r = ${corr!.r?.toFixed(3)}, n = ${corr!.n}). This is exploratory — small samples inflate uncertainty and the CI reflects that.`
              : `The association between adherence and next-day LBI appears negligible in the current dataset (r = ${corr!.r?.toFixed(3) ?? "—"}, n = ${corr!.n}). More data is needed for a reliable estimate.`}
          </Text>
          <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
            This addresses H3 from the study hypotheses. Findings should be treated as preliminary given the sample size.
          </Text>
        </GlassCard>
      ) : null}

      <GlassCard style={{ marginTop: Spacing.md }}>
        <Text style={{ color: c.text.secondary, fontSize: Typography.fontSize.sm }}>
          Method: Spearman rank correlation with 500-sample bootstrap CI and permutation p-value. Lag = 1 day (plan day → next-day LBI). Minimum 3 paired observations required.
        </Text>
      </GlassCard>
    </Screen>
  );
}
