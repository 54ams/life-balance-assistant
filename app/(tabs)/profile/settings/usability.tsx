import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "react-native";
import { SUS_QUESTIONS, computeSusScore, type SusResponse } from "@/lib/evaluation/sus";
import { addSusSubmission, clearSusSubmissions, getOrCreateParticipantId, listSusSubmissions } from "@/lib/evaluation/storage";
import { confirmDestructive, notify } from "@/lib/util/confirm";

const LABELS = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"] as const;

function Likert({
  value,
  onChange,
  color,
  textColor,
}: {
  value: SusResponse | null;
  onChange: (v: SusResponse) => void;
  color: string;
  textColor: string;
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
  const accent = c.accent.primary;

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
      notify("Incomplete", "Please answer all 10 questions.");
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

    notify("Saved", `SUS score: ${sub.score}`);
    setResponses(Array(10).fill(null));
    setFeedback("");
  };

  const onClear = async () => {
    const ok = await confirmDestructive(
      "Clear SUS submissions?",
      "Removes every stored SUS submission and the participant id from this device. This cannot be undone.",
      "Clear",
    );
    if (!ok) return;
    try {
      await clearSusSubmissions();
      setSubmissionsCount(0);
      setLastScore(null);
      notify("Cleared", "All SUS submissions removed.");
    } catch (err: any) {
      notify("Clear failed", err?.message ?? "Could not clear submissions. Please try again.");
    }
  };

  return (
    <Screen title="Usability (SUS)">
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={[styles.h1, { color: c.text.primary }]}>SUS Survey</Text>
        <Text style={[styles.sub, { color: c.text.secondary }]}>
          Answer all 10 questions. Responses are stored locally and can be exported via JSON in Profile → Export.
        </Text>

        <GlassCard style={{ marginTop: 14 }}>
          <Text style={[styles.meta, { color: c.text.secondary }]}>Participant ID</Text>
          <Text style={[styles.pid, { color: c.text.primary }]}>{participantId}</Text>
          <Text style={[styles.meta, { color: c.text.secondary, marginTop: 8 }]}>
            Submissions on this device: {submissionsCount}{lastScore !== null ? ` • Last score: ${lastScore}` : ""}
          </Text>
        </GlassCard>

        {SUS_QUESTIONS.map((q, i) => (
          <GlassCard key={i} style={{ marginTop: 12 }}>
            <Text style={[styles.qTitle, { color: c.text.primary }]}>{i + 1}. {q}</Text>
            <Likert
              value={responses[i]}
              onChange={(v) => {
                const next = [...responses];
                next[i] = v;
                setResponses(next);
              }}
              color={accent}
              textColor={c.text.primary}
            />
            <Text style={[styles.likertLabel, { color: c.text.secondary }]}>
              {responses[i] ? LABELS[responses[i]! - 1] : "Select 1–5"}
            </Text>
          </GlassCard>
        ))}

        <GlassCard style={{ marginTop: 12 }}>
          <Text style={[styles.qTitle, { color: c.text.primary }]}>Optional feedback</Text>
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="What worked well? What was confusing?"
            placeholderTextColor={scheme === "dark" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"}
            multiline
            style={[
              styles.input,
              {
                color: c.text.primary,
                borderColor: scheme === "dark" ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)",
              },
            ]}
          />
        </GlassCard>

        <GlassCard style={{ marginTop: 12 }}>
          <Text style={[styles.qTitle, { color: c.text.primary }]}>Score</Text>
          <Text style={[styles.score, { color: c.text.primary }]}>
            {currentScore === null ? "Answer all questions to preview score" : `${currentScore} / 100`}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <Pressable onPress={onSubmit} style={[styles.btn, { borderColor: accent }]}>
              <Text style={[styles.btnText, { color: c.text.primary }]}>Save submission</Text>
            </Pressable>
            <Pressable onPress={onClear} style={[styles.btn, { borderColor: "rgba(255,80,80,0.55)" }]}>
              <Text style={[styles.btnText, { color: c.text.primary }]}>Clear local SUS data</Text>
            </Pressable>
          </View>
        </GlassCard>

        <Text style={[styles.note, { color: c.text.secondary }]}>
          Tip: export the JSON from Profile → Export, then calculate mean SUS, median, standard deviation, and summarise themes from feedback in your report.
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
