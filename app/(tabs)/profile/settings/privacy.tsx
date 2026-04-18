import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { StyleSheet, Text } from "react-native";

export default function PrivacyNoticeScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <Text style={[styles.h1, { color: c.text.primary }]}>Privacy notice</Text>
      <Text style={[styles.sub, { color: c.text.secondary }]}>
        A plain-English summary of what we store, why, and how you stay in control.
      </Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>What we store</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          Your daily check-ins, emotion notes, the numbers from your WHOOP wearable (if you connect one), the short plans the app suggests, and your answers to any feedback questions. That's it — no name, email, or anything that could identify you.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Why we store it</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          So you can look back, spot patterns in how your body and mind track together, and get gentle suggestions that are actually about your week — not a generic one.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Where it lives</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          Everything stays on this device. The only thing that ever leaves is your WHOOP login, and only if you choose to connect one — those tokens live on a small server we run, nothing else. Exports only happen when you tap the export button.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Keeping things tidy</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          You pick how long the app keeps data (7 days up to a year). You can clear old data any time, delete everything in one tap, or withdraw consent — which also disconnects WHOOP and switches off insights.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>What this isn't</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          Not medical advice. Not a diagnosis. Patterns are observations, not causes — "X and Y go together" doesn't mean "X caused Y". Nothing here should shape a health decision on its own.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Your rights (UK GDPR)</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          You can export your data, delete all of it, withdraw consent, and change how long things are kept — all from Settings. No part of this app makes automated decisions about you.
        </Text>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: "800" },
  sub: { marginTop: 4, marginBottom: 14 },
  card: { padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  body: { lineHeight: 18, fontSize: 13 },
});
