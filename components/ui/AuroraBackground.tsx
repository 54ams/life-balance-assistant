import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View, useColorScheme } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, type BridgeState } from "@/constants/Colors";
import { useReduceMotion } from "@/hooks/useReduceMotion";

const { width, height } = Dimensions.get("window");

type Props = {
  /**
   * Which bridge state's gradient to drift through.
   * Defaults to "neutral" so screens that don't know state still look great.
   */
  state?: BridgeState;
  /**
   * Optional override so a screen can ask for extra stillness (e.g. during
   * breath sessions). Default is the normal ambient drift.
   */
  intensity?: "ambient" | "calm";
};

/**
 * Nocturnal aurora — a living, state-aware backdrop.
 *
 * Four soft orbs drift slowly across the screen. Their colour is derived
 * from `Colors.state[<stateKey>]` so the whole app changes hue based on
 * the user's current Mind–Body bridge state.
 *
 * No hard edges. No categorical colours. The screen is the metric.
 */
export function AuroraBackground({ state = "neutral", intensity = "ambient" }: Props) {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const gradient = c.state[state];
  const reduceMotion = useReduceMotion();

  // Gentle drift — slower than the old version, more meditative
  const drift1 = useRef(new Animated.Value(0)).current;
  const drift2 = useRef(new Animated.Value(0)).current;
  const drift3 = useRef(new Animated.Value(0)).current;
  const drift4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reduce-motion: hold each orb at a stable resting offset so the scene
    // still has dimension and warmth, without any drift.
    if (reduceMotion) {
      drift1.setValue(0.5);
      drift2.setValue(0.5);
      drift3.setValue(0.5);
      drift4.setValue(0.5);
      return;
    }
    const slowFactor = intensity === "calm" ? 1.6 : 1;
    const loop = (val: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: dur * slowFactor, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: dur * slowFactor, useNativeDriver: true }),
        ]),
      );
    const l1 = loop(drift1, 18000);
    const l2 = loop(drift2, 22000);
    const l3 = loop(drift3, 26000);
    const l4 = loop(drift4, 30000);
    l1.start();
    l2.start();
    l3.start();
    l4.start();
    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
      l4.stop();
    };
  }, [drift1, drift2, drift3, drift4, intensity, reduceMotion]);

  const tx1 = drift1.interpolate({ inputRange: [0, 1], outputRange: [0, 36] });
  const ty1 = drift1.interpolate({ inputRange: [0, 1], outputRange: [0, -24] });
  const tx2 = drift2.interpolate({ inputRange: [0, 1], outputRange: [0, -32] });
  const ty2 = drift2.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const tx3 = drift3.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });
  const ty3 = drift3.interpolate({ inputRange: [0, 1], outputRange: [0, 26] });
  const tx4 = drift4.interpolate({ inputRange: [0, 1], outputRange: [-18, 22] });
  const ty4 = drift4.interpolate({ inputRange: [0, 1], outputRange: [10, -18] });

  // Two colour ramps per orb, derived from the state palette. Mixes the
  // state hue with the background ink so orbs bleed into the night.
  const orbColors = useMemo(() => {
    const ink = "#EFE8D9";
    return {
      a: [gradient.start, gradient.end, ink] as const,
      b: [gradient.end, gradient.start, ink] as const,
    };
  }, [gradient]);

  // Kept intentionally subtle so a change in bridge state reads as a soft
  // hue shift rather than a "theme change". The cream canvas should remain
  // dominant across all states.
  const orbOpacity = 0.5;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.background }]} pointerEvents="none">
      {/* Orb 1 — top-right */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          { opacity: orbOpacity, transform: [{ translateX: tx1 }, { translateY: ty1 }] },
        ]}
      >
        <LinearGradient
          colors={[...orbColors.a]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.orbGradient}
        />
      </Animated.View>

      {/* Orb 2 — centre-left */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          { opacity: orbOpacity, transform: [{ translateX: tx2 }, { translateY: ty2 }] },
        ]}
      >
        <LinearGradient
          colors={[...orbColors.b]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.orbGradient}
        />
      </Animated.View>

      {/* Orb 3 — bottom-right */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          { opacity: orbOpacity * 0.9, transform: [{ translateX: tx3 }, { translateY: ty3 }] },
        ]}
      >
        <LinearGradient
          colors={[...orbColors.a]}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 1, y: 0.7 }}
          style={styles.orbGradient}
        />
      </Animated.View>

      {/* Orb 4 — small accent, top-left */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb4,
          { opacity: orbOpacity * 0.7, transform: [{ translateX: tx4 }, { translateY: ty4 }] },
        ]}
      >
        <LinearGradient
          colors={[...orbColors.b]}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={styles.orbGradient}
        />
      </Animated.View>

      {/* Subtle vignette to pull the eye inward and sink the edges */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(239,232,217,0)", "rgba(239,232,217,0.55)"]}
        start={{ x: 0.5, y: 0.4 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const ORB_SIZE = width * 0.95;
const ORB_SIZE_SM = width * 0.6;

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: "hidden",
  },
  orbGradient: {
    flex: 1,
    borderRadius: ORB_SIZE / 2,
  },
  orb1: {
    top: -ORB_SIZE * 0.35,
    right: -ORB_SIZE * 0.25,
  },
  orb2: {
    top: height * 0.22,
    left: -ORB_SIZE * 0.4,
  },
  orb3: {
    bottom: -ORB_SIZE * 0.28,
    right: -ORB_SIZE * 0.18,
  },
  orb4: {
    width: ORB_SIZE_SM,
    height: ORB_SIZE_SM,
    borderRadius: ORB_SIZE_SM / 2,
    top: height * 0.05,
    left: -ORB_SIZE_SM * 0.3,
  },
});
