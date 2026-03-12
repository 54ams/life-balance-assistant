import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { todayISO } from "@/lib/util/todayISO";

type DayItem = { date: string; hasData?: boolean; hasEvent?: boolean };

export function WeeklyStrip({ events = [], dataDates = [] }: { events?: string[]; dataDates?: string[] }) {
  const scheme = useColorScheme();
  const t = scheme === "dark" ? Colors.dark : Colors.light;
  const router = useRouter();
  const today = todayISO();
  const items = useMemo(() => {
    const arr: DayItem[] = [];
    const now = new Date(today);
    for (let i = -3; i <= 3; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      arr.push({
        date: iso,
        hasData: dataDates.includes(iso),
        hasEvent: events.includes(iso),
      });
    }
    return arr;
  }, [today, events, dataDates]);

  return (
    <View style={[styles.wrap, { backgroundColor: t.glass.primary, borderColor: t.glass.border }]}>
      {items.map((d) => {
        const isToday = d.date === today;
        return (
          <Pressable
            key={d.date}
            onPress={() => {
              if (d.date > today) router.push(`/calendar/future/${d.date}` as any);
              else router.push(`/day/${d.date}` as any);
            }}
            style={({ pressed }) => [
              styles.day,
              { borderColor: t.glass.border, backgroundColor: d.hasData ? t.glass.secondary : "transparent" },
              isToday && { backgroundColor: t.accent.primary, shadowColor: t.accent.primary, shadowOpacity: 0.3 },
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${d.date}`}
          >
            <Text style={{ color: t.text.primary, fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.sm }}>
              {d.date.slice(8, 10)}
            </Text>
            <View style={styles.dots}>
              {d.hasData ? <View style={[styles.dot, { backgroundColor: t.accent.primary }]} /> : null}
              {d.hasEvent ? <View style={[styles.ring, { borderColor: t.text.tertiary }]} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  day: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  dots: { flexDirection: "row", gap: Spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3 },
  ring: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
});
