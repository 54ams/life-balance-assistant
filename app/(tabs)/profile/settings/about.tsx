import { StyleSheet, Text } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";

export default function AboutScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <Text style={[styles.h1, { color: c.text.primary }]}>About</Text>
      <Text style={[styles.sub, { color: c.text.secondary }]}>Life Balance Assistant — synoptic prototype.</Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>What it does</Text>
        <Text style={[styles.p, { color: c.text.secondary }]}>Generates a daily Life Balance Index (LBI), a short actionable plan, and transparent explanation screens using wearable and self-report data. WHOOP integration improves signal quality; manual wearable entry is available as a fallback.</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Prototype scope</Text>
        <Text style={[styles.p, { color: c.text.secondary }]}>All user data is stored locally on-device, with WHOOP tokens kept server-side. Predictive and reflective features are exploratory, non-medical, and intended for dissertation evaluation rather than clinical use.</Text>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 34, fontWeight: "800" },
  sub: { marginTop: 4, marginBottom: 14 },
  card: { padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  p: { lineHeight: 19 },
});
