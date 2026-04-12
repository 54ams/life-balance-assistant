import React, { useRef, useState } from "react";
import { Alert, Animated, Pressable, StyleSheet, Text, TextInput, View, Dimensions } from "react-native";
import { router } from "expo-router";
import { useColorScheme } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { saveAppConsent, type AppConsent } from "@/lib/privacy";
import { saveActiveValues } from "@/lib/storage";
import { defaultValuesSet } from "@/lib/emotion";

const VERSION = "2026-03-12";
const { width: SCREEN_W } = Dimensions.get("window");

const ALL_VALUES = [
  "Growth", "Connection", "Health", "Peace", "Discipline", "Purpose",
  "Creativity", "Kindness", "Courage", "Gratitude", "Resilience", "Joy",
];

const LIFE_CONTEXTS = [
  "Student", "Working professional", "Carer / parent",
  "Athlete", "Shift worker", "Remote worker",
];

type ConsentFlags = AppConsent["items"];

const INITIAL_FLAGS: ConsentFlags = {
  dataProcessing: false,
  whoopImport: false,
  exportForResearch: false,
  nonMedicalUse: false,
};

const STEPS = ["Welcome", "Values", "Context", "Consent"];

export default function OnboardingScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const [step, setStep] = useState(0);
  const [selectedValues, setSelectedValues] = useState<string[]>(defaultValuesSet());
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [name, setName] = useState("");
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

  const toggleConsent = (key: keyof ConsentFlags) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const finish = async () => {
    if (!Object.values(flags).every(Boolean)) {
      Alert.alert("Consent required", "You must accept all items to continue.");
      return;
    }
    await saveActiveValues(selectedValues);
    await saveAppConsent({
      consentedAt: new Date().toISOString(),
      privacyVersion: VERSION,
      items: flags,
    });
    router.replace("/");
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: 24, paddingBottom: 40 }}>
      {/* Progress bar */}
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
        {step + 1} of {STEPS.length}
      </Text>

      <Animated.View style={{ opacity: fadeAnim }}>
        {step === 0 && (
          <WelcomeStep c={c} name={name} setName={setName} />
        )}
        {step === 1 && (
          <ValuesStep c={c} selected={selectedValues} toggle={toggleValue} />
        )}
        {step === 2 && (
          <ContextStep c={c} selected={selectedContexts} toggle={toggleContext} />
        )}
        {step === 3 && (
          <ConsentStep c={c} flags={flags} toggle={toggleConsent} />
        )}
      </Animated.View>

      {/* Navigation buttons */}
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

function WelcomeStep({ c, name, setName }: { c: typeof Colors.light; name: string; setName: (s: string) => void }) {
  return (
    <>
      <Text style={[styles.h1, { color: c.accent.primary }]}>Life Balance{"\n"}Assistant</Text>
      <Text style={[styles.body, { color: c.text.secondary, marginTop: 12 }]}>
        This prototype was built as part of a BCS synoptic project exploring how wearable data, emotional self-report, and lifestyle signals can combine into a transparent, explainable wellbeing score.
      </Text>

      <GlassCard style={{ marginTop: 20 }}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>How it works</Text>
        <View style={{ gap: 12, marginTop: 12 }}>
          <StepItem num="1" text="Complete a short daily check-in" c={c} />
          <StepItem num="2" text="Optionally sync WHOOP recovery data" c={c} />
          <StepItem num="3" text="Review your Life Balance Index, trends, and personalised recommendations" c={c} />
        </View>
      </GlassCard>

      <GlassCard style={{ marginTop: 12 }}>
        <Text style={[styles.cardTitle, { color: c.text.primary }]}>What's your name?</Text>
        <Text style={[styles.hint, { color: c.text.secondary }]}>Optional, only used for greetings</Text>
        <TextInput
          placeholder="Enter your name"
          placeholderTextColor={c.text.tertiary}
          value={name}
          onChangeText={setName}
          style={[styles.input, { borderColor: c.border.medium, color: c.text.primary }]}
        />
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
        Select 3 to 6 values that are important in your life. These help the app understand what balance looks like for you.
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
        {selected.length} selected (3-6 required)
      </Text>
    </>
  );
}

function ContextStep({ c, selected, toggle }: { c: typeof Colors.light; selected: string[]; toggle: (v: string) => void }) {
  return (
    <>
      <Text style={[styles.h2, { color: c.text.primary }]}>Life context</Text>
      <Text style={[styles.body, { color: c.text.secondary, marginTop: 8 }]}>
        Select any that apply. This helps us understand your baseline lifestyle so recommendations are more relevant.
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
          label="I understand exports may be used for dissertation research."
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
          If you may be at immediate risk, please use emergency services or a crisis line such as 988 (US) or 116 123 (UK). Continue only if this prototype is appropriate for your situation.
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
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 14,
    fontSize: 16,
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
