import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { TabSwipe } from "@/components/TabSwipe";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDisplayDate } from "@/lib/date";
import { getDay, saveCheckIn } from "@/lib/storage";
import type { ContextTag, DailyCheckIn, ISODate, StressIndicators } from "@/lib/types";

const TAB_ORDER = ["/", "/checkin", "/insights", "/history", "/profile"] as const;

function todayISO(): ISODate {
  return new Date().toISOString().slice(0, 10) as ISODate;
}

type StressKey = keyof StressIndicators;

const STRESS_KEYS: { key: StressKey; label: string }[] = [
  { key: "muscleTension", label: "Muscle tension" },
  { key: "racingThoughts", label: "Racing thoughts" },
  { key: "irritability", label: "Irritability" },
  { key: "avoidance", label: "Avoidance" },
  { key: "restlessness", label: "Restlessness" },
];

const DEEP_WORK: { value: NonNullable<DailyCheckIn["deepWorkMins"]>; label: string }[] = [
  { value: 0, label: "0" },
  { value: 15, label: "15" },
  { value: 30, label: "30" },
  { value: 60, label: "60" },
  { value: 90, label: "90" },
  { value: 120, label: "120" },
];

const DEFAULT_STRESS: StressIndicators = {
  muscleTension: false,
  racingThoughts: false,
  irritability: false,
  avoidance: false,
  restlessness: false,
};

function chipTone(label: string) {
  return label.length <= 3 ? "tight" : "normal";
}

