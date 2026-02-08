import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { TabSwipe } from "@/components/TabSwipe";

const TAB_ORDER = ["/", "/checkin", "/insights", "/history", "/profile"] as const;

function Row({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
			<GlassCard padding={0}>
				<View style={styles.row}>
					<View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: c.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.rowSubtitle, { color: c.muted }]}>{subtitle}</Text>
          ) : null}
					</View>
					<Text style={[styles.chev, { color: c.muted }]}>›</Text>
				</View>
			</GlassCard>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen>
      <Text style={[styles.title, { color: c.text }]}>Profile</Text>
      <Text style={[styles.subtitle, { color: c.muted }]}>Preferences, data, and tools.</Text>

      <View style={{ height: 12 }} />

      <Row
        title="Settings"
        subtitle="Notifications, theme, demo mode"
        onPress={() => router.push("/profile/settings" as any)}
      />

      <Row
        title="History"
        subtitle="Your past check-ins"
        onPress={() => router.push("/history" as any)}
      />

      <Row
        title="Export"
        subtitle="Download your data"
        onPress={() => router.push("/profile/export" as any)}
      />

      <Row
        title="Wearables"
        subtitle="Import CSV and manage sources"
        onPress={() => router.push("/insights" as any)}
      />
    </Screen>
    </TabSwipe>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 13 },
  row: { paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10, flexDirection: "row", alignItems: "center" },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowSubtitle: { fontSize: 12, marginTop: 2 },
  chev: { fontSize: 20, marginLeft: 10 },
});