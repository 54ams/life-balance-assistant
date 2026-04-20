import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";

interface FeatureGuideProps {
  /** Unique key for this feature (used in AsyncStorage) */
  featureId: string;
  /** Short headline e.g. "Behaviour Cycles" */
  title: string;
  /** What this feature does for the user */
  what: string;
  /** Why it helps / the science behind it */
  why: string;
  /** How it connects to the rest of the app */
  connection: string;
}

const GUIDE_PREFIX = "feature_guide_seen_";

export function FeatureGuide({ featureId, title, what, why, connection }: FeatureGuideProps) {
  const c = Colors.light;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const seen = await AsyncStorage.getItem(GUIDE_PREFIX + featureId);
      if (!seen) setVisible(true);
    })();
  }, [featureId]);

  const dismiss = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await AsyncStorage.setItem(GUIDE_PREFIX + featureId, "1");
    setVisible(false);
  }, [featureId]);

  if (!visible) return null;

  return (
    <View style={[styles.card, { borderColor: c.lime }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: c.lime + "30" }]}>
          <IconSymbol name="lightbulb.fill" size={16} color={c.accent.primary} />
        </View>
        <Text style={[styles.title, { color: c.text.primary }]}>How {title} works</Text>
        <Pressable onPress={dismiss} hitSlop={12} accessibilityLabel="Dismiss guide">
          <IconSymbol name="xmark" size={14} color={c.text.tertiary} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: c.accent.primary }]}>WHAT IT DOES</Text>
        <Text style={[styles.body, { color: c.text.primary }]}>{what}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: c.accent.primary }]}>WHY IT HELPS</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>{why}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, { color: c.lime + "CC" }]}>HOW IT CONNECTS</Text>
        <Text style={[styles.body, { color: c.text.secondary }]}>{connection}</Text>
      </View>

      <Pressable
        onPress={dismiss}
        style={[styles.gotItBtn, { backgroundColor: c.accent.primary }]}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Got it</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    backgroundColor: "rgba(255,252,244,0.95)",
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: Spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  section: {
    marginTop: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  gotItBtn: {
    marginTop: Spacing.base,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
});
