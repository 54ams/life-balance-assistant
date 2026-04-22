import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  Dimensions,
  findNodeHandle,
  UIManager,
  type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { BorderRadius } from "@/constants/Spacing";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { TOUR_STEPS, advanceTourStep, skipTour, type TourStep } from "@/lib/tour";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type Rect = { x: number; y: number; w: number; h: number };

type TargetRegistry = {
  register: (id: TourStep["target"], ref: React.RefObject<any>) => void;
  unregister: (id: TourStep["target"]) => void;
  measure: (id: TourStep["target"]) => Promise<Rect | null>;
};

const TourTargetContext = createContext<TargetRegistry | null>(null);

/**
 * Wrap the home screen with this provider so components can register refs
 * under a tour target id. The TourOverlay consumes this registry to measure
 * the real on-screen position of each highlighted element.
 */
export function TourTargetProvider({ children }: { children: React.ReactNode }) {
  const refs = useRef(new Map<TourStep["target"], React.RefObject<any>>());

  const register = useCallback((id: TourStep["target"], ref: React.RefObject<any>) => {
    refs.current.set(id, ref);
  }, []);
  const unregister = useCallback((id: TourStep["target"]) => {
    refs.current.delete(id);
  }, []);

  const measure = useCallback((id: TourStep["target"]) => {
    return new Promise<Rect | null>((resolve) => {
      const ref = refs.current.get(id);
      const node = ref?.current;
      if (!node) return resolve(null);
      const handle = typeof node === "number" ? node : findNodeHandle(node);
      if (handle == null) return resolve(null);
      try {
        UIManager.measureInWindow(handle, (x, y, w, h) => {
          if (w === 0 && h === 0) return resolve(null);
          resolve({ x, y, w, h });
        });
      } catch {
        resolve(null);
      }
    });
  }, []);

  const value = useMemo(() => ({ register, unregister, measure }), [register, unregister, measure]);
  return <TourTargetContext.Provider value={value}>{children}</TourTargetContext.Provider>;
}

/**
 * Hook-powered wrapper: attach a ref to whichever element should be highlighted
 * when the given tour step is active. Accepts all View props.
 */
export function TourTarget({
  id,
  children,
  ...viewProps
}: { id: TourStep["target"]; children: React.ReactNode } & ViewProps) {
  const ctx = useContext(TourTargetContext);
  const ref = useRef<View>(null);
  useEffect(() => {
    if (!ctx) return;
    ctx.register(id, ref);
    return () => ctx.unregister(id);
  }, [ctx, id]);
  return (
    <View ref={ref} collapsable={false} {...viewProps}>
      {children}
    </View>
  );
}

interface TourOverlayProps {
  initialStep?: number;
  onComplete: () => void;
}

// Fallback regions if a target isn't registered (e.g. tab bar icons live in
// a different provider tree). Approximate, but beats nothing. Tab rows are
// computed against the real safe-area inset at render time (see below).
const TAB_BAR_HEIGHT = 68;
const TAB_BAR_SIDE_MARGIN = 20;
const TAB_BAR_BOTTOM_MARGIN = 12;

function fallbackRegionsFor(insetsBottom: number): Record<TourStep["target"], Rect> {
  const tabRowY = SCREEN_HEIGHT - Math.max(insetsBottom, 12) - TAB_BAR_HEIGHT;
  const usableWidth = SCREEN_WIDTH - TAB_BAR_SIDE_MARGIN * 2;
  const tabCellWidth = usableWidth / 4;
  // The floating bar has 4 cells: index(0), checkin(1), insights(2), profile(3)
  const tabX = (i: number) =>
    TAB_BAR_SIDE_MARGIN + tabCellWidth * i + tabCellWidth / 2 - 36;
  return {
    orb: { x: SCREEN_WIDTH / 2 - 130, y: 180, w: 260, h: 260 },
    ribbon: { x: 16, y: 470, w: SCREEN_WIDTH - 32, h: 90 },
    quick_actions: { x: 16, y: 580, w: SCREEN_WIDTH - 32, h: 100 },
    checkin_tab: { x: tabX(1), y: tabRowY, w: 72, h: TAB_BAR_HEIGHT },
    insights_tab: { x: tabX(2), y: tabRowY, w: 72, h: TAB_BAR_HEIGHT },
    profile_tab: { x: tabX(3), y: tabRowY, w: 72, h: TAB_BAR_HEIGHT },
    habits: { x: 16, y: SCREEN_HEIGHT / 2 - 60, w: SCREEN_WIDTH - 32, h: 120 },
    tools: { x: 16, y: SCREEN_HEIGHT / 2 - 60, w: SCREEN_WIDTH - 32, h: 120 },
    final: { x: SCREEN_WIDTH / 2 - 80, y: SCREEN_HEIGHT / 2 - 80, w: 160, h: 160 },
  };
}

