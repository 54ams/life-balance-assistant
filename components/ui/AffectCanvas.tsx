import React, { useEffect, useMemo, useRef } from "react";
import { Animated, PanResponder, StyleSheet, View, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

type Props = {
  initial: { x: number; y: number };
  onChange: (valence: number, arousal: number) => void;
  ghost?: { x: number; y: number } | null;
};

// valence/arousal are mapped from -1..1 to canvas -1..1 space.
export function AffectCanvas({ initial, onChange, ghost }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const radius = 140;
  const pos = useRef(new Animated.ValueXY({ x: initial.x, y: initial.y })).current;
  const latest = useRef({ x: initial.x, y: initial.y });
  const initialRef = useRef(initial);
  initialRef.current = initial;

  const accentGradientSoft = ["#C2E9FB", "#E2D4FF"];
  const glowSoft = "rgba(122,215,240,0.22)";

  useEffect(() => {
    pos.setValue(initial);
    latest.current = initial;
  }, [initial, pos]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          // Capture position at drag start
          latest.current = { x: initialRef.current.x, y: initialRef.current.y };
        },
        onPanResponderMove: (_, g) => {
          const x = Math.max(-radius, Math.min(radius, g.dx + initialRef.current.x));
          const y = Math.max(-radius, Math.min(radius, g.dy + initialRef.current.y));
          latest.current = { x, y };
          pos.setValue({ x, y });
        },
        onPanResponderRelease: () => {
          const { x, y } = latest.current;
          const valence = x / radius;
          const arousal = -y / radius;
          onChangeRef.current(valence, arousal);
        },
      }),
    [pos]
  );

  return (
    <View style={[styles.wrap]}>
      <View style={[styles.gradient, { backgroundColor: accentGradientSoft[0] }]} />
      <View style={[styles.gradient, { backgroundColor: accentGradientSoft[1] }]} />
      {ghost ? (
        <View
          pointerEvents="none"
          style={[
            styles.ghost,
            {
              left: radius + ghost.x - 8,
              top: radius - ghost.y - 8,
              borderColor: c.text.tertiary,
            },
          ]}
        />
      ) : null}
      <Animated.View
        {...pan.panHandlers}
        style={[
          styles.orb,
          {
            transform: [
              { translateX: pos.x },
              { translateY: pos.y },
            ],
            backgroundColor: c.glass.primary,
            borderColor: c.glass.border,
            shadowColor: glowSoft,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 280,
    height: 280,
    borderRadius: 140,
    overflow: "hidden",
    alignSelf: "center",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  orb: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  ghost: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    opacity: 0.35,
  },
});
