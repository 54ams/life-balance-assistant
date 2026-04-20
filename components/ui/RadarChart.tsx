import React from "react";
import { View, Text, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

interface RadarAxis {
  label: string;
  value: number; // 0–100
}

interface RadarChartProps {
  axes: RadarAxis[];
  size?: number;
}

/**
 * View-based "radar" chart — shows each axis as a labeled bar radiating
 * from a central score. Easier to read on mobile than a true spider chart
 * and requires no SVG dependency.
 */
export function RadarChart({ axes, size = 200 }: RadarChartProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  if (axes.length === 0) return null;

  const barColor = (v: number) => {
    if (v >= 75) return "#2FA37A";
    if (v >= 50) return "#C2824A";
    return "#B2423A";
  };

  return (
    <View style={{ gap: 10 }}>
      {axes.map((axis, i) => {
        const pct = Math.min(100, Math.max(0, axis.value));
        return (
          <View key={i} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.text.primary }}>{axis.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: "800", color: barColor(pct) }}>{Math.round(pct)}</Text>
            </View>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: "rgba(0,0,0,0.04)",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  width: `${pct}%`,
                  backgroundColor: barColor(pct),
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
