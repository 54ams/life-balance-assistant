import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { getBackendBaseUrl } from "@/lib/backend";

const CONSENT_KEY = "whoop_consent_v1";

export default function WhoopConsentScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [consentAt, setConsentAt] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY).then(setConsentAt);
  }, []);

  const consent = async () => {
    const ts = new Date().toISOString();
    await AsyncStorage.setItem(CONSENT_KEY, ts);
    setConsentAt(ts);
    Alert.alert("Saved", "WHOOP consent recorded.");
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
    await AsyncStorage.multiRemove([CONSENT_KEY, "whoop_session_token", "whoop_participant_id", "whoop_last_sync"]);
    setConsentAt(null);
    Alert.alert("Withdrawn", "Consent withdrawn and tokens cleared.");
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <Text style={[styles.h1, { color: c.text.primary }]}>WHOOP consent</Text>
      <Text style={[styles.sub, { color: c.text.secondary }]}>Control your WHOOP data linkage.</Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Status</Text>
        <Text style={{ color: c.text.secondary }}>Consent: {consentAt ? `Granted ${consentAt}` : "Not granted"}</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Actions</Text>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Pressable style={[styles.btn, { borderColor: c.border.medium }]} onPress={consent}>
            <Text style={[styles.btnText, { color: c.text.primary }]}>Grant consent</Text>
          </Pressable>
          <Pressable style={[styles.btn, { borderColor: c.danger ?? c.border.medium }]} onPress={withdraw}>
            <Text style={[styles.btnText, { color: c.text.primary }]}>Withdraw & clear tokens</Text>
          </Pressable>
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: "800" },
  sub: { marginTop: 4, marginBottom: 14 },
  card: { padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  btn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  btnText: { fontWeight: "800" },
});
