// Deprecated: legacy button kept for backward compatibility. Prefer GlassButton.
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";

type Variant = "primary" | "secondary" | "ghost";

type Props = PressableProps & {
  title: string;
  variant?: Variant;
  fullWidth?: boolean;
};

export function Button({ title, variant = "primary", fullWidth = true, style, ...props }: Props) {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? Colors.dark : Colors.light;

  const base: ViewStyle = {
    backgroundColor: variant === "primary" ? c.accent.primary : variant === "secondary" ? c.glass.primary : "transparent",
    borderColor: variant === "ghost" ? "transparent" : c.border.medium,
  };

  const text: TextStyle = {
    color: variant === "primary" ? c.text.inverse : c.text.primary,
  };

  return (
    <Pressable
      {...props}
      style={(state) => {
        const userStyle = typeof style === "function" ? style(state) : style;
        return [
          styles.base,
          base,
          fullWidth && { alignSelf: "stretch" },
          state.pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
          userStyle,
        ];
      }}
    >
      <Text style={[styles.text, text]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
});
