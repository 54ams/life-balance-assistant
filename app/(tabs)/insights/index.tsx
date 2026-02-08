import { router } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { ISODate } from "@/lib/types";
import { TabSwipe } from "@/components/TabSwipe";

const TAB_ORDER = ["/", "/checkin", "/insights", "/history", "/profile"] as const;

function todayISO(): ISODate {
  return new Date().toISOString().slice(0, 10) as ISODate;
}

export default function InsightsHome() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"] as any;
  const today = todayISO();

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll>
      <Text style={{ fontSize: 26, fontWeight: "800", color: c.text }}>
        Insights
      </Text>
      <Text style={{ marginTop: 6, color: c.muted }}>
        Explainability, patterns, and data quality.
      </Text>

      <View style={{ marginTop: 16, gap: 12 }}>
        <GlassCard>
          <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>
            Integration
          </Text>
          <Text style={{ marginTop: 6, color: c.muted }}>
            See which signals were used today, what was missing, and how confident the system is.
          </Text>

          <View style={{ marginTop: 12 }}>
            <Button
              title="Open integration"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: "/insights/integration", params: { date: today } } as any)
              }
            />
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>
            Why this score
          </Text>
          <Text style={{ marginTop: 6, color: c.muted }}>
            See what drove today’s Life Balance Index and where uncertainty comes from.
          </Text>

          <View style={{ marginTop: 12 }}>
            <Button
              title="Open explainability"
              variant="primary"
              onPress={() =>
                router.push({ pathname: "/insights/explain", params: { date: today } } as any)
              }
            />
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>
            Patterns
          </Text>
          <Text style={{ marginTop: 6, color: c.muted }}>
            Simple group comparisons (sleep vs LBI, stress vs LBI, recovery risk) over your history.
          </Text>

          <View style={{ marginTop: 12 }}>
            <Button
              title="View patterns"
              variant="secondary"
              onPress={() => router.push("/insights/patterns" as any)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>
            Trends
          </Text>
          <Text style={{ marginTop: 6, color: c.muted }}>
            Visualise your Life Balance Index over time and spot changes against your baseline.
          </Text>

          <View style={{ marginTop: 12 }}>
            <Button
              title="View trends"
              variant="secondary"
              onPress={() => router.push("/insights/trends" as any)}
            />
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>
            Consistency
          </Text>
          <Text style={{ marginTop: 6, color: c.muted }}>
            A stability score across sleep/recovery variation and tracking regularity (last 14 days).
          </Text>

          <View style={{ marginTop: 12 }}>
            <Button title="View consistency" onPress={() => router.push("/insights/consistency" as any)} />
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>
            Correlations
          </Text>
          <Text style={{ marginTop: 6, color: c.muted }}>
            Guided relationships between wearable signals and check-ins (last 30 days).
          </Text>

          <View style={{ marginTop: 12 }}>
            <Button title="Explore correlations" onPress={() => router.push("/insights/correlations" as any)} />
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>
            Wearables
          </Text>
          <Text style={{ marginTop: 6, color: c.muted }}>
            Import daily metrics to improve accuracy of your Life Balance Index.
          </Text>

          <View style={{ marginTop: 12 }}>
            <Button
              title="Import CSV"
              variant="secondary"
              onPress={() => router.push("/insights/import-wearables" as any)}
            />
          </View>
        </GlassCard>


        <GlassCard>
          <Text style={{ fontSize: 16, fontWeight: "800", color: c.text }}>
            Analytics
          </Text>
          <Text style={{ marginTop: 6, color: c.muted }}>
            Generate report-friendly statistics and correlations from your pilot dataset.
          </Text>

          <View style={{ marginTop: 12 }}>
            <Button
              title="View analytics"
              variant="secondary"
              onPress={() => router.push("/insights/analytics" as any)}
            />
          </View>
        </GlassCard>
        <GlassCard padding={12}>
          <Text style={{ fontSize: 14, fontWeight: "800", color: c.text }}>
            Report angle
          </Text>
          <Text style={{ marginTop: 6, color: c.muted }}>
            This app emphasises transparency: users can inspect drivers and uncertainty rather than trusting a black-box score.
          </Text>
        </GlassCard>
      </View>
    </Screen>
    </TabSwipe>
  );
}