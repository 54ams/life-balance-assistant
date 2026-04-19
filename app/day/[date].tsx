import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { RadarChart } from "@/components/ui/RadarChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";
import { getDay, loadPlan, type StoredPlan } from "@/lib/storage";
import type { DailyRecord } from "@/lib/types";
import { formatDateFull } from "@/lib/util/formatDate";

function moodLabel(v: number): string {
  return ["", "Very low", "Low", "Neutral", "Good", "Great"][v] ?? "";
}
function energyLabel(v: number): string {
  return ["", "Exhausted", "Low", "Moderate", "High", "Energised"][v] ?? "";
}
function regulationEmoji(r: string): string {
  if (r === "handled") return "Handled well";
  if (r === "manageable") return "Manageable";
  return "Overwhelmed";
}

export default function DayDetailsScreen() {
  const params = useLocalSearchParams();
  const dateParam = params.date;
  const date = Array.isArray(dateParam) ? dateParam[0] : dateParam;

  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = scheme === "dark" ? Colors.dark : Colors.light;

  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const [record, setRecord] = useState<DailyRecord | null>(null);

  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!date) return;
        try {
          const p = await loadPlan(date);
          const day = await getDay(date as any);
          if (!alive) return;
          setPlan(p);
          setRecord(day);
          setError(null);
        } catch (e: any) {
          if (!alive) return;
          setError(e?.message ?? "Failed to load day data.");
        }
      })();
      return () => { alive = false; };
    }, [date])
  );

  const delta = useMemo(() => {
    if (!plan) return null;
    return typeof plan.baseline === "number" ? plan.lbi - plan.baseline : null;
  }, [plan]);

  const statusTone = useMemo(() => {
    if (!plan) return c.text.secondary;
    return plan.category === "RECOVERY" ? c.danger : c.success;
  }, [plan, c]);

  const displayDate = date
    ? formatDateFull(date as string)
    : "No date";

  const hasData = record?.checkIn || record?.wearable || record?.lbi != null;

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: "Day details", headerShown: false, gestureEnabled: true }} />

      <Text style={{ fontSize: 28, fontWeight: "900", color: c.text.primary, letterSpacing: -0.3 }}>
        Day details
      </Text>
      <Text style={{ marginTop: Spacing.xs, color: c.text.secondary, fontSize: 14 }}>
        {displayDate}
      </Text>

      {error ? (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <EmptyState icon="exclamationmark.triangle" title="Something went wrong" description={error} />
        </GlassCard>
      ) : !date ? (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <EmptyState icon="calendar" title="No date selected" description="Navigate here from the home screen or calendar." />
        </GlassCard>
      ) : !hasData ? (
        <GlassCard style={{ marginTop: Spacing.md }}>
          <EmptyState
            icon="square.and.pencil"
            title="No data for this day"
            description="Complete a check-in or sync wearable data to see details."
          />
        </GlassCard>
      ) : (
        <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>

          {/* Score hero + category badge */}
          {(record?.lbi != null || plan) && (
            <GlassCard>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View>
                  <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "600" }}>Balance score</Text>
                  <Text style={{ color: c.text.primary, fontSize: 48, fontWeight: "900", marginTop: 2 }}>
                    {plan?.lbi ?? record?.lbi ?? "—"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  {plan && (
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: BorderRadius.full,
                        backgroundColor: statusTone + "15",
                      }}
                    >
                      <Text style={{ color: statusTone, fontWeight: "700", fontSize: 12 }}>
                        {plan.category === "RECOVERY" ? "Recovery day" : "Normal day"}
                      </Text>
                    </View>
                  )}
                  {delta != null && (
                    <Text style={{ color: delta >= 0 ? c.success : c.danger, fontSize: 14, fontWeight: "800" }}>
                      {delta > 0 ? "+" : ""}{delta} vs baseline
                    </Text>
                  )}
                  {plan && (
                    <Text style={{ color: c.text.tertiary, fontSize: 12 }}>
                      Confidence: {plan.confidence ?? "—"}
                    </Text>
                  )}
                </View>
              </View>

              <Pressable
                onPress={() => router.push({ pathname: "/insights/explain", params: { date } })}
                style={({ pressed }) => [{ marginTop: Spacing.sm }, pressed && { opacity: 0.6 }]}
              >
                <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 13 }}>
                  Why did I get this score?
                </Text>
              </Pressable>
            </GlassCard>
          )}

          {/* Subscore breakdown */}
          {record?.lbiMeta && (
            <GlassCard>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16, marginBottom: Spacing.sm }}>
                Score breakdown
              </Text>
              <RadarChart
                axes={[
                  { label: "Recovery", value: record.wearable?.recovery ?? 50 },
                  { label: "Sleep", value: Math.min(100, (record.wearable?.sleepHours ?? 7) / 9 * 100) },
                  { label: "Mood", value: (record.checkIn?.mood ?? 3) / 5 * 100 },
                  { label: "Stress", value: 100 - ((record.checkIn?.stressLevel ?? 3) / 5 * 100) },
                ]}
              />
            </GlassCard>
          )}

          {/* Wearable metrics */}
          {record?.wearable && (
            <GlassCard>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16, marginBottom: Spacing.sm }}>
                Wearable data
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <MetricPill label="Recovery" value={`${record.wearable.recovery}%`} c={c} isDark={isDark} />
                <MetricPill label="Sleep" value={`${record.wearable.sleepHours}h`} c={c} isDark={isDark} />
                {record.wearable.strain != null && (
                  <MetricPill label="Strain" value={`${record.wearable.strain.toFixed(1)}`} c={c} isDark={isDark} />
                )}
              </View>
              {(record.wearable.hrv != null || record.wearable.restingHR != null) && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  {record.wearable.hrv != null && <MetricPill label="HRV" value={`${record.wearable.hrv}ms`} c={c} isDark={isDark} />}
                  {record.wearable.restingHR != null && <MetricPill label="RHR" value={`${record.wearable.restingHR}bpm`} c={c} isDark={isDark} />}
                </View>
              )}
              <Pressable onPress={() => router.push("/profile/integrations/whoop" as any)} style={({ pressed }) => [{ marginTop: Spacing.sm }, pressed && { opacity: 0.6 }]}>
                <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 13 }}>Manage wearable →</Text>
              </Pressable>
            </GlassCard>
          )}

          {/* Check-in data */}
          {record?.checkIn && (
            <GlassCard>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16, marginBottom: Spacing.sm }}>
                Check-in
              </Text>
              <View style={{ gap: 8 }}>
                <SignalRow label="Mood" value={moodLabel(record.checkIn.mood)} level={record.checkIn.mood} c={c} isDark={isDark} />
                <SignalRow label="Energy" value={energyLabel(record.checkIn.energy ?? 3)} level={record.checkIn.energy ?? 3} c={c} isDark={isDark} />
                <SignalRow label="Stress" value={["", "None", "Mild", "Moderate", "High", "Severe"][record.checkIn.stressLevel ?? 3]} level={6 - (record.checkIn.stressLevel ?? 3)} c={c} isDark={isDark} />
                <SignalRow label="Sleep quality" value={["", "Terrible", "Poor", "Fair", "Good", "Excellent"][record.checkIn.sleepQuality ?? 3]} level={record.checkIn.sleepQuality ?? 3} c={c} isDark={isDark} />
              </View>

              {/* Behaviours */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: Spacing.sm }}>
                {record.checkIn.exerciseDone && <BehaviourChip label="Exercise" positive c={c} isDark={isDark} />}
                {record.checkIn.caffeineAfter2pm && <BehaviourChip label="Caffeine after 2pm" positive={false} c={c} isDark={isDark} />}
                {record.checkIn.alcohol && <BehaviourChip label="Alcohol" positive={false} c={c} isDark={isDark} />}
              </View>

              {(record.checkIn.deepWorkMins != null && record.checkIn.deepWorkMins > 0) && (
                <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 6 }}>
                  Deep work: {record.checkIn.deepWorkMins} min
                </Text>
              )}
              {(record.checkIn.hydrationLitres != null && record.checkIn.hydrationLitres > 0) && (
                <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>
                  Hydration: {record.checkIn.hydrationLitres}L
                </Text>
              )}

              {record.checkIn.notes ? (
                <View style={{ marginTop: Spacing.sm, padding: 12, borderRadius: BorderRadius.lg, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                  <Text style={{ color: c.text.tertiary, fontSize: 11, fontWeight: "600", marginBottom: 4 }}>Notes</Text>
                  <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18 }}>{record.checkIn.notes}</Text>
                </View>
              ) : null}
            </GlassCard>
          )}

          {/* Stress indicators */}
          {record?.checkIn?.stressIndicators && Object.values(record.checkIn.stressIndicators).some(Boolean) && (
            <GlassCard>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16, marginBottom: Spacing.sm }}>
                Stress indicators
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(record.checkIn.stressIndicators)
                  .filter(([, v]) => v)
                  .map(([key]) => (
                    <View
                      key={key}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: BorderRadius.full,
                        backgroundColor: isDark ? "rgba(255,122,134,0.1)" : "rgba(214,69,80,0.06)",
                      }}
                    >
                      <Text style={{ color: c.danger, fontSize: 13, fontWeight: "600" }}>
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim()}
                      </Text>
                    </View>
                  ))}
              </View>
              <Pressable onPress={() => router.push("/checkin/grounding" as any)} style={({ pressed }) => [{ marginTop: Spacing.sm }, pressed && { opacity: 0.6 }]}>
                <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 13 }}>Try a grounding exercise →</Text>
              </Pressable>
            </GlassCard>
          )}

          {/* Emotional snapshot */}
          {record?.emotion && (
            <GlassCard>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16, marginBottom: Spacing.sm }}>
                Emotional state
              </Text>

              {/* Affect canvas thumbnail — shows where the user placed themselves */}
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 12,
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  alignSelf: "center",
                  marginBottom: Spacing.sm,
                  position: "relative",
                  borderWidth: 1,
                  borderColor: c.border.light,
                }}
              >
                {/* Axis labels */}
                <Text style={{ position: "absolute", top: 2, left: 0, right: 0, textAlign: "center", fontSize: 8, color: c.text.tertiary }}>Activated</Text>
                <Text style={{ position: "absolute", bottom: 2, left: 0, right: 0, textAlign: "center", fontSize: 8, color: c.text.tertiary }}>Calm</Text>
                <Text style={{ position: "absolute", left: 4, top: 0, bottom: 0, textAlignVertical: "center", fontSize: 8, color: c.text.tertiary, lineHeight: 100 }}>−</Text>
                <Text style={{ position: "absolute", right: 4, top: 0, bottom: 0, textAlignVertical: "center", fontSize: 8, color: c.text.tertiary, lineHeight: 100 }}>+</Text>
                {/* Crosshair */}
                <View style={{ position: "absolute", left: 50, top: 10, bottom: 10, width: 1, backgroundColor: c.border.light }} />
                <View style={{ position: "absolute", top: 50, left: 10, right: 10, height: 1, backgroundColor: c.border.light }} />
                {/* Dot — valence is x (-1..1 → 10..90), arousal is y (1..-1 → 10..90) */}
                <View
                  style={{
                    position: "absolute",
                    left: 10 + (record.emotion.valence + 1) * 40 - 6,
                    top: 10 + (1 - record.emotion.arousal) * 40 - 6,
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: c.accent.primary,
                    borderWidth: 2,
                    borderColor: c.lime,
                  }}
                />
              </View>

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <MetricPill label="Valence" value={record.emotion.valence > 0 ? "Positive" : record.emotion.valence < 0 ? "Negative" : "Neutral"} c={c} isDark={isDark} />
                  <MetricPill label="Arousal" value={record.emotion.arousal > 0.3 ? "Activated" : record.emotion.arousal < -0.3 ? "Calm" : "Moderate"} c={c} isDark={isDark} />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <MetricPill label="Regulation" value={regulationEmoji(record.emotion.regulation)} c={c} isDark={isDark} />
                  <MetricPill label="Value" value={record.emotion.valueChosen} c={c} isDark={isDark} />
                </View>
              </View>

              {record.emotion.contextTags.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {record.emotion.contextTags.map((tag) => (
                    <View key={tag} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, backgroundColor: isDark ? "rgba(124,111,220,0.1)" : "rgba(107,93,211,0.06)" }}>
                      <Text style={{ color: c.accent.primary, fontSize: 12, fontWeight: "600" }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              {record.emotion.reflection ? (
                <View style={{ marginTop: Spacing.sm, padding: 12, borderRadius: BorderRadius.lg, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                  <Text style={{ color: c.text.tertiary, fontSize: 11, fontWeight: "600", marginBottom: 4 }}>Reflection</Text>
                  <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18 }}>{record.emotion.reflection}</Text>
                </View>
              ) : null}

              <Pressable onPress={() => router.push("/insights/emotions" as any)} style={({ pressed }) => [{ marginTop: Spacing.sm }, pressed && { opacity: 0.6 }]}>
                <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 13 }}>See emotion patterns →</Text>
              </Pressable>
            </GlassCard>
          )}

          {/* Plan */}
          {plan && (
            <GlassCard>
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 16 }}>Plan</Text>
              <Text style={{ color: c.text.secondary, fontSize: 14, marginTop: 4 }}>{plan.focus}</Text>

              <View style={{ marginTop: Spacing.sm, gap: 6 }}>
                {plan.actions.map((a, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                    <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: c.border.heavy, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                      {plan.completedActions?.[i] && <Text style={{ color: c.success, fontSize: 11, fontWeight: "800" }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.text.primary, fontSize: 14, fontWeight: "600" }}>{a}</Text>
                      {plan.actionReasons?.[i] && (
                        <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 2 }}>{plan.actionReasons[i]}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {plan.triggers.length > 0 && (
                <>
                  <Text style={{ color: c.text.secondary, fontWeight: "700", fontSize: 13, marginTop: Spacing.sm }}>Triggers</Text>
                  <View style={{ marginTop: 4, gap: 4 }}>
                    {plan.triggers.map((t, i) => (
                      <Text key={i} style={{ color: c.text.secondary, fontSize: 13 }}>• {t}</Text>
                    ))}
                  </View>
                </>
              )}

              {plan.explanation && (
                <View style={{ marginTop: Spacing.sm, padding: 12, borderRadius: BorderRadius.lg, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                  <Text style={{ color: c.text.tertiary, fontSize: 11, fontWeight: "600", marginBottom: 4 }}>Explanation</Text>
                  <Text style={{ color: c.text.secondary, fontSize: 13, lineHeight: 18 }}>{plan.explanation}</Text>
                </View>
              )}

              <Pressable onPress={() => router.push({ pathname: "/history/plan-details", params: { date } })} style={({ pressed }) => [{ marginTop: Spacing.sm }, pressed && { opacity: 0.6 }]}>
                <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 13 }}>View full plan →</Text>
              </Pressable>
            </GlassCard>
          )}
        </View>
      )}
    </Screen>
  );
}

