import * as Clipboard from "expo-clipboard";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { todayISO } from "@/lib/util/todayISO";
import { setInsightsSelectedDate } from "@/lib/insightsDate";
import { getAllDays } from "@/lib/storage";
import {
  analyticsToMarkdown,
  buildAnalyticsSummary,
  type AnalyticsSummary,
  type CorrelationRow,
} from "@/lib/analytics";
import type { ISODate } from "@/lib/types";

function strengthLabel(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.6) return "strong link";
  if (abs >= 0.4) return "noticeable link";
  if (abs >= 0.2) return "slight link";
  return "weak link";
}

function prettySignal(key: string): string {
  switch (key) {
    case "lbi":
      return "balance";
    case "sleepHours":
      return "sleep";
    case "recovery":
      return "recovery";
    case "strain":
      return "strain";
    case "mood":
      return "mood";
    case "energy":
      return "energy";
    case "stressIndicatorsCount":
      return "stress";
    default:
      return key;
  }
}

function correlationSentence(row: CorrelationRow): string {
  if (row.r == null) return "";
  const a = prettySignal(row.a);
  const b = prettySignal(row.b);
  const dir = row.r > 0 ? "Better" : "Higher";
  const effect = row.r > 0 ? "better" : "lower";
  const strength = strengthLabel(row.r);
  return `${dir} ${a} \u2192 ${effect} ${b} (${strength})`;
}

function colorForValue(value: number | undefined): string {
  if (value == null) return "#999";
  if (value >= 75) return "#5B7A3E";
  if (value >= 50) return "#C2824A";
  return "#B2423A";
}

function StatPill({
  label,
  value,
  c,
}: {
  label: string;
  value: string | number;
  c: typeof Colors.light;
}) {
  return (
    <View
      style={{
        backgroundColor: c.glass.secondary,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: "center",
        minWidth: 80,
        flex: 1,
      }}
    >
      <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 20 }}>{value}</Text>
      <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function AverageBar({
  label,
  value,
  maxValue,
  c,
}: {
  label: string;
  value: number | undefined;
  maxValue: number;
  c: typeof Colors.light;
}) {
  const pct = value != null ? Math.min((value / maxValue) * 100, 100) : 0;
  const barColor = colorForValue(value != null ? (value / maxValue) * 100 : undefined);

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ color: c.text.secondary, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 13 }}>
          {value != null ? value : "\u2014"}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: c.glass.secondary,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 8,
            borderRadius: 4,
            width: `${pct}%` as any,
            backgroundColor: barColor,
          }}
        />
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<ISODate>(todayISO());
  const [md, setMd] = useState<string>("");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const days = (await getAllDays()).filter((d) => d.date <= date);
      const s = buildAnalyticsSummary(days, 30);
      setSummary(s);
      setMd(analyticsToMarkdown(s));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    (async () => {
      await setInsightsSelectedDate(date);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const copyMarkdown = async () => {
    await Clipboard.setStringAsync(md || "");
  };

  // Pick top 3 correlations by absolute r (same-day only)
  const topCorrelations: CorrelationRow[] = summary
    ? [...summary.correlations]
        .filter((r) => r.r != null && r.lag === 0)
        .sort((a, b) => Math.abs(b.r!) - Math.abs(a.r!))
        .slice(0, 3)
    : [];

  const desc = summary?.descriptives;

  return (
    <Screen scroll contentStyle={styles.container}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />

      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text.primary }]}>Analytics</Text>
          <Text style={[styles.subtitle, { color: c.text.secondary }]}>
            Your patterns over the last 30 days
          </Text>
        </View>

        <Pressable
          onPress={load}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              backgroundColor: pressed
                ? scheme === "dark"
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(0,0,0,0.06)"
                : scheme === "dark"
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.70)",
            },
          ]}
        >
          <IconSymbol name="arrow.clockwise" size={18} color={c.text.primary} />
        </Pressable>
      </View>

      <InsightsDatePicker
        date={date}
        onChange={setDate}
        title="As of"
        helperText="Analytics uses up to 30 days ending on this date."
      />

      {loading ? (
        <GlassCard padding="base">
          <Text style={{ color: c.text.secondary, fontSize: 14 }}>Loading analytics...</Text>
        </GlassCard>
      ) : !summary ? (
        <GlassCard padding="base">
          <Text style={{ color: c.text.secondary, fontSize: 14 }}>No analytics yet.</Text>
        </GlassCard>
      ) : (
        <View style={{ gap: 12 }}>
          {/* Overview card */}
          <GlassCard padding="base">
            <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary }}>
              Your data at a glance
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <StatPill label="Days tracked" value={summary.nDaysTotal} c={c} />
              <StatPill label="Check-ins" value={summary.nDaysWithCheckIn} c={c} />
              <StatPill label="Wearable" value={summary.nDaysWithWearable} c={c} />
            </View>
          </GlassCard>

          {/* Averages card */}
          {desc && (
            <GlassCard padding="base">
              <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary }}>
                Your typical day
              </Text>
              <AverageBar label="Balance" value={desc.lbi?.mean} maxValue={100} c={c} />
              <AverageBar label="Recovery" value={desc.recovery?.mean} maxValue={100} c={c} />
              <AverageBar label="Sleep" value={desc.sleepHours?.mean} maxValue={12} c={c} />
              <AverageBar label="Mood" value={desc.mood?.mean} maxValue={5} c={c} />
            </GlassCard>
          )}

          {/* Trends card */}
          {desc && (
            <GlassCard padding="base">
              <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary }}>
                How things are moving
              </Text>
              {[
                { key: "sleepHours", label: "Sleep" },
                { key: "recovery", label: "Recovery" },
                { key: "mood", label: "Mood" },
                { key: "lbi", label: "Balance" },
              ].map(({ key, label }) => {
                const d = desc[key];
                if (!d || d.n === 0) return null;
                return (
                  <View
                    key={key}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: c.glass.border,
                    }}
                  >
                    <Text style={{ color: c.text.secondary, fontSize: 13 }}>{label}</Text>
                    <Text style={{ color: c.text.primary, fontSize: 13 }}>
                      {"\u2192"} steady (avg {d.mean})
                    </Text>
                  </View>
                );
              })}
              <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 8 }}>
                Trends require multiple windows to compare. Keep logging to unlock direction arrows.
              </Text>
            </GlassCard>
          )}

          {/* Correlations card */}
          {topCorrelations.length > 0 && (
            <GlassCard padding="base">
              <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary }}>
                What moves together
              </Text>
              {topCorrelations.map((row, i) => (
                <View
                  key={i}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: i < topCorrelations.length - 1 ? 1 : 0,
                    borderBottomColor: c.glass.border,
                  }}
                >
                  <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18 }}>
                    {correlationSentence(row)}
                  </Text>
                </View>
              ))}
              <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 8 }}>
                These are patterns, not proof of cause and effect.
              </Text>
            </GlassCard>
          )}

          {/* Copy for research */}
          <GlassCard padding="base">
            <View style={styles.btnRow}>
              <Pressable
                onPress={copyMarkdown}
                disabled={!md}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    opacity: !md ? 0.5 : 1,
                    backgroundColor: pressed ? "rgba(0,0,0,0.06)" : "transparent",
                    borderColor: c.glass.border,
                  },
                ]}
              >
                <Text style={[styles.btnText, { color: c.text.primary }]}>Copy for research</Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, gap: 12 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: "900" },
  subtitle: { marginTop: 2, fontSize: 13, fontWeight: "600" },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, alignItems: "center" },
  btnText: { fontSize: 13, fontWeight: "800" },
});
