import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { AffectCanvas } from "@/components/ui/AffectCanvas";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { formatDateLong } from "@/lib/util/formatDate";
import { Typography } from "@/constants/Typography";
import { todayISO } from "@/lib/util/todayISO";
import {
  getActiveValues,
  getCheckIn,
  getDay,
  getEmotion,
  upsertCheckIn,
  upsertEmotion,
} from "@/lib/storage";
import type {
  DailyCheckIn,
  EmotionalDiaryEntry,
  LifeContextTag,
  WearableMetrics,
} from "@/lib/types";
import { suggestContextFromWearable, wearableSummaryLine, recoveryColor } from "@/lib/whoopContext";
import { deriveIntensity } from "@/lib/emotion";
import { containsSelfHarmSignals } from "@/lib/privacy";
import { refreshDerivedForDate } from "@/lib/pipeline";
import { getTagDef, tagsByKind } from "@/lib/lifeContext";
import { addCustomTag, loadCustomTags } from "@/lib/customTags";
import { deriveLegacyScales } from "@/lib/derive";
import { llmDeeperRead, localMatch, type NoteSuggestion } from "@/lib/noteInterpret";

// -----------------------------------------------------------------
// Step 1 · Affect (Russell 1980 circumplex)
// Step 2 · Life context (Lazarus & Folkman demand/resource tags)
// Step 3 · Note + optional LLM deeper read
// -----------------------------------------------------------------

const TOTAL_STEPS = 3;

const QUADRANT_LABEL = (valence: number, arousal: number) => {
  if (Math.abs(valence) < 0.15 && Math.abs(arousal) < 0.15) return "Somewhere in the middle";
  if (valence >= 0 && arousal >= 0) return "Pleasant · activated";
  if (valence >= 0 && arousal < 0) return "Pleasant · calm";
  if (valence < 0 && arousal >= 0) return "Unpleasant · activated";
  return "Unpleasant · low";
};

