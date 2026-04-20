import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import { ConfidenceBadge } from "./ConfidenceBadge";

export function LBIOrb({
  lbi,
  interpretation,
  confidence,
  onPress,
  onLongPress,
}: {
  lbi: number;
  interpretation: string;
  confidence: "high" | "medium" | "low";
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 25000, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [spin, pulse]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const score = Math.round(lbi);
  const hasData = score > 0;

  const glowPrimary = "rgba(138,124,255,0.28)";

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.9 }]}
    >
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: glowPrimary,
            transform: [{ scale: pulse }],
          },
        ]}
      />
      {/* Rotating ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: c.glass.border,
            transform: [{ rotate }],
          },
        ]}
      />
      {/* Inner circle */}
      <View style={[styles.inner, { backgroundColor: c.glass.primary, borderColor: c.glass.border }]}>
        <Text style={[styles.score, { color: c.text.primary }]}>
          {hasData ? score : "—"}
        </Text>
        <Text style={[styles.label, { color: c.text.tertiary }]}>
          {hasData ? interpretation : "Tap to learn more"}
        </Text>
        <View style={{ marginTop: 8 }}>
          <ConfidenceBadge level={confidence} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    width: 200,
    height: 200,
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.5,
  },
  ring: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 2,
    opacity: 0.6,
  },
  inner: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  score: {
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1,
  },
  label: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: "600",
  },
});
