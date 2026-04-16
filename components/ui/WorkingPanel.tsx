// components/ui/WorkingPanel.tsx
//
// The structured "back of tile" used by FlipCard across the
// calculation-heavy screens. Keeps the maths reveal consistent
// wherever it's used: eyebrow label, plain-words sentence, what went
// in, how it was worked out, the result, and a hint to flip back.
//
// Every field is optional so a screen can drop in just what's relevant
// (Home's BALANCE tile, for instance, is a single plain sentence plus
// inputs; correlations want the formula line as well).

import React from "react";
import { StyleSheet, Text, View, ViewStyle, useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";
import { GlassCard } from "@/components/ui/GlassCard";

type Props = {
  /** Plain-English one-liner describing what this tile is showing. */
  summary: string;
  /** What went in — usually a short list of the inputs used. */
  inputs?: string[];
  /** How the number was worked out, in words or gentle formula. */
  method?: string;
  /** Optional final result the user can double-check against the front. */
  result?: string;
  /** Additional caveats, e.g. "Based on 7 days". */
  footnote?: string;
  /** Optional extra style for the wrapping GlassCard. */
  style?: ViewStyle;
};

export function WorkingPanel({ summary, inputs, method, result, footnote, style }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  return (
    <GlassCard style={{ ...styles.card, ...(style ?? {}) }}>
      <Text style={[styles.eyebrow, { color: c.text.tertiary }]}>
        HOW THIS IS WORKED OUT
      </Text>
      <Text style={[styles.summary, { color: c.text.primary }]}>{summary}</Text>

      {inputs && inputs.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: c.text.tertiary }]}>Using</Text>
          {inputs.map((item, i) => (
            <Text key={i} style={[styles.body, { color: c.text.secondary }]}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}

      {method ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: c.text.tertiary }]}>Worked out</Text>
          <Text style={[styles.body, { color: c.text.secondary }]}>{method}</Text>
        </View>
      ) : null}

      {result ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: c.text.tertiary }]}>Result</Text>
          <Text style={[styles.result, { color: c.text.primary }]}>{result}</Text>
        </View>
      ) : null}

      {footnote ? (
        <Text style={[styles.footnote, { color: c.text.tertiary }]}>{footnote}</Text>
      ) : null}

      <Text style={[styles.hint, { color: c.text.tertiary }]}>Tap to flip back</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  summary: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  section: { marginTop: 10 },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  body: { fontSize: 13, lineHeight: 19 },
  result: { fontSize: 16, fontWeight: "800" },
  footnote: { fontSize: 11, marginTop: 10, fontStyle: "italic" },
  hint: {
    fontSize: 11,
    marginTop: 12,
    textAlign: "right",
    fontWeight: "600",
  },
});
