import React from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, type BridgeState } from "@/constants/Colors";
import type { RealignAction } from "@/lib/realign";

type Props = {
  action: RealignAction;
  state: BridgeState;
  onPress: () => void;
};

/**
 * Home card that surfaces the matched micro-intervention when the
 * Mind–Body bridge is divergent. Visually blends into the aurora so
 * it feels like part of the breath of the app, not a CTA interrupt.
 */
export function RealignCard({ action, state, onPress }: Props) {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? Colors.dark : Colors.light;
  const gradient = c.state[state];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel={`Realign: ${action.title}`}
    >
      <LinearGradient
        colors={[gradient.start + "33", gradient.end + "22"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.inner, { borderColor: gradient.accent + "55" }]}
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: gradient.accent }]}>REALIGN · {action.durationSec}s</Text>
            <Text style={[styles.title, { color: c.text.primary }]}>{action.title}</Text>
            <Text style={[styles.reason, { color: c.text.secondary }]}>{action.reason}</Text>
          </View>
          <View style={[styles.cta, { backgroundColor: gradient.accent }]}>
            <Text style={styles.ctaText}>{action.cta}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    borderRadius: 22,
    overflow: "hidden",
  },
  inner: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  reason: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
