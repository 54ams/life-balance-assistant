import { Stack, router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getInsightsSelectedDate, setInsightsSelectedDate } from "@/lib/insightsDate";
import { getAllDays } from "@/lib/storage";
import { buildPatterns } from "@/lib/explain";
import type { ISODate } from "@/lib/types";

export default function PatternsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"] as any;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<{ title: string; detail: string }[]>([]);
  const [date, setDate] = useState<ISODate>(new Date().toISOString().slice(0,10) as ISODate);

  // Load persisted selected date once
  useEffect(() => {
    (async () => {
      const saved = await getInsightsSelectedDate();
      setDate(saved);
    })();
  }, []);

  // Persist when user changes date
  useEffect(() => {
    (async () => {
      await setInsightsSelectedDate(date);
    })();
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const days = (await getAllDays()).filter((d) => d.date <= date);
        const insights = buildPatterns(days.slice(-30));
        if (!alive) return;
        setItems(insights);
        setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [date])
  );

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: "Patterns", headerShown: false }} />

      <Text style={{ fontSize: 26, fontWeight: "800", color: c.text }}>
        Patterns
      </Text>
      <Text style={{ marginTop: 6, color: c.muted }}>
        Simple, defensible comparisons from your last 30 days.
      </Text>

      <View style={{ marginTop: 14 }}>
        <InsightsDatePicker
          date={date}
          onChange={setDate}
          title="As of"
          helperText="Patterns are calculated from the 30 days leading up to the selected date."
        />
      </View>

      <GlassCard style={{ marginTop: 14 }}>
        <Text style={{ color: c.text, fontWeight: "800" }}>
          Why this matters (viva-ready)
        </Text>
        <Text style={{ marginTop: 8, color: c.muted }}>
          These insights are intentionally transparent: group averages and counts, not opaque AI. That makes them easier to validate and ethically safer for wellbeing support.
        </Text>
      </GlassCard>

      <View style={{ marginTop: 14, gap: 12 }}>
        {loading ? (
          <GlassCard>
            <Text style={{ color: c.text, fontWeight: "700" }}>Loading…</Text>
            <Text style={{ marginTop: 6, color: c.muted }}>
              Calculating simple relationships from recent days.
            </Text>
          </GlassCard>
        ) : (
          items.map((it, i) => (
            <GlassCard key={i}>
              <Text style={{ color: c.text, fontWeight: "900" }}>{it.title}</Text>
              <Text style={{ marginTop: 8, color: c.muted }}>{it.detail}</Text>
            </GlassCard>
          ))
        )}
      </View>

      <View style={{ marginTop: 14 }}>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
