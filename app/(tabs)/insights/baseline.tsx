import React, { useEffect, useState } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { computeBaselineMeta, type BaselineMeta } from "@/lib/baseline";

type Stat = BaselineMeta["baseline"];

function humanSummary(signal: string, stat: Stat): string {
  if (stat.median == null) return "Not enough data yet";
  if (!stat.stable) {
    const label = signal.toLowerCase();
    return `Still building your ${label} baseline...`;
  }
  const m = stat.median;
  switch (signal) {
    case "balance":
      return `Your balance is typically around ${m}`;
    case "recovery":
      return `Your recovery usually sits at ${m}%`;
    case "sleepHours":
      return `You typically sleep about ${m} hours`;
    case "strain":
      return `Your daily strain averages ${m}`;
    case "mood":
      return `Your mood usually rates ${m} out of 5`;
    case "stress":
      return `Your stress level typically sits at ${m} out of 5`;
    default:
      return `Typically around ${m}`;
  }
}

function humanLabel(signal: string): string {
  switch (signal) {
    case "balance":
      return "Balance";
    case "recovery":
      return "Recovery";
    case "sleepHours":
      return "Sleep hours";
    case "strain":
      return "Strain";
    case "mood":
      return "Mood";
    case "stress":
      return "Stress";
    default:
      return signal;
  }
}

function SignalCard({
  signal,
  stat,
  c,
  isDark,
}: {
  signal: string;
  stat: Stat;
  c: typeof Colors.light;
  isDark: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const hasData = stat.median != null;
  const statusColor = !hasData
    ? c.text.tertiary
    : stat.stable
    ? c.success
    : c.warning;

  return (
    <Pressable
      onPress={() => setFlipped((f) => !f)}
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.03)",
      }}
    >
      {!flipped ? (
        /* FRONT */
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: statusColor,
              }}
            />
            <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15 }}>
              {humanLabel(signal)}
            </Text>
          </View>
          <Text
            style={{
              color: c.text.secondary,
              fontSize: 14,
              marginTop: 6,
              lineHeight: 20,
            }}
          >
            {humanSummary(signal, stat)}
          </Text>
          <Text
            style={{
              color: c.text.tertiary,
              fontSize: 11,
              marginTop: 6,
              textAlign: "right",
            }}
          >
            Tap for details
          </Text>
        </View>
      ) : (
        /* BACK */
        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15 }}>
              {humanLabel(signal)}
            </Text>
            <Text
              style={{
                color: hasData ? c.accent.primary : c.text.tertiary,
                fontWeight: "900",
                fontSize: 18,
              }}
            >
              {stat.median ?? "\u2014"}
            </Text>
          </View>
          {hasData && (
            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              <Text style={{ color: c.text.tertiary, fontSize: 11 }}>IQR {stat.iqr ?? "\u2014"}</Text>
              <Text style={{ color: c.text.tertiary, fontSize: 11 }}>n = {stat.n}</Text>
              <Text style={{ color: c.text.tertiary, fontSize: 11 }}>{stat.coverage}% coverage</Text>
              <Text
                style={{
                  color: stat.stable ? c.success : c.warning,
                  fontSize: 11,
                  fontWeight: "700",
                }}
              >
                {stat.stable ? "Stable" : "Calibrating"}
              </Text>
            </View>
          )}
          {!hasData && (
            <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 2 }}>
              Not enough data yet
            </Text>
          )}
          <Text
            style={{
              color: c.text.tertiary,
              fontSize: 11,
              marginTop: 6,
              textAlign: "right",
            }}
          >
            Tap to go back
          </Text>
        </View>
      )}
    </Pressable>
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
            Calibrating baselines... keep logging to build your personal ranges.
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
                : `The app is still learning your personal ranges. Keep logging \u2014 baselines stabilise once coverage is high and day-to-day variation settles.`}
            </Text>
          </GlassCard>

          {/* Signal cards */}
          <GlassCard padding="base">
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 4 }}>
              YOUR SIGNALS
            </Text>
            <SignalCard signal="balance" stat={meta.baseline} c={c} isDark={isDark} />
            <SignalCard signal="recovery" stat={meta.recovery} c={c} isDark={isDark} />
            <SignalCard signal="sleepHours" stat={meta.sleepHours} c={c} isDark={isDark} />
            <SignalCard signal="strain" stat={meta.strain} c={c} isDark={isDark} />
            <SignalCard signal="mood" stat={meta.mood} c={c} isDark={isDark} />
            <SignalCard signal="stress" stat={meta.stress} c={c} isDark={isDark} />
          </GlassCard>

          <Text style={{ color: c.text.tertiary, fontSize: 12, textAlign: "center", marginTop: Spacing.md, lineHeight: 16 }}>
            Baselines are personal \u2014 they describe your range, not a clinical standard.
          </Text>

          <Pressable onPress={() => router.push("/insights/explain" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
            <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>What drives your score? \u2192</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/insights/trends" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
            <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>See your trends \u2192</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
