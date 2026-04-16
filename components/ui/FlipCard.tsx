// components/ui/FlipCard.tsx
//
// A tiny reusable "flip tile" used on calculation-heavy screens. The
// front shows the plain-English result; the back shows the working
// behind it. Tapping (or the page-level "Show my maths" toggle) flips
// between them.
//
// Design notes
// ------------
// React Native's 3D transforms don't implement `backfaceVisibility`
// consistently across platforms, and the common "two absolutely
// positioned panels" trick plays badly with dynamic height. To dodge
// both, we use a single-panel two-phase animation:
//
//   phase 1: rotateY 0° → 90°   (hide current side)
//   phase 2: swap mounted content
//   phase 3: rotateY -90° → 0°  (reveal the other side)
//
// If the user prefers reduced motion, we cross-fade instead of
// flipping.
//
// The component takes `flipped` as a controlled prop so a parent can
// coordinate a staggered "flip the whole page" animation via
// `flipDelayMs`.

import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ViewStyle } from "react-native";
import { useReduceMotion } from "@/hooks/useReduceMotion";

type Props = {
  /** Which side is currently shown. Controlled by the parent. */
  flipped: boolean;
  /** Called when the user taps the card. */
  onToggle?: () => void;
  /** Front-of-card content (plain English). */
  front: React.ReactNode;
  /** Back-of-card content (the working). */
  back: React.ReactNode;
  /** Optional outer style passed through to the wrapper. */
  style?: ViewStyle;
  /** Stagger the flip by this many ms — lets a parent cascade flips. */
  flipDelayMs?: number;
  /** Total duration of the flip in ms (split evenly across both halves). */
  durationMs?: number;
  /** Optional accessibility label for the pressable wrapper. */
  accessibilityLabel?: string;
  /** If false, tapping won't fire onToggle. Default true. */
  interactive?: boolean;
};

export function FlipCard({
  flipped,
  onToggle,
  front,
  back,
  style,
  flipDelayMs = 0,
  durationMs = 420,
  accessibilityLabel,
  interactive = true,
}: Props) {
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(flipped ? 1 : 0)).current;
  // `shownSide` is the side that is *currently mounted*. It only
  // swaps at the mid-point of the animation so each half renders the
  // correct face.
  const [shownSide, setShownSide] = useState<"front" | "back">(
    flipped ? "back" : "front"
  );

  useEffect(() => {
    const target = flipped ? "back" : "front";
    if (target === shownSide) return;

    if (reduceMotion) {
      // Cross-fade: progress 0→1 (or 1→0), swap side at the midpoint.
      const halfway = durationMs / 2;
      const toMid = Animated.timing(progress, {
        toValue: 0.5,
        duration: halfway,
        delay: flipDelayMs,
        useNativeDriver: true,
      });
      const fromMid = Animated.timing(progress, {
        toValue: flipped ? 1 : 0,
        duration: halfway,
        useNativeDriver: true,
      });
      toMid.start(({ finished }) => {
        if (!finished) return;
        setShownSide(target);
        fromMid.start();
      });
      return;
    }

    // Flip: rotate to 90°/-90°, swap side, rotate back to 0°.
    const half = durationMs / 2;
    const midValue = flipped ? 0.5 : 0.5; // same midpoint either way
    const toHide = Animated.timing(progress, {
      toValue: midValue,
      duration: half,
      delay: flipDelayMs,
      useNativeDriver: true,
    });
    const toReveal = Animated.timing(progress, {
      toValue: flipped ? 1 : 0,
      duration: half,
      useNativeDriver: true,
    });
    toHide.start(({ finished }) => {
      if (!finished) return;
      setShownSide(target);
      toReveal.start();
    });
  }, [flipped, reduceMotion, durationMs, flipDelayMs, progress, shownSide]);

  // Animated styles. In "flip" mode we interpolate rotation; in
  // "reduce motion" mode we interpolate opacity.
  const animatedStyle = reduceMotion
    ? {
        opacity: progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 0, 1],
        }),
      }
    : {
        transform: [
          { perspective: 1000 },
          {
            rotateY: progress.interpolate({
              inputRange: [0, 0.5, 0.5001, 1],
              outputRange: ["0deg", "90deg", "-90deg", "0deg"],
            }),
          },
        ],
      };

  const content = shownSide === "front" ? front : back;

  return (
    <Pressable
      onPress={interactive ? onToggle : undefined}
      style={style}
      accessibilityRole={interactive ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded: flipped }}
    >
      <Animated.View style={animatedStyle}>{content}</Animated.View>
    </Pressable>
  );
}
