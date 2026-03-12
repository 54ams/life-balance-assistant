import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

function LinkRow({ label, url }: { label: string; url: string }) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      style={[styles.link, { borderColor: c.border.medium }]}
    >
      <Text style={{ color: c.text.primary, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export default function HelpResourcesScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <Text style={[styles.h1, { color: c.text.primary }]}>Safety resources</Text>
      <Text style={[styles.sub, { color: c.text.secondary }]}>
        This app is not a crisis service. If you may be in danger, use immediate support.
      </Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Immediate help</Text>
        <View style={{ gap: 8, marginTop: 10 }}>
          <LinkRow label="Call 112 / local emergency services" url="tel:112" />
          <LinkRow label="Call 988 (US crisis line)" url="tel:988" />
          <LinkRow label="Befrienders worldwide helplines" url="https://www.befrienders.org/" />
        </View>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>When to use this</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          If you notice escalating distress, self-harm thoughts, or inability to stay safe, contact professional support now.
        </Text>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: "800" },
  sub: { marginTop: 6, marginBottom: 14 },
  card: { padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800" },
  body: { marginTop: 8, lineHeight: 18 },
  link: { borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
});
