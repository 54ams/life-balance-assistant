import React from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { ThemedView } from "./themed-view";

export function ParallaxScrollView({ children, ...props }: ScrollViewProps) {
  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView {...props}>{children}</ScrollView>
    </ThemedView>
  );
}
