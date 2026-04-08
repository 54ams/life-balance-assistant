import * as Clipboard from "expo-clipboard";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { GlassCard } from "@/components/ui/glass-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { todayISO } from "@/lib/util/todayISO";
import { setInsightsSelectedDate } from "@/lib/insightsDate";
import { getAllDays } from "@/lib/storage";
import { analyticsToMarkdown, buildAnalyticsSummary } from "@/lib/analytics";
import type { ISODate } from "@/lib/types";

export default function AnalyticsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<ISODate>(todayISO());
  const [md, setMd] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const days = (await getAllDays()).filter((d) => d.date <= date);
      const summary = buildAnalyticsSummary(days, 30);
      setMd(analyticsToMarkdown(summary));
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

  return (
    <Screen scroll contentStyle={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text.primary }]}>Analytics</Text>
          <Text style={[styles.subtitle, { color: c.text.secondary }]}>
            Pilot stats + correlations (last 30 days)
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

      <GlassCard padding="base">
        <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary }}>How to use this in your report</Text>
        <Text style={{ marginTop: 8, color: c.text.secondary, lineHeight: 18 }}>
          Copy the markdown summary into your appendix or notes. If you need raw data, use the JSON export in Profile → Export.
          Correlations are exploratory (pilot-sized) and meant to support discussion, not prove causality. Data imported from WHOOP where connected.
        </Text>

        <View style={styles.btnRow}>
          <Pressable
            onPress={copyMarkdown}
            disabled={loading || !md}
            style={({ pressed }) => [
              styles.btn,
              { opacity: loading || !md ? 0.5 : 1, backgroundColor: pressed ? "rgba(0,0,0,0.06)" : "transparent", borderColor: "rgba(255,255,255,0.10)" },
            ]}
          >
            <Text style={[styles.btnText, { color: c.text.primary }]}>Copy summary (markdown)</Text>
          </Pressable>
        </View>
      </GlassCard>

      <GlassCard padding="base">
        <Text style={{ fontSize: 14, fontWeight: "900", color: c.text.primary }}>
          Preview
        </Text>
        <Text style={{ marginTop: 10, color: c.text.secondary, lineHeight: 18 }}>
          {loading ? "Loading analytics…" : md || "No analytics yet."}
        </Text>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 18, gap: 12 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: "900" },
  subtitle: { marginTop: 2, fontSize: 13, fontWeight: "600" },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, alignItems: "center" },
  btnText: { fontSize: 13, fontWeight: "800" },
});
