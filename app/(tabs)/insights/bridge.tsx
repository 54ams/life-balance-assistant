import { Stack, router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Colors } from "@/constants/Colors";
import { Spacing, BorderRadius } from "@/constants/Spacing";

import type { DailyRecord, ISODate } from "@/lib/types";
import { getAllDays } from "@/lib/storage";
import { sliceRecordsUpTo } from "@/lib/range";
import { buildAnalyticsSummary } from "@/lib/analytics";
import { todayISO } from "@/lib/util/todayISO";
import { mentalScore, physioScore } from "@/lib/bridge";
import { cognitiveLoadScore } from "@/lib/derive";
import { agreementForDay } from "@/lib/triangulation";

type BridgePoint = {
  date: ISODate;
  physio: number | null;
  mental: number | null;
  load: number | null;
};

function buildPoints(days: DailyRecord[]): BridgePoint[] {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : 1));
  return sorted.map((d) => ({
    date: d.date,
    physio: physioScore(d),
    mental: mentalScore(d),
    load: cognitiveLoadScore(d),
  }));
}

// -----------------------------------------------------------------------------
// Dual-line chart — pure-View implementation (no SVG dep)
// -----------------------------------------------------------------------------

function DualTrackChart({
  points,
  physioColor,
  mentalColor,
  loadColor,
  height = 140,
}: {
  points: BridgePoint[];
  physioColor: string;
  mentalColor: string;
  loadColor: string;
  height?: number;
}) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const axisColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const n = points.length;
  if (n < 2)
    return (
      <View style={{ height, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)", fontSize: 13 }}>
          Need at least 2 days of data to show the chart.
        </Text>
      </View>
    );

  const yOf = (v: number | null) => {
    if (v == null) return null;
    return height - (v / 100) * (height - 20) - 8;
  };

  return (
    <View style={{ height, position: "relative" }}>
      {/* Horizontal gridlines at 25/50/75 */}
      {[25, 50, 75].map((g) => (
        <View
          key={g}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: yOf(g)!,
            height: 1,
            backgroundColor: axisColor,
          }}
        />
      ))}

      {/* Tracks rendered as dots + connectors. Cognitive load sits
          alongside body + mind — per Thayer & Lane (2000), prefrontal
          load often leads physiological response, so showing the
          third line makes lag visible. */}
      {[
        { key: "physio", color: physioColor, get: (p: BridgePoint) => p.physio },
        { key: "mental", color: mentalColor, get: (p: BridgePoint) => p.mental },
        { key: "load", color: loadColor, get: (p: BridgePoint) => p.load },
      ].map((track) => (
        <View key={track.key} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
          {points.map((p, i) => {
            const y = yOf(track.get(p));
            if (y == null) return null;
            const leftPct = ((i / (n - 1)) * 100) as number;
            const widthPct = (100 / (n - 1)) as number;
            // Connector to next point
            const next = points[i + 1];
            const nextY = next ? yOf(track.get(next)) : null;
            return (
              <React.Fragment key={`${track.key}-${i}`}>
                {nextY != null && (
                  <View
                    style={{
                      position: "absolute",
                      left: `${leftPct}%` as `${number}%`,
                      top: Math.min(y, nextY),
                      width: `${widthPct}%` as `${number}%`,
                      height: Math.max(2, Math.abs(y - nextY)),
                      borderLeftWidth: 0,
                      borderTopWidth: 2,
                      borderColor: track.color,
                      opacity: 0.55,
                      transform: [
                        { translateY: y <= nextY ? 0 : -Math.abs(y - nextY) + 2 },
                      ],
                    }}
                  />
                )}
                <View
                  style={{
                    position: "absolute",
                    left: `${leftPct}%` as `${number}%`,
                    top: y - 4,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: track.color,
                    marginLeft: -4,
                  }}
                />
              </React.Fragment>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Screen
// -----------------------------------------------------------------------------

export default function BridgeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];

  const physioColor = isDark ? "#57D6A4" : "#2FA37A";
  const mentalColor = isDark ? "#A4BFB5" : "#6F9A90";
  // Load track uses the terracotta from the body-state gradient — it
  // reads as "the work your mind is doing", distinct from mood.
  const loadColor = isDark ? "#E0A088" : "#B87C5E";

  const [days, setDays] = useState<DailyRecord[]>([]);
  const [expanded, setExpanded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const all = await getAllDays();
        setDays(all);
      })();
    }, []),
  );

  const windowed = useMemo(() => sliceRecordsUpTo(days, todayISO(), 14), [days]);
  const points = useMemo(() => buildPoints(windowed), [windowed]);

  const summary = useMemo(() => buildAnalyticsSummary(windowed, 14), [windowed]);

  // Find the strongest lag-correlated physiological ↔ mental pair.
  const bestLag = useMemo(() => {
    const candidates = (summary.correlations ?? [])
      .filter((x: any) => typeof x.r === "number" && x.n >= 8)
      .filter((x: any) => {
        const physioVars = new Set(["recovery", "sleepHours"]);
        const mentalVars = new Set(["mood", "energy", "stressIndicatorsCount"]);
        return (
          (physioVars.has(x.a) && mentalVars.has(x.b)) ||
          (physioVars.has(x.b) && mentalVars.has(x.a))
        );
      })
      .sort((a: any, b: any) => Math.abs(b.r) - Math.abs(a.r));
    return candidates[0] ?? null;
  }, [summary]);

  // Plain-English insight line for the viva narrative.
  const insightLine = useMemo(() => {
    if (!bestLag || typeof bestLag.r !== "number") return null;
    const { a, b, r, lag } = bestLag;
    const mag = Math.abs(r);
    const strength = mag >= 0.6 ? "a strong" : mag >= 0.4 ? "a moderate" : "a light";
    const direction = r >= 0 ? "positive" : "inverse";
    const lagPart = lag && lag > 0 ? ` with a ${lag}-day lag` : " on the same day";
    return `Over the last 14 days there's ${strength} ${direction} relationship between ${humanName(a)} and ${humanName(b)}${lagPart}.`;
  }, [bestLag]);

  const haveData = points.some((p) => p.physio != null) && points.some((p) => p.mental != null);
  const haveLoad = points.some((p) => p.load != null);

  // Today's triangulation across the four modalities.
  const todayRecord = useMemo(
    () => windowed.find((d) => d.date === todayISO()) ?? windowed[windowed.length - 1] ?? null,
    [windowed],
  );
  const agreement = useMemo(
    () => (todayRecord ? agreementForDay(todayRecord) : null),
    [todayRecord],
  );

  return (
    <Screen title="Mind–Body Bridge" subtitle="How your body and mind track together">
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />

      <View style={{ gap: 12 }}>
        {!haveData ? (
          <GlassCard>
            <EmptyState
              icon="heart.text.square"
              title="Not enough signal yet"
              description="Log a few days of check-ins and sync your wearable. The bridge needs both tracks to appear."
            />
          </GlassCard>
        ) : (
          <>
            <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" accessibilityLabel={expanded ? "Collapse chart" : "Expand chart"}>
              <GlassCard padding="base">
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>
                    14-day bridge
                  </Text>
                  <Text style={{ color: c.text.tertiary, fontSize: 12 }}>
                    {expanded ? "Tap to collapse ↑" : "Tap to expand ↓"}
                  </Text>
                </View>
                <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4, marginBottom: 12 }}>
                  Body (recovery), Mind (mood, energy, stress indicators), and
                  Cognitive load (what your day was demanding) — watch how they
                  lead or lag each other.
                </Text>

                <DualTrackChart
                  points={points}
                  physioColor={physioColor}
                  mentalColor={mentalColor}
                  loadColor={loadColor}
                  height={expanded ? 280 : 140}
                />

                <View style={{ flexDirection: "row", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                  <LegendDot color={physioColor} label="Body" />
                  <LegendDot color={mentalColor} label="Mind" />
                  {haveLoad ? <LegendDot color={loadColor} label="Cognitive load" /> : null}
                </View>
              </GlassCard>
            </Pressable>

            {agreement && agreement.modalities >= 2 ? (
              <GlassCard padding="base">
                <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>
                  How much the signals agree
                </Text>
                <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                  {agreement.label === "converging"
                    ? "All the ways you logged today tell the same story."
                    : agreement.label === "mostly agreeing"
                      ? "Mostly pointing the same way, with a little variation."
                      : "The signals are telling different stories — worth a second look at the working."}
                </Text>
                <View
                  style={{
                    marginTop: 10,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.round(agreement.score * 100)}%`,
                      height: "100%",
                      backgroundColor: c.lime,
                    }}
                  />
                </View>
                <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 6 }}>
                  Agreement {Math.round(agreement.score * 100)} / 100 across{" "}
                  {agreement.modalities} source{agreement.modalities > 1 ? "s" : ""}:{" "}
                  {Object.keys(agreement.components).join(", ")}.
                </Text>
              </GlassCard>
            ) : null}

            <GlassCard padding="base">
              <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>
                What your data says
              </Text>
              {insightLine ? (
                <Text style={{ color: c.text.secondary, fontSize: 14, lineHeight: 20, marginTop: 8 }}>
                  {insightLine}
                </Text>
              ) : (
                <Text style={{ color: c.text.secondary, fontSize: 14, lineHeight: 20, marginTop: 8 }}>
                  We need a few more days with both wearable and check-in data before a stable relationship can be shown.
                </Text>
              )}
              {bestLag && (
                <View
                  style={{
                    marginTop: 12,
                    padding: 10,
                    borderRadius: BorderRadius.lg,
                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  }}
                >
                  <Text style={{ color: c.text.tertiary, fontSize: 11, lineHeight: 16 }}>
                    Statistical details · method: {bestLag.method ?? "spearman"} · r ={" "}
                    {typeof bestLag.r === "number" ? bestLag.r.toFixed(3) : "—"} · n = {bestLag.n} · lag ={" "}
                    {bestLag.lag ?? 0}d
                  </Text>
                </View>
              )}
            </GlassCard>

            <View style={{ paddingHorizontal: Spacing.sm }}>
              <Text style={{ color: c.text.tertiary, fontSize: 12, textAlign: "center", lineHeight: 16 }}>
                Exploratory pattern · correlation ≠ causation · meant for reflection, not diagnosis
              </Text>
            </View>
          </>
        )}

        <Pressable onPress={() => router.push("/checkin/grounding" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
          <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>Try a grounding exercise →</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/insights/weekly" as any)} style={({ pressed }) => [{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }, pressed && { opacity: 0.6 }]}>
          <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 14 }}>See your weekly reflection →</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? "light"];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ color: c.text.secondary, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function humanName(k: string): string {
  switch (k) {
    case "recovery":
      return "recovery";
    case "sleepHours":
      return "sleep hours";
    case "mood":
      return "mood";
    case "energy":
      return "energy";
    case "stressIndicatorsCount":
      return "stress indicators";
    default:
      return k;
  }
}