export default function DailyCheckInScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];
  const date = useMemo(() => todayISO(), []);

  const [step, setStep] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(0)).current;

  // --- State ---------------------------------------------------
  const [valence, setValence] = useState(0); // -1..1
  const [arousal, setArousal] = useState(0); // -1..1
  const [tags, setTags] = useState<LifeContextTag[]>([]);
  const [note, setNote] = useState("");
  const [regulation, setRegulation] =
    useState<EmotionalDiaryEntry["regulation"]>("manageable");
  const [valueChosen, setValueChosen] = useState<string>("Health");
  const [activeValues, setActiveValues] = useState<string[]>([]);

  // WHOOP wearable data for today (Layer 2)
  const [wearable, setWearable] = useState<WearableMetrics | null>(null);

  // Custom tag entry state for pressures + replenishers.
  const [customDemandText, setCustomDemandText] = useState("");
  const [customResourceText, setCustomResourceText] = useState("");
  // Bumped whenever a new custom tag is registered, so chip lists re-render.
  const [customTagVersion, setCustomTagVersion] = useState(0);

  // Local-matcher suggestions + LLM deeper-read state.
  const [localSuggestions, setLocalSuggestions] = useState<NoteSuggestion[]>([]);
  const [llmSuggestions, setLlmSuggestions] = useState<NoteSuggestion[]>([]);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmSource, setLlmSource] = useState<"llm" | "local" | "safety" | null>(null);

  // Load any existing check-in for today (editing case).
  useEffect(() => {
    (async () => {
      // Hydrate user-defined tags into the runtime registry first so
      // tagsByKind() picks them up alongside the built-ins.
      await loadCustomTags();
      setCustomTagVersion((v) => v + 1);

      const values = await getActiveValues();
      setActiveValues(values);
      setValueChosen(values[0] ?? "Health");

      // Load today's wearable data for WHOOP context
      const today = await getDay(date as any);
      if (today?.wearable) {
        setWearable(today.wearable);
      }

      const existing = await getCheckIn(date as any);
      if (existing) {
        if (typeof existing.valence === "number") setValence(existing.valence);
        if (typeof existing.arousal === "number") setArousal(existing.arousal);
        if (existing.lifeContext) setTags(existing.lifeContext);
        if (existing.notes) setNote(existing.notes);
      } else if (today?.wearable) {
        // Pre-fill tags from WHOOP data for new check-ins only
        const whoopSuggestions = suggestContextFromWearable(today.wearable);
        const autoTags: LifeContextTag[] = whoopSuggestions.map((s) => ({
          id: s.tagId,
          kind: s.kind,
        }));
        setTags(autoTags);
      }
      const existingEmotion = await getEmotion(date as any);
      if (existingEmotion) {
        setValence(existingEmotion.valence);
        setArousal(existingEmotion.arousal);
        setRegulation(existingEmotion.regulation);
        setValueChosen(existingEmotion.valueChosen);
      }
    })();
  }, [date]);

  // Keep local suggestions fresh as the note changes.
  useEffect(() => {
    setLocalSuggestions(localMatch(note));
  }, [note]);

  const animateStep = (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const direction = next > step ? 1 : -1;
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideX, { toValue: direction * -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideX.setValue(direction * 20);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideX, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const toggleTag = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTags((prev) => {
      const exists = prev.find((t) => t.id === id);
      if (exists) return prev.filter((t) => t.id !== id);
      const def = getTagDef(id);
      if (!def) return prev;
      return [...prev, { id, kind: def.kind }];
    });
  };

  const acceptSuggestion = (s: NoteSuggestion) => {
    Haptics.selectionAsync().catch(() => {});
    setTags((prev) => {
      if (prev.find((t) => t.id === s.tagId)) return prev;
      return [...prev, { id: s.tagId, kind: s.kind }];
    });
  };

  const rejectSuggestion = (tagId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setLocalSuggestions((prev) => prev.filter((s) => s.tagId !== tagId));
    setLlmSuggestions((prev) => prev.filter((s) => s.tagId !== tagId));
  };

  const runDeeperRead = async () => {
    if (!note.trim()) return;
    setLlmLoading(true);
    try {
      const result = await llmDeeperRead(note);
      // Keep only suggestions the user hasn't already accepted.
      const accepted = new Set(tags.map((t) => t.id));
      setLlmSuggestions(result.suggestions.filter((s) => !accepted.has(s.tagId)));
      setLlmSource(result.source);
    } finally {
      setLlmLoading(false);
    }
  };

  // Combine + de-dup suggestions for the chip UI.
  const pendingSuggestions = useMemo(() => {
    const accepted = new Set(tags.map((t) => t.id));
    const combined: NoteSuggestion[] = [];
    const seen = new Set<string>();
    for (const s of [...llmSuggestions, ...localSuggestions]) {
      if (accepted.has(s.tagId) || seen.has(s.tagId)) continue;
      combined.push(s);
      seen.add(s.tagId);
    }
    return combined;
  }, [localSuggestions, llmSuggestions, tags]);

  // --- Save -----------------------------------------------------
  const save = async () => {
    try {
      const legacy = deriveLegacyScales({
        valence,
        arousal,
        lifeContext: tags,
      });
      const payload: DailyCheckIn = {
        valence,
        arousal,
        lifeContext: tags,
        notes: note.trim() || undefined,
        ...legacy,
      };
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await upsertCheckIn(date as any, payload);

      const emotion: EmotionalDiaryEntry = {
        date: date as any,
        valence,
        arousal,
        intensity: deriveIntensity(valence, arousal),
        contextTags: tags.slice(0, 3).map((t) => {
          const def = getTagDef(t.id);
          return def?.label ?? t.id;
        }),
        regulation,
        valueChosen,
        reflection: note.trim() || undefined,
        source: "user",
      };
      await upsertEmotion(emotion);
      await refreshDerivedForDate(date as any);

      if (containsSelfHarmSignals(note)) {
        Alert.alert(
          "Safety support",
          "If you are at risk, please use crisis support resources now.",
          [
            { text: "Open resources", onPress: () => router.push("/profile/settings/help" as any) },
            { text: "OK" },
          ],
        );
      }
      router.replace("/checkin/saved" as any);
    } catch (e: any) {
      Alert.alert("Could not save", e?.message ?? "Please try again.");
    }
  };

  // --- Render helpers -----------------------------------------
  // Re-read from the registry on each render-eligible change so newly
  // added custom tags appear inline. `customTagVersion` is the trigger.
  const demandTags = useMemo(
    () => tagsByKind("demand"),
    [customTagVersion],
  );
  const resourceTags = useMemo(
    () => tagsByKind("resource"),
    [customTagVersion],
  );
  const selected = new Set(tags.map((t) => t.id));

  const submitCustomTag = async (kind: "demand" | "resource") => {
    const text = kind === "demand" ? customDemandText : customResourceText;
    const trimmed = text.trim();
    if (!trimmed) return;
    const def = await addCustomTag(trimmed, kind);
    if (!def) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (kind === "demand") setCustomDemandText("");
    else setCustomResourceText("");
    setCustomTagVersion((v) => v + 1);
    // Auto-select the freshly created tag.
    setTags((prev) => {
      if (prev.find((t) => t.id === def.id)) return prev;
      return [...prev, { id: def.id, kind: def.kind }];
    });
  };

  return (
    <Screen scroll padded contentStyle={{ gap: Spacing.md, paddingBottom: 140 }}>
      {/* Header ---------------------------------------------- */}
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="Back"
          onPress={() => (step > 0 ? animateStep(step - 1) : router.navigate("/" as any))}
          style={[styles.backBtn, { borderColor: c.border.medium, backgroundColor: c.glass.primary }]}
        >
          <IconSymbol name="chevron.left" size={18} color={c.text.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: c.text.tertiary,
              fontSize: Typography.fontSize.xs,
              fontFamily: Typography.fontFamily.bold,
              letterSpacing: Typography.letterSpacing.allcaps,
              fontWeight: "800",
            }}
          >
            {formatDateLong(todayISO()).toUpperCase()}
          </Text>
          <Text
            style={{
              color: c.text.primary,
              fontSize: 32,
              lineHeight: 38,
              fontFamily: Typography.fontFamily.serifItalic,
            }}
          >
            Check-in
          </Text>
        </View>
      </View>

      {/* Progress -------------------------------------------- */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor:
                  i <= step ? c.accent.primary : "rgba(0,0,0,0.06)",
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: c.accent.primary, letterSpacing: 0.6 }}>
            STEP {step + 1} OF {TOTAL_STEPS}
          </Text>
          <Text style={{ fontSize: 12, color: c.text.secondary }}>
            {step === 0 ? "How it feels" : step === 1 ? "What's around it" : "In your words"}
          </Text>
        </View>
      </View>

      <Animated.View style={{ opacity: fade, transform: [{ translateX: slideX }] }}>
        {/* ------------------------------ STEP 0 · Affect canvas */}
        {step === 0 && wearable && (
          <GlassCard padding="base" style={{ marginBottom: Spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: recoveryColor(wearable.recovery),
                }}
              />
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 14 }}>
                Your body today
              </Text>
            </View>
            <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 6, letterSpacing: 0.3 }}>
              {wearableSummaryLine(wearable)}
            </Text>
            {suggestContextFromWearable(wearable).length > 0 && (
              <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 4, fontStyle: "italic" }}>
                {suggestContextFromWearable(wearable).map((s) => s.reason).join("  ·  ")}
              </Text>
            )}
          </GlassCard>
        )}
        {step === 0 && (
          <GlassCard padding="lg">
            <Text
              style={{
                color: c.text.primary,
                fontSize: 22,
                fontFamily: Typography.fontFamily.serifItalic,
                lineHeight: 28,
              }}
            >
              How does today feel?
            </Text>
            <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
              Tap whichever one fits best right now. No right answer — just where
              you are. Horizontal is pleasant ↔ unpleasant, vertical is
              activated ↔ calm.
            </Text>

            <View style={{ marginTop: Spacing.md, alignItems: "center" }}>
              <AffectCanvas
                initial={{ x: valence * 140, y: -arousal * 140 }}
                onChange={(v, a) => {
                  setValence(v);
                  setArousal(a);
                }}
              />
            </View>

            <View style={{ alignItems: "center", marginTop: Spacing.sm }}>
              <Text
                style={{
                  color: c.text.tertiary,
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 1.2,
                }}
              >
                {QUADRANT_LABEL(valence, arousal).toUpperCase()}
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { color: c.text.primary, marginTop: Spacing.md }]}>
              How are you managing right now?
            </Text>
            <View style={styles.chipWrap}>
              {(["handled", "manageable", "overwhelmed"] as const).map((r) => {
                const active = regulation === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setRegulation(r);
                    }}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? c.accent.primary : c.border.medium,
                        backgroundColor: active ? c.accent.primary : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? c.text.inverse : c.text.primary,
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.fieldLabel, { color: c.text.primary }]}>Which of your values felt present today?</Text>
            <View style={styles.chipWrap}>
              {activeValues.map((v) => {
                const active = valueChosen === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setValueChosen(v);
                    }}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? c.accent.primary : c.border.medium,
                        backgroundColor: active ? c.accent.primary : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? c.text.inverse : c.text.primary,
                        fontWeight: "700",
                        fontSize: 14,
                      }}
                    >
                      {v}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>
        )}

        {/* ------------------------------ STEP 1 · Life context */}
        {step === 1 && (
          <GlassCard padding="lg">
            <Text
              style={{
                color: c.text.primary,
                fontSize: 22,
                fontFamily: Typography.fontFamily.serifItalic,
                lineHeight: 28,
              }}
            >
              What's around today?
            </Text>
            <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
              Pick anything that fits. These shape how the score reads your day —
              pressure on one side, replenishment on the other.
            </Text>

            <Text
              style={{
                color: c.text.tertiary,
                fontSize: Typography.fontSize.xs,
                fontFamily: Typography.fontFamily.bold,
                letterSpacing: Typography.letterSpacing.allcaps,
                fontWeight: "800",
                marginTop: Spacing.md,
              }}
            >
              PRESSURES
            </Text>
            <View style={styles.chipWrap}>
              {demandTags.map((t) => {
                const active = selected.has(t.id);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => toggleTag(t.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? c.accent.primary : c.border.medium,
                        backgroundColor: active ? c.accent.primary : "transparent",
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.label} — ${t.hint}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={{
                        color: active ? c.text.inverse : c.text.primary,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.customRow}>
              <TextInput
                value={customDemandText}
                onChangeText={setCustomDemandText}
                placeholder="Add your own pressure…"
                placeholderTextColor={c.text.tertiary}
                returnKeyType="done"
                onSubmitEditing={() => submitCustomTag("demand")}
                style={[
                  styles.customInput,
                  { borderColor: c.border.medium, color: c.text.primary },
                ]}
                accessibilityLabel="Add a custom pressure tag"
              />
              <Pressable
                onPress={() => submitCustomTag("demand")}
                disabled={!customDemandText.trim()}
                accessibilityRole="button"
                accessibilityLabel="Save custom pressure tag"
                style={({ pressed }) => [
                  styles.customAddBtn,
                  {
                    borderColor: c.accent.primary,
                    backgroundColor: c.accent.primary,
                    opacity: !customDemandText.trim() ? 0.4 : pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={{ color: c.text.inverse, fontWeight: "800", fontSize: 13 }}>Add</Text>
              </Pressable>
            </View>

            <Text
              style={{
                color: c.text.tertiary,
                fontSize: Typography.fontSize.xs,
                fontFamily: Typography.fontFamily.bold,
                letterSpacing: Typography.letterSpacing.allcaps,
                fontWeight: "800",
                marginTop: Spacing.md,
              }}
            >
              REPLENISHERS
            </Text>
            <View style={styles.chipWrap}>
              {resourceTags.map((t) => {
                const active = selected.has(t.id);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => toggleTag(t.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? c.lime : c.border.medium,
                        backgroundColor: active ? c.lime : "transparent",
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.label} — ${t.hint}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={{
                        color: active ? c.accent.primary : c.text.primary,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.customRow}>
              <TextInput
                value={customResourceText}
                onChangeText={setCustomResourceText}
                placeholder="Add your own replenisher…"
                placeholderTextColor={c.text.tertiary}
                returnKeyType="done"
                onSubmitEditing={() => submitCustomTag("resource")}
                style={[
                  styles.customInput,
                  { borderColor: c.border.medium, color: c.text.primary },
                ]}
                accessibilityLabel="Add a custom replenisher tag"
              />
              <Pressable
                onPress={() => submitCustomTag("resource")}
                disabled={!customResourceText.trim()}
                accessibilityRole="button"
                accessibilityLabel="Save custom replenisher tag"
                style={({ pressed }) => [
                  styles.customAddBtn,
                  {
                    borderColor: c.lime,
                    backgroundColor: c.lime,
                    opacity: !customResourceText.trim() ? 0.4 : pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={{ color: c.accent.primary, fontWeight: "800", fontSize: 13 }}>Add</Text>
              </Pressable>
            </View>

            <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: Spacing.md, lineHeight: 16 }}>
              Tip: tap anything — you can always change it later. The app doesn't
              judge what's a demand or a resource, just how they balance.
            </Text>
          </GlassCard>
        )}

        {/* ------------------------------ STEP 2 · Note + LLM */}
        {step === 2 && (
          <>
            <GlassCard padding="lg">
              <Text
                style={{
                  color: c.text.primary,
                  fontSize: 22,
                  fontFamily: Typography.fontFamily.serifItalic,
                  lineHeight: 28,
                }}
              >
                What happened today?
              </Text>
              <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
                A line or two — whatever's on your mind. Stored on your device.
                You can ask the model for a deeper read once you've written it.
              </Text>

              <TextInput
                placeholder="e.g. Long day. Viva prep is getting to me but a walk with a mate helped."
                placeholderTextColor={c.text.tertiary}
                value={note}
                onChangeText={setNote}
                multiline
                style={[
                  styles.input,
                  {
                    borderColor: c.border.medium,
                    color: c.text.primary,
                    minHeight: 110,
                    textAlignVertical: "top",
                  },
                ]}
              />

              {/* Deeper read trigger */}
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: Spacing.sm, gap: 10 }}>
                <Pressable
                  disabled={!note.trim() || llmLoading}
                  onPress={runDeeperRead}
                  accessibilityRole="button"
                  accessibilityLabel="Ask the model for a deeper read of this note"
                  style={({ pressed }) => [
                    styles.deeperBtn,
                    {
                      borderColor: c.accent.primary,
                      backgroundColor: "rgba(44,54,42,0.04)",
                      opacity: !note.trim() || llmLoading ? 0.5 : 1,
                    },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <IconSymbol name="sparkles" size={14} color={c.accent.primary} />
                  <Text style={{ color: c.accent.primary, fontWeight: "800", fontSize: 13 }}>
                    {llmLoading ? "Reading…" : "Ask for a deeper read"}
                  </Text>
                </Pressable>
                <Text style={{ flex: 1, color: c.text.tertiary, fontSize: 11, lineHeight: 15 }}>
                  Scrubbed of anything identifying before it leaves the phone.
                </Text>
              </View>
              {llmSource === "safety" ? (
                <Text style={{ color: c.text.tertiary, fontSize: 11, fontStyle: "italic", marginTop: 6 }}>
                  Deeper read paused for safety — see Profile → Settings → If you need support.
                </Text>
              ) : llmSource === "local" ? (
                <Text style={{ color: c.text.tertiary, fontSize: 11, fontStyle: "italic", marginTop: 6 }}>
                  Read locally on your device. Suggestions below are from the
                  on-device matcher — no network needed.
                </Text>
              ) : null}
            </GlassCard>

            {/* Confirmable chips */}
            {pendingSuggestions.length > 0 && (
              <GlassCard>
                <Text
                  style={{
                    color: c.text.tertiary,
                    fontSize: Typography.fontSize.xs,
                    fontFamily: Typography.fontFamily.bold,
                    letterSpacing: Typography.letterSpacing.allcaps,
                    fontWeight: "800",
                  }}
                >
                  NOTICED IN YOUR NOTE
                </Text>
                <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 4 }}>
                  Tap to add these as context. Nothing is saved until you accept it.
                </Text>
                <View style={{ gap: 8, marginTop: Spacing.sm }}>
                  {pendingSuggestions.map((s) => (
                    <View
                      key={s.tagId}
                      style={[
                        styles.suggestionRow,
                        { borderColor: c.border.light, backgroundColor: c.glass.secondary },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 14 }}>
                          {s.label}
                        </Text>
                        <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 2 }}>
                          {s.source === "llm" ? "model" : "on-device"} ·{" "}
                          <Text style={{ fontStyle: "italic" }}>"{s.trigger}"</Text>
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => acceptSuggestion(s)}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${s.label}`}
                        style={[styles.suggestBtn, { backgroundColor: c.accent.primary }]}
                      >
                        <Text style={{ color: c.text.inverse, fontWeight: "800", fontSize: 12 }}>
                          Add
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => rejectSuggestion(s.tagId)}
                        accessibilityRole="button"
                        accessibilityLabel={`Dismiss ${s.label}`}
                        style={[
                          styles.suggestBtn,
                          { backgroundColor: "transparent", borderWidth: 1, borderColor: c.border.medium },
                        ]}
                      >
                        <Text style={{ color: c.text.secondary, fontWeight: "800", fontSize: 12 }}>
                          Not this
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </GlassCard>
            )}
          </>
        )}
      </Animated.View>

      {/* Footer nav buttons -------------------------------- */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: Spacing.sm }}>
        {step > 0 && (
          <Pressable
            onPress={() => animateStep(step - 1)}
            style={({ pressed }) => [
              styles.navBtn,
              { borderColor: c.border.medium, backgroundColor: c.glass.primary },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15 }}>Back</Text>
          </Pressable>
        )}

        {step < TOTAL_STEPS - 1 ? (
          <Pressable
            onPress={() => animateStep(step + 1)}
            style={({ pressed }) => [
              styles.navBtn,
              {
                flex: 1,
                backgroundColor: c.accent.primary,
                borderColor: c.accent.primary,
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={{ color: c.text.inverse, fontWeight: "800", fontSize: 15 }}>Next</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={save}
            style={({ pressed }) => [
              styles.navBtn,
              {
                flex: 1,
                backgroundColor: c.lime,
                borderColor: c.lime,
              },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={{ color: c.accent.primary, fontWeight: "900", fontSize: 15 }}>
              Save check-in
            </Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginTop: Spacing.xs },
  backBtn: { padding: 10, borderRadius: BorderRadius.md, borderWidth: 1 },
  fieldLabel: { fontWeight: "800", fontSize: 13, marginTop: Spacing.md, letterSpacing: 0.4 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: Spacing.sm },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: BorderRadius.full, borderWidth: 1.5 },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: Spacing.sm,
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: 9,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  customAddBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  input: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: 14,
    fontSize: 15,
  },
  deeperBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  suggestBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
  },
  navBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
