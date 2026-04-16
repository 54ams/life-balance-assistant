import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EmptyState } from "@/components/ui/EmptyState";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { TAB_ORDER } from "@/constants/navigation";
import { useColorScheme } from "react-native";
import { todayISO } from "@/lib/util/todayISO";
import { TabSwipe } from "@/components/TabSwipe";
import { listDailyRecords } from "@/lib/storage";
import * as Haptics from "expo-haptics";

type InsightCategory = {
  title: string;
  description: string;
  icon: string;
  color: string;
  items: { title: string; route: string; icon: string }[];
};

export default function InsightsHome() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];
  const today = todayISO();
  const [dataCount, setDataCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const records = await listDailyRecords(30);
        setDataCount(records.filter((r) => r.lbi != null).length);
      })();
    }, [])
  );

  const categories: InsightCategory[] = [
    {
      title: "Your Score",
      description: "Understand what drives your balance score and what-if scenarios",
      icon: "lightbulb.fill",
      color: isDark ? "#FBBF24" : "#D97706",
      items: [
        { title: "Why this score", route: "/insights/explain", icon: "lightbulb.fill" },
        { title: "Score breakdown", route: "/insights/integration", icon: "slider.horizontal.3" },
        { title: "Personal baseline", route: "/insights/baseline", icon: "chart.bar" },
      ],
    },
    {
      title: "Your Patterns",
      description: "Discover trends, correlations, and what affects your wellbeing",
      icon: "chart.line.uptrend.xyaxis",
      color: isDark ? "#57D6A4" : "#2FA37A",
      items: [
        { title: "Mind–Body Bridge", route: "/insights/bridge", icon: "heart.text.square" },
        { title: "Trends", route: "/insights/trends", icon: "chart.line.uptrend.xyaxis" },
        { title: "Correlations", route: "/insights/correlations", icon: "arrow.triangle.branch" },
        { title: "Patterns", route: "/insights/patterns", icon: "square.grid.2x2" },
        { title: "Consistency", route: "/insights/consistency", icon: "checkmark.circle" },
        { title: "Emotions", route: "/insights/emotions", icon: "heart.text.square" },
      ],
    },
    {
      title: "Your Plan",
      description: "Track adherence, risk outlook, and weekly reflections",
      icon: "checklist",
      color: isDark ? "#8B7FE8" : "#6B5DD3",
      items: [
        { title: "Adherence & LBI", route: "/insights/adherence", icon: "checklist" },
        { title: "Risk outlook", route: "/insights/risk", icon: "exclamationmark.triangle" },
        { title: "Weekly reflection", route: "/insights/weekly", icon: "text.book.closed" },
      ],
    },
  ];

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll>
        <Text style={{ fontSize: 28, fontWeight: "900", color: c.text.primary, letterSpacing: -0.3 }}>
          Insights
        </Text>
        <Text style={{ marginTop: 4, color: c.text.secondary, fontSize: 14 }}>
          {dataCount > 0
            ? `Based on ${dataCount} days of data`
            : "Explore your data. Correlation ≠ causation."}
        </Text>

        {dataCount === 0 ? (
          <GlassCard style={{ marginTop: Spacing.lg }}>
            <EmptyState
              icon="chart.bar.xaxis"
              title="No insights yet"
              description="Complete a few days of check-ins and sync your wearable to unlock personalised insights."
              actionLabel="Start Check-in"
              onAction={() => router.push("/checkin" as any)}
            />
          </GlassCard>
        ) : (
          <View style={{ gap: Spacing.md, marginTop: Spacing.base }}>
            {categories.map((cat) => (
              <GlassCard key={cat.title} padding="base">
                {/* Category header */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.sm }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      backgroundColor: cat.color + "18",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol name={cat.icon as any} size={20} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>{cat.title}</Text>
                    <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>{cat.description}</Text>
                  </View>
                </View>

                {/* Category items */}
                <View style={{ gap: 2 }}>
                  {cat.items.map((item, i) => (
                    <Pressable
                      key={item.route}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({ pathname: item.route, params: { date: today } } as any);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          paddingVertical: 12,
                          paddingHorizontal: 4,
                          borderTopWidth: i > 0 ? 1 : 0,
                          borderTopColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                        },
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <IconSymbol name={item.icon as any} size={16} color={c.text.secondary} />
                      <Text style={{ flex: 1, color: c.text.primary, fontWeight: "600", fontSize: 15 }}>
                        {item.title}
                      </Text>
                      <IconSymbol name="chevron.right" size={12} color={c.text.tertiary} />
                    </Pressable>
                  ))}
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Analytics (for examiners) */}
        <GlassCard style={{ marginTop: Spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: c.glass.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSymbol name="cpu" size={16} color={c.text.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.text.primary }}>Model performance</Text>
              <Text style={{ fontSize: 12, color: c.text.secondary }}>Validation & calibration metrics</Text>
            </View>
            <Pressable
              onPress={() => router.push("/insights/performance" as any)}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.accent.primary }}>View</Text>
            </Pressable>
          </View>
        </GlassCard>

        {/* Analytics report */}
        <GlassCard style={{ marginTop: Spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: c.glass.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSymbol name="doc.text" size={16} color={c.text.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.text.primary }}>Full analytics report</Text>
              <Text style={{ fontSize: 12, color: c.text.secondary }}>Export-ready stats for evaluation</Text>
            </View>
            <Pressable
              onPress={() => router.push("/insights/analytics" as any)}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.accent.primary }}>View</Text>
            </Pressable>
          </View>
        </GlassCard>

        {/* Transparency */}
        <View style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: 12, color: c.text.tertiary, textAlign: "center", lineHeight: 16 }}>
            Patterns are observational · Confidence reflects missing signals · No diagnoses are made
          </Text>
        </View>
      </Screen>
    </TabSwipe>
  );
}
