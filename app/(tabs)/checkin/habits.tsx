import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  LayoutAnimation,
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
  getHabits,
  getTodayProgress,
  logHabitCompletion,
  createHabit,
  archiveHabit,
  getStreak,
  getHabitLog,
  HABIT_CATEGORIES,
  STARTER_HABITS,
  type Habit,
  type HabitCategory,
} from "@/lib/habits";
import { todayISO } from "@/lib/util/todayISO";

type HabitWithState = Habit & { done: boolean; streak: number };

export default function HabitsScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [habits, setHabits] = useState<HabitWithState[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [totalDone, setTotalDone] = useState(0);
  const [totalHabits, setTotalHabits] = useState(0);

  // Builder state
  const [newName, setNewName] = useState("");
  const [newCue, setNewCue] = useState("");
  const [newRoutine, setNewRoutine] = useState("");
  const [newMicro, setNewMicro] = useState("");
  const [newCategory, setNewCategory] = useState<HabitCategory>("mindfulness");

  const loadHabits = useCallback(async () => {
    const progress = await getTodayProgress();
    const withStreaks: HabitWithState[] = [];
    for (const h of progress.habits) {
      const log = await getHabitLog(h.id);
      withStreaks.push({ ...h, streak: getStreak(log) });
    }
    setHabits(withStreaks);
    setTotalDone(progress.completed);
    setTotalHabits(progress.total);
  }, []);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const toggleHabit = async (habit: HabitWithState) => {
    const newState = !habit.done;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? { ...h, done: newState } : h)));
    setTotalDone((d) => d + (newState ? 1 : -1));
    Haptics.notificationAsync(
      newState ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
    await logHabitCompletion(habit.id, todayISO(), newState);
  };

  const handleCreateHabit = async () => {
    if (!newName.trim() || !newCue.trim() || !newRoutine.trim()) return;
    await createHabit({
      name: newName.trim(),
      cue: newCue.trim(),
      routine: newRoutine.trim(),
      microVersion: newMicro.trim() || undefined,
      category: newCategory,
    });
    setNewName("");
    setNewCue("");
    setNewRoutine("");
    setNewMicro("");
    setShowBuilder(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    loadHabits();
  };

  const handleAddStarter = async (key: string) => {
    const starter = STARTER_HABITS[key];
    if (!starter) return;
    await createHabit(starter);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    loadHabits();
  };

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground state="neutral" />
      <SafeAreaView style={{ flex: 1 }}>
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
              <Text style={[styles.title, { color: c.text.primary }]}>Habits</Text>
              <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                Small actions, big shifts
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          {totalHabits > 0 && (
            <GlassCard style={{ marginTop: Spacing.lg }} padding="base">
              <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }}>
                TODAY'S PROGRESS
              </Text>
              <View style={styles.progressRow}>
                <View style={[styles.progressBar, { backgroundColor: "rgba(0,0,0,0.06)" }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: c.accent.primary,
                        width: `${totalHabits > 0 ? (totalDone / totalHabits) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={{ color: c.text.secondary, fontSize: 13, fontWeight: "700", minWidth: 40, textAlign: "right" }}>
                  {totalDone}/{totalHabits}
                </Text>
              </View>
            </GlassCard>
          )}

          {/* Habit list */}
          <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
            {habits.map((habit) => (
              <Pressable key={habit.id} onPress={() => toggleHabit(habit)}>
                <GlassCard padding="base">
                  <View style={styles.habitRow}>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: habit.done ? c.accent.primary : "transparent",
                          borderColor: habit.done ? c.accent.primary : c.border.medium,
                        },
                      ]}
                    >
                      {habit.done && <IconSymbol name="checkmark" size={14} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.habitName,
                          { color: c.text.primary, textDecorationLine: habit.done ? "line-through" : "none" },
                        ]}
                      >
                        {habit.name}
                      </Text>
                      <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 2 }}>
                        If {habit.cue.toLowerCase()} → {habit.routine.toLowerCase()}
                      </Text>
                    </View>
                    {habit.streak > 0 && (
                      <View style={[styles.streakBadge, { backgroundColor: "#f59e0b20" }]}>
                        <Text style={{ fontSize: 10 }}>🔥</Text>
                        <Text style={{ color: "#f59e0b", fontSize: 11, fontWeight: "800" }}>{habit.streak}</Text>
                      </View>
                    )}
                  </View>
                  {habit.microVersion && !habit.done && (
                    <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 6, marginLeft: 38, fontStyle: "italic" }}>
                      Low energy? Try: {habit.microVersion}
                    </Text>
                  )}
                </GlassCard>
              </Pressable>
            ))}
          </View>

          {/* Empty state with starters */}
          {habits.length === 0 && !showBuilder && (
            <View style={{ marginTop: Spacing.xl }}>
              <Text style={{ color: c.text.primary, fontSize: 18, fontWeight: "700", textAlign: "center" }}>
                Start with a tiny habit
              </Text>
              <Text style={{ color: c.text.secondary, fontSize: 14, textAlign: "center", marginTop: 4, lineHeight: 20 }}>
                The best habits are small enough you can't say no.{"\n"}Pick one to begin, or create your own.
              </Text>

              <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
                {Object.entries(STARTER_HABITS).map(([key, habit]) => (
                  <Pressable key={key} onPress={() => handleAddStarter(key)}>
                    <GlassCard padding="base">
                      <View style={styles.habitRow}>
                        <View style={[styles.addIcon, { backgroundColor: c.accent.primary + "14" }]}>
                          <IconSymbol name="plus" size={16} color={c.accent.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: c.text.primary, fontSize: 15, fontWeight: "700" }}>{habit.name}</Text>
                          <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 2 }}>
                            If {habit.cue.toLowerCase()} → {habit.routine.toLowerCase()}
                          </Text>
                        </View>
                      </View>
                    </GlassCard>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* IF/THEN Builder */}
          {showBuilder && (
            <GlassCard style={{ marginTop: Spacing.lg }} padding="base">
              <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "800", marginBottom: Spacing.md }}>
                Create an IF/THEN habit
              </Text>

              <Text style={[styles.fieldLabel, { color: c.text.tertiary }]}>HABIT NAME</Text>
              <TextInput
                style={[styles.input, { color: c.text.primary, borderColor: c.border.medium }]}
                placeholder="e.g. Morning stretch"
                placeholderTextColor={c.text.tertiary}
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={[styles.fieldLabel, { color: c.text.tertiary }]}>IF (your cue/trigger)</Text>
              <TextInput
                style={[styles.input, { color: c.text.primary, borderColor: c.border.medium }]}
                placeholder="e.g. After I pour my morning coffee"
                placeholderTextColor={c.text.tertiary}
                value={newCue}
                onChangeText={setNewCue}
              />

              <Text style={[styles.fieldLabel, { color: c.text.tertiary }]}>THEN (your routine)</Text>
              <TextInput
                style={[styles.input, { color: c.text.primary, borderColor: c.border.medium }]}
                placeholder="e.g. Stretch for 5 minutes"
                placeholderTextColor={c.text.tertiary}
                value={newRoutine}
                onChangeText={setNewRoutine}
              />

              <Text style={[styles.fieldLabel, { color: c.text.tertiary }]}>2-MINUTE VERSION (optional)</Text>
              <TextInput
                style={[styles.input, { color: c.text.primary, borderColor: c.border.medium }]}
                placeholder="e.g. Do 3 shoulder rolls"
                placeholderTextColor={c.text.tertiary}
                value={newMicro}
                onChangeText={setNewMicro}
              />

              <Text style={[styles.fieldLabel, { color: c.text.tertiary }]}>CATEGORY</Text>
              <View style={styles.categoryRow}>
                {HABIT_CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setNewCategory(cat.id)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: newCategory === cat.id ? c.accent.primary : "transparent",
                        borderColor: newCategory === cat.id ? c.accent.primary : c.border.medium,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: newCategory === cat.id ? "#fff" : c.text.secondary,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 12, marginTop: Spacing.lg }}>
                <Pressable
                  onPress={() => setShowBuilder(false)}
                  style={[styles.btnSecondary, { borderColor: c.border.medium }]}
                >
                  <Text style={{ color: c.text.secondary, fontWeight: "700" }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleCreateHabit}
                  style={[styles.btnPrimary, { backgroundColor: c.accent.primary, opacity: newName && newCue && newRoutine ? 1 : 0.4 }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "800" }}>Create Habit</Text>
                </Pressable>
              </View>
            </GlassCard>
          )}

          {/* Add habit button */}
          {!showBuilder && habits.length > 0 && (
            <Pressable
              onPress={() => setShowBuilder(true)}
              style={[styles.addBtn, { backgroundColor: c.accent.primary }]}
            >
              <IconSymbol name="plus" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>New Habit</Text>
            </Pressable>
          )}

          {/* Connection note */}
          <Text style={{ color: c.text.tertiary, fontSize: 11, textAlign: "center", marginTop: Spacing.xl, lineHeight: 16 }}>
            Habits affect your mood, energy, and balance score.{"\n"}The app will show you these connections over time.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 14, marginTop: 2 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  progressBar: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  habitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  habitName: { fontSize: 15, fontWeight: "700" },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  addIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fieldLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginTop: Spacing.md, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  btnPrimary: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.xl, alignItems: "center" },
  btnSecondary: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.xl, alignItems: "center", borderWidth: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: Spacing.lg, paddingVertical: 14, borderRadius: BorderRadius.xl },
});
