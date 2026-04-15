import React from "react";
import { View, Text, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

interface DataPoint {
  label: string;
  value: number;
}

interface MiniLineChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  showLabels?: boolean;
  showValues?: boolean;
}

/**
 * Pure View-based bar/area chart — no SVG dependency needed.
 * Shows data as smoothly graduated bars with connecting visual flow.
 */
export function MiniLineChart({
  data,
  height = 100,
  color,
  showLabels = true,
  showValues = false,
}: MiniLineChartProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const barColor = color ?? c.accent.primary;

  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values) - 3;
  const max = Math.max(...values) + 3;
  const range = Math.max(1, max - min);

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height, gap: 3 }}>
        {data.map((d, i) => {
          const pct = ((d.value - min) / range);
          const barH = Math.max(4, pct * (height - 20));
          const isLast = i === data.length - 1;
          const opacity = 0.35 + pct * 0.65;
          return (
            <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
              {showValues && (
                <Text style={{ fontSize: 9, color: c.text.tertiary, marginBottom: 3, fontWeight: "700" }}>
                  {Math.round(d.value)}
                </Text>
              )}
              <View
                style={{
                  width: "100%",
                  height: barH,
                  borderRadius: 6,
                  backgroundColor: barColor,
                  opacity: isLast ? 1 : opacity,
                  ...(isLast && {
                    shadowColor: barColor,
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                  }),
                }}
              />
            </View>
          );
        })}
      </View>

      {showLabels && (
        <View style={{ flexDirection: "row", marginTop: 6, gap: 3 }}>
          {data.map((d, i) => {
            const step = Math.max(1, Math.ceil(data.length / 7));
            if (i % step !== 0 && i !== data.length - 1) return <View key={i} style={{ flex: 1 }} />;
            return (
              <View key={i} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 9, color: c.text.tertiary, fontWeight: "600" }}>{d.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
