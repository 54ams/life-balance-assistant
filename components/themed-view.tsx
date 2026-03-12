import React from "react";
import { View, type ViewProps, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

export function ThemedView(props: ViewProps) {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? Colors.dark : Colors.light;
  return <View {...props} style={[{ backgroundColor: c.background }, props.style]} />;
}
