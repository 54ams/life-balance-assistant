import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Colors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";
import { getSchedule, saveSchedule, type RecurringItem } from "@/lib/schedule";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function randomId() {
  return Math.random().toString(36).slice(2);
}

export default function ScheduleScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;

  const [items, setItems] = useState<RecurringItem[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newDays, setNewDays] = useState<number[]>([]);
  const [newKind, setNewKind] = useState<"demand" | "resource">("demand");

  useEffect(() => {
    (async () => setItems(await getSchedule()))();
  }, []);

  const toggleDay = (d: number) => {
    setNewDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const addItem = async () => {
    if (!newLabel.trim()) {
      Alert.alert("Schedule", "Enter a label for this recurring item.");
      return;
    }
    if (newDays.length === 0) {
      Alert.alert("Schedule", "Select at least one day.");
      return;
    }
    const item: RecurringItem = {
      id: randomId(),
      label: newLabel.trim(),
      daysOfWeek: [...newDays].sort(),
      kind: newKind,
    };
    const updated = [...items, item];
    setItems(updated);
    await saveSchedule(updated);
    setNewLabel("");
    setNewDays([]);
  };

  const removeItem = async (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    await saveSchedule(updated);
  };

  return (
    <Screen scroll title="My Schedule" subtitle="Set your recurring weekly commitments">
      {/* Existing items */}
      {items.map((item) => (
        <GlassCard key={item.id} style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>
                {item.label}
              </Text>
              <View style={{ flexDirection: "row", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                {item.daysOfWeek.map((d) => (
                  <View
                    key={d}
                    style={[styles.dayChip, { backgroundColor: c.accent.primary }]}
                  >
                    <Text style={styles.dayChipText}>{DAYS[d]}</Text>
                  </View>
                ))}
                <View
                  style={[
                    styles.dayChip,
                    { backgroundColor: item.kind === "demand" ? "#FF9500" : "#34C759" },
                  ]}
                >
                  <Text style={styles.dayChipText}>{item.kind}</Text>
                </View>
              </View>
            </View>
            <Pressable onPress={() => removeItem(item.id)} style={styles.removeBtn}>
              <Text style={{ color: "#FF3B30", fontWeight: "700", fontSize: 13 }}>Remove</Text>
            </Pressable>
          </View>
        </GlassCard>
      ))}

      {items.length === 0 && (
        <GlassCard style={styles.card}>
          <Text style={{ color: c.text.secondary, fontSize: 14, lineHeight: 20 }}>
            No recurring items yet. Add things like your work schedule, gym sessions, lectures, or
            regular commitments so the app can factor them into your recommendations.
          </Text>
        </GlassCard>
      )}

      {/* Add new item */}
      <GlassCard style={styles.card}>
        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16, marginBottom: 10 }}>
          Add recurring item
        </Text>
        <TextInput
          value={newLabel}
          onChangeText={setNewLabel}
          placeholder="e.g. Work 9-5, Gym, Lectures"
          placeholderTextColor={c.text.tertiary}
          style={[styles.input, { borderColor: c.border.medium, color: c.text.primary }]}
        />

        <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 10, marginBottom: 6 }}>
          Days
        </Text>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {DAYS.map((label, i) => (
            <Pressable
              key={i}
              onPress={() => toggleDay(i)}
              style={[
                styles.dayToggle,
                {
                  backgroundColor: newDays.includes(i) ? c.accent.primary : "transparent",
                  borderColor: newDays.includes(i) ? c.accent.primary : c.border.medium,
                },
              ]}
            >
              <Text
                style={{
                  color: newDays.includes(i) ? "#fff" : c.text.secondary,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 10, marginBottom: 6 }}>
          Type
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["demand", "resource"] as const).map((kind) => (
            <Pressable
              key={kind}
              onPress={() => setNewKind(kind)}
              style={[
                styles.dayToggle,
                {
                  backgroundColor: newKind === kind ? (kind === "demand" ? "#FF9500" : "#34C759") : "transparent",
                  borderColor: newKind === kind ? "transparent" : c.border.medium,
                  paddingHorizontal: 16,
                },
              ]}
            >
              <Text
                style={{
                  color: newKind === kind ? "#fff" : c.text.secondary,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                {kind === "demand" ? "Demand (drains energy)" : "Resource (restores energy)"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button title="Add to schedule" onPress={addItem} style={{ marginTop: 14 }} />
      </GlassCard>

      <Text style={{ color: c.text.tertiary, fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 17 }}>
        These feed into your daily recommendations. Demands help the app anticipate heavy days.
        Resources remind it what recharges you.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dayChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  dayChipText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  dayToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
