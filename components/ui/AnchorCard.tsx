import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";

import { Colors } from "@/constants/Colors";
import {
  DAWN_WORDS,
  DUSK_WORDS,
  saveAnchor,
  type AnchorKind,
  type AnchorRecord,
} from "@/lib/anchors";
import { recordLift } from "@/lib/lift";

type Props = {
  kind: AnchorKind;
  existing?: AnchorRecord;
  /** Called after a successful capture so the caller can trigger the ripple */
  onCapture?: (liftPoints: number) => void;
};

/**
 * Dawn / dusk anchor capture card. Shows a curated chip row plus an
 * optional custom text input. Once captured, the card collapses into
 * a quiet acknowledgement line that persists for the day.
 */
export function AnchorCard({ kind, existing, onCapture }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = scheme === "dark" ? Colors.dark : Colors.light;

  const isDawn = kind === "dawn";
  const options = isDawn ? DAWN_WORDS : DUSK_WORDS;
  const current = isDawn ? existing?.dawn : existing?.dusk;

  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(!!current);
  const [savedWord, setSavedWord] = useState(current?.word ?? "");

  const commit = async (word: string) => {
    const trimmed = word.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await saveAnchor(kind, trimmed);
      const pts = 3;
      await recordLift("anchor", pts);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSavedWord(trimmed);
      setCollapsed(true);
      onCapture?.(pts);
    } finally {
      setSaving(false);
    }
  };

  if (collapsed) {
    return (
      <View
        style={[
          styles.wrap,
          {
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
            borderColor: c.border.light,
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: c.text.tertiary }]}>
          {isDawn ? "TODAY'S DAWN ANCHOR" : "TODAY'S DUSK ANCHOR"}
        </Text>
        <Text style={[styles.savedWord, { color: c.text.primary }]}>{savedWord}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
          borderColor: c.border.light,
        },
      ]}
    >
      <Text style={[styles.eyebrow, { color: c.text.tertiary }]}>
        {isDawn ? "DAWN ANCHOR" : "DUSK ANCHOR"}
      </Text>
      <Text style={[styles.prompt, { color: c.text.primary }]}>
        {isDawn ? "One word for today." : "One word to let go."}
      </Text>

      <View style={styles.chipRow}>
        {options.map((w) => (
          <Pressable
            key={w}
            onPress={() => commit(w)}
            disabled={saving}
            style={({ pressed }) => [
              styles.chip,
              { borderColor: c.border.medium, backgroundColor: c.glass.secondary },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ color: c.text.primary, fontSize: 13, fontWeight: "600" }}>{w}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.customRow}>
        <TextInput
          placeholder="or your own word…"
          placeholderTextColor={c.text.tertiary}
          value={custom}
          onChangeText={setCustom}
          maxLength={18}
          returnKeyType="done"
          onSubmitEditing={() => commit(custom)}
          style={[
            styles.input,
            {
              color: c.text.primary,
              borderColor: c.border.medium,
              backgroundColor: c.glass.secondary,
            },
          ]}
        />
        <Pressable
          onPress={() => commit(custom)}
          disabled={!custom.trim() || saving}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: c.accent.primary, opacity: !custom.trim() || saving ? 0.5 : pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  prompt: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  chipRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  customRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  saveBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.4,
  },
  savedWord: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: "300",
    letterSpacing: -0.3,
  },
});
