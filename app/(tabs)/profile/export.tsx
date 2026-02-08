import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { exportPlans } from "@/lib/export";
import { exportDailyCsv, exportResearchJson, exportSusCsv } from "@/lib/researchExport";

export default function ExportScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [days, setDays] = useState(7);
  const [payload, setPayload] = useState<string>("{}");

  const refresh = useCallback(async () => {
    const out = await exportPlans(days);
    setPayload(out);
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
      const txt = await exportResearchJson(days);
      await Clipboard.setStringAsync(txt);
      Alert.alert("Copied", "Research JSON copied to clipboard.");
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Unknown error");
    }
  }, [days]);

  const onCopyDailyCsv = useCallback(async () => {
    try {
      const txt = await exportDailyCsv(days);
      await Clipboard.setStringAsync(txt);
      Alert.alert("Copied", "Daily CSV copied to clipboard.");
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Unknown error");
    }
  }, [days]);

  const onCopySusCsv = useCallback(async () => {
    try {
      const txt = await exportSusCsv();
      await Clipboard.setStringAsync(txt);
      Alert.alert("Copied", "SUS CSV copied to clipboard.");
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Unknown error");
    }
  }, []);

  const subtitle = useMemo(
    () =>
      "Use this in your evaluation appendix to evidence plan outputs, triggers and changes over time.",
    []
  );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Export ({days} days)</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>{subtitle}</Text>
      </View>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>How to copy</Text>
        <Text style={[styles.cardText, { color: c.muted }]}>Tap Copy to put the JSON on your clipboard.</Text>
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
                      backgroundColor: active ? c.accent : "transparent",
                      borderColor: c.border,
                    },
                  ]}
                >
                  <Text style={[styles.pillText, { color: active ? "#fff" : c.text }]}>{n}d</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={onCopy} style={[styles.copyBtn, { backgroundColor: c.accent }]}>
            <Text style={styles.copyText}>Copy plans JSON</Text>
          </Pressable>
          <Pressable onPress={onCopyDatasetJson} style={[styles.copyBtn, { backgroundColor: c.accent }]}>
            <Text style={styles.copyText}>Copy research JSON</Text>
          </Pressable>
          <Pressable onPress={onCopyDailyCsv} style={[styles.copyBtn, { backgroundColor: c.accent }]}>
            <Text style={styles.copyText}>Copy daily CSV</Text>
          </Pressable>
          <Pressable onPress={onCopySusCsv} style={[styles.copyBtn, { backgroundColor: c.accent }]}>
            <Text style={styles.copyText}>Copy SUS CSV</Text>
          </Pressable>
        </View>
      </GlassCard>

      <GlassCard style={styles.codeCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={[styles.code, { color: c.text, opacity: 0.95 }]} selectable>
            {payload}
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
