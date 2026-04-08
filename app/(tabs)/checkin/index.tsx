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

function ScaleRow({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  colors: typeof Colors.light;
}) {
  return (
    <View style={{ marginTop: Spacing.sm }}>
      <Text style={{ fontWeight: "700", color: colors.text.primary }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
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
                styles.chip,
                {
                  backgroundColor: active ? colors.accent.primaryLight : "transparent",
                  borderColor: active ? colors.accent.primary : colors.border.medium,
                },
              ]}
            >
              <Text style={{ fontWeight: "800", color: colors.text.primary }}>{n}</Text>
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
            {
              text: "Open resources",
              onPress: () => router.push("/profile/settings/help" as any),
            },
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
      <Screen scroll padded contentStyle={{ gap: Spacing.md }}>
        <View style={styles.headerRow}>
          <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={[styles.backBtn, { borderColor: c.border.medium }]}>
            <IconSymbol name="chevron.left" size={18} color={c.text.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text.secondary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold }}>Today</Text>
            <Text style={{ color: c.text.primary, fontSize: Typography.fontSize.xxxl, fontWeight: Typography.fontWeight.bold }}>Daily check-in</Text>
          </View>
        </View>

        <GlassCard>
          <ScaleRow label="Mood" value={checkIn.mood} onChange={(n) => setCheckIn((p) => ({ ...p, mood: n as any }))} colors={c} />
          <ScaleRow label="Energy" value={checkIn.energy ?? 3} onChange={(n) => setCheckIn((p) => ({ ...p, energy: n as any }))} colors={c} />
          <ScaleRow label="Stress level" value={checkIn.stressLevel ?? 3} onChange={(n) => setCheckIn((p) => ({ ...p, stressLevel: n as any }))} colors={c} />
          <ScaleRow label="Sleep quality" value={checkIn.sleepQuality ?? 3} onChange={(n) => setCheckIn((p) => ({ ...p, sleepQuality: n as any }))} colors={c} />
        </GlassCard>

        <GlassCard>
          <Text style={{ fontWeight: "700", color: c.text.primary }}>Stress indicators (select all that apply)</Text>
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
                      backgroundColor: active ? c.glass.primary : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: c.text.primary, fontWeight: "700" }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={{ fontWeight: "700", color: c.text.primary }}>Behaviours</Text>
          <View style={styles.toggleRow}>
            {[
              ["caffeineAfter2pm", "Caffeine after 2pm"],
              ["alcohol", "Alcohol"],
              ["exerciseDone", "Exercise"],
            ].map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => toggleBool(key as any)}
                style={[
                  styles.toggle,
                  { borderColor: (checkIn as any)[key] ? c.accent.primary : c.border.medium, backgroundColor: (checkIn as any)[key] ? c.glass.primary : "transparent" },
                ]}
              >
                <Text style={{ color: c.text.primary, fontWeight: "700" }}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
            <Text style={{ color: c.text.secondary }}>Deep work minutes</Text>
            <TextInput
              keyboardType="number-pad"
              value={String(checkIn.deepWorkMins ?? "")}
              onChangeText={(txt) => setCheckIn((p) => ({ ...p, deepWorkMins: Number(txt) || 0 }))}
              style={[styles.note, { borderColor: c.border.medium, color: c.text.primary }]}
            />
            <Text style={{ color: c.text.secondary }}>Hydration (litres)</Text>
            <TextInput
              keyboardType="decimal-pad"
              value={String(checkIn.hydrationLitres ?? "")}
              onChangeText={(txt) => setCheckIn((p) => ({ ...p, hydrationLitres: Number(txt) || 0 }))}
              style={[styles.note, { borderColor: c.border.medium, color: c.text.primary }]}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={{ fontWeight: "700", color: c.text.primary }}>Notes (optional)</Text>
          <TextInput
            placeholder="Add anything notable about today"
            placeholderTextColor={c.text.secondary}
            value={checkIn.notes ?? ""}
            onChangeText={(txt) => setCheckIn((p) => ({ ...p, notes: txt }))}
            style={[styles.note, { borderColor: c.border.medium, color: c.text.primary, minHeight: 80 }]}
            multiline
          />
        </GlassCard>

        {emotion ? (
          <GlassCard>
            <Text style={{ fontWeight: "700", color: c.text.primary }}>Emotional snapshot</Text>
            <Text style={{ color: c.text.secondary, marginTop: 6 }}>
              Capture today&apos;s affect, regulation, values, and context. This supports weekly reflection and emotional trend analysis.
            </Text>

            <View style={{ marginTop: Spacing.md }}>
              <AffectCanvas
                initial={{ x: emotion.valence * 140, y: -emotion.arousal * 140 }}
                onChange={(valence, arousal) =>
                  setEmotion((prev) =>
                    prev
                      ? {
                          ...prev,
                          valence,
                          arousal,
                          intensity: deriveIntensity(valence, arousal),
                        }
                      : prev
                  )
                }
              />
            </View>

            <Text style={{ fontWeight: "700", color: c.text.primary, marginTop: Spacing.md }}>Regulation</Text>
            <View style={styles.chipWrap}>
              {(["handled", "manageable", "overwhelmed"] as const).map((state) => (
                <Pressable
                  key={state}
                  onPress={() => setEmotion((prev) => (prev ? { ...prev, regulation: state } : prev))}
                  style={[
                    styles.chip,
                    {
                      borderColor: emotion.regulation === state ? c.accent.primary : c.border.medium,
                      backgroundColor: emotion.regulation === state ? c.glass.primary : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: c.text.primary, fontWeight: "700" }}>{state}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ fontWeight: "700", color: c.text.primary, marginTop: Spacing.md }}>Value shown today</Text>
            <View style={styles.chipWrap}>
              {activeValues.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setEmotion((prev) => (prev ? { ...prev, valueChosen: value } : prev))}
                  style={[
                    styles.chip,
                    {
                      borderColor: emotion.valueChosen === value ? c.accent.primary : c.border.medium,
                      backgroundColor: emotion.valueChosen === value ? c.glass.primary : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: c.text.primary, fontWeight: "700" }}>{value}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ color: c.text.secondary, marginTop: Spacing.md }}>Context tags (comma separated, up to 3)</Text>
            <TextInput
              placeholder="e.g. travel, deadline, social"
              placeholderTextColor={c.text.secondary}
              value={emotion.contextTags.join(", ")}
              onChangeText={(txt) =>
                setEmotion((prev) =>
                  prev
                    ? {
                        ...prev,
                        contextTags: txt
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .slice(0, 3),
                      }
                    : prev
                )
              }
              style={[styles.note, { borderColor: c.border.medium, color: c.text.primary }]}
            />

            <Text style={{ color: c.text.secondary, marginTop: Spacing.sm }}>Reflection (optional)</Text>
            <TextInput
              placeholder="What seems to be shaping today?"
              placeholderTextColor={c.text.secondary}
              value={emotion.reflection ?? ""}
              onChangeText={(txt) => setEmotion((prev) => (prev ? { ...prev, reflection: txt } : prev))}
              style={[styles.note, { borderColor: c.border.medium, color: c.text.primary, minHeight: 80 }]}
              multiline
            />
            <View style={{ marginTop: Spacing.sm }}>
              <GlassButton
                title={generatingReflection ? "Generating..." : "Generate reflection summary"}
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
                      Alert.alert("Reflection unavailable", "No reflection could be generated right now.");
                    }
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
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 10, borderRadius: 12, borderWidth: 1 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: Spacing.sm },
  chip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: BorderRadius.lg, borderWidth: 1 },
  toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: Spacing.sm },
  toggle: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: BorderRadius.lg, borderWidth: 1 },
  note: { marginTop: 6, borderWidth: 1, borderRadius: 12, padding: 10 },
});
