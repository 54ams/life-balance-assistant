import React, { useCallback, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Dimensions,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TOUR_STEPS, advanceTourStep, skipTour } from "@/lib/tour";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TourOverlayProps {
  initialStep?: number;
  onComplete: () => void;
}

export function TourOverlay({ initialStep = 0, onComplete }: TourOverlayProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [currentStep, setCurrentStep] = useState(initialStep);
  const step = TOUR_STEPS[currentStep];

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

  return (
    <View style={styles.overlay}>
      {/* Semi-transparent backdrop */}
      <Pressable style={styles.backdrop} onPress={handleNext} />

      {/* Tooltip card */}
      <View
        style={[
          styles.tooltipContainer,
          step.position === "top" && { top: 100 },
          step.position === "center" && { top: "35%" },
          step.position === "bottom" && { bottom: 140 },
        ]}
      >
        <View style={[styles.tooltip, { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" }]}>
          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }]}>
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
      </View>
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
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  tooltipContainer: {
    position: "absolute",
    left: 20,
    right: 20,
  },
  tooltip: {
    borderRadius: BorderRadius.xl,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
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
