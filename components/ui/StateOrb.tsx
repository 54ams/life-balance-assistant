import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, bridgeStateFrom, type BridgeState } from "@/constants/Colors";
import { useReduceMotion } from "@/hooks/useReduceMotion";

type Props = {
  /** Physiological score 0-100 or null */
  physio: number | null;
  /** Mental score 0-100 or null */
  mental: number | null;
  /** Optional LBI number shown small beneath the orb */
  lbi?: number | null;
  /** Orb diameter — defaults to 240 which fits the Home hero nicely */
  size?: number;
  /**
   * A key that, when changed, triggers a ripple emanation from the orb.
   * Used after breath sessions, anchor captures, realign completions.
   */
  rippleKey?: number;
  onPress?: () => void;
  onLongPress?: () => void;
};

/**
 * The State Orb — the heart of the app.
 *
 * One circle that expresses the user's current Mind–Body state across
 * three axes at once:
 *   - Hue: shifts along the state gradient (aligned / body / mind / neutral)
 *   - Breath rate: slower (4s) when aligned, quicker (2.5s) when divergent
 *   - Weight: inner core drifts slightly toward the ahead-axis, giving
 *     the orb a subtle asymmetry you feel before you read
 *
 * Long-press opens the split view (caller supplies `onLongPress`).
 * A `rippleKey` change emits a soft ripple — the post-action "you moved
 * the needle" moment.
 */
export function StateOrb({
  physio,
  mental,
  lbi,
  size = 240,
  rippleKey,
  onPress,
  onLongPress,
}: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const reduceMotion = useReduceMotion();

  const state: BridgeState = useMemo(() => bridgeStateFrom(physio, mental), [physio, mental]);
  const gradient = c.state[state];

  // Breath period — divergent states breathe slightly faster, like unsettled breath.
  const gap = physio != null && mental != null ? Math.abs(physio - mental) : 0;
  const breathPeriod = state === "aligned" ? 4000 : gap >= 30 ? 2500 : 3200;

  // Signed bulge — positive pushes the inner core up (body-ahead feels "heady"),
  // negative pushes it down (mind-ahead feels "grounded-deficit"). Subtle.
  const bulge = useMemo(() => {
    if (physio == null || mental == null) return 0;
    const d = physio - mental;
    return Math.max(-12, Math.min(12, d * 0.2));
  }, [physio, mental]);

  const breathAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const ripple = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reduce-motion: hold the orb at its resting mid-breath pose. Colour still
    // carries the full state signal — we just skip the oscillation.
    if (reduceMotion) {
      breathAnim.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: breathPeriod,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: breathPeriod,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathAnim, breathPeriod, reduceMotion]);

  // Trigger a ripple whenever `rippleKey` changes. Under reduce-motion we
  // still flash the ring once, just more briefly, so the "you moved the
  // needle" feedback isn't lost.
  useEffect(() => {
    if (rippleKey === undefined) return;
    ripple.setValue(0);
    Animated.timing(ripple, {
      toValue: 1,
      duration: reduceMotion ? 450 : 1100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [rippleKey, ripple, reduceMotion]);

  const breathScale = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  const coreScale = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.00] });
  const glowOpacity = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.75] });
  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const rippleOpacity = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  const handlePressIn = () => {
    Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true, friction: 7 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  };

  const dim = size;
  const ringDim = dim * 0.88;
  const coreDim = dim * 0.62;

  return (
    <View style={{ alignItems: "center" }}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={450}
        accessibilityRole="button"
        accessibilityLabel={`${narrativeLabel(state)}. Tap for details, long press to split.`}
        style={{ width: dim, height: dim, alignItems: "center", justifyContent: "center" }}
      >
        {/* Soft outer glow — state-coloured, breathes with the orb */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              opacity: glowOpacity,
              transform: [{ scale: breathScale }],
            },
          ]}
        >
          <View
            style={{
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: gradient.glow,
              shadowColor: gradient.accent,
              shadowOpacity: 0.85,
              shadowRadius: 40,
              shadowOffset: { width: 0, height: 0 },
              elevation: 18,
            }}
          />
        </Animated.View>

        {/* Ripple emanation for post-action reveal */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              alignItems: "center",
              justifyContent: "center",
              opacity: rippleOpacity,
              transform: [{ scale: rippleScale }],
            },
          ]}
        >
          <View
            style={{
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              borderWidth: 2,
              borderColor: gradient.accent,
              opacity: 0.6,
            }}
          />
        </Animated.View>

        {/* Main orb body */}
        <Animated.View
          style={{
            transform: [{ scale: pressAnim }],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.View
            style={{
              width: ringDim,
              height: ringDim,
              borderRadius: ringDim / 2,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: breathScale }],
              shadowColor: gradient.accent,
              shadowOpacity: 0.35,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 6 },
            }}
          >
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={{
                width: ringDim,
                height: ringDim,
                borderRadius: ringDim / 2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Inner core — offset by bulge to suggest direction */}
              <Animated.View
                style={{
                  width: coreDim,
                  height: coreDim,
                  borderRadius: coreDim / 2,
                  transform: [{ scale: coreScale }, { translateY: -bulge }],
                  overflow: "hidden",
                }}
              >
                <LinearGradient
                  colors={
                    isDark
                      ? ["rgba(255,255,255,0.22)", "rgba(255,255,255,0.05)"]
                      : ["rgba(255,255,255,0.55)", "rgba(255,255,255,0.20)"]
                  }
                  start={{ x: 0.2, y: 0.1 }}
                  end={{ x: 0.8, y: 0.9 }}
                  style={{ flex: 1, borderRadius: coreDim / 2 }}
                />
              </Animated.View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </Pressable>

      {/* Tiny balance score underneath the orb — present but quiet */}
      {typeof lbi === "number" && (
        <View style={{ marginTop: 14, alignItems: "center" }}>
          <Text style={{ color: c.text.tertiary, fontSize: 10, letterSpacing: 1.4, fontWeight: "700" }}>
            BALANCE
          </Text>
          <Text style={{ color: c.text.secondary, fontSize: 13, fontWeight: "700", marginTop: 2 }}>
            {Math.round(lbi)}
          </Text>
        </View>
      )}
    </View>
  );
}

function narrativeLabel(state: BridgeState): string {
  switch (state) {
    case "aligned":
      return "Body and mind are in step";
    case "body":
      return "Body is ahead of mind";
    case "mind":
      return "Mind is ahead of body";
    default:
      return "State is still waking up";
  }
}
