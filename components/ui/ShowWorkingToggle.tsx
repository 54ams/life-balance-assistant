// components/ui/ShowWorkingToggle.tsx
//
// Small pill that sits near the top of any screen with flip tiles.
// Label reads "Show my maths" when off and "Back to plain" when on.
// Uses the switch accessibility role so assistive tech announces the
// state change correctly.

import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import { BorderRadius } from "@/constants/Spacing";

type Props = {
  value: boolean;
  onToggle: () => void;
  style?: ViewStyle;
};

export function ShowWorkingToggle({ value, onToggle, style }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={value ? "Hide the maths, back to plain English" : "Show my maths"}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: value ? c.accent.primary : "transparent",
          borderColor: value ? c.accent.primary : c.border.medium,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: value ? c.text.inverse : c.text.secondary },
        ]}
      >
        {value ? "Back to plain" : "Show my maths"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});
