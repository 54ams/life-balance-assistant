import React, { useRef, useState } from "react";
import { Alert, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import {
  saveAppConsent,
  setPreferredTone,
  setPrimaryGoals,
  setSleepWindow,
  type AppConsent,
  type PreferredTone,
  type PrimaryGoal,
  type SleepWindow,
} from "@/lib/privacy";
import { saveActiveValues, saveLifeContexts, saveUserName } from "@/lib/storage";
import { defaultValuesSet } from "@/lib/emotion";
import { TextInput } from "react-native";

const VERSION = "2026-04-16";

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
  { key: "Standard", blurb: "Around 11pm – 7am." },
  { key: "Night owl", blurb: "Later nights, slower mornings." },
  { key: "Shift worker", blurb: "Irregular sleep schedule." },
];

type ConsentFlags = AppConsent["items"];

const INITIAL_FLAGS: ConsentFlags = {
  dataProcessing: false,
  whoopImport: false,
  exportForResearch: false,
  nonMedicalUse: false,
};

const STEPS = ["Welcome", "Values", "Context", "Personalise", "Consent"];

export default function OnboardingScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [step, setStep] = useState(0);
  const [selectedValues, setSelectedValues] = useState<string[]>(defaultValuesSet());
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [goals, setGoals] = useState<PrimaryGoal[]>([]);
  const [tone, setTone] = useState<PreferredTone>("Gentle");
  const [sleepWindow, setSleepWin] = useState<SleepWindow | null>(null);
  const [userName, setUserName] = useState("");
  const [flags, setFlags] = useState<ConsentFlags>(INITIAL_FLAGS);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (next: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const next = () => {
    if (step === 1 && selectedValues.length < 3) {
      Alert.alert("Values", "Please select at least 3 values that matter to you.");
      return;
    }
    if (step === 3 && goals.length === 0) {
      Alert.alert("Personalise", "Pick at least one thing you'd like LBA to help with.");
      return;
    }
    if (step === 3 && !sleepWindow) {
      Alert.alert("Personalise", "Please pick a sleep window that best fits you.");
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    animateTransition(step + 1);
  };

  const back = () => {
    if (step > 0) animateTransition(step - 1);
  };

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

  const toggleConsent = (key: keyof ConsentFlags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const finish = async () => {
    if (!Object.values(flags).every(Boolean)) {
      Alert.alert("Consent required", "You must accept all items to continue.");
      return;
    }
    if (userName.trim()) await saveUserName(userName.trim());
    await saveActiveValues(selectedValues);
    await saveLifeContexts(selectedContexts);
    await setPrimaryGoals(goals);
    await setPreferredTone(tone);
    if (sleepWindow) await setSleepWindow(sleepWindow);
    await saveAppConsent({
      consentedAt: new Date().toISOString(),
      privacyVersion: VERSION,
      items: flags,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace("/first-run");
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: 24, paddingBottom: 40 }}>
      <View style={styles.progressRow}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              {
                backgroundColor: i <= step ? c.accent.primary : c.border.medium,
                flex: 1,
              },
            ]}
          />
        ))}
      </View>

      <Text style={[styles.stepLabel, { color: c.text.secondary }]}>
        {step + 1} of {STEPS.length} · {STEPS[step]}
      </Text>

      <Animated.View style={{ opacity: fadeAnim }}>
        {step === 0 && <WelcomeStep c={c} userName={userName} setUserName={setUserName} />}
        {step === 1 && (
          <ValuesStep c={c} selected={selectedValues} toggle={toggleValue} />
        )}
        {step === 2 && (
          <ContextStep c={c} selected={selectedContexts} toggle={toggleContext} />
        )}
        {step === 3 && (
          <PersonaliseStep
            c={c}
            goals={goals}
            toggleGoal={toggleGoal}
            tone={tone}
            setTone={setTone}
            sleepWindow={sleepWindow}
            setSleepWindow={setSleepWin}
          />
        )}
        {step === 4 && (
          <ConsentStep c={c} flags={flags} toggle={toggleConsent} />
        )}
      </Animated.View>

      <View style={styles.navRow}>
        {step > 0 ? (
          <Pressable onPress={back} style={[styles.backButton, { borderColor: c.border.medium }]}>
            <Text style={{ color: c.text.primary, fontWeight: "700" }}>Back</Text>
          </Pressable>
        ) : (
          <View />
        )}
        {step < STEPS.length - 1 ? (
          <GlassButton title="Continue" variant="primary" onPress={next} style={{ flex: 1, marginLeft: step > 0 ? 12 : 0 }} />
        ) : (
          <GlassButton title="Get started" variant="primary" onPress={finish} style={{ flex: 1, marginLeft: 12 }} />
        )}
      </View>
    </Screen>
  );
}

/* --- Step Components --- */