/* --- Sub-components --- */

function MetricPill({ label, value, c, isDark }: { label: string; value: string; c: typeof Colors.light; isDark: boolean }) {
  return (
    <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: BorderRadius.lg, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", alignItems: "center" }}>
      <Text style={{ color: c.text.tertiary, fontSize: 11, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: c.text.primary, fontSize: 14, fontWeight: "800", marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function SignalRow({ label, value, level, c, isDark }: { label: string; value: string; level: number; c: typeof Colors.light; isDark: boolean }) {
  const pct = Math.min(100, (level / 5) * 100);
  const barColor = pct >= 60 ? c.success : pct >= 40 ? c.warning : c.danger;

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: c.text.secondary, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: c.text.primary, fontSize: 13, fontWeight: "700" }}>{value}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", overflow: "hidden" }}>
        <View style={{ height: 6, borderRadius: 3, width: `${pct}%`, backgroundColor: barColor }} />
      </View>
    </View>
  );
}

function BehaviourChip({ label, positive, c, isDark }: { label: string; positive: boolean; c: typeof Colors.light; isDark: boolean }) {
  const bg = positive
    ? (isDark ? "rgba(87,214,164,0.1)" : "rgba(47,163,122,0.06)")
    : (isDark ? "rgba(251,191,36,0.1)" : "rgba(217,119,6,0.06)");
  const color = positive ? c.success : c.warning;

  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, backgroundColor: bg }}>
      <Text style={{ color, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}
