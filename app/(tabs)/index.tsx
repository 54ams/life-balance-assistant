import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";

import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { StateOrb } from "@/components/ui/StateOrb";
import { Ribbon7, type RibbonDay } from "@/components/ui/Ribbon7";
import { RealignCard } from "@/components/ui/RealignCard";
import { AnchorCard } from "@/components/ui/AnchorCard";
import { BreathSession } from "@/components/ui/BreathSession";
import { GlassCard } from "@/components/ui/GlassCard";
import { HeatmapCalendar } from "@/components/ui/HeatmapCalendar";
import { IconSymbol } from "@/components/ui/icon-symbol";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, bridgeStateFrom, type BridgeState } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";

import { getAllDays, getDay, getUserName, listDailyRecords, loadPlan, setPlanActionCompleted } from "@/lib/storage";
import { getCachedRecommendation, type SmartRecommendation } from "@/lib/smartRecommendation";
import { todayISO } from "@/lib/util/todayISO";
import type { DailyRecord, ISODate } from "@/lib/types";
import { refreshDerivedForDate } from "@/lib/pipeline";
import { mentalScore, physioScore, narrativeFor, type NarrativeTone } from "@/lib/bridge";
import { getDemoModeChoice, kioskReset } from "@/lib/demo";
import { getPreferredTone } from "@/lib/privacy";
import { realignFor } from "@/lib/realign";
import { getAnchorsForDate, isDawnWindow, isDuskWindow, listAnchors, type AnchorRecord } from "@/lib/anchors";
import { getActiveLift } from "@/lib/lift";
import type { LbiOutput } from "@/lib/lbi";
import { getTodayProgress, getLongestActiveStreak } from "@/lib/habits";
import { detectDecline, type PatternAlert } from "@/lib/patternInterrupt";
import { shouldPromptWeeklyReflection } from "@/lib/weeklyReflection";
import { hasCompletedTour } from "@/lib/tour";
import { computeBaselineMeta, type BaselineMeta } from "@/lib/baseline";
import { TourOverlay, TourTarget, TourTargetProvider } from "@/components/ui/TourOverlay";