function WelcomeStep({ c, userName, setUserName }: { c: typeof Colors.light; userName: string; setUserName: (n: string) => void }) {
  return (
    <>
      <Text style={[styles.h1, { color: c.accent.primary }]}>Life Balance{"\n"}Assistant</Text>
      <Text style={[styles.body, { color: c.text.secondary, marginTop: 12 }]}>
        A calm space for noticing how your body and mind are doing — together, in one place. Nothing to fix, just something to see.
      </Text>

      <GlassCard style={{ marginTop: 20 }}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>What should we call you?</Text>
        <Text style={[styles.hint, { color: c.text.secondary }]}>Optional — just for your greeting. Stays on this device.</Text>
        <TextInput
          value={userName}
          onChangeText={setUserName}
          placeholder="e.g. Ami"
          placeholderTextColor={c.text.tertiary}
          style={{
            marginTop: 10,
            padding: 14,
            borderRadius: BorderRadius.lg,
            borderWidth: 1.5,
            borderColor: c.border.medium,
            color: c.text.primary,
            fontSize: 16,
            fontWeight: "600",
          }}
          maxLength={30}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </GlassCard>

      <GlassCard style={{ marginTop: 12 }}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>How it works</Text>
        <View style={{ gap: 12, marginTop: 12 }}>
          <StepItem num="1" text="Take a short daily check-in — a minute or two" c={c} />
          <StepItem num="2" text="Connect a WHOOP wearable if you have one (optional)" c={c} />
          <StepItem num="3" text="See how your body and mind are doing, with gentle suggestions when you need them" c={c} />
        </View>
      </GlassCard>

      <GlassCard style={{ marginTop: 12 }}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Your privacy, up front</Text>
        <Text style={[styles.body, { color: c.text.secondary, marginTop: 8 }]}>
          All data stays on this device. You can export or delete it at any time. Your name above is optional and never leaves your phone.
        </Text>
      </GlassCard>
    </>
  );
}

function StepItem({ num, text, c }: { num: string; text: string; c: typeof Colors.light }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={[styles.stepCircle, { backgroundColor: c.accent.primary }]}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{num}</Text>
      </View>
      <Text style={{ color: c.text.primary, flex: 1, fontSize: 15 }}>{text}</Text>
    </View>
  );
}

