import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { router } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { listDailyRecords, listFutureEventsByDate, listUpcomingEvents } from "@/lib/storage";
import type { ISODate } from "@/lib/types";
import { todayISO } from "@/lib/util/todayISO";

type Marked = Record<string, any>;

function formatSelected(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export default function CalendarScreen() {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? Colors.dark : Colors.light;
  const [selected, setSelected] = useState<ISODate>(todayISO());
  const [dataDates, setDataDates] = useState<ISODate[]>([]);
  const [eventsForDay, setEventsForDay] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const records = await listDailyRecords();
      setDataDates(records.filter((r) => !!r.wearable || !!r.lbi).map((r) => r.date));
      setUpcoming(await listUpcomingEvents(todayISO(), 30));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setEventsForDay(await listFutureEventsByDate(selected));
    })();
  }, [selected]);

  const marked: Marked = useMemo(() => {
    const m: Marked = {};
    dataDates.forEach((d) => {
      m[d] = { ...(m[d] || {}), marked: true, dotColor: c.accent.primary };
    });
    upcoming.forEach((e) => {
      m[e.dateISO] = { ...(m[e.dateISO] || {}), selectedColor: c.accent.primaryLight, selected: true };
    });
    m[selected] = { ...(m[selected] || {}), selected: true, selectedColor: c.accent.primary };
    return m;
  }, [dataDates, upcoming, selected, c]);

  const onDayPress = (d: DateData) => {
    const iso = d.dateString as ISODate;
    setSelected(iso);
    const today = todayISO();
    if (iso > today) router.push(`/calendar/future/${iso}` as any);
    else router.push(`/day/${iso}` as any);
  };

  return (
    <Screen scroll>
      <Text style={[styles.title, { color: c.text.primary }]}>Calendar</Text>
      <Text style={[styles.subtitle, { color: c.text.secondary }]}>Review past days and plan ahead.</Text>

      <GlassCard padding="base" style={{ marginTop: Spacing.md, borderRadius: BorderRadius.xxl }}>
        <Calendar
          onDayPress={onDayPress}
          markedDates={marked}
          theme={{
            backgroundColor: "transparent",
            calendarBackground: "transparent",
            monthTextColor: c.text.primary,
            textSectionTitleColor: c.text.secondary,
            dayTextColor: c.text.primary,
            todayTextColor: c.accent.primaryLight,
            selectedDayBackgroundColor: c.accent.primary,
            selectedDayTextColor: c.text.inverse,
            textDisabledColor: c.text.tertiary,
            arrowColor: c.accent.primary,
          }}
        />
      </GlassCard>

      <GlassCard style={{ marginTop: Spacing.md }}>
        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>
          {formatSelected(selected)}
        </Text>

        <View style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
          {eventsForDay.length === 0 ? (
            <Text style={{ color: c.text.secondary, fontSize: 14 }}>
              {selected === todayISO() ? "Tap a day to view details." : "No events for this day."}
            </Text>
          ) : (
            eventsForDay.map((e) => (
              <View key={e.id} style={[styles.eventRow, { borderColor: c.border.light }]}>
                <View style={[styles.impactDot, {
                  backgroundColor: e.impactLevel === "high" ? c.danger : e.impactLevel === "medium" ? c.warning : c.success,
                }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 14 }}>{e.title}</Text>
                  <Text style={{ color: c.text.secondary, fontSize: 12 }}>{e.impactLevel} impact</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.3 },
  subtitle: { marginTop: 4, fontSize: 14, marginBottom: 4 },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  impactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
