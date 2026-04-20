import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { generateGPExportData, generateGPExportHTML, type GPExportData } from "@/lib/gpExport";
import { listDailyRecords, getUserName } from "@/lib/storage";

export default function GPExportScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [data, setData] = useState<GPExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    (async () => {
      const records = await listDailyRecords(30);
      const exportData = await generateGPExportData(records, 28);
      setData(exportData);
      setLoading(false);
    })();
  }, []);

  const handleExport = async () => {
    if (!data) return;
    try {
      const userName = await getUserName();
      const html = generateGPExportHTML(data, userName || undefined);

      // Try expo-print if available, otherwise share as text
      try {
        const Print = require("expo-print");
        const Sharing = require("expo-sharing");
        const { uri } = await Print.printToFileAsync({ html, width: 612, height: 792 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share GP Summary" });
        }
      } catch {
        // Fallback: share as text summary
        Alert.alert(
          "Summary Generated",
          `${data.summary.checkInDays} check-ins over ${data.summary.totalDays} days.\nMood trend: ${data.summary.moodTrend}\nSleep avg: ${data.summary.avgSleepHours ?? "—"} hrs\n\nTo share as PDF, install expo-print.`,
        );
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setExported(true);
    } catch (err) {
      Alert.alert("Export failed", (err as any)?.message ?? "Unknown error");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground state="neutral" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <IconSymbol name="chevron.left" size={20} color={c.text.primary} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: c.text.primary }]}>Show Your GP</Text>
              <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                A clean summary for your appointment
              </Text>
            </View>
          </View>

          {/* Explanation */}
          <GlassCard style={{ marginTop: Spacing.lg }} padding="base">
            <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <IconSymbol name="cross.case.fill" size={24} color={c.accent.primary} />
              <Text style={{ color: c.text.secondary, fontSize: 14, lineHeight: 20, flex: 1 }}>
                This generates a 4-week summary of your mood, sleep, and self-care patterns.
                Designed to be useful in a 10-minute consultation — no jargon, just clear data.
              </Text>
            </View>
          </GlassCard>

          {loading ? (
            <Text style={{ color: c.text.tertiary, textAlign: "center", marginTop: Spacing.xxl }}>
              Generating your summary...
            </Text>
          ) : data ? (
            <>
              {/* Preview */}
              <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginTop: Spacing.xl }}>
                PREVIEW
              </Text>

              <GlassCard style={{ marginTop: Spacing.sm }} padding="base">
                <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "800" }}>
                  {data.dateRange.from} to {data.dateRange.to}
                </Text>

                <View style={{ marginTop: Spacing.md, gap: 8 }}>
                  <View style={styles.statRow}>
                    <Text style={{ color: c.text.secondary }}>Check-in days</Text>
                    <Text style={{ color: c.text.primary, fontWeight: "700" }}>{data.summary.checkInDays}/{data.summary.totalDays}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={{ color: c.text.secondary }}>Mood trend</Text>
                    <Text style={{ color: data.summary.moodTrend === "improving" ? "#10b981" : data.summary.moodTrend === "declining" ? "#ef4444" : c.text.primary, fontWeight: "700" }}>
                      {data.summary.moodTrend}
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={{ color: c.text.secondary }}>Average sleep</Text>
                    <Text style={{ color: c.text.primary, fontWeight: "700" }}>{data.summary.avgSleepHours ?? "—"} hrs</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={{ color: c.text.secondary }}>Average recovery</Text>
                    <Text style={{ color: c.text.primary, fontWeight: "700" }}>{data.summary.avgRecovery ?? "—"}%</Text>
                  </View>
                </View>
              </GlassCard>

              {data.concerns.length > 0 && (
                <>
                  <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginTop: Spacing.lg }}>
                    SELF-REPORTED CONCERNS
                  </Text>
                  {data.concerns.map((concern, i) => (
                    <GlassCard key={i} style={{ marginTop: Spacing.sm }} padding="base">
                      <Text style={{ color: c.text.primary, fontSize: 14 }}>{concern}</Text>
                    </GlassCard>
                  ))}
                </>
              )}

              {data.selfCareActions.length > 0 && (
                <>
                  <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginTop: Spacing.lg }}>
                    SELF-CARE ACTIONS BEING TAKEN
                  </Text>
                  {data.selfCareActions.map((action, i) => (
                    <GlassCard key={i} style={{ marginTop: Spacing.sm }} padding="base">
                      <Text style={{ color: "#10b981", fontSize: 14 }}>{action}</Text>
                    </GlassCard>
                  ))}
                </>
              )}

              {/* Export button */}
              <Pressable
                onPress={handleExport}
                style={[styles.exportBtn, { backgroundColor: exported ? "#10b981" : c.accent.primary }]}
              >
                <IconSymbol name={exported ? "checkmark" : "square.and.arrow.up"} size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
                  {exported ? "Exported" : "Export as PDF"}
                </Text>
              </Pressable>

              {/* Disclaimer */}
              <GlassCard style={{ marginTop: Spacing.lg }} padding="base">
                <Text style={{ color: c.text.tertiary, fontSize: 11, lineHeight: 16, fontStyle: "italic" }}>
                  {data.disclaimer}
                </Text>
              </GlassCard>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 14, marginTop: 2 },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  exportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: Spacing.xl, paddingVertical: 16, borderRadius: BorderRadius.xl },
});
