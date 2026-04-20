import React, { useEffect, useState } from "react";
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
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { detectCycles, type DetectedCycle } from "@/lib/cycles";
import { listDailyRecords } from "@/lib/storage";
import { FeatureGuide } from "@/components/ui/FeatureGuide";

export default function CyclesScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const [cycles, setCycles] = useState<DetectedCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const records = await listDailyRecords(30);
      const detected = await detectCycles(records);
      setCycles(detected);
      setLoading(false);
    })();
  }, []);

  const positiveCount = cycles.filter((c) => c.direction === "positive").length;
  const negativeCount = cycles.filter((c) => c.direction === "negative").length;

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
              <Text style={[styles.title, { color: c.text.primary }]}>Behaviour-Mood Cycles</Text>
              <Text style={[styles.subtitle, { color: c.text.secondary }]}>
                How your actions and feelings reinforce each other
              </Text>
            </View>
          </View>

          {/* First-visit guide */}
          <FeatureGuide
            featureId="cycles"
            title="Behaviour Cycles"
            what="Detects feedback loops in your data — where actions and feelings reinforce each other over days and weeks."
            why="Based on behavioural activation research (Jacobson, 2001). Seeing your cycles helps you break negative ones and strengthen positive ones."
            connection="Uses your check-in mood, habits, sleep data, and WHOOP recovery to find real patterns — not guesses."
          />

          {/* Explanation */}
          <GlassCard style={{ marginTop: Spacing.lg }} padding="base">
            <Text style={{ color: c.text.secondary, fontSize: 14, lineHeight: 20 }}>
              Your behaviour and mood form feedback loops. Exercise might lift tomorrow's mood,
              which motivates more exercise. But low mood can lead to withdrawal, which deepens the dip.
              These are YOUR patterns from YOUR data.
            </Text>
          </GlassCard>

          {loading ? (
            <Text style={{ color: c.text.tertiary, textAlign: "center", marginTop: Spacing.xxl }}>
              Analysing your patterns...
            </Text>
          ) : cycles.length === 0 ? (
            <View style={{ marginTop: Spacing.xxl, alignItems: "center" }}>
              <IconSymbol name="chart.line.uptrend.xyaxis" size={40} color={c.text.tertiary} />
              <Text style={{ color: c.text.primary, fontSize: 18, fontWeight: "700", marginTop: Spacing.md, textAlign: "center" }}>
                Not enough data yet
              </Text>
              <Text style={{ color: c.text.secondary, fontSize: 14, textAlign: "center", marginTop: 4, lineHeight: 20, maxWidth: 280 }}>
                Keep checking in and logging habits. Patterns usually emerge after 7-14 days of data.
              </Text>
            </View>
          ) : (
            <>
              {/* Summary */}
              <View style={styles.summaryRow}>
                <View style={[styles.summaryBadge, { backgroundColor: "#10b98120" }]}>
                  <Text style={{ color: "#10b981", fontSize: 20, fontWeight: "800" }}>{positiveCount}</Text>
                  <Text style={{ color: "#10b981", fontSize: 11, fontWeight: "600" }}>positive</Text>
                </View>
                <View style={[styles.summaryBadge, { backgroundColor: "#ef444420" }]}>
                  <Text style={{ color: "#ef4444", fontSize: 20, fontWeight: "800" }}>{negativeCount}</Text>
                  <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "600" }}>negative</Text>
                </View>
              </View>

              {/* Cycle cards */}
              <View style={{ marginTop: Spacing.lg, gap: Spacing.md }}>
                {cycles.map((cycle) => {
                  const isPositive = cycle.direction === "positive";
                  const accentColor = isPositive ? "#10b981" : "#ef4444";
                  const expanded = expandedId === cycle.id;

                  return (
                    <Pressable key={cycle.id} onPress={() => setExpandedId(expanded ? null : cycle.id)}>
                      <GlassCard padding="base">
                        <View style={styles.cycleHeader}>
                          <View style={[styles.directionDot, { backgroundColor: accentColor }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: c.text.primary, fontSize: 15, fontWeight: "700" }}>
                              {cycle.title}
                            </Text>
                            <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
                              {cycle.description}
                            </Text>
                          </View>
                          <IconSymbol
                            name={expanded ? "chevron.up" : "chevron.down"}
                            size={14}
                            color={c.text.tertiary}
                          />
                        </View>

                        {expanded && (
                          <View style={{ marginTop: Spacing.md }}>
                            {/* Visual cycle representation */}
                            <View style={styles.cycleVisual}>
                              {cycle.nodes.map((node, i) => (
                                <React.Fragment key={node.id}>
                                  <View style={[styles.nodeBox, { borderColor: accentColor + "40", backgroundColor: accentColor + "10" }]}>
                                    <Text style={{ color: c.text.primary, fontSize: 12, fontWeight: "700", textAlign: "center" }}>
                                      {node.label}
                                    </Text>
                                  </View>
                                  {i < cycle.nodes.length - 1 && (
                                    <IconSymbol name="arrow.down" size={16} color={accentColor} />
                                  )}
                                </React.Fragment>
                              ))}
                              {/* Loop back arrow */}
                              <View style={[styles.loopArrow, { borderColor: accentColor + "40" }]}>
                                <IconSymbol name="arrow.uturn.up" size={14} color={accentColor} />
                                <Text style={{ color: accentColor, fontSize: 10, fontWeight: "600" }}>repeats</Text>
                              </View>
                            </View>

                            {/* Evidence */}
                            <View style={{ marginTop: Spacing.md }}>
                              <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }}>EVIDENCE</Text>
                              {cycle.edges.map((edge, i) => (
                                <Text key={i} style={{ color: c.text.secondary, fontSize: 12, marginTop: 4 }}>
                                  {edge.evidence}
                                </Text>
                              ))}
                              <View style={[styles.confidenceBadge, { backgroundColor: "rgba(0,0,0,0.04)" }]}>
                                <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "700" }}>
                                  Confidence: {cycle.confidence} · {cycle.dataPoints} data points
                                </Text>
                              </View>
                            </View>
                          </View>
                        )}
                      </GlassCard>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text style={{ color: c.text.tertiary, fontSize: 11, textAlign: "center", marginTop: Spacing.xl, lineHeight: 16 }}>
            Correlations aren't causation — but consistent patterns are worth noticing
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
  summaryRow: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg, justifyContent: "center" },
  summaryBadge: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: BorderRadius.lg, alignItems: "center" },
  cycleHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  directionDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  cycleVisual: { alignItems: "center", gap: 6, paddingVertical: Spacing.md },
  nodeBox: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, minWidth: 140 },
  loopArrow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  confidenceBadge: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
});
