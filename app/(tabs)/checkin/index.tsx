import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AffectCanvas } from "@/components/ui/AffectCanvas";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { todayISO } from "@/lib/util/todayISO";
import { getActiveValues, getCheckIn, getEmotion, upsertCheckIn, upsertEmotion } from "@/lib/storage";
import type { DailyCheckIn, EmotionalDiaryEntry } from "@/lib/types";
import { useColorScheme } from "react-native";
import { containsSelfHarmSignals } from "@/lib/privacy";
import { deriveIntensity } from "@/lib/emotion";
import { refreshDerivedForDate } from "@/lib/pipeline";
import { reflectEmotion } from "@/lib/llm";
import { recordReflectionFeedback } from "@/lib/reflectionFeedback";
import * as Haptics from "expo-haptics";

const STRESS_INDICATORS: Array<{ key: keyof NonNullable<DailyCheckIn["stressIndicators"]>; label: string }> = [
  { key: "muscleTension", label: "Muscle tension" },
  { key: "racingThoughts", label: "Racing thoughts" },
  { key: "irritability", label: "Irritability" },
  { key: "avoidance", label: "Avoidance" },
  { key: "restlessness", label: "Restlessness" },
];

const SCALE_LABELS: Record<string, string[]> = {
  Mood: ["Very low", "Low", "Neutral", "Good", "Great"],
  Energy: ["Exhausted", "Low", "Moderate", "High", "Energised"],
  "Stress level": ["None", "Mild", "Moderate", "High", "Severe"],
  "Sleep quality": ["Terrible", "Poor", "Fair", "Good", "Excellent"],
};

const STEP_TITLES = ["How you feel", "Today's signals", "Emotional snapshot"];
const STEP_SUBTITLES = [
  "Rate your mood, energy, sleep and stress",
  "Behaviours and stress indicators",
  "Map your affect, values and reflection",
];
const TOTAL_STEPS = 3;

