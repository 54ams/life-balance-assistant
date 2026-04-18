import React, { useEffect, useState } from "react";
import { Text, View, useColorScheme } from "react-native";
import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { computeBaselineMeta, type BaselineMeta } from "@/lib/baseline";

function SignalCard({
  label,
  stat,
  c,
  isDark,
}: {
  label: string;
  stat: BaselineMeta["baseline"];
  c: typeof Colors.light;
  isDark: boolean;
}) {
  const hasData = stat.median != null;
  return (
    <View
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15 }}>{label}</Text>
        <Text style={{ color: hasData ? c.accent.primary : c.text.tertiary, fontWeight: "900", fontSize: 18 }}>
          {stat.median ?? "—"}
        </Text>
      </View>
      {hasData && (
        <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
          <Text style={{ color: c.text.tertiary, fontSize: 11 }}>IQR {stat.iqr ?? "—"}</Text>
          <Text style={{ color: c.text.tertiary, fontSize: 11 }}>n = {stat.n}</Text>
          <Text style={{ color: c.text.tertiary, fontSize: 11 }}>{stat.coverage}% coverage</Text>
          <Text style={{ color: stat.stable ? c.success : c.warning, fontSize: 11, fontWeight: "700" }}>
            {stat.stable ? "Stable" : "Calibrating"}
          </Text>
        </View>
      )}
      {!hasData && (
        <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 2 }}>Not enough data yet</Text>
      )}
    </View>
  );
}

export default function BaselineScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];
  const [meta, setMeta] = useState<BaselineMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    computeBaselineMeta(14).then(setMeta).catch((e: any) => setError(e?.message ?? "Failed to compute baselines."));
  }, []);

  return (
    <Screen scroll title="Personal baselines" subtitle="Your normal ranges, built from your own data">
      {error ? (
        <GlassCard padding="base">
          <Text style={{ color: c.danger, fontWeight: "700" }}>Error</Text>
          <Text style={{ color: c.text.secondary, marginTop: Spacing.xs }}>{error}</Text>
        </GlassCard>
      ) : !meta ? (
        <GlassCard padding="base">
          <Text style={{ color: c.text.primary, fontSize: 14 }}>
            Calibrating baselines… keep logging to build your personal ranges.
          </Text>
        </GlassCard>
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {/* Status */}
          <GlassCard padding="base">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: meta.status === "stable" ? c.success : c.warning,
                }}
              />
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>
                {meta.status === "stable" ? "Baselines are stable" : "Still calibrating"}
              </Text>
            </View>
            <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
              {meta.status === "stable"
                ? `Your baselines are built from the last ${meta.targetDays} days. Coverage is high enough and variance is low enough to call them stable.`
                : `The app is still learning your personal ranges. Keep logging — baselines stabilise once coverage is high and day-to-day variation settles.`}
            </Text>
          </GlassCard>

          {/* How baselines work */}
          <GlassCard padding="base">
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 4 }}>
              HOW IT WORKS
            </Text>
            <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18 }}>
              Each signal's baseline is the median of your last {meta.targetDays} days. The IQR (interquartile range)
              shows how much you typically vary. Coverage is the percentage of days with data. A signal is "stable"
              when coverage is high and the IQR-to-median ratio is low.
            </Text>
          </GlassCard>

          {/* Signal cards */}
          <GlassCard padding="base">
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 4 }}>
              YOUR SIGNALS
            </Text>
            <SignalCard label="Balance (LBI)" stat={meta.baseline} c={c} isDark={isDark} />
            <SignalCard label="Recovery" stat={meta.recovery} c={c} isDark={isDark} />
            <SignalCard label="Sleep hours" stat={meta.sleepHours} c={c} isDark={isDark} />
            <SignalCard label="Strain" stat={meta.strain} c={c} isDark={isDark} />
            <SignalCard label="Mood" stat={meta.mood} c={c} isDark={isDark} />
            <SignalCard label="Stress" stat={meta.stress} c={c} isDark={isDark} />
          </GlassCard>

          <Text style={{ color: c.text.tertiary, fontSize: 12, textAlign: "center", marginTop: Spacing.md, lineHeight: 16 }}>
            Baselines are personal — they describe your range, not a clinical standard.
          </Text>
        </View>
      )}
    </Screen>
  );
}
