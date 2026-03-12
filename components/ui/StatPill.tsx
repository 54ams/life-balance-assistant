import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { useAppTheme } from "@/theme/tokens";

export function StatPill({ label, value }: { label: string; value: string }) {
  const t = useAppTheme();
  return (
    <View style={[styles.pill, { borderColor: t.glassBorder, backgroundColor: t.glassBackground }]}>
      <Text style={{ color: t.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: t.textPrimary, fontWeight: "800", fontSize: 14 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 90,
  },
});
