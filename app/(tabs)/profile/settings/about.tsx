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
      <Text style={[styles.sub, { color: c.text.secondary }]}>Life Balance Assistant — a prototype wellbeing app.</Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>What it does</Text>
        <Text style={[styles.p, { color: c.text.secondary }]}>Brings together how your body is doing (from a WHOOP wearable if you have one) and how your mind is doing (from short daily check-ins) into a single daily picture, with gentle suggestions when things feel off. You can also type in wearable numbers by hand if you'd rather not connect a device.</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>What this is, and isn't</Text>
        <Text style={[styles.p, { color: c.text.secondary }]}>Your data stays on this device. The only thing kept on a server is your WHOOP login, and only if you choose to connect one. This is a prototype for personal reflection — not medical advice, not a crisis service, not a substitute for seeing a professional.</Text>
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