function ScaleRow({
  label,
  value,
  onChange,
  c,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  c: typeof Colors.light;
}) {
  const labels = SCALE_LABELS[label] ?? [];
  return (
    <View style={{ marginTop: Spacing.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "700", color: c.text.primary, fontSize: 15 }}>{label}</Text>
        <Text style={{ color: c.text.secondary, fontSize: 12 }}>{labels[value - 1] ?? ""}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => {
                onChange(n);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${n}`}
              accessibilityState={{ selected: active }}
              style={[
                styles.scaleBtn,
                {
                  backgroundColor: active ? c.accent.primary : "transparent",
                  borderColor: active ? c.accent.primary : c.border.medium,
                },
              ]}
            >
              <Text style={{ fontWeight: "800", color: active ? "#fff" : c.text.primary, fontSize: 15 }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function DailyCheckInScreen() {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? Colors.dark : Colors.light;
  const isDark = scheme === "dark";
  const date = useMemo(() => todayISO(), []);

  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [checkIn, setCheckIn] = useState<DailyCheckIn>({
    mood: 3,
    energy: 3,
    stressLevel: 3,
    sleepQuality: 3,
    stressIndicators: {
      muscleTension: false,
      racingThoughts: false,
      irritability: false,
      avoidance: false,
      restlessness: false,
    },
    caffeineAfter2pm: false,
    alcohol: false,
    exerciseDone: false,
    deepWorkMins: 0,
    hydrationLitres: 0,
    notes: "",
  });
  const [emotion, setEmotion] = useState<EmotionalDiaryEntry | null>(null);
  const [activeValues, setActiveValues] = useState<string[]>([]);
  const [generatingReflection, setGeneratingReflection] = useState(false);
  const [reflectionSource, setReflectionSource] = useState<"remote" | "local" | "safety" | null>(null);
  const [reflectionFeedback, setReflectionFeedback] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    (async () => {
      const existing = await getCheckIn(date as any);
      if (existing) setCheckIn((prev) => ({ ...prev, ...existing }));
      const existingEmotion = await getEmotion(date as any);
      const values = await getActiveValues();
      setActiveValues(values);
      setEmotion(
        existingEmotion ?? {
          date: date as any,
          valence: 0,
          arousal: 0,
          intensity: 0,
          contextTags: [],
          regulation: "manageable",
          valueChosen: values[0] ?? "Health",
          reflection: "",
          source: "user",
        }
      );
    })();
  }, [date]);

  const toggleIndicator = (key: keyof NonNullable<DailyCheckIn["stressIndicators"]>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckIn((prev) => ({
      ...prev,
      stressIndicators: {
        ...(prev.stressIndicators ?? {
          muscleTension: false,
          racingThoughts: false,
          irritability: false,
          avoidance: false,
          restlessness: false,
        }),
        [key]: !(prev.stressIndicators ?? {})[key],
      },
    }));
  };

  const toggleBool = (key: keyof DailyCheckIn) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckIn((prev) => ({ ...prev, [key]: !(prev as any)[key] }));
  };

  const animateStep = (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const save = async () => {
    try {
      if ((checkIn.deepWorkMins ?? 0) < 0 || (checkIn.deepWorkMins ?? 0) > 960) {
        Alert.alert("Check-in", "Deep work minutes should be between 0 and 960.");
        return;
      }
      if ((checkIn.hydrationLitres ?? 0) < 0 || (checkIn.hydrationLitres ?? 0) > 10) {
        Alert.alert("Check-in", "Hydration should be between 0 and 10 litres.");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await upsertCheckIn(date as any, checkIn);
      if (emotion) {
        await upsertEmotion({
          ...emotion,
          date: date as any,
          intensity: deriveIntensity(emotion.valence, emotion.arousal),
          reflection: emotion.reflection?.trim() || undefined,
          contextTags: emotion.contextTags.slice(0, 3),
        });
      }
      await refreshDerivedForDate(date as any);
      if (containsSelfHarmSignals(`${checkIn.notes ?? ""} ${emotion?.reflection ?? ""}`)) {
        Alert.alert(
          "Safety support",
          "If you are at risk, please use crisis support resources now.",
          [
            { text: "Open resources", onPress: () => router.push("/profile/settings/help" as any) },
            { text: "OK" },
          ]
        );
      }
      router.replace("/checkin/saved" as any);
    } catch (e: any) {
      Alert.alert("Could not save", e?.message ?? "Please try again.");
    }
  };

  return (
    <Screen scroll padded contentStyle={{ gap: Spacing.md, paddingBottom: 120 }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="Back"
          onPress={() => step > 0 ? animateStep(step - 1) : router.back()}
          style={[styles.backBtn, { borderColor: c.border.medium, backgroundColor: c.glass.primary }]}
        >
          <IconSymbol name="chevron.left" size={18} color={c.text.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text.secondary, fontSize: 13, fontWeight: "600" }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </Text>
          <Text style={{ color: c.text.primary, fontSize: 28, fontWeight: "900", letterSpacing: -0.3 }}>
            Check-in
          </Text>
        </View>
      </View>

      {/* Grounding alternative — body-first, wordless check-in path */}
      {step === 0 && (
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/checkin/grounding" as any);
          }}
          style={({ pressed }) => [
            styles.groundingLink,
            {
              borderColor: c.border.light,
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
            },
            pressed && { opacity: 0.75 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Prefer a 30-second body-first grounding scan instead"
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }}>
              PREFER SOMETHING QUIETER?
            </Text>
            <Text style={{ color: c.text.primary, fontSize: 15, fontWeight: "700", marginTop: 2 }}>
              30-second grounding scan
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={14} color={c.text.secondary} />
        </Pressable>
      )}

      {/* Step progress bar */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= step
                  ? c.accent.primary
                  : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: c.accent.primary }}>
            Step {step + 1} of {TOTAL_STEPS}
          </Text>
          <Text style={{ fontSize: 13, color: c.text.secondary }}>{STEP_TITLES[step]}</Text>
        </View>
      </View>

      {/* Step content with fade animation */}
      <Animated.View style={{ opacity: fadeAnim }}>
        {step === 0 && (
          <>
            {/* Step 1: Mood, Energy, Stress, Sleep */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: c.text.primary }]}>How are you feeling?</Text>
              <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>{STEP_SUBTITLES[0]}</Text>
              <ScaleRow label="Mood" value={checkIn.mood} onChange={(n) => setCheckIn((p) => ({ ...p, mood: n as any }))} c={c} />
              <ScaleRow label="Energy" value={checkIn.energy ?? 3} onChange={(n) => setCheckIn((p) => ({ ...p, energy: n as any }))} c={c} />
              <ScaleRow label="Stress level" value={checkIn.stressLevel ?? 3} onChange={(n) => setCheckIn((p) => ({ ...p, stressLevel: n as any }))} c={c} />
              <ScaleRow label="Sleep quality" value={checkIn.sleepQuality ?? 3} onChange={(n) => setCheckIn((p) => ({ ...p, sleepQuality: n as any }))} c={c} />
            </GlassCard>

            {/* Notes */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Notes</Text>
              <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>Anything notable about today (optional)</Text>
              <TextInput
                placeholder="e.g. Slept poorly, long commute, felt focused..."
                placeholderTextColor={c.text.tertiary}
                value={checkIn.notes ?? ""}
                onChangeText={(txt) => setCheckIn((p) => ({ ...p, notes: txt }))}
                style={[styles.input, { borderColor: c.border.medium, color: c.text.primary, minHeight: 70, textAlignVertical: "top" }]}
                multiline
              />
            </GlassCard>
          </>
        )}

        {step === 1 && (
          <>
            {/* Step 2: Stress indicators + Behaviours */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Stress indicators</Text>
              <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4 }}>Select any that apply today</Text>
              <View style={styles.chipWrap}>
                {STRESS_INDICATORS.map(({ key, label }) => {
                  const active = !!checkIn.stressIndicators?.[key];
                  return (
                    <Pressable
                      key={key}
                      onPress={() => toggleIndicator(key)}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? c.accent.primary : c.border.medium,
                          backgroundColor: active ? c.accent.primary : "transparent",
                        },
                      ]}
                    >
                      <Text style={{ color: active ? "#fff" : c.text.primary, fontWeight: "700", fontSize: 14 }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </GlassCard>

            <GlassCard>
              <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Today's behaviours</Text>
              <View style={styles.chipWrap}>
                {([
                  ["caffeineAfter2pm", "Caffeine after 2pm"],
                  ["alcohol", "Alcohol"],
                  ["exerciseDone", "Exercise"],
                ] as const).map(([key, label]) => {
                  const active = !!(checkIn as any)[key];
                  return (
                    <Pressable
                      key={key}
                      onPress={() => toggleBool(key as any)}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? c.accent.primary : c.border.medium,
                          backgroundColor: active ? c.accent.primary : "transparent",
                        },
                      ]}
                    >
                      <Text style={{ color: active ? "#fff" : c.text.primary, fontWeight: "700", fontSize: 14 }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ marginTop: Spacing.md, gap: Spacing.md }}>
                <View>
                  <Text style={{ color: c.text.primary, fontWeight: "600", fontSize: 14 }}>Deep work minutes</Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={String(checkIn.deepWorkMins ?? "")}
                    onChangeText={(txt) => setCheckIn((p) => ({ ...p, deepWorkMins: Number(txt) || 0 }))}
                    style={[styles.input, { borderColor: c.border.medium, color: c.text.primary }]}
                    placeholder="0"
                    placeholderTextColor={c.text.tertiary}
                  />
                </View>
                <View>
                  <Text style={{ color: c.text.primary, fontWeight: "600", fontSize: 14 }}>Hydration (litres)</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    value={String(checkIn.hydrationLitres ?? "")}
                    onChangeText={(txt) => setCheckIn((p) => ({ ...p, hydrationLitres: Number(txt) || 0 }))}
                    style={[styles.input, { borderColor: c.border.medium, color: c.text.primary }]}
                    placeholder="0"
                    placeholderTextColor={c.text.tertiary}
                  />
                </View>
              </View>
            </GlassCard>
          </>
        )}

        {step === 2 && emotion && (
          <>
            {/* Step 3: Emotional snapshot */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Emotional snapshot</Text>
              <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4 }}>
                Map today's affect, regulation, and values alignment.
              </Text>

              <View style={{ marginTop: Spacing.md }}>
                <AffectCanvas
                  initial={{ x: emotion.valence * 140, y: -emotion.arousal * 140 }}
                  onChange={(valence, arousal) =>
                    setEmotion((prev) =>
                      prev ? { ...prev, valence, arousal, intensity: deriveIntensity(valence, arousal) } : prev
                    )
                  }
                />
              </View>

              <Text style={[styles.fieldLabel, { color: c.text.primary }]}>Regulation</Text>
              <View style={styles.chipWrap}>
                {(["handled", "manageable", "overwhelmed"] as const).map((state) => {
                  const active = emotion.regulation === state;
                  return (
                    <Pressable
                      key={state}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEmotion((prev) => (prev ? { ...prev, regulation: state } : prev));
                      }}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? c.accent.primary : c.border.medium,
                          backgroundColor: active ? c.accent.primary : "transparent",
                        },
                      ]}
                    >
                      <Text style={{ color: active ? "#fff" : c.text.primary, fontWeight: "700", fontSize: 14 }}>
                        {state.charAt(0).toUpperCase() + state.slice(1)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: c.text.primary }]}>Value shown today</Text>
              <View style={styles.chipWrap}>
                {activeValues.map((value) => {
                  const active = emotion.valueChosen === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEmotion((prev) => (prev ? { ...prev, valueChosen: value } : prev));
                      }}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? c.accent.primary : c.border.medium,
                          backgroundColor: active ? c.accent.primary : "transparent",
                        },
                      ]}
                    >
                      <Text style={{ color: active ? "#fff" : c.text.primary, fontWeight: "700", fontSize: 14 }}>{value}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </GlassCard>

            <GlassCard>
              <Text style={[styles.fieldLabel, { color: c.text.primary, marginTop: 0 }]}>Context tags</Text>
              <Text style={{ color: c.text.secondary, fontSize: 12 }}>Comma separated, up to 3</Text>
              <TextInput
                placeholder="e.g. travel, deadline, social"
                placeholderTextColor={c.text.tertiary}
                value={emotion.contextTags.join(", ")}
                onChangeText={(txt) =>
                  setEmotion((prev) =>
                    prev
                      ? { ...prev, contextTags: txt.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 3) }
                      : prev
                  )
                }
                style={[styles.input, { borderColor: c.border.medium, color: c.text.primary }]}
              />

              <Text style={[styles.fieldLabel, { color: c.text.primary }]}>Reflection</Text>
              <TextInput
                placeholder="What seems to be shaping today?"
                placeholderTextColor={c.text.tertiary}
                value={emotion.reflection ?? ""}
                onChangeText={(txt) => setEmotion((prev) => (prev ? { ...prev, reflection: txt } : prev))}
                style={[styles.input, { borderColor: c.border.medium, color: c.text.primary, minHeight: 80, textAlignVertical: "top" }]}
                multiline
              />
              <View style={{ marginTop: Spacing.sm }}>
                <GlassButton
                  title={generatingReflection ? "Writing…" : "Suggest a reflection"}
                  variant="secondary"
                  onPress={async () => {
                    setGeneratingReflection(true);
                    setReflectionFeedback(null);
                    try {
                      const result = await reflectEmotion({
                        valence: emotion.valence,
                        arousal: emotion.arousal,
                        regulation: emotion.regulation,
                        contextTags: emotion.contextTags,
                        valueChosen: emotion.valueChosen,
                      });
                      setEmotion((prev) => (prev ? { ...prev, reflection: result.text } : prev));
                      setReflectionSource(result.source);
                    } finally {
                      setGeneratingReflection(false);
                    }
                  }}
                />
                {reflectionSource === "local" && (
                  <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 6, fontStyle: "italic" }}>
                    Written on this device — no internet needed.
                  </Text>
                )}
                {reflectionSource === "safety" && (
                  <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 6, fontStyle: "italic" }}>
                    Reflection paused for safety. See Profile → Settings → If you need support.
                  </Text>
                )}
                {reflectionSource && reflectionSource !== "safety" && emotion.reflection ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
                    <Text style={{ color: c.text.tertiary, fontSize: 12 }}>Helpful?</Text>
                    <Pressable
                      onPress={async () => {
                        setReflectionFeedback("up");
                        await recordReflectionFeedback("up");
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Reflection was helpful"
                      style={({ pressed }) => [
                        styles.feedbackBtn,
                        {
                          borderColor: reflectionFeedback === "up" ? c.accent.primary : c.border.medium,
                          backgroundColor: reflectionFeedback === "up" ? c.accent.primary + "15" : "transparent",
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={{ color: reflectionFeedback === "up" ? c.accent.primary : c.text.secondary, fontSize: 13, fontWeight: "700" }}>
                        Yes
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        setReflectionFeedback("down");
                        await recordReflectionFeedback("down");
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Reflection was not helpful"
                      style={({ pressed }) => [
                        styles.feedbackBtn,
                        {
                          borderColor: reflectionFeedback === "down" ? c.danger : c.border.medium,
                          backgroundColor: reflectionFeedback === "down" ? (c.danger ?? "#D64550") + "15" : "transparent",
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={{ color: reflectionFeedback === "down" ? (c.danger ?? "#D64550") : c.text.secondary, fontSize: 13, fontWeight: "700" }}>
                        Not quite
                      </Text>
                    </Pressable>
                    {reflectionFeedback ? (
                      <Text style={{ color: c.text.tertiary, fontSize: 11 }}>Thanks.</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </GlassCard>
          </>
        )}
      </Animated.View>

      {/* Navigation buttons */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: Spacing.sm }}>
        {step > 0 && (
          <Pressable
            onPress={() => animateStep(step - 1)}
            style={({ pressed }) => [
              styles.navBtn,
              {
                borderColor: c.border.medium,
                backgroundColor: c.glass.primary,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15 }}>Back</Text>
          </Pressable>
        )}

        {step < TOTAL_STEPS - 1 ? (
          <Pressable
            onPress={() => animateStep(step + 1)}
            style={({ pressed }) => [
              styles.navBtn,
              {
                flex: 1,
                backgroundColor: c.accent.primary,
                borderColor: c.accent.primary,
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Next</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={save}
            style={({ pressed }) => [
              styles.navBtn,
              {
                flex: 1,
                backgroundColor: c.accent.primary,
                borderColor: c.accent.primary,
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Save Check-in</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn: { padding: 10, borderRadius: BorderRadius.md, borderWidth: 1 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  fieldLabel: { fontWeight: "700", fontSize: 15, marginTop: Spacing.md },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: Spacing.sm },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  scaleBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1.5 },
  input: { marginTop: 8, borderWidth: 1, borderRadius: BorderRadius.lg, padding: 14, fontSize: 15 },
  navBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  groundingLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  feedbackBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
});
