import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View, useColorScheme, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";

type Props = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  padded?: boolean;
  decorated?: boolean; // retained for API but ignored
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

export function Screen({
  children,
  title,
  subtitle,
  scroll = false,
  padded = true,
  style,
  contentStyle,
}: Props) {
  const scheme = useColorScheme();
  const t = scheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const basePadding: ViewStyle = padded
    ? { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xl }
    : {};

  const topPad = insets.top + 6;

  const safeChildren = React.Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return <Text style={{ color: t.text.primary }}>{String(child)}</Text>;
    }
    return child;
  });
  const header = title ? (
    <View style={{ marginBottom: subtitle ? Spacing.xs : Spacing.sm }}>
      <Text style={{ color: t.text.primary, fontSize: Typography.fontSize.xxxl, fontWeight: Typography.fontWeight.bold }}>{title}</Text>
      {subtitle ? <Text style={{ color: t.text.secondary, marginTop: Spacing.xs }}>{subtitle}</Text> : null}
    </View>
  ) : null;

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]}>
        <ScrollView
          style={[styles.fill, style]}
          contentContainerStyle={[
            { paddingTop: topPad },
            basePadding,
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {header}
          {safeChildren}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]}>
      <View
        style={[
          styles.fill,
          { paddingTop: topPad },
          basePadding,
          style,
        ]}
      >
        {header}
        {safeChildren}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
});
