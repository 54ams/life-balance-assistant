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
        This app is not a crisis service. If you are in danger or need someone to talk to right now, please use one of the options below.
      </Text>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Right now</Text>
        <View style={{ gap: 8, marginTop: 10 }}>
          <LinkRow label="999 — Emergency services" url="tel:999" />
          <LinkRow label="Samaritans — 116 123 (free, 24/7)" url="tel:116123" />
          <LinkRow label="Shout — text SHOUT to 85258" url="sms:85258&body=SHOUT" />
        </View>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>Other support</Text>
        <View style={{ gap: 8, marginTop: 10 }}>
          <LinkRow label="NHS 111 — non-urgent health advice" url="tel:111" />
          <LinkRow label="Mind — information and support" url="https://www.mind.org.uk/" />
          <LinkRow label="CALM — helpline for men (5pm–midnight)" url="tel:0800585858" />
        </View>
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={[styles.title, { color: c.text.primary }]}>When to use this page</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>
          If you notice rising distress, thoughts of harming yourself, or you can't stay safe, please reach out — now. You don't have to wait for it to get worse.
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
