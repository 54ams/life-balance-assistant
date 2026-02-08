import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { clearAllPlans } from "@/lib/storage";

export default function DataSettings() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [busy, setBusy] = useState(false);

  const onReset = async () => {
    setBusy(true);
    try {
      await clearAllPlans();
      Alert.alert("Reset", "All stored plans were cleared.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <Text style={[styles.h1, { color: c.text }]}>Data & privacy</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Everything is stored locally on-device for the prototype.</Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Local storage</Text>
        <Text style={[styles.cardSub, { color: c.muted }]}>Check-ins, wearable imports, and plans are stored in AsyncStorage.</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Reset demo data</Text>
        <Text style={[styles.cardSub, { color: c.muted }]}>Clears saved plan outputs so you can re-demo from scratch.</Text>
        <Pressable disabled={busy} style={[styles.btn, { backgroundColor: c.tint, opacity: busy ? 0.6 : 1 }]} onPress={onReset}>
          <Text style={styles.btnText}>{busy ? "Clearing…" : "Clear saved plans"}</Text>
        </Pressable>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 34, fontWeight: "800" },
  sub: { marginTop: 4, marginBottom: 14 },
  card: { padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardSub: { marginTop: 6, marginBottom: 12, lineHeight: 18 },
  btn: { paddingVertical: 12, borderRadius: 999, alignItems: "center" },
  btnText: { fontWeight: "800", color: "#fff" },
});
