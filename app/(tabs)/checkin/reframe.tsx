import React, { useState } from "react";
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
  createReframe,
  getPrompt,
  DISTORTION_LABELS,
  type CognitiveDistortion,
} from "@/lib/reframing";

type Step = "thought" | "evidence" | "reframe" | "done";

export default function ReframeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [step, setStep] = useState<Step>("thought");
  const [thought, setThought] = useState("");
  const [distortion, setDistortion] = useState<CognitiveDistortion | null>(null);
  const [evidenceFor, setEvidenceFor] = useState("");
  const [evidenceAgainst, setEvidenceAgainst] = useState("");
  const [reframe, setReframe] = useState("");

  const handleNext = () => {
    if (step === "thought" && thought.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setStep("evidence");
    } else if (step === "evidence" && evidenceAgainst.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setStep("reframe");
    } else if (step === "reframe" && reframe.trim()) {
      handleSave();
    }
  };

  const handleSave = async () => {
    await createReframe({
      automaticThought: thought.trim(),
      cognitiveDistortion: distortion ?? undefined,
      evidenceFor: evidenceFor.trim(),
      evidenceAgainst: evidenceAgainst.trim(),
      reframe: reframe.trim(),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setStep("done");
  };

  if (step === "done") {
    return (
      <View style={{ flex: 1 }}>
        <AuroraBackground state="aligned" />
        <SafeAreaView style={{ flex: 1, justifyContent: "center", paddingHorizontal: Spacing.base }}>
          <View style={{ alignItems: "center" }}>
            <View style={[styles.doneIcon, { backgroundColor: c.accent.primary + "20" }]}>
              <IconSymbol name="checkmark.circle.fill" size={48} color={c.accent.primary} />
            </View>
            <Text style={[styles.doneTitle, { color: c.text.primary }]}>
              Thought reframed
            </Text>
            <Text style={{ color: c.text.secondary, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20, maxWidth: 280 }}>
              You've created space between the thought and reality. The original thought was one perspective — not the full picture.
            </Text>

            <GlassCard style={{ marginTop: Spacing.xl, width: "100%" }} padding="base">
              <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }}>YOUR REFRAME</Text>
              <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "600", marginTop: 6, fontStyle: "italic", lineHeight: 22 }}>
                "{reframe}"
              </Text>
            </GlassCard>

            <Pressable
              onPress={() => router.back()}
              style={[styles.doneBtn, { backgroundColor: c.accent.primary }]}
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
            contentContainerStyle={{ paddingHorizontal: Spacing.base, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <IconSymbol name="chevron.left" size={20} color={c.text.primary} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: c.text.primary }]}>Reframe a Thought</Text>
                <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                  Step {step === "thought" ? "1" : step === "evidence" ? "2" : "3"} of 3
                </Text>
              </View>
            </View>

            {/* Step indicators */}
            <View style={styles.stepRow}>
              {(["thought", "evidence", "reframe"] as Step[]).map((s, i) => (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor:
                        s === step ? c.accent.primary :
                        (["thought", "evidence", "reframe"].indexOf(step) > i ? c.accent.primary + "60" : c.border.medium),
                    },
                  ]}
                />
              ))}
            </View>

            {/* STEP 1: The thought */}
            {step === "thought" && (
              <View style={{ marginTop: Spacing.xl }}>
                <Text style={[styles.prompt, { color: c.text.primary }]}>
                  {getPrompt("thought")}
                </Text>
                <TextInput
                  style={[styles.textArea, { color: c.text.primary, borderColor: c.border.medium }]}
                  placeholder="Write the thought that's bothering you..."
                  placeholderTextColor={c.text.tertiary}
                  multiline
                  value={thought}
                  onChangeText={setThought}
                  autoFocus
                />

                {/* Optional distortion selector */}
                <Text style={[styles.sectionLabel, { color: c.text.tertiary }]}>
                  DOES THIS SOUND LIKE ANY OF THESE? (OPTIONAL)
                </Text>
                <View style={styles.distortionGrid}>
                  {(Object.entries(DISTORTION_LABELS) as [CognitiveDistortion, { label: string; description: string }][]).map(
                    ([key, { label }]) => (
                      <Pressable
                        key={key}
                        onPress={() => setDistortion(distortion === key ? null : key)}
                        style={[
                          styles.distortionChip,
                          {
                            backgroundColor: distortion === key ? c.accent.primary : "transparent",
                            borderColor: distortion === key ? c.accent.primary : c.border.medium,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: distortion === key ? "#fff" : c.text.secondary,
                            fontSize: 12,
                            fontWeight: "600",
                          }}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            )}

            {/* STEP 2: Evidence */}
            {step === "evidence" && (
              <View style={{ marginTop: Spacing.xl }}>
                <GlassCard padding="base" style={{ marginBottom: Spacing.lg }}>
                  <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }}>YOUR THOUGHT</Text>
                  <Text style={{ color: c.text.primary, fontSize: 14, marginTop: 4, fontStyle: "italic" }}>"{thought}"</Text>
                </GlassCard>

                <Text style={[styles.prompt, { color: c.text.primary }]}>
                  {getPrompt("evidenceFor")}
                </Text>
                <TextInput
                  style={[styles.textArea, { color: c.text.primary, borderColor: c.border.medium, minHeight: 80 }]}
                  placeholder="What supports this thought..."
                  placeholderTextColor={c.text.tertiary}
                  multiline
                  value={evidenceFor}
                  onChangeText={setEvidenceFor}
                />

                <Text style={[styles.prompt, { color: c.text.primary, marginTop: Spacing.lg }]}>
                  {getPrompt("evidenceAgainst")}
                </Text>
                <TextInput
                  style={[styles.textArea, { color: c.text.primary, borderColor: c.border.medium, minHeight: 80 }]}
                  placeholder="What goes against this thought..."
                  placeholderTextColor={c.text.tertiary}
                  multiline
                  value={evidenceAgainst}
                  onChangeText={setEvidenceAgainst}
                  autoFocus
                />
              </View>
            )}

            {/* STEP 3: Reframe */}
            {step === "reframe" && (
              <View style={{ marginTop: Spacing.xl }}>
                <GlassCard padding="base" style={{ marginBottom: Spacing.lg }}>
                  <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }}>EVIDENCE AGAINST</Text>
                  <Text style={{ color: c.text.primary, fontSize: 14, marginTop: 4 }}>{evidenceAgainst}</Text>
                </GlassCard>

                <Text style={[styles.prompt, { color: c.text.primary }]}>
                  {getPrompt("reframe")}
                </Text>
                <TextInput
                  style={[styles.textArea, { color: c.text.primary, borderColor: c.border.medium }]}
                  placeholder="Write a more balanced thought..."
                  placeholderTextColor={c.text.tertiary}
                  multiline
                  value={reframe}
                  onChangeText={setReframe}
                  autoFocus
                />
              </View>
            )}

            {/* Next button */}
            <Pressable
              onPress={handleNext}
              style={[
                styles.nextBtn,
                {
                  backgroundColor: c.accent.primary,
                  opacity:
                    (step === "thought" && thought.trim()) ||
                    (step === "evidence" && evidenceAgainst.trim()) ||
                    (step === "reframe" && reframe.trim())
                      ? 1
                      : 0.4,
                },
              ]}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                {step === "reframe" ? "Save Reframe" : "Next"}
              </Text>
              <IconSymbol name="arrow.right" size={16} color="#fff" />
            </Pressable>
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
  stepRow: { flexDirection: "row", gap: 8, marginTop: Spacing.lg, justifyContent: "center" },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  prompt: { fontSize: 20, fontWeight: "700", lineHeight: 26, marginBottom: Spacing.md },
  textArea: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: 16, fontSize: 15, minHeight: 100, textAlignVertical: "top", lineHeight: 22 },
  sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginTop: Spacing.xl, marginBottom: 8 },
  distortionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  distortionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: Spacing.xl, paddingVertical: 16, borderRadius: BorderRadius.xl },
  doneIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 26, fontWeight: "800", marginTop: Spacing.lg },
  doneBtn: { marginTop: Spacing.xl, paddingVertical: 16, paddingHorizontal: 48, borderRadius: BorderRadius.xl },
});
