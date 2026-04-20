import React from "react";
import { Text, View, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

interface StrengthIndicatorProps {
  value: number; // correlation coefficient -1 to 1
  label?: string;
}

function strengthLabel(r: number): { text: string; color: string; isDark: string } {
  const abs = Math.abs(r);
  if (abs >= 0.6) return { text: "Strong", color: "#2FA37A", isDark: "#57D6A4" };
  if (abs >= 0.4) return { text: "Moderate", color: "#C2824A", isDark: "#E0B278" };
  if (abs >= 0.2) return { text: "Weak", color: "#9CA3AF", isDark: "#737373" };
  return { text: "Very weak", color: "#9CA3AF", isDark: "#737373" };
}

function directionLabel(r: number): string {
  if (r > 0.05) return "positive";
  if (r < -0.05) return "negative";
  return "neutral";
}

export function correlationToHuman(a: string, b: string, r: number): string {
  const strength = strengthLabel(r);
  const dir = directionLabel(r);
  const aName = prettyName(a);
  const bName = prettyName(b);

  if (Math.abs(r) < 0.2) return `No clear link between ${aName} and ${bName}`;

  if (dir === "positive") {
    return `${strength.text} link: better ${aName} tends to go with better ${bName}`;
  }
  return `${strength.text} link: higher ${aName} tends to go with lower ${bName}`;
}

function prettyName(key: string): string {
  const map: Record<string, string> = {
    sleepHours: "sleep",
    stressIndicatorsCount: "stress indicators",
    stressCount: "stress",
    recovery: "recovery",
    lbi: "balance score",
    mood: "mood",
    energy: "energy",
    strain: "strain",
    adherenceRatio: "plan adherence",
    nextDayLbi: "next-day balance",
  };
  return map[key] ?? key;
}

export function StrengthIndicator({ value, label }: StrengthIndicatorProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const s = strengthLabel(value);
  const barColor = s.color;
  const abs = Math.abs(value);
  const pct = Math.min(100, Math.round(abs * 100));

  return (
    <View style={{ gap: 4 }}>
      {label && (
        <Text style={{ fontSize: 13, fontWeight: "700", color: c.text.primary }}>{label}</Text>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: "rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 6,
              borderRadius: 3,
              width: `${pct}%`,
              backgroundColor: barColor,
            }}
          />
        </View>
        <Text style={{ fontSize: 12, fontWeight: "700", color: barColor, minWidth: 60 }}>
          {s.text}
        </Text>
      </View>
    </View>
  );
}
