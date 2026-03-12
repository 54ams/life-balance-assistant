import React from "react";
import { Text, View } from "react-native";
import { GlassCard } from "./glass-card";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";

export function ErrorState({
  title,
  message,
  bullets,
}: {
  title: string;
  message: string;
  bullets?: string[];
}) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  return (
    <GlassCard style={{ padding: 14 }}>
      <Text style={{ color: c.text.primary, fontWeight: "800" }}>{title}</Text>
      <Text style={{ color: c.text.secondary, marginTop: 6 }}>{message}</Text>
      {bullets?.length ? (
        <View style={{ marginTop: 8, gap: 6 }}>
          {bullets.map((b) => (
            <Text key={b} style={{ color: c.text.secondary }}>
              • {b}
            </Text>
          ))}
        </View>
      ) : null}
    </GlassCard>
  );
}
