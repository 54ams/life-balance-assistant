import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { exportPlans, exportModelSensitivity } from "@/lib/export";
import { analyticsToMarkdown, buildAnalyticsSummary } from "@/lib/analytics";
import { getAllDays } from "@/lib/storage";
import { buildAppendixSummary } from "@/lib/report";

export default function ExportScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [days, setDays] = useState(7);
  const [payload, setPayload] = useState<string>("{}");
  const [appendix, setAppendix] = useState<string>("");

  const refresh = useCallback(async () => {
    const out = await exportPlans(days);
    setPayload(out);
    setAppendix(await buildAppendixSummary(days));
  }, [days]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(payload);
      Alert.alert("Copied", "Plans JSON copied to clipboard.");
    } catch (e: any) {
      Alert.alert("Copy failed", e?.message ?? "Unknown error");
    }
  }, [payload]);

  const onCopyDatasetJson = useCallback(async () => {
    try {
      const txt = await exportPlans(days);
      await Clipboard.setStringAsync(txt);
      Alert.alert("Copied", "Research JSON copied to clipboard.");
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Unknown error");
    }
  }, [days]);

  const onCopySensitivity = useCallback(async () => {
    try {
      const txt = exportModelSensitivity();
      await Clipboard.setStringAsync(txt);
      Alert.alert("Copied", "Model sensitivity JSON copied to clipboard.");
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Unknown error");
    }
  }, []);

  const onSaveFiles = useCallback(async () => {
    try {
      const exportDir = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}life-balance-exports`;
      await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
      const jsonPath = `${exportDir}/research-export-${days}d.json`;
      const sensitivityPath = `${exportDir}/model-sensitivity.json`;
      const analyticsPath = `${exportDir}/analytics-summary-${days}d.md`;
      const appendixPath = `${exportDir}/appendix-summary-${days}d.txt`;
      await FileSystem.writeAsStringAsync(jsonPath, await exportPlans(days));
      await FileSystem.writeAsStringAsync(sensitivityPath, exportModelSensitivity());
      const records = (await getAllDays()).slice(-Math.max(days, 30));
      await FileSystem.writeAsStringAsync(analyticsPath, analyticsToMarkdown(buildAnalyticsSummary(records, 30)));
      await FileSystem.writeAsStringAsync(appendixPath, await buildAppendixSummary(days));
      Alert.alert("Saved", `Export files written to:\n${exportDir}`);
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Could not write export files.");
    }
  }, [days]);

  const subtitle = useMemo(
    () =>
      "Download a copy of your check-ins, plans, and any patterns the app has spotted. You own this — take it with you any time.",
    []
  );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text.primary }]}>Export ({days} days)</Text>
        <Text style={[styles.subtitle, { color: c.text.secondary }]}>{subtitle}</Text>
      </View>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>How to copy</Text>
        <Text style={[styles.cardText, { color: c.text.secondary }]}>Tap Copy to put the JSON on your clipboard.</Text>
        <View style={styles.controlsRow}>
          <View style={styles.daysRow}>
            {[1, 7, 14, 30].map((n) => {
              const active = n === days;
              return (
                <Pressable
                  key={n}
                  onPress={() => setDays(n)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? c.accent.primary : "transparent",
                      borderColor: c.border.medium,
                    },
                  ]}
                >
                  <Text style={[styles.pillText, { color: active ? "#fff" : c.text.primary }]}>{n}d</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={onCopy} style={[styles.copyBtn, { backgroundColor: c.accent.primary }]}>
            <Text style={styles.copyText}>Copy plans JSON</Text>
          </Pressable>
          <Pressable onPress={onCopyDatasetJson} style={[styles.copyBtn, { backgroundColor: c.accent.primary }]}>
            <Text style={styles.copyText}>Copy research JSON</Text>
          </Pressable>
          <Pressable onPress={onCopySensitivity} style={[styles.copyBtn, { backgroundColor: c.accent.primary }]}>
            <Text style={styles.copyText}>Copy model sensitivity</Text>
          </Pressable>
          <Pressable onPress={onSaveFiles} style={[styles.copyBtn, { backgroundColor: c.accent.primary }]}>
            <Text style={styles.copyText}>Save export files</Text>
          </Pressable>
          {/* CSV exports removed from UI; JSON exports retained */}
        </View>
      </GlassCard>

      <GlassCard style={styles.codeCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={[styles.code, { color: c.text.primary, opacity: 0.95 }]} selectable>
            {payload}
          </Text>
        </ScrollView>
      </GlassCard>

      <GlassCard style={styles.codeCard}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Appendix summary preview</Text>
        <Text style={[styles.cardText, { color: c.text.secondary }]}>
          This is the short report-facing summary that is also saved to the export bundle.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <Text style={[styles.code, { color: c.text.primary, opacity: 0.95 }]} selectable>
            {appendix || "No summary yet."}
          </Text>
        </ScrollView>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 18, maxWidth: 320 },
  card: { padding: 14, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardText: { fontSize: 13, lineHeight: 18 },
  controlsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, flexWrap: "wrap", gap: 10 },
  daysRow: { flexDirection: "row", gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: "700" },
  copyBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  copyText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  codeCard: { padding: 14, marginTop: 12 },
  code: { fontFamily: "Menlo", fontSize: 12, lineHeight: 16 },
});
