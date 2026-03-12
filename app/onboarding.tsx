import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { saveAppConsent, type AppConsent } from "@/lib/privacy";

const VERSION = "2026-03-12";

type ConsentFlags = AppConsent["items"];

const INITIAL_FLAGS: ConsentFlags = {
  dataProcessing: false,
  whoopImport: false,
  exportForResearch: false,
  nonMedicalUse: false,
};

export default function OnboardingScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [flags, setFlags] = useState<ConsentFlags>(INITIAL_FLAGS);

  const toggle = (key: keyof ConsentFlags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const continueIntoApp = async () => {
    if (!Object.values(flags).every(Boolean)) {
      Alert.alert("Consent required", "You must accept all items to use the prototype.");
      return;
    }
    await saveAppConsent({
      consentedAt: new Date().toISOString(),
      privacyVersion: VERSION,
      items: flags,
    });
    router.replace("/");
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: 18, paddingBottom: 28 }}>
      <Text style={[styles.h1, { color: c.text.primary }]}>Life Balance Assistant</Text>
      <Text style={[styles.sub, { color: c.text.secondary }]}>
        This prototype combines wearable data, emotional self-report, and lifestyle signals to generate an explainable Life Balance Index and daily recommendations.
      </Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>What to expect</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>1. Complete a daily check-in.</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>2. Sync WHOOP or add wearable values manually if WHOOP is unavailable.</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>3. Review your score, daily plan, explanations, and trends.</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Consent</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          This app is for reflective wellbeing support only. It is not medical advice, not crisis support, and all analytics are observational.
        </Text>
        <View style={{ gap: 10, marginTop: 10 }}>
          <Check label="I agree to local processing of wellbeing data." checked={flags.dataProcessing} onPress={() => toggle("dataProcessing")} />
          <Check label="I understand WHOOP integration is optional and separately consented." checked={flags.whoopImport} onPress={() => toggle("whoopImport")} />
          <Check label="I understand exports may be used for dissertation research." checked={flags.exportForResearch} onPress={() => toggle("exportForResearch")} />
          <Check label="I understand this app is non-diagnostic and not crisis support." checked={flags.nonMedicalUse} onPress={() => toggle("nonMedicalUse")} />
        </View>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Safety</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          If you may be at immediate risk, use emergency services or a crisis line such as 988 in the US. Continue only if this prototype is appropriate for your situation.
        </Text>
      </GlassCard>

      <Pressable style={[styles.btn, { backgroundColor: c.accent.primary }]} onPress={continueIntoApp}>
        <Text style={styles.btnText}>Continue into app</Text>
      </Pressable>
    </Screen>
  );
}

function Check({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  return (
    <Pressable onPress={onPress} style={[styles.check, { borderColor: c.border.medium }]}>
      <Text style={{ color: c.text.primary, fontWeight: "700" }}>{checked ? "☑" : "☐"} {label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: "800" },
  sub: { marginTop: 6, marginBottom: 14, lineHeight: 20 },
  card: { padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800" },
  body: { marginTop: 6, lineHeight: 18 },
  check: { borderWidth: 1, borderRadius: 12, padding: 10 },
  btn: { paddingVertical: 12, borderRadius: 999, alignItems: "center", marginTop: 6 },
  btnText: { color: "#fff", fontWeight: "800" },
});
