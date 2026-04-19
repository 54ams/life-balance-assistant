import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import {
  getPrimaryGoals,
  getPreferredTone,
  getSleepWindow,
  setPrimaryGoals,
  setPreferredTone,
  setSleepWindow,
  type PreferredTone,
  type PrimaryGoal,
  type SleepWindow,
} from "@/lib/privacy";
import { getActiveValues, getLifeContexts, getUserName, saveActiveValues, saveLifeContexts, saveUserName } from "@/lib/storage";

const ALL_VALUES = [
  "Growth", "Connection", "Health", "Peace", "Discipline", "Purpose",
  "Creativity", "Kindness", "Courage", "Gratitude", "Resilience", "Joy",
];

const LIFE_CONTEXTS = [
  "Student", "Working professional", "Carer / parent",
  "Athlete", "Shift worker", "Remote worker",
];

const GOALS: PrimaryGoal[] = [
  "Sleep quality",
  "Stress recovery",
  "Consistent energy",
  "Emotional awareness",
  "Physical activity",
  "Mindful eating",
];

const TONES: Array<{ key: PreferredTone; blurb: string }> = [
  { key: "Gentle", blurb: "Soft, validating language." },
  { key: "Direct", blurb: "Clear and matter-of-fact." },
  { key: "Playful", blurb: "Warm with a light touch." },
];

const SLEEP_WINDOWS: Array<{ key: SleepWindow; blurb: string }> = [
  { key: "Early bird", blurb: "To bed early, up early." },
  { key: "Standard", blurb: "Around 11pm \u2013 7am." },
  { key: "Night owl", blurb: "Later nights, slower mornings." },
  { key: "Shift worker", blurb: "Irregular sleep schedule." },
];

