import { StyleSheet, Text } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function AboutScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <Text style={[styles.h1, { color: c.text }]}>About</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Life Balance Assistant — synoptic prototype.</Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>What it does</Text>
        <Text style={[styles.p, { color: c.muted }]}>Generates a daily Life Balance Index (LBI) and a short, actionable plan.
          Wearable CSVs can improve accuracy and explainability.</Text>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: c.text }]}>Prototype scope</Text>
        <Text style={[styles.p, { color: c.muted }]}>All data is stored locally. AI integrations (summaries, coaching) are intentionally out of scope for the current build and discussed in the report as future work.</Text>
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
