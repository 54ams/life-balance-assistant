import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import {
  getWeekStart,
  generateWeekSummary,
  saveWeeklyReflection,
  getWeeklyReflection,
  type WeekDataSummary,
} from "@/lib/weeklyReflection";
import { listDailyRecords } from "@/lib/storage";
import type { ISODate } from "@/lib/types";
import { FeatureGuide } from "@/components/ui/FeatureGuide";

type Step = "summary" | "reflect" | "intention" | "done";

export default function WeeklyReflectionScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const weekStart = getWeekStart();
  const [step, setStep] = useState<Step>("summary");
  const [dataSummary, setDataSummary] = useState<WeekDataSummary | null>(null);
  const [wins, setWins] = useState("");
  const [lessons, setLessons] = useState("");
  const [challenges, setChallenges] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [intention, setIntention] = useState("");

  useEffect(() => {
    (async () => {
      const existing = await getWeeklyReflection(weekStart);
      if (existing) {
        setWins(existing.wins.join("\n"));
        setLessons(existing.lessons.join("\n"));
        setChallenges(existing.challenges.join("\n"));
        setGratitude(existing.gratitude);
        setIntention(existing.nextWeekIntention);
        setDataSummary(existing.dataSummary);
      } else {
        const records = await listDailyRecords(14);
        const summary = await generateWeekSummary(records, weekStart);
        setDataSummary(summary);
      }
    })();
  }, [weekStart]);

  const handleSave = async () => {
    if (!dataSummary) return;
    await saveWeeklyReflection({
      weekStartDate: weekStart,
      wins: wins.split("\n").filter(Boolean),
      lessons: lessons.split("\n").filter(Boolean),
      challenges: challenges.split("\n").filter(Boolean),
      gratitude: gratitude.trim(),
      nextWeekIntention: intention.trim(),
      adjustments: [],
      dataSummary,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setStep("done");
  };

  const trendIcon = dataSummary?.trendDirection === "improving" ? "arrow.up.right" : dataSummary?.trendDirection === "declining" ? "arrow.down.right" : "arrow.right";
  const trendColor = dataSummary?.trendDirection === "improving" ? "#10b981" : dataSummary?.trendDirection === "declining" ? "#ef4444" : c.text.secondary;

  if (step === "done") {
    return (
      <View style={{ flex: 1 }}>
        <AuroraBackground state="aligned" />
        <SafeAreaView style={{ flex: 1, justifyContent: "center", paddingHorizontal: Spacing.base }}>
          <View style={{ alignItems: "center" }}>
            <View style={[styles.doneIcon, { backgroundColor: c.accent.primary + "20" }]}>
              <IconSymbol name="checkmark.circle.fill" size={48} color={c.accent.primary} />
            </View>
            <Text style={{ color: c.text.primary, fontSize: 26, fontWeight: "800", marginTop: Spacing.lg }}>
              Week reflected
            </Text>
            <Text style={{ color: c.text.secondary, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20, maxWidth: 280 }}>
              Taking time to reflect each week builds self-awareness. Your insights carry forward.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={[styles.nextBtn, { backgroundColor: c.accent.primary, marginTop: Spacing.xl }]}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Done</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground state="neutral" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <IconSymbol name="chevron.left" size={20} color={c.text.primary} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: c.text.primary }]}>Weekly Reflection</Text>
                <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                  Week of {weekStart}
                </Text>
              </View>
            </View>

            {/* First-visit guide */}
            <FeatureGuide
              featureId="weekly_reflection"
              title="Weekly Reflection"
              what="A structured end-of-week review. See your data summary, reflect on wins and challenges, then set one clear intention for next week."
              why="Regular reflection builds self-awareness and agency (Gibbs, 1988). One intention per week beats ten vague goals."
              connection="Your reflections influence the smart recommendations you see on your home screen and help the app learn what matters to you."
            />

            {/* STEP 1: Data summary */}
            {step === "summary" && dataSummary && (
              <View style={{ marginTop: Spacing.xl }}>
                <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Your week in numbers</Text>

                <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
                  <GlassCard padding="base">
                    <View style={styles.statRow}>
                      <Text style={{ color: c.text.secondary, fontSize: 14 }}>Check-ins</Text>
                      <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "700" }}>{dataSummary.checkInCount} days</Text>
                    </View>
                  </GlassCard>
                  <GlassCard padding="base">
                    <View style={styles.statRow}>
                      <Text style={{ color: c.text.secondary, fontSize: 14 }}>Mood trend</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <IconSymbol name={trendIcon as any} size={14} color={trendColor} />
                        <Text style={{ color: trendColor, fontSize: 16, fontWeight: "700" }}>{dataSummary.trendDirection}</Text>
                      </View>
                    </View>
                  </GlassCard>
                  <GlassCard padding="base">
                    <View style={styles.statRow}>
                      <Text style={{ color: c.text.secondary, fontSize: 14 }}>Habits completed</Text>
                      <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "700" }}>{dataSummary.habitsCompletionRate}%</Text>
                    </View>
                  </GlassCard>
                  <GlassCard padding="base">
                    <View style={styles.statRow}>
                      <Text style={{ color: c.text.secondary, fontSize: 14 }}>Sleep hygiene avg</Text>
                      <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "700" }}>{dataSummary.avgSleepHygiene}%</Text>
                    </View>
                  </GlassCard>
                  {dataSummary.reframeCount > 0 && (
                    <GlassCard padding="base">
                      <View style={styles.statRow}>
                        <Text style={{ color: c.text.secondary, fontSize: 14 }}>Thought reframes</Text>
                        <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "700" }}>{dataSummary.reframeCount}</Text>
                      </View>
                    </GlassCard>
                  )}
                  {dataSummary.longestStreak > 0 && (
                    <GlassCard padding="base">
                      <View style={styles.statRow}>
                        <Text style={{ color: c.text.secondary, fontSize: 14 }}>Best habit streak</Text>
                        <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "700" }}>🔥 {dataSummary.longestStreak} days</Text>
                      </View>
                    </GlassCard>
                  )}
                </View>

                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setStep("reflect"); }}
                  style={[styles.nextBtn, { backgroundColor: c.accent.primary, marginTop: Spacing.xl }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Reflect on This Week</Text>
                  <IconSymbol name="arrow.right" size={16} color="#fff" />
                </Pressable>
              </View>
            )}

            {/* STEP 2: Reflect */}
            {step === "reflect" && (
              <View style={{ marginTop: Spacing.xl }}>
                <Text style={[styles.prompt, { color: c.text.primary }]}>What went well this week?</Text>
                <TextInput
                  style={[styles.textArea, { color: c.text.primary, borderColor: c.border.medium }]}
                  placeholder="Your wins, big or small..."
                  placeholderTextColor={c.text.tertiary}
                  multiline
                  value={wins}
                  onChangeText={setWins}
                />

                <Text style={[styles.prompt, { color: c.text.primary, marginTop: Spacing.lg }]}>What was challenging?</Text>
                <TextInput
                  style={[styles.textArea, { color: c.text.primary, borderColor: c.border.medium }]}
                  placeholder="Difficulties you faced..."
                  placeholderTextColor={c.text.tertiary}
                  multiline
                  value={challenges}
                  onChangeText={setChallenges}
                />

                <Text style={[styles.prompt, { color: c.text.primary, marginTop: Spacing.lg }]}>What did you learn?</Text>
                <TextInput
                  style={[styles.textArea, { color: c.text.primary, borderColor: c.border.medium }]}
                  placeholder="Insights or realisations..."
                  placeholderTextColor={c.text.tertiary}
                  multiline
                  value={lessons}
                  onChangeText={setLessons}
                />

                <Text style={[styles.prompt, { color: c.text.primary, marginTop: Spacing.lg }]}>One thing you're grateful for</Text>
                <TextInput
                  style={[styles.input, { color: c.text.primary, borderColor: c.border.medium }]}
                  placeholder="Something that mattered..."
                  placeholderTextColor={c.text.tertiary}
                  value={gratitude}
                  onChangeText={setGratitude}
                />

                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setStep("intention"); }}
                  style={[styles.nextBtn, { backgroundColor: c.accent.primary, marginTop: Spacing.xl }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Set Next Week's Intention</Text>
                  <IconSymbol name="arrow.right" size={16} color="#fff" />
                </Pressable>
              </View>
            )}

            {/* STEP 3: Intention */}
            {step === "intention" && (
              <View style={{ marginTop: Spacing.xl }}>
                <Text style={[styles.sectionTitle, { color: c.text.primary }]}>What's your focus for next week?</Text>
                <Text style={{ color: c.text.secondary, fontSize: 14, marginTop: 4, lineHeight: 20 }}>
                  One clear intention is more powerful than many vague goals.
                </Text>

                <TextInput
                  style={[styles.textArea, { color: c.text.primary, borderColor: c.border.medium, marginTop: Spacing.lg }]}
                  placeholder="e.g. Prioritise sleep this week..."
                  placeholderTextColor={c.text.tertiary}
                  multiline
                  value={intention}
                  onChangeText={setIntention}
                  autoFocus
                />

                <Pressable
                  onPress={handleSave}
                  style={[styles.nextBtn, { backgroundColor: c.accent.primary, marginTop: Spacing.xl }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Complete Reflection</Text>
                  <IconSymbol name="checkmark" size={16} color="#fff" />
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 14, marginTop: 2 },
  sectionTitle: { fontSize: 20, fontWeight: "700" },
  prompt: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  textArea: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: 16, fontSize: 15, minHeight: 80, textAlignVertical: "top", lineHeight: 22 },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: BorderRadius.xl },
  doneIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
});
