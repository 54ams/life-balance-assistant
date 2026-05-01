import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
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
      <ScreenHeader
        title="Wrapping up"
        subtitle="If you've been trying the app for a while, this is a tidy way to share your feedback and take a copy of your data with you."
      />

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Where you are</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>Check-ins in the last 30 days: {summary.records}</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>Plans saved in the last 30 days: {summary.plans}</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>Feedback surveys saved on this device: {summary.sus}</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          A good stopping point is a handful of check-ins, a few plans, and one short feedback survey.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Step 1 — Share feedback</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>A short survey about how the app felt to use. Takes a minute.</Text>
        <Pressable style={[styles.btn, { backgroundColor: c.accent.primary }]} onPress={() => router.push("/profile/settings/usability" as any)}>
          <Text style={[styles.btnText, { color: c.onPrimary }]}>Open survey</Text>
        </Pressable>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Step 2 — Take a copy</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>Save your check-ins, plans, and patterns as a file on this device.</Text>
        <Pressable style={[styles.btn, { backgroundColor: c.accent.primary }]} onPress={() => router.push("/profile/export" as any)}>
          <Text style={[styles.btnText, { color: c.onPrimary }]}>Open export</Text>
        </Pressable>
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
