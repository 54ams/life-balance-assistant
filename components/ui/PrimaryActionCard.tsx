import React from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export function PrimaryActionCard({
  title,
  subtitle,
  icon,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  subtitle: string;
  icon: any;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const glassOverlay = "rgba(0,0,0,0.10)";

  return (
    <GlassCard style={styles.card}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        style={({ pressed }) => [
          styles.row,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: glassOverlay }]}>
          <IconSymbol name={icon} size={18} color={c.text.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 15 }}>{title}</Text>
          <Text style={{ color: c.text.tertiary, marginTop: 4, fontSize: 12 }}>{subtitle}</Text>
        </View>
        <IconSymbol name="chevron.right" size={16} color={c.text.tertiary} />
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
