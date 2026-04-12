import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View, Dimensions } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { TAB_ORDER } from "@/constants/navigation";
import { useColorScheme } from "react-native";
import { todayISO } from "@/lib/util/todayISO";
import { TabSwipe } from "@/components/TabSwipe";

const WIDTH = Dimensions.get("window").width;

type Section = {
  title: string;
  desc: string;
  route: string;
  icon: string;
};

const FEATURED: Section[] = [
  { title: "Why this score", desc: "Top drivers and uncertainty", route: "/insights/explain", icon: "lightbulb.fill" },
  { title: "Trends", desc: "Trajectory vs baseline", route: "/insights/trends", icon: "chart.line.uptrend.xyaxis" },
  { title: "Correlations", desc: "Exploratory relationships", route: "/insights/correlations", icon: "arrow.triangle.branch" },
];

const MORE: Section[] = [
  { title: "Patterns", desc: "30-day comparisons", route: "/insights/patterns", icon: "square.grid.2x2" },
  { title: "Consistency", desc: "Routine stability", route: "/insights/consistency", icon: "checkmark.circle" },
  { title: "Integration", desc: "Signal weights & confidence", route: "/insights/integration", icon: "slider.horizontal.3" },
  { title: "Baselines", desc: "Personal median + IQR", route: "/insights/baseline", icon: "chart.bar" },
  { title: "Model performance", desc: "Validation & calibration", route: "/insights/performance", icon: "cpu" },
  { title: "Risk outlook", desc: "Next-day personal model", route: "/insights/risk", icon: "exclamationmark.triangle" },
  { title: "Weekly reflection", desc: "Identity & affect patterns", route: "/insights/weekly", icon: "text.book.closed" },
  { title: "Adherence & LBI", desc: "Plan completion vs score", route: "/insights/adherence", icon: "checklist" },
];

export default function InsightsHome() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const today = todayISO();

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll>
        <Text style={{ fontSize: 28, fontWeight: "900", color: c.text.primary, letterSpacing: -0.3 }}>
          Insights
        </Text>
        <Text style={{ marginTop: 4, color: c.text.secondary, fontSize: 14 }}>
          Explore your data. Correlation ≠ causation.
        </Text>

        {/* Featured cards */}
        <View style={{ gap: Spacing.sm, marginTop: Spacing.base }}>
          {FEATURED.map((s) => (
            <Pressable
              key={s.route}
              onPress={() => router.push({ pathname: s.route, params: { date: today } } as any)}
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}
            >
              <GlassCard padding="base">
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <View style={{
                    width: 42, height: 42, borderRadius: 14,
                    backgroundColor: c.glass.secondary, alignItems: "center", justifyContent: "center",
                  }}>
                    <IconSymbol name={s.icon as any} size={20} color={c.accent.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>{s.title}</Text>
                    <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>{s.desc}</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={14} color={c.text.tertiary} />
                </View>
              </GlassCard>
            </Pressable>
          ))}
        </View>

        {/* Horizontal carousel */}
        <Text style={{ fontSize: 17, fontWeight: "800", color: c.text.primary, marginTop: Spacing.lg }}>
          More insights
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: Spacing.sm, marginHorizontal: -Spacing.base }}
          contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: Spacing.sm }}
        >
          {MORE.map((s) => (
            <Pressable
              key={s.route}
              onPress={() => router.push({ pathname: s.route, params: { date: today } } as any)}
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}
            >
              <GlassCard style={{ width: WIDTH * 0.42, minHeight: 120 }} padding="base">
                <View style={{
                  width: 34, height: 34, borderRadius: 10,
                  backgroundColor: c.glass.secondary, alignItems: "center", justifyContent: "center",
                  marginBottom: 10,
                }}>
                  <IconSymbol name={s.icon as any} size={16} color={c.accent.primary} />
                </View>
                <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 14 }}>{s.title}</Text>
                <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 4 }}>{s.desc}</Text>
              </GlassCard>
            </Pressable>
          ))}
        </ScrollView>

        {/* Analytics */}
        <GlassCard style={{ marginTop: Spacing.lg }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: c.text.primary }}>Analytics</Text>
          <Text style={{ marginTop: 4, color: c.text.secondary, fontSize: 13 }}>
            Report-friendly stats for pilot evaluation.
          </Text>
          <View style={{ marginTop: Spacing.sm }}>
            <GlassButton
              title="View analytics"
              variant="secondary"
              onPress={() => router.push("/insights/analytics" as any)}
            />
          </View>
        </GlassCard>

        {/* Transparency */}
        <GlassCard style={{ marginTop: Spacing.sm }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.text.primary }}>Transparency</Text>
          <Text style={{ marginTop: 4, color: c.text.secondary, fontSize: 13, lineHeight: 18 }}>
            Patterns are observational. Confidence reflects missing signals. No diagnoses are made.
          </Text>
        </GlassCard>
      </Screen>
    </TabSwipe>
  );
}