function borderRadiusForTarget(target: TourStep["target"]): number {
  if (target === "orb" || target === "final") return 9999;
  return 16;
}

export function TourOverlay({ initialStep = 0, onComplete }: TourOverlayProps) {
  const c = Colors.light;
  const ctx = useContext(TourTargetContext);
  const insets = useSafeAreaInsets();
  const fallbacks = useMemo(() => fallbackRegionsFor(insets.bottom), [insets.bottom]);

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [rect, setRect] = useState<Rect>(() => fallbacks[TOUR_STEPS[initialStep]?.target ?? "final"]);
  const step = TOUR_STEPS[currentStep];

  const fadeIn = useRef(new Animated.Value(0)).current;
  const spotlightScale = useRef(new Animated.Value(0.9)).current;
  const spotlightPulse = useRef(new Animated.Value(0)).current;

  // Re-measure target whenever the step changes. Retry a couple of times
  // in case the target hasn't mounted yet (e.g. navigation animation).
  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    let attempts = 0;
    const tryMeasure = async () => {
      const measured = ctx ? await ctx.measure(step.target) : null;
      if (cancelled) return;
      if (measured) {
        setRect(measured);
      } else if (attempts < 6) {
        attempts += 1;
        setTimeout(tryMeasure, 120);
      } else {
        setRect(fallbacks[step.target]);
      }
    };
    setRect(fallbacks[step.target]);
    tryMeasure();
    return () => { cancelled = true; };
  }, [currentStep, ctx, step, fallbacks]);

  // Entry + pulse animations
  useEffect(() => {
    fadeIn.setValue(0);
    spotlightScale.setValue(0.92);
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(spotlightScale, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
    ]).start();

    spotlightPulse.setValue(0);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(spotlightPulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(spotlightPulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [currentStep, fadeIn, spotlightScale, spotlightPulse]);

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
  const borderRadius = borderRadiusForTarget(step.target);

  // Tooltip placement — above the spotlight if there isn't room below.
  const PADDING = 12;
  const spotlightBottom = rect.y + rect.h;
  const spaceBelow = SCREEN_HEIGHT - spotlightBottom;
  const tooltipAbove = spaceBelow < 300;
  const pulseOpacity = spotlightPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  const pulseScale = spotlightPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Dark backdrop with cutout via 4 rects around the spotlight */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleNext}>
        <View style={[styles.backdropSection, { top: 0, left: 0, right: 0, height: Math.max(0, rect.y - PADDING) }]} />
        <View style={[styles.backdropSection, { top: spotlightBottom + PADDING, left: 0, right: 0, bottom: 0 }]} />
        <View style={[styles.backdropSection, { top: Math.max(0, rect.y - PADDING), left: 0, width: Math.max(0, rect.x - PADDING), height: rect.h + PADDING * 2 }]} />
        <View style={[styles.backdropSection, { top: Math.max(0, rect.y - PADDING), left: rect.x + rect.w + PADDING, right: 0, height: rect.h + PADDING * 2 }]} />
      </Pressable>

      {/* Pulsing spotlight ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.spotlightRing,
          {
            top: rect.y - PADDING,
            left: rect.x - PADDING,
            width: rect.w + PADDING * 2,
            height: rect.h + PADDING * 2,
            borderRadius: borderRadius + PADDING,
            transform: [{ scale: Animated.multiply(spotlightScale, pulseScale) }],
            opacity: Animated.multiply(fadeIn, pulseOpacity),
          },
        ]}
      />

      {/* Tooltip card */}
      <Animated.View
        style={[
          styles.tooltipContainer,
          tooltipAbove
            ? { bottom: SCREEN_HEIGHT - rect.y + PADDING + 16 }
            : { top: spotlightBottom + PADDING + 16 },
          { opacity: fadeIn, transform: [{ translateY: Animated.multiply(Animated.subtract(1, fadeIn), 10) }] },
        ]}
      >
        <View style={styles.tooltip}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { backgroundColor: c.accent.primary, width: `${progress * 100}%` }]} />
          </View>

          <Text style={{ color: c.text.tertiary, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 12 }}>
            {currentStep + 1} of {TOUR_STEPS.length}
          </Text>

          <Text style={[styles.title, { color: c.text.primary }]}>{step.title}</Text>
          <Text style={[styles.description, { color: c.text.secondary }]}>{step.description}</Text>

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
