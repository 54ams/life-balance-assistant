import React, { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";

import type { ISODate } from "@/lib/types";
import { formatDisplayDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";

function todayISO(): ISODate {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}` as ISODate;
}

export function InsightsDatePicker({
  date,
  onChange,
  allowToday = true,
  title = "Date",
  helperText,
}: {
  date: ISODate;
  onChange: (d: ISODate) => void;
  allowToday?: boolean;
  title?: string;
  helperText?: string;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? "light"];
  const [open, setOpen] = useState(false);
  const today = useMemo(() => todayISO(), []);
  const maxDate = today;

  const marked = useMemo(() => ({ [date]: { selected: true } }), [date]);

  return (
    <GlassCard style={{ padding: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ color: colors.text.primary, fontSize: 14, fontWeight: "700" }}>{title}</Text>
          <Text style={{ color: colors.text.tertiary, fontSize: 12, marginTop: 2 }}>
            {formatDisplayDate(date)}
          </Text>
          {helperText ? (
            <Text style={{ color: colors.text.tertiary, fontSize: 12, marginTop: 6 }}>{helperText}</Text>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {allowToday ? (
            <Button
              variant="secondary"
              onPress={() => onChange(today)}
              title="Today"
            />
          ) : null}
          <Button onPress={() => setOpen(true)} title="Pick date" />
        </View>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "center",
            padding: 16,
          }}
          onPress={() => setOpen(false)}
        >
          <Pressable onPress={() => {}} style={{}}>
            <View
              style={{
                backgroundColor: colors.glass.primary,
                borderRadius: 18,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border.medium,
              }}
            >
              <Text style={{ color: colors.text.primary, fontSize: 14, fontWeight: "700", marginBottom: 8 }}>
                Select a past date
              </Text>

              <Calendar
                current={date}
                maxDate={maxDate}
                markedDates={marked}
                onDayPress={(day) => {
                  const selected = day.dateString as ISODate;
                  if (selected > maxDate) return;
                  onChange(selected);
                  setOpen(false);
                }}
                theme={{
                  calendarBackground: colors.glass.primary,
                  dayTextColor: colors.text.primary,
                  monthTextColor: colors.text.primary,
                  textSectionTitleColor: colors.text.tertiary,
                  selectedDayBackgroundColor: colors.accent.primary,
                  selectedDayTextColor: colors.background,
                  todayTextColor: colors.accent.primary,
                  arrowColor: colors.accent.primary,
                }}
              />

              <View style={{ marginTop: 10 }}>
                <Button variant="secondary" onPress={() => setOpen(false)} title="Close" />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </GlassCard>
  );
}
