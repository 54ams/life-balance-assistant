import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

type Props = ViewProps & {
  padding?: number;
};

export function GlassCard({ style, padding = 16, children, ...props }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  return (
    <View {...props} style={[styles.wrap, style]}>
      <BlurView
        intensity={scheme === "dark" ? 28 : 18}
        tint={scheme === "dark" ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: scheme === "dark"
              ? "rgba(30, 16, 50, 0.40)"
              : "rgba(255, 255, 255, 0.45)",
            borderColor: scheme === "dark"
              ? "rgba(255,255,255,0.10)"
              : "rgba(0,0,0,0.06)",
          },
        ]}
      />
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: "hidden",
  },
});