export default function EditProfileScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [name, setName] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [goals, setGoals] = useState<PrimaryGoal[]>([]);
  const [tone, setTone] = useState<PreferredTone>("Gentle");
  const [sleepWindow, setSleepWin] = useState<SleepWindow>("Standard");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [n, v, ctx, g, t, sw] = await Promise.all([
        getUserName(),
        getActiveValues(),
        getLifeContexts(),
        getPrimaryGoals(),
        getPreferredTone(),
        getSleepWindow(),
      ]);
      setName(n);
      setSelectedValues(v);
      setSelectedContexts(ctx);
      if (g && g.length > 0) setGoals(g);
      if (t) setTone(t);
      if (sw) setSleepWin(sw);
      setLoaded(true);
    })();
  }, []);

  const toggleValue = (v: string) => {
    setSelectedValues((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : prev.length < 6 ? [...prev, v] : prev
    );
  };

  const toggleContext = (v: string) => {
    setSelectedContexts((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const toggleGoal = (g: PrimaryGoal) => {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 2 ? [...prev, g] : prev
    );
  };

  const save = async () => {
    if (selectedValues.length < 3) {
      Alert.alert("Values", "Please select at least 3 values.");
      return;
    }
    if (goals.length === 0) {
      Alert.alert("Goals", "Pick at least one goal.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await Promise.all([
      saveUserName(name.trim()),
      saveActiveValues(selectedValues),
      saveLifeContexts(selectedContexts),
      setPrimaryGoals(goals),
      setPreferredTone(tone),
      setSleepWindow(sleepWindow),
    ]);
    Alert.alert("Saved", "Your profile has been updated.");
    router.back();
  };

  if (!loaded) return null;

  return (
    <Screen scroll>
      <Text style={[styles.heading, { color: c.text.primary }]}>Edit profile</Text>

      {/* Name */}
      <GlassCard style={styles.section} padding="lg">
        <Text style={[styles.label, { color: c.text.tertiary }]}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name (optional)"
          placeholderTextColor={c.text.tertiary}
          style={[
            styles.input,
            {
              borderColor: c.border.medium,
              color: c.text.primary,
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
            },
          ]}
        />
      </GlassCard>

      {/* Values */}
      <GlassCard style={styles.section} padding="lg">
        <Text style={[styles.label, { color: c.text.tertiary }]}>YOUR VALUES (3-6)</Text>
        <View style={styles.chipGrid}>
          {ALL_VALUES.map((v) => {
            const active = selectedValues.includes(v);
            return (
              <Pressable
                key={v}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  toggleValue(v);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? c.accent.primary + "20" : isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
                    borderColor: active ? c.accent.primary : c.border.light,
                  },
                ]}
              >
                <Text style={{ color: active ? c.accent.primary : c.text.secondary, fontSize: 13, fontWeight: "600" }}>
                  {v}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      {/* Life contexts */}
      <GlassCard style={styles.section} padding="lg">
        <Text style={[styles.label, { color: c.text.tertiary }]}>LIFE CONTEXTS</Text>
        <View style={styles.chipGrid}>
          {LIFE_CONTEXTS.map((v) => {
            const active = selectedContexts.includes(v);
            return (
              <Pressable
                key={v}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  toggleContext(v);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? c.accent.primary + "20" : isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
                    borderColor: active ? c.accent.primary : c.border.light,
                  },
                ]}
              >
                <Text style={{ color: active ? c.accent.primary : c.text.secondary, fontSize: 13, fontWeight: "600" }}>
                  {v}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      {/* Primary goals */}
      <GlassCard style={styles.section} padding="lg">
        <Text style={[styles.label, { color: c.text.tertiary }]}>PRIMARY GOALS (1-2)</Text>
        <View style={styles.chipGrid}>
          {GOALS.map((g) => {
            const active = goals.includes(g);
            return (
              <Pressable
                key={g}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  toggleGoal(g);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? c.accent.primary + "20" : isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
                    borderColor: active ? c.accent.primary : c.border.light,
                  },
                ]}
              >
                <Text style={{ color: active ? c.accent.primary : c.text.secondary, fontSize: 13, fontWeight: "600" }}>
                  {g}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      {/* Preferred tone */}
      <GlassCard style={styles.section} padding="lg">
        <Text style={[styles.label, { color: c.text.tertiary }]}>PREFERRED TONE</Text>
        {TONES.map((t) => {
          const active = tone === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setTone(t.key);
              }}
              style={[
                styles.radioRow,
                {
                  backgroundColor: active ? c.accent.primary + "14" : "transparent",
                  borderColor: active ? c.accent.primary + "40" : c.border.light,
                },
              ]}
            >
              <View style={[styles.radioOuter, { borderColor: active ? c.accent.primary : c.text.tertiary }]}>
                {active && <View style={[styles.radioInner, { backgroundColor: c.accent.primary }]} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 14 }}>{t.key}</Text>
                <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 2 }}>{t.blurb}</Text>
              </View>
            </Pressable>
          );
        })}
      </GlassCard>

      {/* Sleep window */}
      <GlassCard style={styles.section} padding="lg">
        <Text style={[styles.label, { color: c.text.tertiary }]}>SLEEP WINDOW</Text>
        {SLEEP_WINDOWS.map((sw) => {
          const active = sleepWindow === sw.key;
          return (
            <Pressable
              key={sw.key}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSleepWin(sw.key);
              }}
              style={[
                styles.radioRow,
                {
                  backgroundColor: active ? c.accent.primary + "14" : "transparent",
                  borderColor: active ? c.accent.primary + "40" : c.border.light,
                },
              ]}
            >
              <View style={[styles.radioOuter, { borderColor: active ? c.accent.primary : c.text.tertiary }]}>
                {active && <View style={[styles.radioInner, { backgroundColor: c.accent.primary }]} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 14 }}>{sw.key}</Text>
                <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 2 }}>{sw.blurb}</Text>
              </View>
            </Pressable>
          );
        })}
      </GlassCard>

      {/* Save */}
      <View style={{ marginTop: Spacing.md, marginBottom: Spacing.xl }}>
        <GlassButton title="Save changes" onPress={save} variant="primary" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: 6,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
