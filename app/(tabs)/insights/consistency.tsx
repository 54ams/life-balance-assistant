import { Stack } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

import type { ISODate } from "@/lib/types";
import { getAllDays } from "@/lib/storage";
import { sliceRecordsUpTo } from "@/lib/range";
import { computeConsistency } from "@/lib/consistency";
import { getInsightsSelectedDate, setInsightsSelectedDate } from "@/lib/insightsDate";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { formatDisplayDate } from "@/lib/date";

function Bar({ label, value, c }: { label: string; value: number; c: any }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: c.text, fontWeight: "700" }}>{label}</Text>
        <Text style={{ color: c.icon }}>{value}%</Text>
      </View>
      <View style={{ height: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.10)" }}>
        <View style={{ width: `${value}%`, height: 10, borderRadius: 999, backgroundColor: c.tint }} />
      </View>
    </View>
  );
}

export default function ConsistencyScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"] as any;

  const [date, setDate] = useState<ISODate>(new Date().toISOString().slice(0, 10) as ISODate);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<any[]>([]);

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
    setLoading(true);
    try {
      const all = await getAllDays();
      setDays(all);
    } finally {
      setLoading(false);
    }
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
    <Screen title="Consistency" subtitle="Routine stability and signal regularity (last 14 days)">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ gap: 12 }}>
        <InsightsDatePicker
          date={date}
          onChange={setDate}
          title="As of"
          helperText="Consistency uses the last 14 days up to the selected date."
        />

        {!hasAny ? (
          <GlassCard style={{ padding: 14 }}>
            <Text style={{ color: c.text, fontWeight: "800" }}>No data in this window</Text>
            <Text style={{ color: c.icon, marginTop: 6 }}>
              There are no saved records in the 14 days up to {formatDisplayDate(date)}.
            </Text>
          </GlassCard>
        ) : (
          <>
            <GlassCard style={{ padding: 14 }}>
              <Text style={{ color: c.text, fontWeight: "900", fontSize: 18 }}>
                Consistency score: {out.score} / 100
              </Text>
              <Text style={{ color: c.icon, marginTop: 6 }}>
                Higher = more stable sleep/recovery + more regular tracking (not “better mood”).
              </Text>

              {out.notes.length ? (
                <View style={{ marginTop: 10, gap: 6 }}>
                  {out.notes.map((n, i) => (
                    <Text key={i} style={{ color: c.icon }}>
                      • {n}
                    </Text>
                  ))}
                </View>
              ) : null}
            </GlassCard>

            <GlassCard style={{ padding: 14, gap: 14 }}>
              <Text style={{ color: c.text, fontWeight: "800" }}>Components</Text>
              <Bar label="Sleep consistency" value={out.components.sleepConsistency} c={c} />
              <Bar label="Recovery consistency" value={out.components.recoveryConsistency} c={c} />
              <Bar label="Mood stability" value={out.components.moodStability} c={c} />
              <Bar label="Check-in regularity" value={out.components.checkInRegularity} c={c} />
              <Bar label="Wearable regularity" value={out.components.wearableRegularity} c={c} />
            </GlassCard>
          </>
        )}
      </View>
    </Screen>
  );
}
