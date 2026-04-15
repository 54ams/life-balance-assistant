import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  return (
    <View style={styles.wrap}>
      <Text style={{ color: c.text.secondary, fontSize: 13, fontWeight: "700" }}>{subtitle ?? " "}</Text>
      <Text style={{ color: c.text.primary, fontSize: 28, fontWeight: "900", letterSpacing: -0.3 }}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginBottom: 6 },
});
