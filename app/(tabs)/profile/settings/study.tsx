import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { listDailyRecords, listPlans } from "@/lib/storage";
import { listSusSubmissions } from "@/lib/evaluation/storage";

export default function StudyCompletionScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [summary, setSummary] = useState({ records: 0, plans: 0, sus: 0 });

  useEffect(() => {
    (async () => {
      const [records, plans, sus] = await Promise.all([
        listDailyRecords(30),
        listPlans(30),
        listSusSubmissions(),
      ]);
      setSummary({ records: records.length, plans: plans.length, sus: sus.length });
    })();
  }, []);

  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <Text style={[styles.h1, { color: c.text.primary }]}>Study completion</Text>
      <Text style={[styles.sub, { color: c.text.secondary }]}>
        Use this flow at the end of pilot participation so usability and export evidence are captured consistently.
      </Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Readiness snapshot</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>Records in last 30 days: {summary.records}</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>Saved plans in last 30 days: {summary.plans}</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>SUS submissions on device: {summary.sus}</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          Recommended minimum before write-up: multiple days of check-in + wearable data, saved plans, and at least one SUS submission.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Step 1</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>Complete the in-app SUS survey and optional feedback.</Text>
        <Pressable style={[styles.btn, { backgroundColor: c.accent.primary }]} onPress={() => router.push("/profile/settings/usability" as any)}>
          <Text style={styles.btnText}>Open SUS survey</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Step 2</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>Export the anonymised research bundle and archive it for analysis.</Text>
        <Pressable style={[styles.btn, { backgroundColor: c.accent.primary }]} onPress={() => router.push("/profile/export" as any)}>
          <Text style={styles.btnText}>Open export tools</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Step 3</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          Capture screenshots of Home, Explain, Weekly reflection, and Export for the dissertation appendix.
        </Text>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: "800" },
  sub: { marginTop: 6, marginBottom: 14, lineHeight: 20 },
  card: { padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800" },
  body: { marginTop: 6, lineHeight: 18 },
  btn: { marginTop: 12, paddingVertical: 12, borderRadius: 999, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800" },
});
