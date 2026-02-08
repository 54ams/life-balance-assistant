import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

function Row({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ marginBottom: 12 }}>
      <GlassCard>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{title}</Text>
            {!!subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
          </View>
          <Text style={styles.chev}>›</Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

export default function SettingsTab() {
  const scheme = useColorScheme();
  const C = Colors[scheme ?? "light"];

  return (
    <Screen scroll>
      <Text style={[styles.h1, { color: C.text }]}>Settings</Text>
      <Text style={[styles.sub, { color: C.muted }]}>
        Preferences, data, and tools.
      </Text>

      <View style={{ height: 16 }} />

      <Row
        title="Notifications"
        subtitle="Daily check-in reminder"
        onPress={() => router.push("/profile/settings/notifications" as any)}
      />
      <Row
        title="Data & privacy"
        subtitle="What is stored locally and how exports work"
        onPress={() => router.push("/profile/settings/data" as any)}
      />
      <Row
        title="Demo tools"
        subtitle="Seed data and test reminders"
        onPress={() => router.push("/profile/settings/demo" as any)}
      />
      <Row
        title="About"
        subtitle="Project version and credits"
        onPress={() => router.push("/profile/settings/about" as any)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 34, fontWeight: "800" },
  sub: { marginTop: 6, fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  rowTitle: { fontSize: 16, fontWeight: "800" },
  rowSub: { marginTop: 4, fontSize: 13, opacity: 0.85 },
  chev: { fontSize: 26, opacity: 0.5, marginLeft: 10 },
});
