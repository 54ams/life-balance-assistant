import React from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Colors, bridgeStateFrom } from "@/constants/Colors";

export type RibbonDay = {
  date: string;
  physio: number | null;
  mental: number | null;
  hasAnchor?: boolean;
};

type Props = {
  days: RibbonDay[];
  onPressDay?: (date: string) => void;
};

/**
 * Horizontal 7-day "ribbon" for Home. Each day is a small dot whose
 * hue reflects that day's bridge state. A tiny anchor dot sits below
 * the dot if an anchor was captured that day.
 *
 * Meant to sit directly under the State Orb on Home — a glanceable
 * week-at-a-glance without opening another screen.
 */
export function Ribbon7({ days, onPressDay }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const recent = days.slice(-7);
  const todayIdx = recent.length - 1;

  return (
    <View style={styles.row}>
      {recent.map((d, i) => {
        const state = bridgeStateFrom(d.physio, d.mental);
        const g = c.state[state];
        const isToday = i === todayIdx;
        const label = new Date(d.date + "T12:00:00").toLocaleDateString("en-GB", {
          weekday: "short",
        })[0];
        const stateDescription =
          d.physio == null && d.mental == null
            ? "nothing logged"
            : state === "aligned"
            ? "body and mind in step"
            : state === "body"
            ? "body running ahead of your mind"
            : state === "mind"
            ? "mind running ahead of your body"
            : "a quiet day";

        return (
          <Pressable
            key={d.date}
            onPress={() => onPressDay?.(d.date)}
            style={({ pressed }) => [styles.cell, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={`${d.date}, ${stateDescription}${d.hasAnchor ? ", moment noted" : ""}${
              isToday ? ". Today." : ""
            }. Tap for details.`}
          >
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "700", letterSpacing: 0.6 }}>
              {label.toUpperCase()}
            </Text>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: g.accent,
                  borderColor: isToday ? c.text.primary : "transparent",
                  opacity: d.physio == null && d.mental == null ? 0.25 : 1,
                },
              ]}
            />
            <View
              style={[
                styles.anchorDot,
                {
                  backgroundColor: d.hasAnchor ? c.text.secondary : "transparent",
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 4,
    marginTop: 12,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  anchorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
