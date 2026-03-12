import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/tokens";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const t = useAppTheme();
  return (
    <View style={styles.wrap}>
      <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: "700" }}>{subtitle ?? " "}</Text>
      <Text style={{ color: t.textPrimary, fontSize: 28, fontWeight: "900", letterSpacing: -0.3 }}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginBottom: 6 },
});
