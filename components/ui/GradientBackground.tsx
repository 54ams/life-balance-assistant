import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { useAppTheme } from "@/theme/tokens";

export function GradientBackground() {
  const t = useAppTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 30000,
        useNativeDriver: true,
      })
    ).start();
  }, [anim]);

  const translate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          transform: [{ translateX: translate }],
          backgroundColor: t.backgroundPrimary,
          opacity: 0.96,
        },
      ]}
    />
  );
}
