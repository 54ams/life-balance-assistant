import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAppTheme } from "@/theme/tokens";
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
  const t = useAppTheme();
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
        <View style={[styles.iconWrap, { backgroundColor: t.glassOverlay }]}>
          <IconSymbol name={icon} size={18} color={t.textPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontWeight: "800", fontSize: 15 }}>{title}</Text>
          <Text style={{ color: t.textMuted, marginTop: 4, fontSize: 12 }}>{subtitle}</Text>
        </View>
        <IconSymbol name="chevron.right" size={16} color={t.textMuted} />
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
