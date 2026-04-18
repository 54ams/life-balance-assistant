import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { AppConsent, getAppConsent, saveAppConsent, withdrawAllConsent } from "@/lib/privacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBackendBaseUrl } from "@/lib/backend";

const VERSION = "2026-04-16";

type ConsentFlags = AppConsent["items"];

const ALL_TRUE: ConsentFlags = {
  dataProcessing: true,
  whoopImport: true,
  exportForResearch: true,
  nonMedicalUse: true,
};

export default function ConsentSafetyScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [flags, setFlags] = useState<ConsentFlags>(ALL_TRUE);
  const [consentedAt, setConsentedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const existing = await getAppConsent();
      if (!existing) return;
      setFlags(existing.items);
      setConsentedAt(existing.consentedAt);
    })();
  }, []);

  const toggle = (k: keyof ConsentFlags) => {
    setFlags((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const save = async () => {
    if (!Object.values(flags).every(Boolean)) {
      Alert.alert("Consent incomplete", "All items must be accepted to enable insights and WHOOP.");
      return;
    }
    const payload: AppConsent = {
      consentedAt: new Date().toISOString(),
      privacyVersion: VERSION,
      items: flags,
    };
    await saveAppConsent(payload);
    setConsentedAt(payload.consentedAt);
    Alert.alert("Saved", "Consent recorded. Insights and integrations remain enabled.");
  };

  const withdraw = async () => {
    const session = await AsyncStorage.getItem("whoop_session_token");
    const backendUrl = getBackendBaseUrl();
    if (session && backendUrl) {
      try {
        await fetch(`${backendUrl}/whoop/session`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session}` },
        });
      } catch {}
    }
    await withdrawAllConsent();
    setConsentedAt(null);
    Alert.alert("Withdrawn", "Consent withdrawn. Local study data was cleared, WHOOP disconnected, and the app will require consent again.");
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <Text style={[styles.h1, { color: c.text.primary }]}>Consent & safety</Text>
      <Text style={[styles.sub, { color: c.text.secondary }]}>
        Explicit consent is required before insights and wearable sync.
      </Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Current status</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          {consentedAt ? `Consented at ${consentedAt}` : "Not consented"}
        </Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>Policy version: {VERSION}</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Please confirm</Text>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Check label="I agree to local processing of wellbeing data." checked={flags.dataProcessing} onPress={() => toggle("dataProcessing")} />
          <Check label="I agree to optional WHOOP import for this prototype." checked={flags.whoopImport} onPress={() => toggle("whoopImport")} />
          <Check label="I understand my exports may be used (anonymously) to help improve this app." checked={flags.exportForResearch} onPress={() => toggle("exportForResearch")} />
          <Check label="I understand this is not medical advice or a crisis service." checked={flags.nonMedicalUse} onPress={() => toggle("nonMedicalUse")} />
        </View>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>If things feel too heavy</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          In an emergency, call 999. For someone to talk to any time, call Samaritans on 116 123 (free, 24/7). You'll find more options in Settings → Safety resources.
        </Text>
      </GlassCard>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
        <Pressable style={[styles.btn, { backgroundColor: c.accent.primary }]} onPress={save}>
          <Text style={styles.btnText}>Save consent</Text>
        </Pressable>
        <Pressable style={[styles.btn, { backgroundColor: c.danger ?? "#ef4444" }]} onPress={withdraw}>
          <Text style={styles.btnText}>Withdraw consent</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Check({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={[styles.check, { borderColor: c.border.medium }]}
    >
      <Text style={{ color: c.text.primary, fontWeight: "700" }}>{checked ? "☑" : "☐"} {label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: "800" },
  sub: { marginTop: 6, marginBottom: 14 },
  card: { padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800" },
  body: { marginTop: 6, lineHeight: 18 },
  check: { borderWidth: 1, borderRadius: 12, padding: 10 },
  btn: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 999 },
  btnText: { color: "#fff", fontWeight: "800" },
});
