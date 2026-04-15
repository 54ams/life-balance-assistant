import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

export function GradientBackground() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
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
          backgroundColor: c.background,
          opacity: 0.96,
        },
      ]}
    />
  );
}
