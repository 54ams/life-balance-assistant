import React, { useCallback, useState } from "react";
import { Text, View, useColorScheme } from "react-native";
import { useFocusEffect } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { FlipCard } from "@/components/ui/FlipCard";
import { WorkingPanel } from "@/components/ui/WorkingPanel";
import { ShowWorkingToggle } from "@/components/ui/ShowWorkingToggle";
import { useShowWorking } from "@/hooks/useShowWorking";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { listPlans, listDailyRecords } from "@/lib/storage";
import { computeAdherenceCorrelation, type CorrelationRow } from "@/lib/analytics";

function humanStrength(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.6) return "strong";
  if (abs >= 0.4) return "noticeable";
  if (abs >= 0.2) return "slight";
  return "barely any";
}

function plainEnglishResult(r: number, n: number): string {
  const abs = Math.abs(r);
  if (abs < 0.2) {
    return `Across ${n} days there's barely any link between ticking off your plan and how you felt the next day. That's useful too — it suggests other things (sleep, stress, rest) matter more for you.`;
  }
  const strength = humanStrength(r);
  if (r > 0) {
    return `Across ${n} days there's a ${strength} link between days you stuck to your plan and feeling a bit better the next day. Not a rule — just a pattern worth noticing.`;
  }
  return `Across ${n} days there's a ${strength} link in the opposite direction — days you stuck to your plan were followed by slightly rougher days. That can happen when plans are too ambitious; it's worth reflecting on rather than worrying about.`;
}

export default function AdherenceInsightsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [corr, setCorr] = useState<CorrelationRow | null | undefined>(undefined);
  const [pairCount, setPairCount] = useState(0);
  const working = useShowWorking(false);

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
  const flipped = working.isFlipped("adherence");

  return (
    <Screen scroll>
      <Text style={{ fontSize: Typography.fontSize.xxl, fontWeight: Typography.fontWeight.bold, color: c.text.primary }}>
        Sticking to your plan
      </Text>
      <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
        When you tick off the small things you planned, does tomorrow tend to go a bit better?
      </Text>

      <GlassCard style={{ marginTop: Spacing.md }}>
        <Text style={{ fontWeight: Typography.fontWeight.bold, color: c.text.primary }}>How we look at this</Text>
        <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
          For each day you had a plan, we work out how much of it you ticked off. Then we look at your balance score the next day. If the two tend to move together, we'll spot it here.
        </Text>
        <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
          This is just something to notice — two things moving together doesn't mean one caused the other, and a handful of days can easily mislead.
        </Text>
      </GlassCard>

      {hasResult ? (
        <View style={{ marginTop: Spacing.md, flexDirection: "row", justifyContent: "flex-end" }}>
          <ShowWorkingToggle value={working.globalShow} onToggle={working.toggleGlobal} />
        </View>
      ) : null}

      {corr === undefined ? (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <Text style={{ fontWeight: Typography.fontWeight.bold, color: c.text.primary }}>What we're seeing</Text>
          <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>Working it out…</Text>
        </GlassCard>
      ) : corr === null ? (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <Text style={{ fontWeight: Typography.fontWeight.bold, color: c.text.primary }}>What we're seeing</Text>
          <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
            We haven't got quite enough to go on yet — we need at least three days where you had a plan and a balance score the next day.
          </Text>
          <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
            Plans with actions so far: {pairCount}. Keep ticking things off over the next few days and this will appear automatically.
          </Text>
        </GlassCard>
      ) : (
        <View style={{ marginTop: Spacing.md }}>
          <FlipCard
            flipped={flipped}
            onToggle={() => working.toggleTile("adherence")}
            accessibilityLabel={`What we're seeing. Tap to ${flipped ? "hide" : "show"} the maths.`}
            front={
              <GlassCard>
                <Text style={{ fontWeight: Typography.fontWeight.bold, color: c.text.primary }}>What we're seeing</Text>
                <Text style={{ marginTop: Spacing.xs, color: c.text.primary, lineHeight: 20 }}>
                  {plainEnglishResult(corr.r ?? 0, corr.n)}
                </Text>
                <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 12, textAlign: "right", fontWeight: "600" }}>
                  Tap to show the maths
                </Text>
              </GlassCard>
            }
            back={
              <WorkingPanel
                summary="How the link between sticking to your plan and your next-day balance was measured."
                inputs={[
                  `${corr.n} days where you had a plan and a balance score the next day`,
                  `Plan adherence ratio (ticked-off actions ÷ total actions)`,
                  `Balance score the following day`,
                ]}
                method="Spearman rank correlation, with a bootstrap to estimate a likely range."
                result={`Strength ${corr.r != null ? corr.r.toFixed(3) : "—"} (between −1 and +1)${
                  corr.ciLower != null && corr.ciUpper != null
                    ? ` · likely range ${corr.ciLower.toFixed(2)} to ${corr.ciUpper.toFixed(2)}`
                    : ""
                }`}
                footnote={
                  corr.p != null
                    ? corr.p < 0.05
                      ? "Pattern is reasonably reliable."
                      : "Early signal — keep logging to confirm."
                    : undefined
                }
              />
            }
          />
        </View>
      )}

      {hasResult ? (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <Text style={{ fontWeight: Typography.fontWeight.bold, color: c.text.primary }}>A friendly reminder</Text>
          <Text style={{ marginTop: Spacing.xs, color: c.text.secondary }}>
            Plans work best when they're small and flexible. If a pattern looks off, try a lighter plan rather than pushing harder — the aim is to notice, not to grade yourself.
          </Text>
        </GlassCard>
      ) : null}
    </Screen>
  );
}
