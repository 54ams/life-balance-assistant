import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TOUR_STEPS, advanceTourStep, skipTour } from "@/lib/tour";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Spotlight regions — approximate positions where each target lives on-screen.
// These create a "cutout" in the dark overlay so the element shows through.
type SpotlightRegion = { x: number; y: number; w: number; h: number; borderRadius: number };

const SPOTLIGHT_REGIONS: Record<string, SpotlightRegion> = {
  orb: { x: SCREEN_WIDTH / 2 - 80, y: 160, w: 160, h: 160, borderRadius: 80 },
  ribbon: { x: 16, y: 340, w: SCREEN_WIDTH - 32, h: 80, borderRadius: 16 },
  quick_actions: { x: 16, y: 440, w: SCREEN_WIDTH - 32, h: 90, borderRadius: 16 },
  checkin_tab: { x: SCREEN_WIDTH * 0.25 - 35, y: SCREEN_HEIGHT - 90, w: 70, h: 60, borderRadius: 16 },
  insights_tab: { x: SCREEN_WIDTH * 0.5 - 35, y: SCREEN_HEIGHT - 90, w: 70, h: 60, borderRadius: 16 },
  profile_tab: { x: SCREEN_WIDTH * 0.75 - 35, y: SCREEN_HEIGHT - 90, w: 70, h: 60, borderRadius: 16 },
  final: { x: SCREEN_WIDTH / 2 - 60, y: SCREEN_HEIGHT / 2 - 60, w: 120, h: 120, borderRadius: 60 },
};

interface TourOverlayProps {
  initialStep?: number;
  onComplete: () => void;
}

export function TourOverlay({ initialStep = 0, onComplete }: TourOverlayProps) {
  const c = Colors.light;

  const [currentStep, setCurrentStep] = useState(initialStep);
  const step = TOUR_STEPS[currentStep];

  const fadeIn = useRef(new Animated.Value(0)).current;
  const spotlightScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animate in on step change
    fadeIn.setValue(0);
    spotlightScale.setValue(0.85);
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(spotlightScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();
  }, [currentStep, fadeIn, spotlightScale]);

  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = await advanceTourStep();
    if (next === -1) {
      onComplete();
    } else {
      setCurrentStep(next);
    }
  }, [onComplete]);

  const handleSkip = useCallback(async () => {
    await skipTour();
    onComplete();
  }, [onComplete]);

  if (!step) return null;

  const isLast = currentStep === TOUR_STEPS.length - 1;
  const progress = (currentStep + 1) / TOUR_STEPS.length;
  const spotlight = SPOTLIGHT_REGIONS[step.target] ?? SPOTLIGHT_REGIONS.final;

  // Position tooltip: above or below the spotlight depending on space
  const spotlightBottom = spotlight.y + spotlight.h;
  const spaceBelow = SCREEN_HEIGHT - spotlightBottom;
  const tooltipAbove = spaceBelow < 280;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Dark backdrop with cutout effect using 4 rects */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleNext}>
        {/* Top section */}
        <View style={[styles.backdropSection, { top: 0, left: 0, right: 0, height: spotlight.y }]} />
        {/* Bottom section */}
        <View style={[styles.backdropSection, { top: spotlightBottom, left: 0, right: 0, bottom: 0 }]} />
        {/* Left section */}
        <View style={[styles.backdropSection, { top: spotlight.y, left: 0, width: spotlight.x, height: spotlight.h }]} />
        {/* Right section */}
        <View style={[styles.backdropSection, { top: spotlight.y, left: spotlight.x + spotlight.w, right: 0, height: spotlight.h }]} />
      </Pressable>

      {/* Spotlight ring — pulsing border around the highlighted element */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.spotlightRing,
          {
            top: spotlight.y - 4,
            left: spotlight.x - 4,
            width: spotlight.w + 8,
            height: spotlight.h + 8,
            borderRadius: spotlight.borderRadius + 4,
            transform: [{ scale: spotlightScale }],
            opacity: fadeIn,
          },
        ]}
      />

      {/* Tooltip card */}
      <Animated.View
        style={[
          styles.tooltipContainer,
          tooltipAbove
            ? { bottom: SCREEN_HEIGHT - spotlight.y + 20 }
            : { top: spotlightBottom + 20 },
          { opacity: fadeIn, transform: [{ translateY: Animated.multiply(Animated.subtract(1, fadeIn), 10) }] },
        ]}
      >
        <View style={styles.tooltip}>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { backgroundColor: c.accent.primary, width: `${progress * 100}%` }]} />
          </View>

          {/* Step counter */}
          <Text style={{ color: c.text.tertiary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 12 }}>
            {currentStep + 1} of {TOUR_STEPS.length}
          </Text>

          {/* Title */}
          <Text style={[styles.title, { color: c.text.primary }]}>{step.title}</Text>

          {/* Description */}
          <Text style={[styles.description, { color: c.text.secondary }]}>{step.description}</Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {!isLast && (
              <Pressable onPress={handleSkip} style={styles.skipBtn}>
                <Text style={{ color: c.text.tertiary, fontSize: 14, fontWeight: "600" }}>Skip tour</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleNext}
              style={[styles.nextBtn, { backgroundColor: c.accent.primary }]}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
                {isLast ? "Get Started" : "Next"}
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
  backdropSection: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  spotlightRing: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: "#C7E86A",
    shadowColor: "#C7E86A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipContainer: {
    position: "absolute",
    left: 20,
    right: 20,
  },
  tooltip: {
    borderRadius: BorderRadius.xl,
    padding: 24,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
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
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.full,
  },
});
