import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { Screen } from "@/components/Screen";
import { TabSwipe } from "@/components/TabSwipe";
import { TAB_ORDER } from "@/constants/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AffectCanvas } from "@/components/ui/AffectCanvas";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { todayISO } from "@/lib/util/todayISO";
import { getActiveValues, getCheckIn, getEmotion, upsertCheckIn, upsertEmotion } from "@/lib/storage";
import type { DailyCheckIn, EmotionalDiaryEntry } from "@/lib/types";
import { useColorScheme } from "react-native";
import { containsSelfHarmSignals } from "@/lib/privacy";
import { deriveIntensity } from "@/lib/emotion";
import { refreshDerivedForDate } from "@/lib/pipeline";
import { reflectEmotion } from "@/lib/llm";

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
              onPress={() => onChange(n)}
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
  const date = useMemo(() => todayISO(), []);

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
    setCheckIn((prev) => ({ ...prev, [key]: !(prev as any)[key] }));
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
      Alert.alert("Saved", "Daily check-in saved.");
      router.replace({ pathname: "/", params: { refresh: "1" } } as any);
    } catch (e: any) {
      Alert.alert("Could not save", e?.message ?? "Please try again.");
    }
  };

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll padded contentStyle={{ gap: Spacing.md, paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Back"
            onPress={() => router.back()}
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

        {/* Scales */}
        <GlassCard>
          <Text style={[styles.sectionTitle, { color: c.text.primary }]}>How are you feeling?</Text>
          <ScaleRow label="Mood" value={checkIn.mood} onChange={(n) => setCheckIn((p) => ({ ...p, mood: n as any }))} c={c} />
          <ScaleRow label="Energy" value={checkIn.energy ?? 3} onChange={(n) => setCheckIn((p) => ({ ...p, energy: n as any }))} c={c} />
          <ScaleRow label="Stress level" value={checkIn.stressLevel ?? 3} onChange={(n) => setCheckIn((p) => ({ ...p, stressLevel: n as any }))} c={c} />
          <ScaleRow label="Sleep quality" value={checkIn.sleepQuality ?? 3} onChange={(n) => setCheckIn((p) => ({ ...p, sleepQuality: n as any }))} c={c} />
        </GlassCard>

        {/* Stress indicators */}
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

        {/* Behaviours */}
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

        {/* Notes */}
        <GlassCard>
          <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Notes</Text>
          <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>Anything notable about today (optional)</Text>
          <TextInput
            placeholder="e.g. Slept poorly, long commute, felt focused..."
            placeholderTextColor={c.text.tertiary}
            value={checkIn.notes ?? ""}
            onChangeText={(txt) => setCheckIn((p) => ({ ...p, notes: txt }))}
            style={[styles.input, { borderColor: c.border.medium, color: c.text.primary, minHeight: 80, textAlignVertical: "top" }]}
            multiline
          />
        </GlassCard>

        {/* Emotional snapshot */}
        {emotion ? (
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
                    onPress={() => setEmotion((prev) => (prev ? { ...prev, regulation: state } : prev))}
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
                    onPress={() => setEmotion((prev) => (prev ? { ...prev, valueChosen: value } : prev))}
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

            <Text style={[styles.fieldLabel, { color: c.text.primary }]}>Context tags</Text>
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
                title={generatingReflection ? "Generating..." : "Generate AI reflection"}
                variant="secondary"
                onPress={async () => {
                  setGeneratingReflection(true);
                  try {
                    const text = await reflectEmotion({
                      date,
                      valence: emotion.valence,
                      arousal: emotion.arousal,
                      intensity: deriveIntensity(emotion.valence, emotion.arousal),
                      regulation: emotion.regulation,
                      contextTags: emotion.contextTags,
                      valueChosen: emotion.valueChosen,
                    });
                    if (text) {
                      setEmotion((prev) => (prev ? { ...prev, reflection: text } : prev));
                    } else {
                      Alert.alert("Unavailable", "Could not generate a reflection right now.");
                    }
                  } catch {
                    Alert.alert("Connection error", "Could not reach the server. Check your internet connection and try again.");
                  } finally {
                    setGeneratingReflection(false);
                  }
                }}
              />
            </View>
          </GlassCard>
        ) : null}

        <GlassButton title="Save check-in" variant="primary" onPress={save} />
      </Screen>
    </TabSwipe>
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
});
