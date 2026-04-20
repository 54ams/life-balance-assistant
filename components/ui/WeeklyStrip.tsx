import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { todayISO } from "@/lib/util/todayISO";

type DayItem = { date: string; dayName: string; dayNum: string; hasData?: boolean; hasEvent?: boolean };

const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyStrip({ events = [], dataDates = [] }: { events?: string[]; dataDates?: string[] }) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const t = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const today = todayISO();

  const items = useMemo(() => {
    const arr: DayItem[] = [];
    const now = new Date(today + "T00:00:00");
    // Show Mon–Sun of the current week
    const dayOfWeek = now.getDay(); // 0=Sun .. 6=Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + mondayOffset + i);
      const iso = d.toISOString().slice(0, 10);
      arr.push({
        date: iso,
        dayName: SHORT_DAYS[i],
        dayNum: d.getDate().toString(),
        hasData: dataDates.includes(iso),
        hasEvent: events.includes(iso),
      });
    }
    return arr;
  }, [today, events, dataDates]);

  return (
    <View style={styles.container}>
      {/* Day name row */}
      <View style={styles.row}>
        {items.map((d) => (
          <View key={d.date + "-label"} style={styles.cell}>
            <Text style={[styles.dayLabel, { color: d.date === today ? t.accent.primary : t.text.tertiary }]}>
              {d.dayName}
            </Text>
          </View>
        ))}
      </View>
      {/* Date number row */}
      <View style={styles.row}>
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
                styles.dateCell,
                isToday && [styles.todayCell, { backgroundColor: t.accent.primary }],
                !isToday && d.hasData && { backgroundColor: "rgba(0,0,0,0.04)" },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`View ${d.date}`}
            >
              <Text
                style={[
                  styles.dateNum,
                  { color: isToday ? "#fff" : d.hasData ? t.text.primary : t.text.tertiary },
                ]}
              >
                {d.dayNum}
              </Text>
              {d.hasData && !isToday && <View style={[styles.dot, { backgroundColor: t.accent.primary }]} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cell: {
    flex: 1,
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: BorderRadius.md,
    gap: 2,
  },
  todayCell: {
    shadowColor: "#7C6FDC",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  dateNum: {
    fontSize: 15,
    fontWeight: "800",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
