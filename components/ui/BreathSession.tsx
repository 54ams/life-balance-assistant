import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Colors, type BridgeState } from "@/constants/Colors";
import { patternFor, liftForPreset, type RealignPreset } from "@/lib/realign";
import { recordLift } from "@/lib/lift";
import { useReduceMotion } from "@/hooks/useReduceMotion";

type Props = {
  visible: boolean;
  preset: RealignPreset;
  /** Seconds — defaults to 60 */
  durationSec?: number;
  /** Bridge state used to tint the aurora behind the session */
  state?: BridgeState;
  onClose: () => void;
  /** Called with the lift points granted on full completion */
  onComplete?: (points: number) => void;
};

/**
 * Full-screen breath session. One guided breathing circle synced to the
 * preset's inhale/hold/exhale pattern. Completing a full session grants
 * a measurable `mentalScore` lift via `lib/lift.ts` — the felt-efficacy
 * loop.
 */
export function BreathSession({
  visible,
  preset,
  durationSec = 60,
  state = "neutral",
  onClose,
  onComplete,
}: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const reduceMotion = useReduceMotion();
  const pattern = useMemo(() => patternFor(preset), [preset]);
  const cycleSec = pattern.inhale + pattern.holdIn + pattern.exhale + pattern.holdOut;

  type Phase = "inhale" | "holdIn" | "exhale" | "holdOut";
  const [phase, setPhase] = useState<Phase>("inhale");
  const [remaining, setRemaining] = useState(durationSec);
  const [started, setStarted] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.7)).current;

  // Reset when the modal opens
  useEffect(() => {
    if (visible) {
      setStarted(false);
      setRemaining(durationSec);
      setPhase("inhale");
      scaleAnim.setValue(0.7);
    }
  }, [visible, durationSec, scaleAnim]);

  // Drive the breath animation once started
  useEffect(() => {
    if (!visible || !started) return;

    let cancelled = false;

    const runPhase = (p: Phase) => {
      if (cancelled) return;
      setPhase(p);
      Haptics.selectionAsync().catch(() => {});
      const durationMs =
        (p === "inhale"
          ? pattern.inhale
          : p === "holdIn"
          ? pattern.holdIn
          : p === "exhale"
          ? pattern.exhale
          : pattern.holdOut) * 1000;

      if (durationMs === 0) {
        // Skip zero-length phases
        runPhase(nextPhase(p, pattern));
        return;
      }

      const target =
        p === "inhale" ? 1.0 : p === "holdIn" ? 1.0 : p === "exhale" ? 0.7 : 0.7;

      const animation = reduceMotion
        ? Animated.timing(scaleAnim, {
            toValue: target,
            duration: 250,
            useNativeDriver: true,
          })
        : Animated.timing(scaleAnim, {
            toValue: target,
            duration: durationMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          });

      animation.start(({ finished }) => {
        if (!finished || cancelled) return;
        runPhase(nextPhase(p, pattern));
      });
    };

    runPhase("inhale");
    return () => {
      cancelled = true;
    };
  }, [visible, started, pattern, scaleAnim, reduceMotion]);

  // Countdown
  useEffect(() => {
    if (!visible || !started) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          // Complete on next tick
          setTimeout(() => finish(true), 0);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, started]);

  const finish = async (completed: boolean) => {
    if (completed) {
      const pts = liftForPreset(preset);
      await recordLift("breath", pts);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onComplete?.(pts);
    }
    onClose();
  };

  const phaseLabel = phase === "inhale"
    ? "Breathe in"
    : phase === "holdIn"
    ? "Hold"
    : phase === "exhale"
    ? "Breathe out"
    : "Rest";

  const gradient = c.state[state];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => finish(false)}
    >
      <View style={StyleSheet.absoluteFill}>
        <AuroraBackground state={state} intensity="calm" />

        <View style={styles.overlay}>
          <View style={{ flex: 1 }} />

          {/* Breath circle */}
          <View style={{ alignItems: "center", justifyContent: "center", height: 320 }}>
            <Animated.View
              style={{
                transform: [{ scale: scaleAnim }],
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0.1, y: 0.1 }}
                end={{ x: 0.9, y: 0.9 }}
                style={styles.breathCircle}
              >
                <Text style={styles.phaseText}>{phaseLabel}</Text>
              </LinearGradient>
            </Animated.View>
          </View>

          <View style={{ alignItems: "center", paddingHorizontal: 32 }}>
            {!started ? (
              <>
                <Text style={[styles.headline, { color: c.text.primary }]}>
                  {pattern.label} · {durationSec}s
                </Text>
                <Text style={[styles.sub, { color: c.text.secondary }]}>
                  Tap to begin. Let the circle lead your breath.
                </Text>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setStarted(true);
                  }}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: gradient.accent, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <Text style={styles.primaryBtnText}>Begin</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.timer, { color: c.text.primary }]}>{remaining}s</Text>
                <Text style={[styles.sub, { color: c.text.secondary }]}>
                  {pattern.label} · {Math.ceil(remaining / cycleSec)} cycles left
                </Text>
              </>
            )}
            <Pressable
              onPress={() => finish(false)}
              hitSlop={12}
              style={({ pressed }) => [styles.closeLink, pressed && { opacity: 0.6 }]}
            >
              <Text style={{ color: c.text.tertiary, fontSize: 13 }}>
                {started ? "End session" : "Close"}
              </Text>
            </Pressable>
          </View>

          <View style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

function nextPhase(
  p: "inhale" | "holdIn" | "exhale" | "holdOut",
  pattern: { inhale: number; holdIn: number; exhale: number; holdOut: number },
): "inhale" | "holdIn" | "exhale" | "holdOut" {
  if (p === "inhale") return pattern.holdIn > 0 ? "holdIn" : "exhale";
  if (p === "holdIn") return "exhale";
  if (p === "exhale") return pattern.holdOut > 0 ? "holdOut" : "inhale";
  return "inhale";
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 24,
  },
  breathCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headline: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 20,
    letterSpacing: 0.3,
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  timer: {
    fontSize: 44,
    fontWeight: "200",
    letterSpacing: -1,
  },
  closeLink: {
    marginTop: 24,
    padding: 8,
  },
});
