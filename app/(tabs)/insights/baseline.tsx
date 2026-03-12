import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { computeBaselineMeta, type BaselineMeta } from "@/lib/baseline";
import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";

function StatRow({ label, stat }: { label: string; stat: BaselineMeta["baseline"] }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
      <Text style={{ fontWeight: "700" }}>{label}</Text>
      <Text>
        {stat.median == null ? "—" : stat.median} (IQR {stat.iqr ?? "—"}) • n={stat.n} • {stat.coverage}% cov
        {stat.stable === true ? " • stable" : stat.stable === false ? " • still calibrating" : ""}
      </Text>
    </View>
  );
}

export default function BaselineScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [meta, setMeta] = useState<BaselineMeta | null>(null);

  useEffect(() => {
    computeBaselineMeta(14).then(setMeta);
  }, []);

  return (
    <Screen scroll title="Baselines" subtitle="Personal ranges (median + IQR) and coverage">
      {!meta ? (
        <GlassCard style={{ padding: 14 }}>
          <Text style={{ color: c.text.primary }}>Calibrating baselines… add more days.</Text>
        </GlassCard>
      ) : (
        <View style={{ gap: Spacing.sm }}>
          <GlassCard padding="base">
            <Text style={{ color: c.text.primary, fontSize: Typography.fontSize.lg, fontWeight: "800" }}>
              Status: {meta.status === "stable" ? "Stable" : "Calibrating"}
            </Text>
            <Text style={{ color: c.text.secondary, marginTop: Spacing.xs }}>
              Coverage uses last {meta.targetDays} days. Stable once coverage is high and IQR relative to median is small.
            </Text>
          </GlassCard>

          <GlassCard padding="base">
            <Text style={{ color: c.text.primary, fontWeight: "800" }}>Signals</Text>
            <StatRow label="LBI" stat={meta.baseline} />
            <StatRow label="Recovery" stat={meta.recovery} />
            <StatRow label="Sleep hours" stat={meta.sleepHours} />
            <StatRow label="Strain" stat={meta.strain} />
            <StatRow label="Mood" stat={meta.mood} />
            <StatRow label="Stress" stat={meta.stress} />
          </GlassCard>
        </View>
      )}
    </Screen>
  );
}
