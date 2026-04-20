import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
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
  saveSleepHygiene,
  getTodaySleepHygiene,
  getEmptyChecklist,
  CHECKLIST_ITEMS,
  type SleepChecklist,
} from "@/lib/sleepHygiene";
import { FeatureGuide } from "@/components/ui/FeatureGuide";

export default function SleepHygieneScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [checklist, setChecklist] = useState<SleepChecklist>(getEmptyChecklist());
  const [saved, setSaved] = useState(false);
  const [expandedTip, setExpandedTip] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const existing = await getTodaySleepHygiene();
      if (existing) setChecklist(existing.checklist);
    })();
  }, []);

  const score = Object.values(checklist).filter(Boolean).length;
  const total = CHECKLIST_ITEMS.length;
  const percentage = Math.round((score / total) * 100);

  const toggle = (key: keyof SleepChecklist) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    await saveSleepHygiene(checklist);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSaved(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground state="aligned" />
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
              <Text style={[styles.title, { color: c.text.primary }]}>Sleep Hygiene</Text>
              <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                Your evening wind-down checklist
              </Text>
            </View>
          </View>

          {/* First-visit guide */}
          <FeatureGuide
            featureId="sleep_hygiene"
            title="Sleep Hygiene"
            what="An evidence-based evening checklist. Tick off each habit before bed to build a consistent wind-down routine."
            why="Sleep hygiene is one of the strongest predictors of next-day recovery and mood (Walker, 2017). Small consistent changes compound over weeks."
            connection="Your hygiene score feeds directly into your balance calculation and pattern detection. The app tracks how tonight's habits affect tomorrow's energy."
          />

          {/* Score ring */}
          <GlassCard style={{ marginTop: Spacing.lg }} padding="base">
            <View style={{ alignItems: "center" }}>
              <View style={[styles.scoreRing, { borderColor: c.accent.primary }]}>
                <Text style={{ color: c.text.primary, fontSize: 28, fontWeight: "800" }}>{percentage}%</Text>
              </View>
              <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 8 }}>
                {score}/{total} items completed tonight
              </Text>
              <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 4, textAlign: "center", lineHeight: 16 }}>
                Better sleep hygiene correlates with deeper recovery and improved next-day mood
              </Text>
            </View>
          </GlassCard>

          {/* Checklist */}
          <View style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
            <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }}>
              TONIGHT'S CHECKLIST
            </Text>
            {CHECKLIST_ITEMS.map((item) => (
              <View key={item.key}>
                <Pressable onPress={() => toggle(item.key)}>
                  <GlassCard padding="base">
                    <View style={styles.checkRow}>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            backgroundColor: checklist[item.key] ? c.accent.primary : "transparent",
                            borderColor: checklist[item.key] ? c.accent.primary : c.border.medium,
                          },
                        ]}
                      >
                        {checklist[item.key] && <IconSymbol name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text style={[styles.checkLabel, { color: c.text.primary }]}>{item.label}</Text>
                      <Pressable
                        onPress={() => setExpandedTip(expandedTip === item.key ? null : item.key)}
                        hitSlop={8}
                      >
                        <IconSymbol
                          name="info.circle"
                          size={16}
                          color={c.text.tertiary}
                        />
                      </Pressable>
                    </View>
                    {expandedTip === item.key && (
                      <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 8, marginLeft: 38, lineHeight: 17, fontStyle: "italic" }}>
                        {item.tip}
                      </Text>
                    )}
                  </GlassCard>
                </Pressable>
              </View>
            ))}
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: saved ? "#10b981" : c.accent.primary }]}
          >
            {saved ? (
              <>
                <IconSymbol name="checkmark" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Saved</Text>
              </>
            ) : (
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Save Tonight's Checklist</Text>
            )}
          </Pressable>

          {/* Connection note */}
          <Text style={{ color: c.text.tertiary, fontSize: 11, textAlign: "center", marginTop: Spacing.lg, lineHeight: 16 }}>
            Your sleep hygiene score feeds into pattern detection.{"\n"}
            Over time, you'll see how tonight's habits affect tomorrow's energy.
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
  scoreRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, alignItems: "center", justifyContent: "center" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: Spacing.xl, paddingVertical: 16, borderRadius: BorderRadius.xl },
});
