import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";

export type FormulaInfo = {
  title: string;
  /** Simplified breakdown in plain English */
  breakdown: string;
  /** The actual maths formula */
  formula: string;
  /** Optional reference */
  reference?: string;
};

interface FormulaSheetProps {
  visible: boolean;
  formula: FormulaInfo | null;
  onClose: () => void;
}

export function FormulaSheet({ visible, formula, onClose }: FormulaSheetProps) {
  const c = Colors.light;

  if (!formula) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <IconSymbol name="function" size={18} color={c.accent.primary} />
          <Text style={[styles.title, { color: c.text.primary }]}>
            {formula.title}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <IconSymbol name="xmark" size={16} color={c.text.tertiary} />
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          {/* Simplified breakdown */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: c.accent.primary }]}>HOW IT WORKS</Text>
            <Text style={[styles.body, { color: c.text.primary }]}>
              {formula.breakdown}
            </Text>
          </View>

          {/* Actual formula */}
          <View style={[styles.formulaBox, { backgroundColor: c.accent.primary + "08", borderColor: c.accent.primary + "20" }]}>
            <Text style={[styles.sectionLabel, { color: c.text.tertiary }]}>THE MATHS</Text>
            <Text style={[styles.formulaText, { color: c.accent.primary }]}>
              {formula.formula}
            </Text>
          </View>

          {/* Reference */}
          {formula.reference && (
            <Text style={[styles.reference, { color: c.text.tertiary }]}>
              {formula.reference}
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// Formula definitions for each insight card
export const FORMULAS: Record<string, FormulaInfo> = {
  balance: {
    title: "Life Balance Index",
    breakdown:
      "Your score blends two sides:\n\n" +
      "• Body (70% weight): Recovery score + Sleep score\n" +
      "• Mind (30% weight): Mood score + Low-stress score\n\n" +
      "Body counts more because wearable data is measured objectively. " +
      "A penalty of -6 applies when high strain meets low recovery.",
    formula:
      "LBI = 0.7 × (0.5 × Recovery + 0.5 × SleepScore)\n" +
      "    + 0.3 × (0.5 × MoodScore + 0.5 × StressScore)\n\n" +
      "where:\n" +
      "  SleepScore = ((hours - 5) / 4) × 100\n" +
      "  MoodScore = ((mood - 1) / 4) × 100\n" +
      "  StressScore = 100 - ((stressLevel - 1) / 4) × 100",
    reference: "Custom composite index. Weights validated against WHOOP recovery correlation during pilot testing.",
  },
  body: {
    title: "Body Score",
    breakdown:
      "Combines two wearable signals:\n\n" +
      "• Recovery %: directly from WHOOP (HRV-based)\n" +
      "• Sleep: hours mapped to 0-100 (5h = 0, 9h = 100)\n\n" +
      "Strain is shown for context but doesn't affect the score — it's an input, not an output.",
    formula:
      "BodyScore = 0.5 × Recovery + 0.5 × SleepScore\n\n" +
      "SleepScore = clamp(((hours - 5) / 4) × 100, 0, 100)",
    reference: "Recovery from WHOOP HRV analysis. Sleep score threshold based on Walker (2017) recommendations.",
  },
  bridge: {
    title: "Mind-Body Bridge",
    breakdown:
      "Compares your physical and mental sides:\n\n" +
      "• Body = Recovery + Sleep (wearable)\n" +
      "• Mind = Mood + Energy + Low-stress (check-in)\n\n" +
      "A gap > 10 points means one side is doing better. " +
      "A gap > 30 points suggests significant disconnect.",
    formula:
      "Physio = 0.5 × Recovery + 0.5 × SleepScore\n" +
      "Mental = 0.33 × MoodScore + 0.33 × EnergyScore + 0.33 × StressScore\n\n" +
      "Gap = |Physio - Mental|\n" +
      "Aligned if gap ≤ 10",
    reference: "Inspired by Thayer & Lane (2000) neurovisceral integration model.",
  },
  baseline: {
    title: "Personal Baseline",
    breakdown:
      "Your baseline is the median (middle value) of your LBI scores over the last 7 days.\n\n" +
      "It updates daily, so it always reflects your recent normal — not a fixed target.\n\n" +
      "Deviation = Today's LBI - Baseline",
    formula:
      "Baseline = median(LBI[day-6], LBI[day-5], ..., LBI[day])\n\n" +
      "Deviation = LBI_today - Baseline",
    reference: "Rolling median chosen over mean for robustness to outlier days.",
  },
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.base,
    paddingBottom: 40,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.base,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  section: {
    marginBottom: Spacing.base,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  formulaBox: {
    padding: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  formulaText: {
    fontSize: 12,
    fontFamily: "monospace",
    lineHeight: 20,
    fontWeight: "600",
  },
  reference: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },
});
