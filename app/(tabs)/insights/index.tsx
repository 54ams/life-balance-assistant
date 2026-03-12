import { router } from "expo-router";
import React from "react";
import { ScrollView, Text, View, Dimensions } from "react-native";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { TAB_ORDER } from "@/constants/navigation";
import { useColorScheme } from "react-native";
import { todayISO } from "@/lib/util/todayISO";
import { TabSwipe } from "@/components/TabSwipe";

const WIDTH = Dimensions.get("window").width;

type Slide = {
  title: string;
  desc: string;
  cta: string;
  route: string;
  variant?: "primary" | "secondary";
};

const slides: Slide[] = [
  { title: "Why this score", desc: "Top drivers and uncertainty for today.", cta: "Open explain", route: "/insights/explain", variant: "primary" },
  { title: "Trends", desc: "Trajectory vs baseline over time.", cta: "View trends", route: "/insights/trends" },
  { title: "Correlations", desc: "Exploratory relationships with safeguards.", cta: "Explore correlations", route: "/insights/correlations" },
  { title: "Patterns", desc: "Transparent 30-day comparisons.", cta: "Open patterns", route: "/insights/patterns" },
  { title: "Consistency", desc: "Routine stability and tracking regularity.", cta: "Open consistency", route: "/insights/consistency" },
  { title: "Integration", desc: "Which signals were used and confidence.", cta: "Open integration", route: "/insights/integration" },
  { title: "Baselines", desc: "Median + IQR personal ranges.", cta: "View baselines", route: "/insights/baseline" },
  { title: "Model performance", desc: "Validation + calibration summary.", cta: "Open performance", route: "/insights/performance" },
  { title: "Risk outlook", desc: "Tomorrow risk from your personal model.", cta: "Open risk outlook", route: "/insights/risk" },
  { title: "Weekly reflection", desc: "Identity, regulation, affect patterns.", cta: "Open weekly", route: "/insights/weekly" },
];

export default function InsightsHome() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"] as any;
  const today = todayISO();

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll>
        <Text style={{ fontSize: 26, fontWeight: "800", color: c.text.primary }}>Insights</Text>
        <Text style={{ marginTop: 6, color: c.text.secondary }}>Swipe between focus areas. Correlation ≠ causation.</Text>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <GlassCard style={{ flexBasis: "48%", flexGrow: 1, padding: 12 }}>
            <Text style={{ color: c.text.primary, fontWeight: "800" }}>Baselines</Text>
            <Text style={{ color: c.text.secondary, marginTop: 4 }}>Median/IQR + coverage</Text>
            <View style={{ marginTop: 8 }}>
              <Button title="Open" variant="secondary" onPress={() => router.push("/insights/baseline" as any)} />
            </View>
          </GlassCard>
          <GlassCard style={{ flexBasis: "48%", flexGrow: 1, padding: 12 }}>
            <Text style={{ color: c.text.primary, fontWeight: "800" }}>Model performance</Text>
            <Text style={{ color: c.text.secondary, marginTop: 4 }}>Validation & calibration</Text>
            <View style={{ marginTop: 8 }}>
              <Button title="Open" variant="secondary" onPress={() => router.push("/insights/performance" as any)} />
            </View>
          </GlassCard>
          <GlassCard style={{ flexBasis: "48%", flexGrow: 1, padding: 12 }}>
            <Text style={{ color: c.text.primary, fontWeight: "800" }}>Risk outlook</Text>
            <Text style={{ color: c.text.secondary, marginTop: 4 }}>Personal next-day model</Text>
            <View style={{ marginTop: 8 }}>
              <Button title="Open" variant="secondary" onPress={() => router.push("/insights/risk" as any)} />
            </View>
          </GlassCard>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 14 }}
        >
          {slides.map((s, idx) => (
            <View key={s.title} style={{ width: WIDTH - 36, marginRight: idx === slides.length - 1 ? 0 : 12 }}>
              <GlassCard>
                <Text style={{ fontSize: 18, fontWeight: "800", color: c.text.primary }}>{s.title}</Text>
                <Text style={{ marginTop: 8, color: c.text.secondary }}>{s.desc}</Text>
                <View style={{ marginTop: 12 }}>
                  <Button
                    title={s.cta}
                    variant={s.variant ?? "secondary"}
                    onPress={() => router.push({ pathname: s.route, params: { date: today } } as any)}
                  />
                </View>
              </GlassCard>
            </View>
          ))}
        </ScrollView>

        <View style={{ marginTop: 16, gap: 12 }}>
          <GlassCard>
            <Text style={{ fontSize: 16, fontWeight: "800", color: c.text.primary }}>
              Analytics
            </Text>
            <Text style={{ marginTop: 6, color: c.text.secondary }}>
              Report-friendly stats for pilot evaluation.
            </Text>

            <View style={{ marginTop: 12 }}>
              <Button
                title="View analytics"
                variant="secondary"
                onPress={() => router.push("/insights/analytics" as any)}
                accessibilityLabel="View analytics"
              />
            </View>
          </GlassCard>
          <GlassCard padding="base">
            <Text style={{ fontSize: 14, fontWeight: "800", color: c.text.primary }}>
              Transparency
            </Text>
            <Text style={{ marginTop: 6, color: c.text.secondary }}>
              Patterns are observational. Confidence reflects missing signals. No diagnoses are made.
            </Text>
          </GlassCard>
        </View>
      </Screen>
    </TabSwipe>
  );
}
