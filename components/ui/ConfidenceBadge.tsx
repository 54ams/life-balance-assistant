import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/tokens";

export function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const t = useAppTheme();
  const colors = {
    high: t.accentSuccess,
    medium: t.accentWarning,
    low: t.accentDanger,
  };
  return (
    <View style={[styles.badge, { borderColor: colors[level], backgroundColor: t.glassBackground }]}>
      <Text style={{ color: colors[level], fontWeight: "800", fontSize: 12 }}>{`Confidence: ${level}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
});
