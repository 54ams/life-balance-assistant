import React from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";

interface DayData {
  date: string; // ISO
  value: number; // 0–100
}

interface HeatmapCalendarProps {
  data: DayData[];
  weeks?: number;
  onDayPress?: (date: string) => void;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const CELL_SIZE = 18;
const GAP = 3;

function scoreToColor(value: number, isDark: boolean): string {
  if (value >= 80) return isDark ? "#57D6A4" : "#2FA37A";
  if (value >= 65) return isDark ? "#7FE0BC" : "#5DBD9A";
  if (value >= 50) return isDark ? "#E0B278" : "#C2824A";
  if (value >= 35) return isDark ? "#C88A6B" : "#B87C5E";
  return isDark ? "#E08078" : "#B2423A";
}

export function HeatmapCalendar({ data, weeks = 8, onDayPress }: HeatmapCalendarProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  // Build grid: weeks x 7 days, ending at today
  const today = new Date();
  const totalDays = weeks * 7;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - totalDays + 1);

  const dataMap = new Map(data.map((d) => [d.date, d.value]));

  const grid: { date: string; value: number | null; isToday: boolean }[][] = [];
  const cursor = new Date(startDate);
  // Adjust to Monday
  const dayOfWeek = cursor.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  cursor.setDate(cursor.getDate() + mondayOffset);

  for (let w = 0; w < weeks; w++) {
    const week: typeof grid[0] = [];
    for (let d = 0; d < 7; d++) {
      const iso = cursor.toISOString().slice(0, 10);
      const isToday = iso === today.toISOString().slice(0, 10);
      const isFuture = cursor > today;
      week.push({
        date: iso,
        value: isFuture ? null : (dataMap.get(iso) ?? null),
        isToday,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    grid.push(week);
  }

  // Month labels
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  grid.forEach((week, wi) => {
    const firstDay = new Date(week[0].date);
    if (firstDay.getMonth() !== lastMonth) {
      lastMonth = firstDay.getMonth();
      monthLabels.push({
        label: firstDay.toLocaleDateString("en-GB", { month: "short" }),
        weekIndex: wi,
      });
    }
  });

  return (
    <View>
      {/* Month labels row */}
      <View style={{ flexDirection: "row", marginBottom: 4, marginLeft: 20 }}>
        {monthLabels.map((m, i) => (
          <Text
            key={i}
            style={{
              position: "absolute",
              left: m.weekIndex * (CELL_SIZE + GAP),
              fontSize: 10,
              color: c.text.tertiary,
              fontWeight: "600",
            }}
          >
            {m.label}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: "row", marginTop: 14 }}>
        {/* Day labels */}
        <View style={{ gap: GAP, marginRight: 4, justifyContent: "center" }}>
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={{ height: CELL_SIZE, justifyContent: "center" }}>
              {i % 2 === 0 ? (
                <Text style={{ fontSize: 9, color: c.text.tertiary, fontWeight: "600" }}>{label}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Grid */}
        <View style={{ flexDirection: "row", gap: GAP }}>
          {grid.map((week, wi) => (
            <View key={wi} style={{ gap: GAP }}>
              {week.map((day, di) => {
                const isEmpty = day.value === null;
                const bg = isEmpty
                  ? isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"
                  : scoreToColor(day.value!, isDark);

                return (
                  <Pressable
                    key={di}
                    onPress={() => !isEmpty && onDayPress?.(day.date)}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: 4,
                      backgroundColor: bg,
                      opacity: isEmpty ? 0.5 : 1,
                      borderWidth: day.isToday ? 2 : 0,
                      borderColor: day.isToday ? c.accent.primary : "transparent",
                    }}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 8, gap: 4 }}>
        <Text style={{ fontSize: 9, color: c.text.tertiary }}>Low</Text>
        {[35, 50, 65, 80].map((v) => (
          <View
            key={v}
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              backgroundColor: scoreToColor(v, isDark),
            }}
          />
        ))}
        <Text style={{ fontSize: 9, color: c.text.tertiary }}>High</Text>
      </View>
    </View>
  );
}
