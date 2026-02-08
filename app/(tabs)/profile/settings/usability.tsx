import * as Clipboard from "expo-clipboard";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/glass-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SUS_QUESTIONS, computeSusScore, type SusResponse } from "@/lib/evaluation/sus";
import { addSusSubmission, clearSusSubmissions, getOrCreateParticipantId, listSusSubmissions } from "@/lib/evaluation/storage";
import { susSubmissionsToCsv } from "@/lib/evaluation/export";

const LABELS = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"] as const;

function Likert({
  value,
  onChange,
  color,
}: {
  value: SusResponse | null;
  onChange: (v: SusResponse) => void;
  color: string;
}) {
  return (
    <View style={styles.likertRow}>
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === (n as SusResponse);
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n as SusResponse)}
            style={[
              styles.choice,
              {
                borderColor: selected ? color : "rgba(255,255,255,0.22)",
                backgroundColor: selected ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)",
              },
            ]}
          >
            <Text style={[styles.choiceText, { color: textColor }]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function UsabilitySusScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const accent = c.tint;

  const [participantId, setParticipantId] = useState<string>("");
  const [responses, setResponses] = useState<(SusResponse | null)[]>(Array(10).fill(null));
  const [feedback, setFeedback] = useState<string>("");
  const [submissionsCount, setSubmissionsCount] = useState<number>(0);
  const [lastScore, setLastScore] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const pid = await getOrCreateParticipantId();
      setParticipantId(pid);
      const subs = await listSusSubmissions();
      setSubmissionsCount(subs.length);
      setLastScore(subs[0]?.score ?? null);
    })();
  }, []);

  const currentScore = useMemo(() => {
    const filled = responses.every((r) => r !== null);
    if (!filled) return null;
    return computeSusScore(responses as SusResponse[]);
  }, [responses]);

  const onSubmit = async () => {
    if (!responses.every((r) => r !== null)) {
      Alert.alert("Incomplete", "Please answer all 10 questions.");
      return;
    }

    const sub = await addSusSubmission({
      participantId: participantId || "P-UNKNOWN",
      responses: responses as SusResponse[],
      feedback,
      appVersion: undefined,
    });

    setLastScore(sub.score);
    const subs = await listSusSubmissions();
    setSubmissionsCount(subs.length);

    Alert.alert("Saved", `SUS score: ${sub.score}`);
    setResponses(Array(10).fill(null));
    setFeedback("");
  };

  const onCopyCsv = async () => {
    const subs = await listSusSubmissions();
    if (!subs.length) {
      Alert.alert("No data", "No SUS submissions saved yet.");
      return;
    }
    const csv = susSubmissionsToCsv(subs);
    await Clipboard.setStringAsync(csv);
    Alert.alert("Copied", "SUS CSV copied to clipboard.");
  };

  const onClear = async () => {
    Alert.alert("Clear data?", "This removes all stored SUS submissions on this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearSusSubmissions();
          setSubmissionsCount(0);
          setLastScore(null);
          Alert.alert("Cleared", "All SUS submissions removed.");
        },
      },
    ]);
  };

  return (
    <Screen title="Usability (SUS)">
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={[styles.h1, { color: c.text }]}>SUS Survey</Text>
        <Text style={[styles.sub, { color: c.mutedText }]}>
          Answer all 10 questions. Responses are stored locally and can be exported as CSV for your evaluation.
        </Text>

        <GlassCard style={{ marginTop: 14 }}>
          <Text style={[styles.meta, { color: c.mutedText }]}>Participant ID</Text>
          <Text style={[styles.pid, { color: c.text }]}>{participantId}</Text>
          <Text style={[styles.meta, { color: c.mutedText, marginTop: 8 }]}>
            Submissions on this device: {submissionsCount}{lastScore !== null ? ` • Last score: ${lastScore}` : ""}
          </Text>
        </GlassCard>

        {SUS_QUESTIONS.map((q, i) => (
          <GlassCard key={i} style={{ marginTop: 12 }}>
            <Text style={[styles.qTitle, { color: c.text }]}>{i + 1}. {q}</Text>
            <Likert
              value={responses[i]}
              onChange={(v) => {
                const next = [...responses];
                next[i] = v;
                setResponses(next);
              }}
              color={accent}
            />
            <Text style={[styles.likertLabel, { color: c.mutedText }]}>
              {responses[i] ? LABELS[responses[i]! - 1] : "Select 1–5"}
            </Text>
          </GlassCard>
        ))}

        <GlassCard style={{ marginTop: 12 }}>
          <Text style={[styles.qTitle, { color: c.text }]}>Optional feedback</Text>
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="What worked well? What was confusing?"
            placeholderTextColor={scheme === "dark" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"}
            multiline
            style={[
              styles.input,
              {
                color: c.text,
                borderColor: scheme === "dark" ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)",
              },
            ]}
          />
        </GlassCard>

        <GlassCard style={{ marginTop: 12 }}>
          <Text style={[styles.qTitle, { color: c.text }]}>Score</Text>
          <Text style={[styles.score, { color: c.text }]}>
            {currentScore === null ? "Answer all questions to preview score" : `${currentScore} / 100`}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <Pressable onPress={onSubmit} style={[styles.btn, { borderColor: accent }]}>
              <Text style={[styles.btnText, { color: c.text }]}>Save submission</Text>
            </Pressable>
            <Pressable onPress={onCopyCsv} style={[styles.btn, { borderColor: "rgba(255,255,255,0.22)" }]}>
              <Text style={[styles.btnText, { color: c.text }]}>Copy CSV</Text>
            </Pressable>
            <Pressable onPress={onClear} style={[styles.btn, { borderColor: "rgba(255,80,80,0.55)" }]}>
              <Text style={[styles.btnText, { color: c.text }]}>Clear local SUS data</Text>
            </Pressable>
          </View>
        </GlassCard>

        <Text style={[styles.note, { color: c.mutedText }]}>
          Tip: for your report, paste the CSV into Excel, calculate mean SUS, median, standard deviation, and summarise themes from feedback.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 34, fontWeight: "900", marginTop: 4 },
  sub: { marginTop: 6, lineHeight: 20 },
  meta: { fontSize: 12 },
  pid: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  qTitle: { fontSize: 16, fontWeight: "800" },
  likertRow: { flexDirection: "row", gap: 10, marginTop: 10, alignItems: "center" },
  choice: {
    width: 44,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceText: { fontSize: 16, fontWeight: "800", color: "white" },
  likertLabel: { marginTop: 8, fontSize: 12 },
  input: {
    marginTop: 10,
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  score: { marginTop: 8, fontSize: 22, fontWeight: "900" },
  btn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  btnText: { fontWeight: "800" },
  note: { marginTop: 14, fontSize: 12, lineHeight: 18 },
});
