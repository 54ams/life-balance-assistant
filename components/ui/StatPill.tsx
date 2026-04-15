import React from "react";
import { Text, View, StyleSheet, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

export function StatPill({ label, value }: { label: string; value: string }) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.pill, { borderColor: c.glass.border, backgroundColor: c.glass.primary }]}>
      <Text style={{ color: c.text.tertiary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 14 }}>{value}</Text>
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
