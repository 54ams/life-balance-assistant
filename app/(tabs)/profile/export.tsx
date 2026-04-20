// Export & Report screen — generates a readable plain-English report
// from the user's data. I wanted this to be something you could share
// with a GP or therapist, not just a JSON dump for developers.
// Still saves raw JSON alongside for my dissertation research data.

import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { FlipCard } from "@/components/ui/FlipCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { useColorScheme } from "react-native";
import { listDailyRecords, listPlans } from "@/lib/storage";
import { exportPlans } from "@/lib/export";

/* ── Report generation helpers ─────────────────────── */

function avgOf(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function scoreWord(score: number): string {
  if (score >= 75) return "great";
  if (score >= 60) return "good";
  if (score >= 45) return "okay";
  if (score >= 30) return "low";
  return "very low";
}

function trendDirection(values: number[]): string {
  if (values.length < 3) return "not enough data to spot a trend yet";
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const avgFirst = avgOf(firstHalf);
  const avgSecond = avgOf(secondHalf);
  const diff = avgSecond - avgFirst;
  if (Math.abs(diff) <= 3) return "staying steady";
  if (diff > 0) return "trending upward";
  return "trending downward";
}

type ReportData = {
  days: number;
  totalRecords: number;
  daysWithCheckIn: number;
  daysWithWearable: number;
  daysWithScore: number;
  avgBalance: number;
  avgSleep: number;
  avgRecovery: number;
  balanceTrend: string;
  sleepTrend: string;
  bestDay: { date: string; score: number } | null;
  hardestDay: { date: string; score: number } | null;
  recoveryDays: number;
  normalDays: number;
  adherenceRate: number;
  topTriggers: string[];
};

function buildReadableReport(data: ReportData): string {
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════");
  lines.push("   YOUR LIFE BALANCE REPORT");
  lines.push(`   Last ${data.days} days`);
  lines.push("═══════════════════════════════════════");
  lines.push("");

  lines.push("📊 THE BIG PICTURE");
  lines.push("───────────────────────────────────────");
  lines.push(`You checked in ${data.daysWithCheckIn} out of ${data.totalRecords} days.`);
  if (data.daysWithWearable > 0) {
    lines.push(`Wearable data was available for ${data.daysWithWearable} days.`);
  }
  if (data.daysWithScore > 0) {
    lines.push(`Your average balance score was ${data.avgBalance} — that's ${scoreWord(data.avgBalance)}.`);
    lines.push(`Overall trend: ${data.balanceTrend}.`);
  }
  lines.push("");

  if (data.avgSleep > 0 || data.avgRecovery > 0) {
    lines.push("😴 SLEEP & RECOVERY");
    lines.push("───────────────────────────────────────");
    if (data.avgSleep > 0) {
      lines.push(`Average sleep: ${(Math.round(data.avgSleep * 10) / 10)} hours per night.`);
      lines.push(`Sleep trend: ${data.sleepTrend}.`);
      if (data.avgSleep < 7) lines.push(`Tip: You're averaging under 7 hours. Even 30 minutes more can make a difference.`);
    }
    if (data.avgRecovery > 0) {
      lines.push(`Average recovery: ${data.avgRecovery}%.`);
      if (data.avgRecovery >= 67) lines.push(`Your body is recovering well overall.`);
      else if (data.avgRecovery >= 45) lines.push(`Recovery is moderate — keep an eye on rest and nutrition.`);
      else lines.push(`Recovery has been low — prioritise sleep and lighter days where possible.`);
    }
    lines.push("");
  }

  if (data.bestDay || data.hardestDay) {
    lines.push("📅 NOTABLE DAYS");
    lines.push("───────────────────────────────────────");
    if (data.bestDay) lines.push(`Best day: ${data.bestDay.date} (score ${data.bestDay.score})`);
    if (data.hardestDay) lines.push(`Hardest day: ${data.hardestDay.date} (score ${data.hardestDay.score})`);
    lines.push("");
  }

  if (data.recoveryDays > 0 || data.normalDays > 0) {
    lines.push("🎯 YOUR PLANS");
    lines.push("───────────────────────────────────────");
    lines.push(`Recovery days: ${data.recoveryDays} | Normal days: ${data.normalDays}`);
    if (data.adherenceRate > 0) {
      lines.push(`Plan adherence: ${data.adherenceRate}% of actions completed.`);
      if (data.adherenceRate >= 70) lines.push(`Great consistency — you're following through.`);
      else if (data.adherenceRate >= 40) lines.push(`Decent follow-through. Even partial effort counts.`);
      else lines.push(`Adherence has been low. Try focusing on just 1-2 actions per day.`);
    }
    lines.push("");
  }

  if (data.topTriggers.length > 0) {
    lines.push("💡 YOUR TOP COPING STRATEGIES");
    lines.push("───────────────────────────────────────");
    data.topTriggers.forEach((t) => lines.push(`• ${t}`));
    lines.push("");
  }

  lines.push("───────────────────────────────────────");
  lines.push("All data stored on your device. This report");
  lines.push("is for your personal use — share it with");
  lines.push("anyone you trust (GP, therapist, coach).");
  lines.push("───────────────────────────────────────");
  lines.push(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`);

  return lines.join("\n");
}

export default function ExportScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [days, setDays] = useState(7);
  const [report, setReport] = useState<string>("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [flipPreview, setFlipPreview] = useState(false);

  const refresh = useCallback(async () => {
    const records = await listDailyRecords(days);
    const plans = await listPlans(days);

    const withCheckIn = records.filter((r) => r.checkIn != null);
    const withWearable = records.filter((r) => r.wearable != null);
    const withLbi = records.filter((r) => typeof r.lbi === "number");
    const lbiValues = withLbi.map((r) => r.lbi as number);
    const sleepValues = withWearable.map((r) => r.wearable!.sleepHours).filter((v) => v != null) as number[];
    const recoveryValues = withWearable.map((r) => r.wearable!.recovery).filter((v) => v != null) as number[];

    let bestDay: { date: string; score: number } | null = null;
    let hardestDay: { date: string; score: number } | null = null;
    for (const r of withLbi) {
      const score = r.lbi as number;
      if (!bestDay || score > bestDay.score) bestDay = { date: r.date, score };
      if (!hardestDay || score < hardestDay.score) hardestDay = { date: r.date, score };
    }

    const recoveryDays = plans.filter((p) => p.category === "RECOVERY").length;
    const normalDays = plans.filter((p) => p.category === "NORMAL").length;

    let totalActions = 0;
    let completedActions = 0;
    for (const p of plans) {
      totalActions += p.actions.length;
      completedActions += (p.completedActions ?? []).filter(Boolean).length;
    }
    const adherenceRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

    // Collect unique triggers across plans
    const triggerCounts: Record<string, number> = {};
    for (const p of plans) {
      for (const t of p.triggers ?? []) {
        if (!t.includes("Data is limited")) {
          triggerCounts[t] = (triggerCounts[t] || 0) + 1;
        }
      }
    }
    const topTriggers = Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);

    const data: ReportData = {
      days,
      totalRecords: records.length,
      daysWithCheckIn: withCheckIn.length,
      daysWithWearable: withWearable.length,
      daysWithScore: withLbi.length,
      avgBalance: avgOf(lbiValues),
      avgSleep: sleepValues.length > 0 ? Math.round(avgOf(sleepValues.map((s) => Math.round(s * 10))) / 10) : 0,
      avgRecovery: avgOf(recoveryValues),
      balanceTrend: trendDirection(lbiValues),
      sleepTrend: trendDirection(sleepValues.map((s) => Math.round(s * 10))),
      bestDay,
      hardestDay,
      recoveryDays,
      normalDays,
      adherenceRate,
      topTriggers,
    };

    setReportData(data);
    setReport(buildReadableReport(data));
  }, [days]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onCopyReport = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(report);
      Alert.alert("Copied", "Your report has been copied to clipboard.");
    } catch (e: any) {
      Alert.alert("Copy failed", e?.message ?? "Unknown error");
    }
  }, [report]);

  const onShareReport = useCallback(async () => {
    try {
      await Share.share({ message: report, title: "Life Balance Report" });
    } catch {}
  }, [report]);

  const onSaveReport = useCallback(async () => {
    try {
      const exportDir = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}life-balance-exports`;
      await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
      const reportPath = `${exportDir}/life-balance-report-${days}d.txt`;
      await FileSystem.writeAsStringAsync(reportPath, report);

      // Also save raw JSON for research purposes
      const jsonPath = `${exportDir}/research-data-${days}d.json`;
      const jsonData = await exportPlans(days);
      await FileSystem.writeAsStringAsync(jsonPath, jsonData);

      Alert.alert("Saved", `Report saved to:\n${exportDir}\n\nIncludes a readable report and raw data for research.`);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Could not write files.");
    }
  }, [days, report]);

  return (
    <Screen scroll>
      {/* Header */}
      <Text
        style={{
          color: c.text.tertiary,
          fontSize: Typography.fontSize.xs,
          fontFamily: Typography.fontFamily.bold,
          letterSpacing: Typography.letterSpacing.allcaps,
          fontWeight: "800",
        }}
      >
        YOUR DATA
      </Text>
      <Text
        style={{
          color: c.text.primary,
          fontSize: 32,
          fontFamily: Typography.fontFamily.serifItalic,
          letterSpacing: -0.3,
          marginTop: 4,
          lineHeight: 38,
        }}
      >
        Export & Report
      </Text>
      <Text style={{ color: c.text.secondary, fontSize: 14, marginTop: 6, lineHeight: 20, maxWidth: 320 }}>
        A readable summary of your wellbeing data. Share it with your GP, therapist, coach, or keep it for yourself.
      </Text>

      {/* Time range selector */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: Spacing.base }}>
        {[7, 14, 30].map((n) => {
          const active = n === days;
          return (
            <Pressable
              key={n}
              onPress={() => setDays(n)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: BorderRadius.full,
                borderWidth: 1,
                backgroundColor: active ? c.accent.primary : "transparent",
                borderColor: active ? c.accent.primary : c.border.medium,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : c.text.primary }}>
                {n} days
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Summary stats */}
      {reportData && reportData.totalRecords > 0 && (
        <GlassCard style={{ marginTop: Spacing.md }} padding="base">
          <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 10 }}>
            WHAT'S IN THIS REPORT
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            <StatBubble label="Days" value={reportData.totalRecords} c={c} />
            <StatBubble label="Check-ins" value={reportData.daysWithCheckIn} c={c} />
            <StatBubble label="Wearable" value={reportData.daysWithWearable} c={c} />
            {reportData.daysWithScore > 0 && <StatBubble label="Avg balance" value={reportData.avgBalance} c={c} />}
          </View>
        </GlassCard>
      )}

      {/* Key Insights Cards */}
      {reportData && reportData.daysWithScore > 0 && (
        <View style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
          {/* Balance overview */}
          <GlassCard padding="base">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: c.accent.primary + "22", alignItems: "center", justifyContent: "center" }}>
                <IconSymbol name="chart.bar" size={14} color={c.accent.primary} />
              </View>
              <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15 }}>Balance Overview</Text>
            </View>
            <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18 }}>
              Your average balance was {reportData.avgBalance} ({scoreWord(reportData.avgBalance)}) over the last {days} days. The overall direction is {reportData.balanceTrend}.
            </Text>
          </GlassCard>

          {/* Sleep */}
          {reportData.avgSleep > 0 && (
            <GlassCard padding="base">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: "#6B8BE822", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name="moon.fill" size={14} color="#6B8BE8" />
                </View>
                <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15 }}>Sleep</Text>
              </View>
              <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18 }}>
                Averaging {(Math.round(reportData.avgSleep * 10) / 10)} hours per night. Trend: {reportData.sleepTrend}.
                {reportData.avgSleep < 7 ? " You're under the recommended 7-9 hours — try winding down earlier." : " That's within a healthy range."}
              </Text>
            </GlassCard>
          )}

          {/* Plan adherence */}
          {(reportData.recoveryDays > 0 || reportData.normalDays > 0) && (
            <GlassCard padding="base">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: "#E0B27822", alignItems: "center", justifyContent: "center" }}>
                  <IconSymbol name="checklist" size={14} color="#E0B278" />
                </View>
                <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15 }}>Plans & Actions</Text>
              </View>
              <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18 }}>
                {reportData.recoveryDays} recovery day{reportData.recoveryDays !== 1 ? "s" : ""} and {reportData.normalDays} normal day{reportData.normalDays !== 1 ? "s" : ""}.
                {reportData.adherenceRate > 0 ? ` You completed ${reportData.adherenceRate}% of suggested actions.` : ""}
              </Text>
            </GlassCard>
          )}
        </View>
      )}

      {/* Report preview (flip card) */}
      {report.length > 0 && (
        <View style={{ marginTop: Spacing.md }}>
          <FlipCard
            flipped={flipPreview}
            onToggle={() => setFlipPreview((v) => !v)}
            accessibilityLabel="Report preview"
            front={
              <GlassCard padding="base">
                <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8 }}>
                  FULL REPORT PREVIEW
                </Text>
                <Text numberOfLines={8} style={{ color: c.text.secondary, fontSize: 12, lineHeight: 17, fontFamily: "Menlo" }}>
                  {report}
                </Text>
                <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 8, fontWeight: "600" }}>
                  Tap to see the full report
                </Text>
              </GlassCard>
            }
            back={
              <GlassCard padding="base">
                <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8 }}>
                  FULL REPORT
                </Text>
                <Text selectable style={{ color: c.text.primary, fontSize: 12, lineHeight: 17, fontFamily: "Menlo" }}>
                  {report}
                </Text>
                <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 8, textAlign: "center", fontWeight: "600" }}>
                  Tap to collapse
                </Text>
              </GlassCard>
            }
          />
        </View>
      )}

      {/* Action buttons */}
      <View style={{ gap: 10, marginTop: Spacing.md }}>
        <Pressable
          onPress={onShareReport}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: c.accent.primary },
            pressed && { opacity: 0.9 },
          ]}
        >
          <IconSymbol name="square.and.arrow.up" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Share report</Text>
        </Pressable>

        <Pressable
          onPress={onCopyReport}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: c.border.medium },
            pressed && { opacity: 0.9 },
          ]}
        >
          <IconSymbol name="doc.on.doc" size={16} color={c.text.primary} />
          <Text style={[styles.actionBtnText, { color: c.text.primary }]}>Copy to clipboard</Text>
        </Pressable>

        <Pressable
          onPress={onSaveReport}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: c.border.medium },
            pressed && { opacity: 0.9 },
          ]}
        >
          <IconSymbol name="arrow.down.doc" size={16} color={c.text.primary} />
          <Text style={[styles.actionBtnText, { color: c.text.primary }]}>Save to device</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <Text
        style={{
          color: c.text.tertiary,
          fontSize: 11,
          textAlign: "center",
          marginTop: Spacing.lg,
          marginBottom: Spacing.sm,
          lineHeight: 16,
        }}
      >
        All data stays on your device. Reports contain no identifying information.
      </Text>
    </Screen>
  );
}

function StatBubble({ label, value, c }: { label: string; value: number; c: typeof Colors.light }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color: c.text.primary, fontSize: 20, fontWeight: "900" }}>{value}</Text>
      <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