export default function CheckInScreen() {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  const date = useMemo(() => todayISO(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");

  // DailyCheckIn types: mood is 1–4, energy optional 1–4
  const [mood, setMood] = useState<DailyCheckIn["mood"]>(2);
  const [energy, setEnergy] = useState<NonNullable<DailyCheckIn["energy"]>>(3);

  const [stressIndicators, setStressIndicators] = useState<StressIndicators>(DEFAULT_STRESS);

  const [caffeineAfter2pm, setCaffeineAfter2pm] = useState<boolean>(false);
  const [alcohol, setAlcohol] = useState<boolean>(false);
  const [deepWorkMins, setDeepWorkMins] = useState<DailyCheckIn["deepWorkMins"]>(30);

  const [contextTags, setContextTags] = useState<ContextTag[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const day = await getDay(date);
        if (day?.checkIn) {
          const ci = day.checkIn;

          setMood(ci.mood);
          if (ci.energy != null) setEnergy(ci.energy);

          setStressIndicators(ci.stressIndicators ?? DEFAULT_STRESS);

          setCaffeineAfter2pm(!!ci.caffeineAfter2pm);
          setAlcohol(!!ci.alcohol);
          setDeepWorkMins(ci.deepWorkMins ?? 30);

          setContextTags(ci.contextTags ?? []);

          setNotes(ci.notes ?? "");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  const toggleTag = (tag: ContextTag) => {
    setContextTags((prev: ContextTag[]) => {
      return prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag];
    });
  };

  const toggleStress = (key: StressKey) => {
    setStressIndicators((prev) => {
      const safe = prev ?? DEFAULT_STRESS;
      return { ...safe, [key]: !safe[key] };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: DailyCheckIn = {
        mood,
        energy,
        stressIndicators,
        caffeineAfter2pm,
        alcohol,
        contextTags: contextTags.length ? contextTags : undefined,
        deepWorkMins: deepWorkMins ?? 30,
        notes: notes.trim() || undefined,
      };

      await saveCheckIn(date, payload);

      // Go back to Home and force a refresh so LBI/plan updates.
      router.replace({ pathname: "/", params: { refresh: "1" } } as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll contentStyle={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.back,
              {
                backgroundColor: pressed
                  ? scheme === "dark"
                    ? "rgba(255,255,255,0.10)"
                    : "rgba(0,0,0,0.06)"
                  : scheme === "dark"
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.70)",
              },
            ]}
          >
            <IconSymbol name="chevron.left" size={20} color={c.text} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.text }]}>Log check-in</Text>
            <Text style={[styles.subtitle, { color: c.muted }]}>{formatDisplayDate(date)}</Text>
          </View>
        </View>

        <GlassCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>How do you feel?</Text>

          <Text style={[styles.label, { color: c.muted }]}>Mood</Text>
          <View style={styles.row}>
            <Chip label="😖" active={mood === 1} onPress={() => setMood(1)} tone="tight" />
            <Chip label="😐" active={mood === 2} onPress={() => setMood(2)} tone="tight" />
            <Chip label="🙂" active={mood === 3} onPress={() => setMood(3)} tone="tight" />
            <Chip label="😄" active={mood === 4} onPress={() => setMood(4)} tone="tight" />
          </View>

          <Text style={[styles.label, { color: c.muted }]}>Energy</Text>
          <View style={styles.row}>
            <Chip label="1" active={energy === 1} onPress={() => setEnergy(1)} tone="tight" />
            <Chip label="2" active={energy === 2} onPress={() => setEnergy(2)} tone="tight" />
            <Chip label="3" active={energy === 3} onPress={() => setEnergy(3)} tone="tight" />
            <Chip label="4" active={energy === 4} onPress={() => setEnergy(4)} tone="tight" />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Stress indicators</Text>
          <Text style={[styles.small, { color: c.muted }]}>Tap all that apply.</Text>
          <View style={styles.wrap}>
            {STRESS_KEYS.map((it) => (
              <Chip
                key={it.key}
                label={it.label}
                active={!!stressIndicators[it.key]}
                onPress={() => toggleStress(it.key)}
              />
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Behaviours</Text>
          <Text style={[styles.small, { color: c.muted }]}>Low effort, high signal.</Text>
          <View style={styles.wrap}>
            <Chip
              label="Caffeine after 2pm"
              active={caffeineAfter2pm}
              onPress={() => setCaffeineAfter2pm((v) => !v)}
            />
            <Chip
              label="Alcohol"
              active={alcohol}
              onPress={() => setAlcohol((v) => !v)}
            />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Deep work</Text>
          <Text style={[styles.small, { color: c.muted }]}>How much focused work feels realistic today?</Text>
          <View style={styles.wrap}>
            {DEEP_WORK.map((it) => (
              <Chip
                key={String(it.value)}
                label={it.label}
                active={deepWorkMins === it.value}
                tone={chipTone(it.label)}
                onPress={() => setDeepWorkMins(it.value)}
              />
            ))}
          </View>
        </GlassCard>        <GlassCard style={styles.card}>
          <Text style={{ color: c.text, fontSize: 14, fontWeight: "700" }}>Context (optional)</Text>
          <Text style={{ color: c.icon, marginTop: 6 }}>
            These tags help interpret your day without adding lots of questions.
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {[
              { key: "illness", label: "Illness" },
              { key: "travel", label: "Travel" },
              { key: "late_meal", label: "Late meal" },
              { key: "alcohol", label: "Alcohol" },
              { key: "acute_stress", label: "Acute stress" },
              { key: "menstrual_cycle", label: "Cycle" },
            ].map((t) => {
              const active = (contextTags ?? []).includes(t.key as any);
              return (
                <Pressable
                  key={t.key}
                  onPress={() => toggleTag(t.key as any)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? c.tint : "rgba(255,255,255,0.18)",
                    backgroundColor: active ? "rgba(255,255,255,0.10)" : "transparent",
                  }}
                >
                  <Text style={{ color: active ? c.text : c.icon, fontWeight: "600" }}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>



        <GlassCard style={styles.card}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Notes</Text>
          <Text style={[styles.small, { color: c.muted }]}>Optional: anything that would help future you.</Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: scheme === "dark" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.65)",
                borderColor: scheme === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={loading ? "Loading…" : "e.g., meeting-heavy day, felt restless after lunch"}
              placeholderTextColor={c.muted}
              style={[styles.input, { color: c.text }]}
              multiline
            />
          </View>
        </GlassCard>

        <Button
          title={saving ? "Saving…" : "Save check-in"}
          onPress={save}
          disabled={loading || saving}
          style={{ marginBottom: 18 }}
        />
      </Screen>
    </TabSwipe>
  );
}

function Chip({
  label,
  active,
  onPress,
  tone = "normal",
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tone?: "normal" | "tight";
}) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];

  const bg = active
    ? c.tint
    : scheme === "dark"
    ? "rgba(255,255,255,0.08)"
    : "rgba(255,255,255,0.65)";

  const textColor = active ? "#0B0610" : c.text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        tone === "tight" && styles.chipTight,
        {
          backgroundColor: pressed && !active
            ? scheme === "dark"
              ? "rgba(255,255,255,0.12)"
              : "rgba(0,0,0,0.06)"
            : bg,
          borderColor: active
            ? "rgba(0,0,0,0.10)"
            : scheme === "dark"
            ? "rgba(255,255,255,0.10)"
            : "rgba(0,0,0,0.08)",
        },
      ]}
    >
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    gap: 12,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 8,
  },
  small: {
    marginTop: -6,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipTight: {
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "800",
  },
  inputWrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    minHeight: 96,
  },
  input: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
});
