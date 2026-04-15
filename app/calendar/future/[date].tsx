import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Colors } from "@/constants/Colors";
import { addFutureEvent, deleteFutureEvent, listFutureEventsByDate } from "@/lib/storage";
import type { ISODate } from "@/lib/types";

const impacts = ["low", "medium", "high"] as const;

export default function FutureEventScreen() {
  const params = useLocalSearchParams<{ date: ISODate }>();
  const date = params?.date as ISODate;
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const glassOverlay = isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.10)";

  const [title, setTitle] = useState("");
  const [impactLevel, setImpactLevel] = useState<typeof impacts[number]>("medium");
  const [tags, setTags] = useState("");
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!date) return;
    (async () => {
      setEvents(await listFutureEventsByDate(date));
    })();
  }, [date]);

  const save = async () => {
    if (!title.trim() || !date) return;
    await addFutureEvent({
      id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      dateISO: date,
      title: title.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      impactLevel,
    });
    setTitle("");
    setTags("");
    setEvents(await listFutureEventsByDate(date));
    Alert.alert("Saved", "Event saved for this date.");
  };

  const remove = async (id: string) => {
    await deleteFutureEvent(id);
    setEvents(await listFutureEventsByDate(date));
  };

  return (
    <Screen scroll title="Future context" subtitle={date}>
      <GlassCard>
        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Add context</Text>
        <TextInput
          placeholder="e.g., Travel day, Big presentation"
          placeholderTextColor={c.text.tertiary}
          style={[styles.input, { borderColor: c.glass.border, color: c.text.primary }]}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={{ color: c.text.tertiary, marginTop: 8 }}>Impact</Text>
        <View style={styles.row}>
          {impacts.map((lvl) => (
            <Pressable
              key={lvl}
              onPress={() => setImpactLevel(lvl)}
              style={[
                styles.chip,
                {
                  borderColor: c.glass.border,
                  backgroundColor: impactLevel === lvl ? glassOverlay : "transparent",
                },
              ]}
            >
              <Text style={{ color: c.text.primary, fontWeight: "700" }}>{lvl}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          placeholder="Tags (comma separated)"
          placeholderTextColor={c.text.tertiary}
          style={[styles.input, { borderColor: c.glass.border, color: c.text.primary }]}
          value={tags}
          onChangeText={setTags}
        />

        <View style={{ marginTop: 10 }}>
          <Button title="Save" onPress={save} />
        </View>
      </GlassCard>

      <View style={{ height: 12 }} />

      <GlassCard>
        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Saved for this day</Text>
        {events.length === 0 ? (
          <Text style={{ color: c.text.tertiary, marginTop: 8 }}>No events yet.</Text>
        ) : (
          <View style={{ marginTop: 10, gap: 10 }}>
            {events.map((e) => (
              <View key={e.id} style={styles.eventRow}>
                <View>
                  <Text style={{ color: c.text.primary, fontWeight: "700" }}>{e.title}</Text>
                  <Text style={{ color: c.text.tertiary, marginTop: 2 }}>
                    {e.impactLevel} impact {e.tags?.length ? `• ${e.tags.join(", ")}` : ""}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Delete event"
                  onPress={() => remove(e.id)}
                  style={({ pressed }) => [{ padding: 8 }, pressed && { opacity: 0.7 }]}
                >
                  <Text style={{ color: c.danger, fontWeight: "800" }}>Delete</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 8,
  },
});
