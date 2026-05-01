import { Stack, router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useColorScheme } from "react-native";

import type { ISODate } from "@/lib/types";
import { getAllDays } from "@/lib/storage";
import { sliceRecordsUpTo } from "@/lib/range";
import { computeConsistency } from "@/lib/consistency";
import { getInsightsSelectedDate, setInsightsSelectedDate } from "@/lib/insightsDate";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { formatDisplayDate } from "@/lib/date";
import { todayISO } from "@/lib/util/todayISO";

function Bar({ label, value, c }: { label: string; value: number; c: typeof import("@/constants/Colors").Colors.light }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: c.text.primary, fontWeight: "700" }}>{label}</Text>
        <Text style={{ color: c.text.tertiary }}>{value}%</Text>
      </View>
      <View style={{ height: 10, borderRadius: 999, backgroundColor: c.border.medium }}>
        <View style={{ width: `${value}%`, height: 10, borderRadius: 999, backgroundColor: c.accent.primary }} />
      </View>
    </View>
  );
}

export default function ConsistencyScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [date, setDate] = useState<ISODate>(todayISO());
  const [days, setDays] = useState<import("@/lib/types").DailyRecord[]>([]);

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

  const load = useCallback(async () => {
    const all = await getAllDays();
    setDays(all);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const windowed = useMemo(() => sliceRecordsUpTo(days, date, 14), [days, date]);
  const out = useMemo(() => computeConsistency(windowed), [windowed]);

  const hasAny = windowed.length > 0;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />

      <ScreenHeader
        title="Consistency"
        subtitle="How consistent your daily patterns are (last 14 days)"
        fallback="/insights"
      />

      <View style={{ gap: 12 }}>
        <InsightsDatePicker
          date={date}
          onChange={setDate}
          title="As of"
          helperText="Consistency uses the last 14 days up to the selected date."
        />

        {!hasAny ? (
          <GlassCard style={{ padding: 14 }}>
            <Text style={{ color: c.text.primary, fontWeight: "800" }}>No data in this window</Text>
            <Text style={{ color: c.text.secondary, marginTop: 6 }}>
              There are no saved records in the 14 days up to {formatDisplayDate(date)}.
            </Text>
          </GlassCard>
        ) : (
          <>
            <GlassCard style={{ padding: 14 }}>
              <Text style={{ color: c.text.primary, fontWeight: "900", fontSize: 18 }}>
                Consistency score: {out.score} / 100
              </Text>
              <Text style={{ color: c.text.secondary, marginTop: 6 }}>
                Higher = more stable sleep/recovery + more regular tracking (not “better mood”).
              </Text>

              {out.notes.length ? (
                <View style={{ marginTop: 10, gap: 6 }}>
                  {out.notes.map((n, i) => (
                    <Text key={i} style={{ color: c.text.secondary }}>
                      • {n}
                    </Text>
                  ))}
                </View>
              ) : null}
            </GlassCard>

            <GlassCard style={{ padding: 14, gap: 16 }}>
              <Text style={{ color: c.text.primary, fontWeight: "800" }}>Components</Text>
              <Bar label="Sleep consistency" value={out.components.sleepConsistency} c={c} />
              <Bar label="Recovery consistency" value={out.components.recoveryConsistency} c={c} />
              <Bar label="Mood stability" value={out.components.moodStability} c={c} />
              <Bar label="Check-in regularity" value={out.components.checkInRegularity} c={c} />
              <Bar label="Wearable regularity" value={out.components.wearableRegularity} c={c} />
            </GlassCard>
          </>
        )}

        <Pressable onPress={() => router.push("/profile/settings/notifications" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
          <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>Set up reminders →</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/insights/trends" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
          <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>See your trends →</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
