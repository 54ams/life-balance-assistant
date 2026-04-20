import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Colors } from "@/constants/Colors";
import { getActiveValues, saveActiveValues } from "@/lib/storage";
import { defaultValuesSet } from "@/lib/emotion";

export default function ValuesScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const glassOverlay = "rgba(0,0,0,0.10)";

  const [values, setValues] = useState<string[]>(defaultValuesSet());
  const [custom, setCustom] = useState("");

  useEffect(() => {
    (async () => {
      setValues(await getActiveValues());
    })();
  }, []);

  const toggleValue = (v: string) => {
    setValues((prev) => {
      const next = prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v];
      return next.slice(0, 6);
    });
  };

  const addCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed) return;
    toggleValue(trimmed);
    setCustom("");
  };

  const save = async () => {
    try {
      await saveActiveValues(values);
      Alert.alert("Saved", "Values updated.");
    } catch (e: any) {
      Alert.alert("Need at least 3 values", e?.message ?? "Select at least 3 values.");
    }
  };

  return (
    <Screen scroll title="Values" subtitle="Choose up to 6 that matter most">
      <GlassCard>
        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Core set</Text>
        <View style={styles.wrap}>
          {defaultValuesSet().map((v) => (
            <Pressable
              key={v}
              onPress={() => toggleValue(v)}
              style={[
                styles.chip,
                { borderColor: c.glass.border, backgroundColor: values.includes(v) ? glassOverlay : "transparent" },
              ]}
            >
              <Text style={{ color: c.text.primary, fontWeight: "800" }}>{v}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Add your own</Text>
        <TextInput
          placeholder="e.g., Creativity"
          placeholderTextColor={c.text.tertiary}
          value={custom}
          onChangeText={setCustom}
          onSubmitEditing={addCustom}
          style={[styles.input, { borderColor: c.glass.border, color: c.text.primary }]}
        />
        <Button title="Add" variant="secondary" onPress={addCustom} />
        <View style={{ marginTop: 10, gap: 8 }}>
          {values
            .filter((v) => !defaultValuesSet().includes(v))
            .map((v) => (
              <Pressable key={v} onPress={() => toggleValue(v)} style={styles.customRow}>
                <Text style={{ color: c.text.primary }}>{v}</Text>
                <Text style={{ color: c.danger, fontWeight: "800" }}>Remove</Text>
              </Pressable>
            ))}
        </View>
      </GlassCard>

      <Button title="Save values" onPress={save} />
      <Text style={{ color: c.text.tertiary, marginTop: 8 }}>
        Keep between 3 and 6 values. Presence is tracked; nothing is scored.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  chip: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginVertical: 10 },
  customRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
});
