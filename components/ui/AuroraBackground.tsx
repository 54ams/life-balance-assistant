import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View, useColorScheme } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

/**
 * Aurora / cosmic nebula background inspired by the purple-blue
 * gradient mockups. Three animated orbs drift slowly to create
 * a living, breathing backdrop.
 */
export function AuroraBackground() {
  const isDark = useColorScheme() === "dark";

  const drift1 = useRef(new Animated.Value(0)).current;
  const drift2 = useRef(new Animated.Value(0)).current;
  const drift3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (val: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: dur, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: dur, useNativeDriver: true }),
        ])
      );
    loop(drift1, 12000).start();
    loop(drift2, 16000).start();
    loop(drift3, 20000).start();
  }, [drift1, drift2, drift3]);

  const tx1 = drift1.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
  const ty1 = drift1.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const tx2 = drift2.interpolate({ inputRange: [0, 1], outputRange: [0, -25] });
  const ty2 = drift2.interpolate({ inputRange: [0, 1], outputRange: [0, 15] });
  const tx3 = drift3.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const ty3 = drift3.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });

  // Palette shifts between dark (deep cosmic) and light (soft pastel)
  const bg = isDark ? "#0B0D17" : "#F0F0F8";
  const orb1Colors = isDark
    ? (["#2D1B69", "#4B2D8E", "#1B1145"] as const)
    : (["#D8CCFA", "#C2B6F0", "#E8E0FF"] as const);
  const orb2Colors = isDark
    ? (["#162044", "#1E3A6E", "#0E1530"] as const)
    : (["#C2E0FB", "#B0D4F7", "#D6ECFF"] as const);
  const orb3Colors = isDark
    ? (["#3D1456", "#5A2080", "#280E3A"] as const)
    : (["#E8D0F8", "#DCC4F0", "#F0E4FF"] as const);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} pointerEvents="none">
      {/* Orb 1 — top right, purple */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          { transform: [{ translateX: tx1 }, { translateY: ty1 }] },
        ]}
      >
        <LinearGradient
          colors={[...orb1Colors]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.orbGradient}
        />
      </Animated.View>

      {/* Orb 2 — centre left, blue */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          { transform: [{ translateX: tx2 }, { translateY: ty2 }] },
        ]}
      >
        <LinearGradient
          colors={[...orb2Colors]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.orbGradient}
        />
      </Animated.View>

      {/* Orb 3 — bottom right, magenta-purple */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          { transform: [{ translateX: tx3 }, { translateY: ty3 }] },
        ]}
      >
        <LinearGradient
          colors={[...orb3Colors]}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 1, y: 0.7 }}
          style={styles.orbGradient}
        />
      </Animated.View>
    </View>
  );
}

const ORB_SIZE = width * 0.85;

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: "hidden",
    opacity: 0.7,
  },
  orbGradient: {
    flex: 1,
    borderRadius: ORB_SIZE / 2,
  },
  orb1: {
    top: -ORB_SIZE * 0.3,
    right: -ORB_SIZE * 0.25,
  },
  orb2: {
    top: height * 0.25,
    left: -ORB_SIZE * 0.4,
  },
  orb3: {
    bottom: -ORB_SIZE * 0.2,
    right: -ORB_SIZE * 0.15,
  },
});
