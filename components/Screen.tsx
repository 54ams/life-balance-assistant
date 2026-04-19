import React from "react";
import { ScrollView, StyleSheet, Text, View, useColorScheme, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";

type Props = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  padded?: boolean;
  decorated?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

/** Subtle top wash that echoes the aurora on the home screen. */
function ScreenWash({ isDark }: { isDark: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={{
        ...StyleSheet.absoluteFillObject,
        height: 260,
        backgroundColor: isDark ? "rgba(156,176,138,0.06)" : "rgba(156,176,138,0.08)",
        borderBottomLeftRadius: 80,
        borderBottomRightRadius: 80,
      }}
    />
  );
}

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
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const basePadding: ViewStyle = padded
    ? { paddingHorizontal: Spacing.base }
    : {};

  const topPad = insets.top + 8;

  const safeChildren = React.Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return <Text style={{ color: c.text.primary }}>{String(child)}</Text>;
    }
    return child;
  });

  const header = title ? (
    <View style={{ marginBottom: Spacing.sm }}>
      <Text style={styles.title(c)}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle(c)}>{subtitle}</Text> : null}
    </View>
  ) : null;

  if (scroll) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
        <ScreenWash isDark={isDark} />
        <ScrollView
          style={[s.fill, style]}
          contentContainerStyle={[
            { paddingTop: topPad, paddingBottom: 120 },
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
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <ScreenWash isDark={isDark} />
      <View
        style={[
          s.fill,
          { paddingTop: topPad, paddingBottom: Spacing.xl },
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

const styles = {
  title: (c: typeof Colors.light) => ({
    color: c.text.primary,
    fontSize: 28,
    fontWeight: "900" as const,
    letterSpacing: -0.3,
  }),
  subtitle: (c: typeof Colors.light) => ({
    color: c.text.secondary,
    marginTop: 4,
    fontSize: 14,
  }),
};

const s = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
});
