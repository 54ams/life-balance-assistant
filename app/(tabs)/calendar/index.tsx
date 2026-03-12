import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { router } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import { Typography } from "@/constants/Typography";
import { Spacing } from "@/constants/Spacing";
import { listDailyRecords, listFutureEventsByDate, listUpcomingEvents } from "@/lib/storage";
import type { ISODate } from "@/lib/types";
import { todayISO } from "@/lib/util/todayISO";

type Marked = Record<string, any>;

export default function CalendarScreen() {
  const scheme = useColorScheme();
  const t = scheme === "dark" ? Colors.dark : Colors.light;
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
      m[d] = { ...(m[d] || {}), marked: true, dotColor: t.accent.primary };
    });
    upcoming.forEach((e) => {
      m[e.dateISO] = { ...(m[e.dateISO] || {}), selectedColor: t.accent.primaryLight, selected: true };
    });
    m[selected] = { ...(m[selected] || {}), selected: true, selectedColor: t.accent.primary };
    return m;
  }, [dataDates, upcoming, selected, t]);

  const onDayPress = (d: DateData) => {
    const iso = d.dateString as ISODate;
    setSelected(iso);
    const today = todayISO();
    if (iso > today) router.push(`/calendar/future/${iso}` as any);
    else router.push(`/day/${iso}` as any);
  };

  return (
    <Screen scroll title="Calendar" subtitle="Review past days, plan future context">
      <GlassCard padding="base" style={{ borderRadius: 20 }}>
        <Calendar
          onDayPress={onDayPress}
          markedDates={marked}
          theme={{
            backgroundColor: "transparent",
            calendarBackground: "transparent",
            monthTextColor: t.text.primary,
            textSectionTitleColor: t.text.secondary,
            dayTextColor: t.text.primary,
            todayTextColor: t.accent.primaryLight,
            selectedDayBackgroundColor: t.accent.primary,
            selectedDayTextColor: t.text.inverse,
          }}
        />
      </GlassCard>

      <View style={{ height: Spacing.sm }} />

      <GlassCard>
        <Text style={{ color: t.text.primary, fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.lg }}>Selected day</Text>
        <Text style={{ color: t.text.secondary, marginTop: Spacing.xs }}>{selected}</Text>

        <View style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
          {eventsForDay.length === 0 ? (
            <Text style={{ color: t.text.secondary }}>No future events tagged.</Text>
          ) : (
            eventsForDay.map((e) => (
              <View key={e.id} style={styles.eventRow}>
                <Text style={{ color: t.text.primary, fontWeight: Typography.fontWeight.bold }}>{e.title}</Text>
                <Text style={{ color: t.text.secondary }}>{e.impactLevel} impact</Text>
              </View>
            ))
          )}
        </View>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eventRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
});
