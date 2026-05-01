import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/Colors";

type Props = {
  initial: { x: number; y: number };
  onChange: (valence: number, arousal: number) => void;
  ghost?: { x: number; y: number } | null;
};

// Canonical cell centres on the Russell (1980) circumplex, mapped to
// -1..1 valence (x, horizontal) and arousal (y, vertical-inverted).
// The previous draggable implementation caused navigation gesture
// conflicts and scroll issues on real devices; tap targets are
// unambiguous, accessible, and friendlier under time pressure.
const CELLS: Array<{
  key: string;
  label: string;
  valence: number;
  arousal: number;
  emoji: string;
}> = [
  { key: "tense",    label: "Tense",     valence: -0.7, arousal:  0.7, emoji: "😖" },
  { key: "alert",    label: "Alert",     valence:  0.0, arousal:  0.8, emoji: "⚡" },
  { key: "excited",  label: "Excited",   valence:  0.7, arousal:  0.7, emoji: "🤩" },
  { key: "low",      label: "Low",       valence: -0.8, arousal:  0.0, emoji: "😕" },
  { key: "steady",   label: "Steady",    valence:  0.0, arousal:  0.0, emoji: "😐" },
  { key: "content",  label: "Content",   valence:  0.8, arousal:  0.0, emoji: "🙂" },
  { key: "drained",  label: "Drained",   valence: -0.7, arousal: -0.7, emoji: "😴" },
  { key: "quiet",    label: "Quiet",     valence:  0.0, arousal: -0.8, emoji: "🌙" },
  { key: "calm",     label: "Calm",      valence:  0.7, arousal: -0.7, emoji: "☺️" },
];

function nearestCellKey(valence: number, arousal: number): string {
  let bestKey = "steady";
  let bestDist = Infinity;
  for (const cell of CELLS) {
    const dv = cell.valence - valence;
    const da = cell.arousal - arousal;
    const d = dv * dv + da * da;
    if (d < bestDist) {
      bestDist = d;
      bestKey = cell.key;
    }
  }
  return bestKey;
}

export function AffectCanvas({ initial, onChange, ghost }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const radius = 140; // kept in scope for parity with how callers compute `initial`

  // Infer the active cell from incoming valence/arousal (mapped back from
  // the canvas coordinate the check-in page stores on state).
  const initialValence = initial.x / radius;
  const initialArousal = -initial.y / radius;
  const [selected, setSelected] = useState<string>(() =>
    nearestCellKey(initialValence, initialArousal),
  );

  useEffect(() => {
    setSelected(nearestCellKey(initialValence, initialArousal));
  }, [initialValence, initialArousal]);

  const ghostKey = useMemo(() => {
    if (!ghost) return null;
    return nearestCellKey(ghost.x / radius, -ghost.y / radius);
  }, [ghost]);

  const pick = (cell: (typeof CELLS)[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelected(cell.key);
    onChange(cell.valence, cell.arousal);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.axisRow}>
        <Text style={[styles.axisLabel, { color: c.text.tertiary }]}>ACTIVATED</Text>
      </View>
      <View style={styles.grid}>
        {CELLS.map((cell) => {
          const active = selected === cell.key;
          const isGhost = ghostKey === cell.key && !active;
          return (
            <Pressable
              key={cell.key}
              onPress={() => pick(cell)}
              accessibilityRole="button"
              accessibilityLabel={cell.label}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.cell,
                {
                  backgroundColor: active ? c.accent.primary : "rgba(255,255,255,0.7)",
                  borderColor: active
                    ? c.accent.primary
                    : isGhost
                    ? c.text.tertiary
                    : c.border.heavy,
                  borderStyle: isGhost ? "dashed" : "solid",
                },
                pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] },
              ]}
            >
              {/* Emoji glyphs render with their own intrinsic baseline,
                  which is what made the icons drift off-centre on small
                  cells. Pinning lineHeight = fontSize and forcing
                  textAlign center removes that drift on iOS, Android, and
                  react-native-web. */}
              <Text
                style={styles.emoji}
                allowFontScaling={false}
              >
                {cell.emoji}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  lineHeight: 14,
                  fontWeight: "800",
                  textAlign: "center",
                  color: active ? c.text.inverse : c.text.primary,
                }}
              >
                {cell.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axisRow}>
        <Text style={[styles.axisLabel, { color: c.text.tertiary }]}>CALM</Text>
      </View>
      <View style={styles.horizontalAxis}>
        <Text style={[styles.axisLabel, { color: c.text.tertiary }]}>UNPLEASANT</Text>
        <Text style={[styles.axisLabel, { color: c.text.tertiary }]}>PLEASANT</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  axisRow: {
    alignItems: "center",
    paddingVertical: 4,
  },
  horizontalAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 4,
  },
  axisLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  cell: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  emoji: {
    fontSize: 26,
    lineHeight: 28,
    textAlign: "center",
    // textAlignVertical only does anything on Android, but it's harmless
    // elsewhere and makes the centring visibly correct on Pixel devices.
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});
