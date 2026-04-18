import { Stack, router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { FlipCard } from "@/components/ui/FlipCard";
import { WorkingPanel } from "@/components/ui/WorkingPanel";
import { ShowWorkingToggle } from "@/components/ui/ShowWorkingToggle";
import { useShowWorking } from "@/hooks/useShowWorking";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { getInsightsSelectedDate, setInsightsSelectedDate } from "@/lib/insightsDate";
import { getAllDays } from "@/lib/storage";
import { buildPatterns, type Pattern } from "@/lib/explain";
import type { ISODate } from "@/lib/types";
import { todayISO } from "@/lib/util/todayISO";

export default function PatternsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"] as any;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Pattern[]>([]);
  const [date, setDate] = useState<ISODate>(todayISO());
  const working = useShowWorking(false);

  useEffect(() => {
    (async () => {
      const saved = await getInsightsSelectedDate();
      setDate(saved);
    })();
  }, []);

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

      <Text style={{ fontSize: 26, fontWeight: "800", color: c.text.primary }}>
        Patterns
      </Text>
      <Text style={{ marginTop: 6, color: c.text.secondary }}>
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
        <Text style={{ color: c.text.primary, fontWeight: "800" }}>
          Why you can trust these
        </Text>
        <Text style={{ marginTop: 8, color: c.text.secondary }}>
          Nothing here is a black box. They're simple averages and counts from your own data, so you can see exactly how each one was worked out.
        </Text>
      </GlassCard>

      {!loading && items.some((it) => it.working) ? (
        <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "flex-end" }}>
          <ShowWorkingToggle value={working.globalShow} onToggle={working.toggleGlobal} />
        </View>
      ) : null}

      <View style={{ marginTop: 14, gap: 12 }}>
        {loading ? (
          <GlassCard>
            <Text style={{ color: c.text.primary, fontWeight: "700" }}>Loading…</Text>
            <Text style={{ marginTop: 6, color: c.text.secondary }}>
              Calculating simple relationships from recent days.
            </Text>
          </GlassCard>
        ) : (
          items.map((it, i) => {
            const id = `pat-${i}`;
            const flipped = working.isFlipped(id);
            const hasWorking = !!it.working;

            if (!hasWorking) {
              return (
                <GlassCard key={id}>
                  <Text style={{ color: c.text.primary, fontWeight: "900" }}>{it.title}</Text>
                  <Text style={{ marginTop: 8, color: c.text.secondary }}>{it.detail}</Text>
                </GlassCard>
              );
            }

            return (
              <FlipCard
                key={id}
                flipped={flipped}
                onToggle={() => working.toggleTile(id)}
                flipDelayMs={flipped !== working.globalShow ? 0 : i * 40}
                accessibilityLabel={`${it.title}. Tap to ${flipped ? "hide" : "show"} the maths.`}
                front={
                  <GlassCard>
                    <Text style={{ color: c.text.primary, fontWeight: "900" }}>{it.title}</Text>
                    <Text style={{ marginTop: 8, color: c.text.secondary }}>{it.detail}</Text>
                    <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 10, textAlign: "right", fontWeight: "600" }}>
                      Tap to show the maths
                    </Text>
                  </GlassCard>
                }
                back={
                  <WorkingPanel
                    summary={it.working!.summary}
                    inputs={it.working!.inputs}
                    method={it.working!.method}
                    result={it.working!.result}
                    footnote={it.working!.footnote}
                  />
                }
              />
            );
          })
        )}
      </View>

      <View style={{ marginTop: 14 }}>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
