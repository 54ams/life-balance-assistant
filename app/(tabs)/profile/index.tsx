import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/Colors";
import { TAB_ORDER } from "@/constants/navigation";
import { useColorScheme } from "react-native";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { TabSwipe } from "@/components/TabSwipe";

function Row({
  title,
  subtitle,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
    >
			<GlassCard padding="base">
				<View style={styles.row}>
					<View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: c.text.primary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.rowSubtitle, { color: c.text.secondary }]}>{subtitle}</Text>
          ) : null}
					</View>
					<Text style={[styles.chev, { color: c.text.tertiary }]}>›</Text>
				</View>
			</GlassCard>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? Colors.dark : Colors.light;

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen>
      <Text style={[styles.title, { color: c.text.primary }]}>Profile</Text>
      <Text style={[styles.subtitle, { color: c.text.secondary }]}>Preferences, data, and tools.</Text>

      <View style={{ height: 12 }} />

      <Row
        title="Settings"
        subtitle="Notifications, theme, demo mode"
        onPress={() => router.push("/profile/settings" as any)}
        accessibilityLabel="Open settings"
      />

      <Row
        title="Calendar"
        subtitle="Review past days and future contexts"
        onPress={() => router.push("/calendar" as any)}
        accessibilityLabel="Open calendar"
      />

      <Row
        title="History"
        subtitle="Review saved days, plans, and adherence"
        onPress={() => router.push("/history" as any)}
        accessibilityLabel="Open history"
      />

      <Row
        title="Export"
        subtitle="Download your data"
        onPress={() => router.push("/profile/export" as any)}
        accessibilityLabel="Open export"
      />

      <Row
        title="Wearables"
        subtitle="Connect WHOOP and manage sources"
        onPress={() => router.push("/profile/integrations/whoop" as any)}
        accessibilityLabel="Open wearables and insights"
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
