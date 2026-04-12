import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { TAB_ORDER } from "@/constants/navigation";
import { useColorScheme } from "react-native";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TabSwipe } from "@/components/TabSwipe";

const SECTIONS: Array<{ title: string; subtitle: string; icon: any; route: string }> = [
  { title: "Settings", subtitle: "Notifications, theme, demo mode", icon: "gearshape.fill", route: "/profile/settings" },
  { title: "Calendar", subtitle: "Review past and future days", icon: "calendar", route: "/calendar" },
  { title: "History", subtitle: "Plans, adherence, and outcomes", icon: "clock.fill", route: "/history" },
  { title: "Export", subtitle: "Download your data for research", icon: "square.and.arrow.up", route: "/profile/export" },
  { title: "Wearables", subtitle: "Connect WHOOP and manage sources", icon: "heart.fill", route: "/profile/integrations/whoop" },
];

export default function ProfileScreen() {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? Colors.dark : Colors.light;

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll>
        <Text style={[styles.title, { color: c.text.primary }]}>Profile</Text>
        <Text style={[styles.subtitle, { color: c.text.secondary }]}>Preferences, data, and tools.</Text>

        <View style={{ gap: Spacing.sm, marginTop: Spacing.base }}>
          {SECTIONS.map((s) => (
            <Pressable
              key={s.route}
              onPress={() => router.push(s.route as any)}
              accessibilityLabel={s.title}
              accessibilityRole="button"
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}
            >
              <GlassCard padding="base">
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: c.glass.secondary }]}>
                    <IconSymbol name={s.icon} size={18} color={c.text.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text.primary, fontSize: 15, fontWeight: "700" }}>{s.title}</Text>
                    <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>{s.subtitle}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color={c.text.tertiary} />
                </View>
              </GlassCard>
            </Pressable>
          ))}
        </View>

        <Text style={{ color: c.text.tertiary, fontSize: 12, textAlign: "center", marginTop: Spacing.lg }}>
          Life Balance Assistant · v1.0.0
        </Text>
      </Screen>
    </TabSwipe>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.3 },
  subtitle: { marginTop: 4, fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
