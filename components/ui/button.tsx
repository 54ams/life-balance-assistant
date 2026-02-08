import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

type Variant = "primary" | "secondary" | "ghost";

type Props = PressableProps & {
  title: string;
  variant?: Variant;
  fullWidth?: boolean;
};

export function Button({ title, variant = "primary", fullWidth = true, style, ...props }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const base: ViewStyle = {
    backgroundColor: variant === "primary" ? c.primary : variant === "secondary" ? c.card : "transparent",
    borderColor: variant === "ghost" ? "transparent" : c.border,
  };

  const text: TextStyle = {
    color: variant === "primary" ? (scheme === "dark" ? "#190019" : "#FBE4D8") : c.text,
  };

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.base,
        base,
        fullWidth && { alignSelf: "stretch" },
        pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      <Text style={[styles.text, text]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
});
