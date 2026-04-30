import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { BorderRadius } from "@/constants/Spacing";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TOUR_STEPS, advanceTourStep, skipTour, type TourStep } from "@/lib/tour";
import * as Haptics from "expo-haptics";

// ─── Compatibility layer ────────────────────────────────────────────────────
// The previous tour highlighted specific rectangles using UIManager
// measurement. That was unreliable on web (especially after a refresh while
// scrolled), produced huge mis-positioned spotlight boxes, and looked broken
// at viva-quality. The simplified tour below ignores element positions and
// renders as a clean bottom sheet that works identically on web and mobile.
//
// We keep TourTargetProvider / TourTarget as no-op wrappers so the existing
// call sites (home screen orb, ribbon, quick actions) still compile and
// render their children unchanged.

type TargetRegistry = {
  register: (id: TourStep["target"], ref: unknown) => void;
  unregister: (id: TourStep["target"]) => void;
};

const TourTargetContext = createContext<TargetRegistry | null>(null);

export function TourTargetProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<TargetRegistry>(
    () => ({ register: () => {}, unregister: () => {} }),
    [],
  );
  return <TourTargetContext.Provider value={value}>{children}</TourTargetContext.Provider>;
}

export function TourTarget({
  children,
  ...viewProps
}: { id: TourStep["target"]; children: React.ReactNode } & ViewProps) {
  return <View {...viewProps}>{children}</View>;
}

// ─── Bottom-sheet tour ──────────────────────────────────────────────────────

interface TourOverlayProps {
  initialStep?: number;
  onComplete: () => void;
}

export function TourOverlay({ initialStep = 0, onComplete }: TourOverlayProps) {
  const c = Colors.light;
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const step = TOUR_STEPS[currentStep];

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fadeIn.setValue(0);
    slideUp.setValue(20);
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [currentStep, fadeIn, slideUp]);

  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = await advanceTourStep();
    if (next === -1) onComplete();
    else setCurrentStep(next);
  }, [onComplete]);

  const handleSkip = useCallback(async () => {
    await skipTour();
    onComplete();
  }, [onComplete]);

  if (!step) return null;

  const isLast = currentStep === TOUR_STEPS.length - 1;
  const progress = (currentStep + 1) / TOUR_STEPS.length;
  // Sit above the floating tab bar so the sheet never overlaps the nav.
  const bottomOffset = Math.max(insets.bottom, 12) + 96;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Subtle dim — tap dismisses the current step like Next */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleNext}>
        <Animated.View style={[styles.backdrop, { opacity: fadeIn }]} />
      </Pressable>

      <Animated.View
        style={[
          styles.sheetWrap,
          { bottom: bottomOffset, opacity: fadeIn, transform: [{ translateY: slideUp }] },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { backgroundColor: c.accent.primary, width: `${progress * 100}%` }]} />
          </View>

          <Text style={{ color: c.text.tertiary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 12 }}>
            {currentStep + 1} of {TOUR_STEPS.length}
          </Text>

          <Text style={[styles.title, { color: c.text.primary }]}>{step.title}</Text>
          <Text style={[styles.description, { color: c.text.secondary }]}>{step.description}</Text>

          <View style={styles.buttonRow}>
            {!isLast ? (
              <Pressable onPress={handleSkip} style={styles.skipBtn}>
                <Text style={{ color: c.text.tertiary, fontSize: 14, fontWeight: "600" }}>Skip tour</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              onPress={handleNext}
              style={[styles.nextBtn, { backgroundColor: c.accent.primary }]}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
                {isLast ? "Get started" : "Next"}
              </Text>
              {!isLast && <IconSymbol name="arrow.right" size={14} color="#fff" />}
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheetWrap: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  sheet: {
    borderRadius: BorderRadius.xl,
    padding: 22,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14.5,
    lineHeight: 21,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: BorderRadius.full,
  },
});
