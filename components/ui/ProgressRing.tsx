import React from "react";
import { View, Text, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

interface ProgressRingProps {
  progress: number; // 0–1
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  centerText?: string;
}

/**
 * View-based circular progress indicator — no SVG needed.
 * Uses a rounded track with a filled portion.
 */
export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  color,
  label,
  centerText,
}: ProgressRingProps) {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? Colors.dark : Colors.light;
  const ringColor = color ?? c.accent.primary;
  const pct = Math.min(1, Math.max(0, progress));
  const trackColor = scheme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: trackColor,
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Progress overlay - top portion colored */}
        <View
          style={{
            position: "absolute",
            top: -strokeWidth,
            left: -strokeWidth,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: "transparent",
            borderTopColor: pct > 0 ? ringColor : "transparent",
            borderRightColor: pct > 0.25 ? ringColor : "transparent",
            borderBottomColor: pct > 0.5 ? ringColor : "transparent",
            borderLeftColor: pct > 0.75 ? ringColor : "transparent",
            transform: [{ rotate: "-90deg" }],
          }}
        />
        {centerText && (
          <Text style={{ fontSize: size * 0.22, fontWeight: "900", color: c.text.primary }}>
            {centerText}
          </Text>
        )}
      </View>
      {label && (
        <Text style={{ fontSize: 11, fontWeight: "600", color: c.text.secondary, textAlign: "center" }}>
          {label}
        </Text>
      )}
    </View>
  );
}
