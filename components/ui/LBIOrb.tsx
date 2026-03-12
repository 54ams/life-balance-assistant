import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/tokens";
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
  const t = useAppTheme();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 25000,
        useNativeDriver: true,
      })
    ).start();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.9 }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: t.glassBorder,
            shadowColor: t.glowPrimary,
            transform: [{ rotate }],
          },
        ]}
      />
      <View style={[styles.inner, { backgroundColor: t.glassBackground, borderColor: t.glassBorder }]}>
        <Text style={{ color: t.textPrimary, fontSize: 40, fontWeight: "900" }}>{Math.round(lbi)}</Text>
        <Text style={{ color: t.textMuted, marginTop: 4 }}>{interpretation}</Text>
        <View style={{ marginTop: 10 }}>
          <ConfidenceBadge level={confidence} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    marginTop: 12,
  },
  ring: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    opacity: 0.8,
  },
  inner: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
