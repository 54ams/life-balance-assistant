import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Colors } from "@/constants/Colors";
import {
  getPreferredTone,
  setPreferredTone,
  type PreferredTone,
} from "@/lib/privacy";

const TONES: { key: PreferredTone; title: string; subtitle: string }[] = [
  {
    key: "Gentle",
    title: "Gentle",
    subtitle: "Calm, warm, encouraging. Good for most days.",
  },
  {
    key: "Direct",
    title: "Direct",
    subtitle: "Still warm, but a bit more matter-of-fact.",
  },
  {
    key: "Playful",
    title: "Playful",
    subtitle: "A touch of light humour — if that suits you.",
  },
];

export default function ReflectionSettingsScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const [tone, setTone] = useState<PreferredTone>("Gentle");

  useEffect(() => {
    (async () => {
      setTone(await getPreferredTone());
    })();
  }, []);

  const choose = async (next: PreferredTone) => {
    setTone(next);
    await setPreferredTone(next);
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: 18 }}>
      <ScreenHeader
        title="Reflection tone"
        subtitle="How would you like the app to speak to you when it offers a little reflection after a check-in?"
      />

      <View style={{ gap: 10, marginTop: 14 }}>
        {TONES.map((t) => {
          const active = tone === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => choose(t.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${t.title} tone`}
            >
              <GlassCard
                style={{
                  ...styles.card,
                  ...(active ? { borderColor: c.accent.primary, borderWidth: 1 } : {}),
                }}
              >
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: c.text.primary }]}>{t.title}</Text>
                    <Text style={[styles.body, { color: c.text.secondary }]}>{t.subtitle}</Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: active ? c.accent.primary : c.border.medium,
                        backgroundColor: active ? c.accent.primary : "transparent",
                      },
                    ]}
                  >
                    {active ? <Text style={styles.radioTick}>✓</Text> : null}
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          );
        })}
      </View>

      <GlassCard style={{ ...styles.card, marginTop: 14 }}>
        <Text style={[styles.title, { color: c.text.primary }]}>Good to know</Text>
        <Text style={[styles.body, { color: c.text.secondary, marginTop: 6 }]}>
          Reflections are never advice or diagnosis — just a sentence or two to help you pause. You can always edit or ignore them.
        </Text>
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: "800" },
  sub: { marginTop: 4, lineHeight: 20, fontSize: 14 },
  card: { padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 16, fontWeight: "800" },
  body: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioTick: { color: "#fff", fontWeight: "900", fontSize: 14 },
});
