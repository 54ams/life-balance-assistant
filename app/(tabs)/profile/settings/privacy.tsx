import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
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
        Plain-language summary for dissertation prototype use.
      </Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Data types</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          Daily check-ins, emotional diary entries, optional WHOOP wearable metrics, generated plans, reminders, and evaluation responses (SUS).
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Purpose</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          To support reflective wellbeing tracking, compute LBI and explainable insights, and generate dissertation research evidence.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Storage & transfer</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          Mobile data is stored locally (AsyncStorage). WHOOP OAuth tokens are stored server-side only. Exports are manual and user-initiated.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Retention & deletion</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          You can choose retention window, run purge now, and delete all data from Settings. Withdrawing consent disconnects WHOOP and blocks insights.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Disclaimers</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          Not medical advice. Patterns are observational only. Correlation does not imply causation. Predictive outputs are exploratory and should not be used for health decisions.
        </Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Your rights (GDPR-oriented)</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          You can access your data (export), request erasure (delete all), withdraw consent, and limit retention. This prototype does not use automated clinical decisions.
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
