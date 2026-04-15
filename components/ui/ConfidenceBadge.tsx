import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

export function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const colors = {
    high: c.success,
    medium: c.warning,
    low: c.danger,
  };
  return (
    <View style={[styles.badge, { borderColor: colors[level], backgroundColor: c.glass.primary }]}>
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