function greetingForHour(h: number) {
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function clamp01to100(n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const [date] = useState<ISODate>(todayISO());

  // Bridge state — the single source of truth that drives hue, orb, aurora.
  const [physio, setPhysio] = useState<number | null>(null);
  const [mentalRaw, setMentalRaw] = useState<number | null>(null);
  const [activeLift, setActiveLift] = useState<number>(0);
  const [lbi, setLbi] = useState<LbiOutput | null>(null);

  // Ribbon + heatmap
  const [ribbonDays, setRibbonDays] = useState<RibbonDay[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ date: string; value: number }[]>([]);

  // Anchors
  const [anchorsToday, setAnchorsToday] = useState<AnchorRecord>({ date });

  // Plan — collapsed to a single "one thing"
  const [todayPlan, setTodayPlan] = useState<
    { focus: string; actions: string[]; actionReasons: string[]; completedActions: boolean[] } | null
  >(null);

  // Smart recommendation (Layer 4)
  const [smartRec, setSmartRec] = useState<SmartRecommendation | null>(null);

  // UI / session
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [userName, setUserName] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [tone, setTone] = useState<NarrativeTone>("Gentle");
  const [hasAnyData, setHasAnyData] = useState(true);
  // Wearable / score baseline calibration status. Surfaced as a banner so
  // testers and viva examiners understand why early-day scores can read low —
  // the LBI needs a few days of data before its baseline is meaningful.
  const [baselineMeta, setBaselineMeta] = useState<BaselineMeta | null>(null);
  const [breathVisible, setBreathVisible] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);
  const [milestone, setMilestone] = useState<string | null>(null);

  // New interconnected features
  const [habitProgress, setHabitProgress] = useState<{ total: number; completed: number }>({ total: 0, completed: 0 });
  const [longestStreak, setLongestStreak] = useState(0);
  const [patternAlert, setPatternAlert] = useState<PatternAlert | null>(null);
  const [showWeeklyPrompt, setShowWeeklyPrompt] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Reveal animation
  const reveal = useRef(new Animated.Value(0)).current;

  const headerGreeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  // Kiosk reset — preserved from previous Home so live viva handovers still work.
  const armedAtRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);
  const lastTapRef = useRef<number>(0);

  const armKioskReset = useCallback(() => {
    armedAtRef.current = Date.now();
    tapCountRef.current = 0;
    lastTapRef.current = 0;
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const runKioskReset = useCallback(() => {
    Alert.alert(
      "Reset app?",
      "This clears everything on this device and takes you back to the welcome screen. Handy if you want to start completely fresh.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await kioskReset();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              router.replace("/welcome" as any);
            } catch (err) {
              Alert.alert("Reset failed", (err as any)?.message ?? "Unknown error");
            }
          },
        },
      ],
    );
  }, []);

  const onGreetingTap = useCallback(() => {
    const now = Date.now();
    if (now - armedAtRef.current > 3000) {
      tapCountRef.current = 0;
      return;
    }
    if (now - lastTapRef.current > 700) tapCountRef.current = 0;
    lastTapRef.current = now;
    tapCountRef.current += 1;
    if (tapCountRef.current >= 3) {
      armedAtRef.current = 0;
      tapCountRef.current = 0;
      runKioskReset();
    }
  }, [runKioskReset]);

  /* ---------------- Loaders ---------------- */

  const refreshLift = useCallback(async () => {
    const lift = await getActiveLift();
    setActiveLift(lift);
  }, []);

  const refreshAnchors = useCallback(async () => {
    setAnchorsToday(await getAnchorsForDate(date));
  }, [date]);

  const loadHome = useCallback(() => {
    let alive = true;
    (async () => {
      try {
        const day = await getDay(date);
        setCheckedInToday(!!day?.checkIn);

        const pScore = day ? physioScore(day) : null;
        const mScore = day ? mentalScore(day) : null;
        setPhysio(pScore);
        setMentalRaw(mScore);

        if (!day?.wearable && !day?.checkIn) {
          setHasAnyData(false);
          setLbi(null);
          setTodayPlan(null);
        } else {
          setHasAnyData(true);
          if (day?.wearable) {
            try {
              const derived = await refreshDerivedForDate(date);
              if (alive) setLbi(derived.lbi);
            } catch {
              /* non-fatal */
            }
            const plan = await loadPlan(date);
            if (alive) {
              setTodayPlan(
                plan
                  ? {
                      focus: plan.focus,
                      actions: plan.actions,
                      actionReasons: plan.actionReasons ?? [],
                      completedActions: plan.completedActions ?? plan.actions.map(() => false),
                    }
                  : null,
              );
            }
          } else {
            setLbi(null);
            setTodayPlan(null);
          }
        }

        // Ribbon — last 7 days with bridge state + anchor markers
        const [records, allAnchors] = await Promise.all([
          listDailyRecords(14),
          listAnchors(14),
        ]);

        try {
          const meta = await computeBaselineMeta();
          if (alive) setBaselineMeta(meta);
        } catch {
          /* non-fatal — banner just hides */
        }
        if (alive) {
          const anchorDates = new Set(
            allAnchors.filter((a) => a.dawn || a.dusk).map((a) => a.date),
          );
          const last7: RibbonDay[] = fillLast7Days(records, anchorDates);
          setRibbonDays(last7);

          // Heatmap — all days with an LBI score
          const hm = records
            .filter((r) => typeof r.lbi === "number")
            .map((r) => ({ date: r.date, value: r.lbi as number }));
          setHeatmapData(hm);
        }

        // Load smart recommendation
        const rec = await getCachedRecommendation(date);
        if (alive && rec) setSmartRec(rec);

        await refreshAnchors();
        await refreshLift();

        setUserName(await getUserName());
        setTone(await getPreferredTone());
        setIsDemoMode((await getDemoModeChoice()) === "demo");

        // New interconnected features
        const hp = await getTodayProgress();
        if (alive) setHabitProgress({ total: hp.total, completed: hp.completed });
        const streak = await getLongestActiveStreak();
        if (alive) setLongestStreak(streak);
        const alert = detectDecline(records);
        if (alive) setPatternAlert(alert.active ? alert : null);
        const weeklyPrompt = await shouldPromptWeeklyReflection();
        if (alive) setShowWeeklyPrompt(weeklyPrompt);
        const tourDone = await hasCompletedTour();
        if (alive) setShowTour(!tourDone);

        // Milestone detection
        const checkInCount = records.filter((r) => r.checkIn != null).length;
        const milestones = [
          { n: 30, key: "milestone_dismissed_30", msg: "30 days logged! Your baselines are well-established." },
          { n: 7, key: "milestone_dismissed_7", msg: "One week of check-ins! Patterns are starting to form." },
          { n: 1, key: "milestone_dismissed_1", msg: "First check-in complete! You've taken the first step." },
        ];
        for (const m of milestones) {
          if (checkInCount >= m.n) {
            const dismissed = await AsyncStorage.getItem(m.key);
            if (!dismissed) { if (alive) setMilestone(m.msg); break; }
          }
        }
      } catch (err: any) {
        if (alive) setHasAnyData(false);
      }

      // Animate reveal once
      Animated.timing(reveal, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }).start();
    })();
    return () => {
      alive = false;
    };
  }, [date, reveal, refreshAnchors, refreshLift]);

  useEffect(() => {
    return loadHome();
  }, [loadHome]);

  useFocusEffect(
    useCallback(() => {
      return loadHome();
    }, [loadHome]),
  );

  // Periodically refresh the active lift so the orb fades back as the 30-min
  // window decays, without requiring the user to reopen the screen.
  useEffect(() => {
    const t = setInterval(() => {
      refreshLift();
    }, 30 * 1000);
    return () => clearInterval(t);
  }, [refreshLift]);

  /* ---------------- Derived values ---------------- */

  // The mentalScore the orb sees — raw signal + transient lift from rituals.
  const mentalForOrb = useMemo(() => {
    if (mentalRaw == null && activeLift === 0) return null;
    const base = mentalRaw ?? 50; // soft default so the lift still registers visually
    return clamp01to100(base + activeLift);
  }, [mentalRaw, activeLift]);

  const state: BridgeState = useMemo(() => bridgeStateFrom(physio, mentalForOrb), [physio, mentalForOrb]);
  const narrative = useMemo(() => narrativeFor(physio, mentalForOrb, tone), [physio, mentalForOrb, tone]);
  const realign = useMemo(() => realignFor(physio, mentalForOrb), [physio, mentalForOrb]);

  // First incomplete action from the plan → "Today's one thing"
  const oneThing = useMemo(() => {
    if (!todayPlan) return null;
    const idx = todayPlan.completedActions.findIndex((x) => !x);
    if (idx < 0) return null;
    return {
      index: idx,
      text: todayPlan.actions[idx],
      reason: todayPlan.actionReasons[idx] ?? "",
    };
  }, [todayPlan]);

  const showDawn = isDawnWindow() && !anchorsToday.dawn;
  const showDusk = isDuskWindow() && !anchorsToday.dusk;

  /* ---------------- Handlers ---------------- */

  const onOrbLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push("/insights/bridge" as any);
  }, []);

  const onOrbPress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.push("/insights/bridge" as any);
  }, []);

  const onRealignPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setBreathVisible(true);
  }, []);

  const onBreathComplete = useCallback(async () => {
    // Active lift has been recorded inside BreathSession via lib/lift.
    await refreshLift();
    setRippleKey((k) => k + 1);
  }, [refreshLift]);

  const onAnchorCaptured = useCallback(async () => {
    await refreshAnchors();
    await refreshLift();
    setRippleKey((k) => k + 1);
  }, [refreshAnchors, refreshLift]);

  const toggleOneThing = useCallback(async () => {
    if (!todayPlan || !oneThing) return;
    const next = [...todayPlan.completedActions];
    next[oneThing.index] = true;
    setTodayPlan({ ...todayPlan, completedActions: next });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await setPlanActionCompleted(date, oneThing.index, true);
    setRippleKey((k) => k + 1);
  }, [todayPlan, oneThing, date]);

  /* ---------------- Empty state ---------------- */

  if (!hasAnyData && !lbi) {
    return (
      <View style={{ flex: 1 }}>
        <AuroraBackground state="neutral" />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Pressable
                style={{ flex: 1 }}
                onPress={onGreetingTap}
                onLongPress={armKioskReset}
                delayLongPress={800}
              >
                <Text style={[styles.greeting, { color: c.text.secondary }]}>
                  {headerGreeting}
                  {userName ? `, ${userName}` : ""}
                </Text>
              </Pressable>
              {isDemoMode && (
                <Pressable
                  onPress={() => router.push("/profile/settings/demo" as any)}
                  style={[styles.demoChip, { backgroundColor: c.accent.primary }]}
                >
                  <Text style={[styles.demoChipText, { color: c.onPrimary }]}>Demo data</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => router.push("/profile" as any)}
                style={[
                  styles.avatar,
                  {
                    backgroundColor: "rgba(0,0,0,0.05)",
                    borderColor: c.border.light,
                  },
                ]}
              >
                <IconSymbol name="person.fill" size={18} color={c.text.secondary} />
              </Pressable>
            </View>

            {/* Hero card — first-launch guidance */}
            <View style={{ marginTop: Spacing.xl, alignItems: "center" }}>
              <StateOrb physio={null} mental={null} lbi={null} size={160} />
              <Text
                style={{
                  color: c.text.primary,
                  fontSize: 26,
                  fontFamily: "CormorantGaramond_500Medium_Italic",
                  textAlign: "center",
                  marginTop: Spacing.base,
                  lineHeight: 32,
                }}
              >
                Your balance starts here
              </Text>
              <Text
                style={{
                  color: c.text.secondary,
                  fontSize: 14,
                  textAlign: "center",
                  marginTop: 6,
                  lineHeight: 20,
                  maxWidth: 300,
                }}
              >
                A short check-in is all you need. The orb will reflect how your body and mind are tracking together.
              </Text>
            </View>

            {/* CTA */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/checkin" as any);
              }}
              style={({ pressed }) => [
                {
                  marginTop: Spacing.lg,
                  backgroundColor: c.accent.primary,
                  borderRadius: BorderRadius.xl,
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                },
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
              ]}
            >
              <Text style={{ color: c.lime, fontSize: 16, fontWeight: "900" }}>
                Start your first check-in
              </Text>
              <IconSymbol name="arrow.right" size={16} color={c.lime} />
            </Pressable>

            {/* Three pillars overview */}
            <View style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
              <Text
                style={{
                  color: c.text.tertiary,
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 1.2,
                  marginBottom: 4,
                }}
              >
                HOW IT WORKS
              </Text>
              {[
                {
                  icon: "square.and.pencil" as const,
                  title: "Check in daily",
                  desc: "Place yourself on the affect canvas, tag life pressures and resources, add a note if you want.",
                },
                {
                  icon: "heart.fill" as const,
                  title: "Connect your body",
                  desc: "Sync a WHOOP band to bring in recovery, sleep, and strain — the physiological side of the bridge.",
                },
                {
                  icon: "chart.line.uptrend.xyaxis" as const,
                  title: "Watch patterns emerge",
                  desc: "The app finds relationships between your body and mind over time. No rules — just things to notice.",
                },
              ].map((item) => (
                <GlassCard key={item.title} padding="base">
                  <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 14,
                        backgroundColor: c.accent.primary + "14",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconSymbol name={item.icon} size={18} color={c.accent.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text.primary, fontSize: 15, fontWeight: "800" }}>
                        {item.title}
                      </Text>
                      <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 2, lineHeight: 17 }}>
                        {item.desc}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  /* ---------------- Main ---------------- */

  return (
    <TourTargetProvider>
    <View style={{ flex: 1 }}>
      <AuroraBackground state={state} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={{ flex: 1 }}
              onPress={onGreetingTap}
              onLongPress={armKioskReset}
              delayLongPress={800}
              accessibilityRole="none"
              accessibilityLabel={`${headerGreeting}${userName ? `, ${userName}` : ""}`}
            >
              <Text style={[styles.greeting, { color: c.text.secondary }]}>
                {headerGreeting}
                {userName ? `, ${userName}` : ""}
              </Text>
            </Pressable>
            {isDemoMode && (
              <Pressable
                onPress={() => router.push("/profile/settings/demo" as any)}
                accessibilityRole="button"
                accessibilityLabel="Demo data indicator. Tap to manage."
                style={[styles.demoChip, { backgroundColor: c.accent.primary }]}
              >
                <Text style={[styles.demoChipText, { color: c.onPrimary }]}>Demo data</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => router.push("/profile" as any)}
              style={[
                styles.avatar,
                {
                  backgroundColor: "rgba(0,0,0,0.05)",
                  borderColor: c.border.light,
                },
              ]}
            >
              <IconSymbol name="person.fill" size={18} color={c.text.secondary} />
            </Pressable>
          </View>

          <Animated.View
            style={{
              opacity: reveal,
              transform: [
                {
                  translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
                },
              ],
            }}
          >
            {/* Milestone celebration */}
            {milestone && (
              <GlassCard style={{ marginBottom: Spacing.md }} padding="base">
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 22 }}>⭐</Text>
                  <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15, flex: 1 }}>{milestone}</Text>
                  <Pressable
                    onPress={async () => {
                      const key = milestone.startsWith("30") ? "milestone_dismissed_30" : milestone.startsWith("One") ? "milestone_dismissed_7" : "milestone_dismissed_1";
                      await AsyncStorage.setItem(key, "1");
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setMilestone(null);
                    }}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: c.accent.primary }}
                  >
                    <Text style={{ color: c.onPrimary, fontSize: 12, fontWeight: "700" }}>Dismiss</Text>
                  </Pressable>
                </View>
              </GlassCard>
            )}

            {/* Narrative headline — the felt experience, not a number */}
            <Text
              style={[styles.narrative, { color: c.text.primary }]}
              accessibilityRole="header"
            >
              {narrative}
            </Text>

            {/* Smart recommendation — ML-classified daily insight */}
            {smartRec && (
              <GlassCard style={{ marginTop: Spacing.md }} padding="base">
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text
                    style={{
                      color: c.text.tertiary,
                      fontSize: 10,
                      fontWeight: "800",
                      letterSpacing: 1.6,
                    }}
                  >
                    TODAY'S INSIGHT
                  </Text>
                  {/* Provenance pill — surfaces honestly which signal drove
                      the recommendation. ml = personal model, ml-cold-start
                      = synthetic prior, +llm = phrasing enriched by the LLM,
                      rules = no feature row available yet. */}
                  {smartRec.category && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: c.border.medium,
                        backgroundColor: c.glass.secondary,
                      }}
                    >
                      <Text style={{ color: c.text.tertiary, fontSize: 9, fontWeight: "800", letterSpacing: 1 }}>
                        {smartRec.source.toUpperCase()}
                      </Text>
                      <Text style={{ color: c.accent.primary, fontSize: 9, fontWeight: "900", letterSpacing: 1 }}>
                        · {smartRec.category}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{
                    color: c.text.primary,
                    fontSize: 17,
                    fontWeight: "800",
                    marginTop: 4,
                    letterSpacing: -0.2,
                  }}
                >
                  {smartRec.headline}
                </Text>
                <Text
                  style={{
                    color: c.text.secondary,
                    fontSize: 14,
                    marginTop: 4,
                    lineHeight: 20,
                  }}
                >
                  {smartRec.text}
                </Text>
                {smartRec.topDrivers && smartRec.topDrivers.length > 0 && (
                  <Text
                    style={{
                      color: c.text.tertiary,
                      fontSize: 11,
                      marginTop: 8,
                      fontStyle: "italic",
                    }}
                  >
                    Why: {smartRec.topDrivers
                      .slice(0, 2)
                      .map((d) => `${d.name.replace("_z", "")} ${d.direction === "up" ? "↑" : "↓"}`)
                      .join(", ")}
                  </Text>
                )}
              </GlassCard>
            )}

            {/* Baseline calibration banner — shown until the LBI baseline is
                stable. Without this, early-day scores can read low or jumpy
                and testers (and the viva examiner) won't know why. */}
            {baselineMeta && baselineMeta.status === "calibrating" && (
              <GlassCard style={{ marginTop: Spacing.md }} padding="base">
                <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                  <IconSymbol name="waveform.path.ecg" size={18} color={c.accent.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 14 }}>
                      Still calibrating
                    </Text>
                    <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                      Day {Math.min(baselineMeta.daysUsed, baselineMeta.targetDays)} of {baselineMeta.targetDays}.
                      Your score finds its meaning by comparing today to your own
                      pattern, so it'll read more reliably once a few more days
                      are in.
                    </Text>
                  </View>
                </View>
              </GlassCard>
            )}

            {/* State Orb — the single expressive metric */}
            <View style={{ alignItems: "center", marginTop: Spacing.lg }}>
              <TourTarget id="orb">
              <StateOrb
                physio={physio}
                mental={mentalForOrb}
                lbi={lbi ? lbi.lbi : null}
                size={260}
                rippleKey={rippleKey}
                onPress={onOrbPress}
                onLongPress={onOrbLongPress}
              />
              </TourTarget>
              <Text
                style={{
                  color: c.text.tertiary,
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 1.4,
                  marginTop: 10,
                  textTransform: "uppercase" as const,
                }}
              >
                Mind–Body Balance
              </Text>
              <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 4 }}>
                Tap to see your bridge
              </Text>
            </View>

            {/* 7-day ribbon */}
            {ribbonDays.length > 0 && (
              <TourTarget id="ribbon">
                <Ribbon7
                  days={ribbonDays}
                  onPressDay={(d) => router.push(`/day/${d}` as any)}
                />
                <Text style={{ color: c.text.tertiary, fontSize: 11, textAlign: "center", marginTop: 4 }}>
                  Tap a day for details
                </Text>
              </TourTarget>
            )}

            {/* 8-week heatmap — shows data density at a glance */}
            {heatmapData.length >= 7 && (
              <Pressable onPress={() => router.push("/insights/balance-summary" as any)}>
                <GlassCard style={{ marginTop: Spacing.lg }} padding="base">
                  <Text
                    style={{
                      color: c.text.tertiary,
                      fontSize: 10,
                      fontWeight: "800",
                      letterSpacing: 1.2,
                      marginBottom: 10,
                    }}
                  >
                    YOUR LAST 8 WEEKS
                  </Text>
                  <HeatmapCalendar
                    data={heatmapData}
                    weeks={8}
                    onDayPress={(d) => router.push(`/day/${d}` as any)}
                  />
                  <Text style={{ color: c.accent.primary, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 10 }}>
                    Tap to see your balance summary →
                  </Text>
                </GlassCard>
              </Pressable>
            )}

            {/* Realign — matched micro-intervention when divergent */}
            {realign.show && (
              <RealignCard action={realign} state={state} onPress={onRealignPress} />
            )}

            {/* Dawn / dusk anchor */}
            {showDawn && (
              <AnchorCard kind="dawn" existing={anchorsToday} onCapture={onAnchorCaptured} />
            )}
            {showDusk && (
              <AnchorCard kind="dusk" existing={anchorsToday} onCapture={onAnchorCaptured} />
            )}
            {/* If already captured, show the collapsed acknowledgement */}
            {!showDawn && anchorsToday.dawn && isDawnWindow() && (
              <AnchorCard kind="dawn" existing={anchorsToday} />
            )}
            {!showDusk && anchorsToday.dusk && isDuskWindow() && (
              <AnchorCard kind="dusk" existing={anchorsToday} />
            )}

            {/* Today's one thing — a single next-step nudge */}
            {oneThing && (
              <View
                style={[
                  styles.oneThingWrap,
                  {
                    backgroundColor: "rgba(255,255,255,0.55)",
                    borderColor: c.border.light,
                  },
                ]}
              >
                <Text style={[styles.eyebrow, { color: c.text.tertiary }]}>TODAY'S ONE THING</Text>
                <Text style={[styles.oneThingTitle, { color: c.text.primary }]}>{oneThing.text}</Text>
                {oneThing.reason ? (
                  <Text style={[styles.oneThingReason, { color: c.text.secondary }]}>
                    {oneThing.reason}
                  </Text>
                ) : null}
                <Pressable
                  onPress={toggleOneThing}
                  style={({ pressed }) => [
                    styles.oneThingBtn,
                    {
                      backgroundColor: c.accent.primary,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={styles.oneThingBtnText}>Mark done</Text>
                </Pressable>
              </View>
            )}

            {/* Quick Actions — always visible toolkit */}
            <TourTarget id="quick_actions" style={styles.quickActionsRow}>
              {[
                { icon: "wind", label: "Breathe", onPress: () => setBreathVisible(true) },
                { icon: "square.and.pencil", label: checkedInToday ? "Update" : "Check in", onPress: () => router.push("/checkin" as any) },
                { icon: "repeat", label: "Habits", onPress: () => router.push("/checkin/habits" as any) },
                { icon: "lightbulb.fill", label: "Reframe", onPress: () => router.push("/checkin/reframe" as any) },
              ].map((action) => (
                <Pressable
                  key={action.label}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); action.onPress(); }}
                  style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: c.accent.primary + "14" }]}>
                    <IconSymbol name={action.icon as any} size={20} color={c.accent.primary} />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: c.text.secondary }]}>{action.label}</Text>
                </Pressable>
              ))}
            </TourTarget>

            {/* Pattern Alert — urgent card when declining */}
            {patternAlert && (
              <GlassCard style={{ marginTop: Spacing.lg, borderColor: "#ef4444" + "40" }} padding="base">
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#ef444420", alignItems: "center", justifyContent: "center" }}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#ef4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text.primary, fontSize: 14, fontWeight: "700" }}>
                      {patternAlert.message}
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                      {patternAlert.suggestedActions.slice(0, 3).map((action) => (
                        <Pressable
                          key={action.id}
                          onPress={() => {
                            if (action.route) router.push(action.route as any);
                            else if (action.tool === "breathe") setBreathVisible(true);
                          }}
                          style={[styles.interruptChip, { backgroundColor: c.accent.primary }]}
                        >
                          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{action.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              </GlassCard>
            )}

            {/* Habit Progress + Streak */}
            {habitProgress.total > 0 && (
              <Pressable onPress={() => router.push("/checkin/habits" as any)}>
                <GlassCard style={{ marginTop: Spacing.lg }} padding="base">
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }}>TODAY'S HABITS</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <View style={[styles.progressBar, { backgroundColor: "rgba(0,0,0,0.06)" }]}>
                          <View style={[styles.progressFill, { backgroundColor: c.accent.primary, width: `${habitProgress.total > 0 ? (habitProgress.completed / habitProgress.total) * 100 : 0}%` }]} />
                        </View>
                        <Text style={{ color: c.text.secondary, fontSize: 13, fontWeight: "700" }}>
                          {habitProgress.completed}/{habitProgress.total}
                        </Text>
                      </View>
                    </View>
                    {longestStreak > 0 && (
                      <View style={[styles.streakBadge, { backgroundColor: "#f59e0b18" }]}>
                        <Text style={{ fontSize: 14 }}>🔥</Text>
                        <Text style={{ color: "#f59e0b", fontSize: 14, fontWeight: "800" }}>{longestStreak}</Text>
                      </View>
                    )}
                  </View>
                </GlassCard>
              </Pressable>
            )}

            {/* Weekly Reflection Prompt */}
            {showWeeklyPrompt && (
              <Pressable onPress={() => router.push("/insights/weekly-reflection" as any)}>
                <GlassCard style={{ marginTop: Spacing.lg }} padding="base">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: c.accent.primary + "14", alignItems: "center", justifyContent: "center" }}>
                      <IconSymbol name="calendar.badge.clock" size={20} color={c.accent.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text.primary, fontSize: 15, fontWeight: "700" }}>Time for your weekly reflection</Text>
                      <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 2 }}>Review your week, celebrate wins, set intentions</Text>
                    </View>
                    <IconSymbol name="chevron.right" size={14} color={c.text.tertiary} />
                  </View>
                </GlassCard>
              </Pressable>
            )}

            {/* More tools row */}
            <View style={[styles.moreToolsRow, { marginTop: Spacing.lg }]}>
              <Pressable
                onPress={() => router.push("/checkin/sleep-hygiene" as any)}
                style={({ pressed }) => [styles.toolCard, { backgroundColor: "rgba(255,255,255,0.6)" }, pressed && { opacity: 0.7 }]}
              >
                <IconSymbol name="moon.fill" size={18} color={c.accent.primary} />
                <Text style={{ color: c.text.primary, fontSize: 12, fontWeight: "700", marginTop: 4 }}>Sleep</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/insights/cycles" as any)}
                style={({ pressed }) => [styles.toolCard, { backgroundColor: "rgba(255,255,255,0.6)" }, pressed && { opacity: 0.7 }]}
              >
                <IconSymbol name="arrow.triangle.2.circlepath" size={18} color={c.accent.primary} />
                <Text style={{ color: c.text.primary, fontSize: 12, fontWeight: "700", marginTop: 4 }}>Cycles</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/insights" as any)}
                style={({ pressed }) => [styles.toolCard, { backgroundColor: "rgba(255,255,255,0.6)" }, pressed && { opacity: 0.7 }]}
              >
                <IconSymbol name="sparkles" size={18} color={c.accent.primary} />
                <Text style={{ color: c.text.primary, fontSize: 12, fontWeight: "700", marginTop: 4 }}>Insights</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/checkin/grounding" as any)}
                style={({ pressed }) => [styles.toolCard, { backgroundColor: "rgba(255,255,255,0.6)" }, pressed && { opacity: 0.7 }]}
              >
                <IconSymbol name="leaf.fill" size={18} color={c.accent.primary} />
                <Text style={{ color: c.text.primary, fontSize: 12, fontWeight: "700", marginTop: 4 }}>Ground</Text>
              </Pressable>
            </View>

            <Text
              style={{
                color: c.text.tertiary,
                marginTop: Spacing.lg,
                fontSize: 11,
                textAlign: "center",
                lineHeight: 16,
                letterSpacing: 0.3,
              }}
            >
              Just observations, not diagnoses · Two things lining up doesn't mean one caused the other
            </Text>
          </Animated.View>
        </ScrollView>

        {/* Breath session modal */}
        <BreathSession
          visible={breathVisible}
          preset={realign.preset}
          durationSec={realign.durationSec}
          state={state}
          onClose={() => setBreathVisible(false)}
          onComplete={() => onBreathComplete()}
        />

        {/* App Tour overlay — shown once after onboarding */}
        {showTour && (
          <TourOverlay onComplete={() => setShowTour(false)} />
        )}
      </SafeAreaView>
    </View>
    </TourTargetProvider>
  );
}

/* ---------------- Helpers ---------------- */

function fillLast7Days(records: DailyRecord[], anchorDates: Set<string>): RibbonDay[] {
  const byDate = new Map<string, DailyRecord>();
  for (const r of records) byDate.set(r.date, r);

  const out: RibbonDay[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const rec = byDate.get(iso);
    out.push({
      date: iso,
      physio: rec ? physioScore(rec) : null,
      mental: rec ? mentalScore(rec) : null,
      hasAnchor: anchorDates.has(iso),
    });
  }
  return out;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  greeting: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  demoChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
  },
  demoChipText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  narrative: {
    marginTop: Spacing.lg,
    fontSize: 30,
    fontFamily: "CormorantGaramond_500Medium_Italic",
    letterSpacing: -0.3,
    lineHeight: 38,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  oneThingWrap: {
    marginTop: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  oneThingTitle: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  oneThingReason: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  oneThingBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  oneThingBtnText: {
    color: "#EFE8D9",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.4,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    gap: 8,
  },
  quickAction: {
    alignItems: "center",
    flex: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  interruptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%" as const,
    borderRadius: 4,
  },
  streakBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 12,
  },
  moreToolsRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: 8,
  },
  toolCard: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
});
