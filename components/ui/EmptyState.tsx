import React from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import { IconSymbol } from "./icon-symbol";
import { Colors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  return (
    <View style={{ alignItems: "center", paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: isDark ? "rgba(124,111,220,0.12)" : "rgba(107,93,211,0.08)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: Spacing.base,
        }}
      >
        <IconSymbol name={icon as any} size={32} color={c.accent.primary} />
      </View>

      <Text
        style={{
          fontSize: 18,
          fontWeight: "800",
          color: c.text.primary,
          textAlign: "center",
          marginBottom: Spacing.sm,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          fontSize: 14,
          color: c.text.secondary,
          textAlign: "center",
          lineHeight: 20,
          maxWidth: 280,
        }}
      >
        {description}
      </Text>

      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => ({
            marginTop: Spacing.lg,
            backgroundColor: c.accent.primary,
            paddingVertical: 12,
            paddingHorizontal: 28,
            borderRadius: BorderRadius.full,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: c.onPrimary, fontWeight: "700", fontSize: 15 }}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