function ValuesStep({ c, selected, toggle }: { c: typeof Colors.light; selected: string[]; toggle: (v: string) => void }) {
  return (
    <>
      <Text style={[styles.h2, { color: c.text.primary }]}>What matters to you?</Text>
      <Text style={[styles.body, { color: c.text.secondary, marginTop: 8 }]}>
        Select 3 to 6 values. These help the app understand what balance looks like for you.
      </Text>

      <View style={styles.chipGrid}>
        {ALL_VALUES.map((v) => {
          const active = selected.includes(v);
          return (
            <Pressable
              key={v}
              onPress={() => toggle(v)}
              style={[
                styles.valueChip,
                {
                  backgroundColor: active ? c.accent.primary : "transparent",
                  borderColor: active ? c.accent.primary : c.border.medium,
                },
              ]}
            >
              <Text style={{ color: active ? "#fff" : c.text.primary, fontWeight: "700", fontSize: 14 }}>
                {v}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.hint, { color: c.text.secondary, marginTop: 12 }]}>
        {selected.length} selected (3–6 required)
      </Text>
    </>
  );
}

function ContextStep({ c, selected, toggle }: { c: typeof Colors.light; selected: string[]; toggle: (v: string) => void }) {
  return (
    <>
      <Text style={[styles.h2, { color: c.text.primary }]}>Life context</Text>
      <Text style={[styles.body, { color: c.text.secondary, marginTop: 8 }]}>
        These are broad, non-identifying buckets. Select any that apply — they help tune suggestions to your rhythm.
      </Text>

      <View style={styles.chipGrid}>
        {LIFE_CONTEXTS.map((v) => {
          const active = selected.includes(v);
          return (
            <Pressable
              key={v}
              onPress={() => toggle(v)}
              style={[
                styles.valueChip,
                {
                  backgroundColor: active ? c.accent.primary : "transparent",
                  borderColor: active ? c.accent.primary : c.border.medium,
                },
              ]}
            >
              <Text style={{ color: active ? "#fff" : c.text.primary, fontWeight: "700", fontSize: 14 }}>
                {v}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <GlassCard style={{ marginTop: 20 }}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Important</Text>
        <Text style={[styles.body, { color: c.text.secondary, marginTop: 6 }]}>
          This app is observational and non-diagnostic. It does not provide medical advice or crisis support. All analytics are exploratory.
        </Text>
      </GlassCard>
    </>
  );
}

function PersonaliseStep({
  c,
  goals,
  toggleGoal,
  tone,
  setTone,
  sleepWindow,
  setSleepWindow,
}: {
  c: typeof Colors.light;
  goals: PrimaryGoal[];
  toggleGoal: (g: PrimaryGoal) => void;
  tone: PreferredTone;
  setTone: (t: PreferredTone) => void;
  sleepWindow: SleepWindow | null;
  setSleepWindow: (s: SleepWindow) => void;
}) {
  return (
    <>
      <Text style={[styles.h2, { color: c.text.primary }]}>Personalise</Text>
      <Text style={[styles.body, { color: c.text.secondary, marginTop: 8 }]}>
        Three quick, non-identifying choices to tune the app to you.
      </Text>

      <GlassCard style={{ marginTop: 16 }}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>What would you like help with?</Text>
        <Text style={[styles.hint, { color: c.text.secondary }]}>Pick 1 or 2</Text>
        <View style={[styles.chipGrid, { marginTop: 12 }]}>
          {GOALS.map((g) => {
            const active = goals.includes(g);
            return (
              <Pressable
                key={g}
                onPress={() => toggleGoal(g)}
                style={[
                  styles.valueChip,
                  {
                    backgroundColor: active ? c.accent.primary : "transparent",
                    borderColor: active ? c.accent.primary : c.border.medium,
                  },
                ]}
              >
                <Text style={{ color: active ? "#fff" : c.text.primary, fontWeight: "700", fontSize: 14 }}>
                  {g}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard style={{ marginTop: 12 }}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Preferred tone</Text>
        <Text style={[styles.hint, { color: c.text.secondary }]}>For reflections and nudges</Text>
        <View style={{ gap: 8, marginTop: 12 }}>
          {TONES.map(({ key, blurb }) => {
            const active = tone === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTone(key)}
                style={[
                  styles.rowPick,
                  {
                    borderColor: active ? c.accent.primary : c.border.medium,
                    backgroundColor: active ? `${c.accent.primary}10` : "transparent",
                  },
                ]}
              >
                <View style={[styles.radio, { borderColor: active ? c.accent.primary : c.border.heavy }]}>
                  {active && <View style={[styles.radioDot, { backgroundColor: c.accent.primary }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text.primary, fontWeight: "700" }}>{key}</Text>
                  <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 2 }}>{blurb}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard style={{ marginTop: 12 }}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Rough sleep window</Text>
        <Text style={[styles.hint, { color: c.text.secondary }]}>Helps time suggestions</Text>
        <View style={{ gap: 8, marginTop: 12 }}>
          {SLEEP_WINDOWS.map(({ key, blurb }) => {
            const active = sleepWindow === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSleepWindow(key)}
                style={[
                  styles.rowPick,
                  {
                    borderColor: active ? c.accent.primary : c.border.medium,
                    backgroundColor: active ? `${c.accent.primary}10` : "transparent",
                  },
                ]}
              >
                <View style={[styles.radio, { borderColor: active ? c.accent.primary : c.border.heavy }]}>
                  {active && <View style={[styles.radioDot, { backgroundColor: c.accent.primary }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text.primary, fontWeight: "700" }}>{key}</Text>
                  <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 2 }}>{blurb}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>
    </>
  );
}

function ConsentStep({ c, flags, toggle }: { c: typeof Colors.light; flags: ConsentFlags; toggle: (k: keyof ConsentFlags) => void }) {
  return (
    <>
      <Text style={[styles.h2, { color: c.text.primary }]}>Before we begin</Text>
      <Text style={[styles.body, { color: c.text.secondary, marginTop: 8 }]}>
        Please review and accept each statement to continue.
      </Text>

      <View style={{ gap: 10, marginTop: 16 }}>
        <ConsentRow
          label="I agree to local processing of wellbeing data on this device."
          checked={flags.dataProcessing}
          onPress={() => toggle("dataProcessing")}
          c={c}
        />
        <ConsentRow
          label="I understand WHOOP integration is optional and separately consented."
          checked={flags.whoopImport}
          onPress={() => toggle("whoopImport")}
          c={c}
        />
        <ConsentRow
          label="I understand my exports may be used (in anonymous form) to help improve this app."
          checked={flags.exportForResearch}
          onPress={() => toggle("exportForResearch")}
          c={c}
        />
        <ConsentRow
          label="I understand this app is non-diagnostic and not crisis support."
          checked={flags.nonMedicalUse}
          onPress={() => toggle("nonMedicalUse")}
          c={c}
        />
      </View>

      <GlassCard style={{ marginTop: 20 }}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>Safety notice</Text>
        <Text style={[styles.body, { color: c.text.secondary, marginTop: 6 }]}>
          If you may be at immediate risk, please call 999 for emergency services or Samaritans on 116 123 (free, 24/7). Continue only if this app is appropriate for your situation.
        </Text>
      </GlassCard>
    </>
  );
}

function ConsentRow({ label, checked, onPress, c }: { label: string; checked: boolean; onPress: () => void; c: typeof Colors.light }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.consentRow,
        {
          borderColor: checked ? c.accent.primary : c.border.medium,
          backgroundColor: checked ? `${c.accent.primary}10` : "transparent",
        },
      ]}
    >
      <View style={[styles.checkbox, { borderColor: checked ? c.accent.primary : c.border.heavy, backgroundColor: checked ? c.accent.primary : "transparent" }]}>
        {checked && <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>✓</Text>}
      </View>
      <Text style={{ color: c.text.primary, flex: 1, fontSize: 14, lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  progressDot: {
    height: 4,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 20,
  },
  h1: {
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  h2: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  hint: {
    fontSize: 13,
    marginTop: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  valueChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  rowPick: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
});
