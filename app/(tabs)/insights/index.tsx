import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EmptyState } from "@/components/ui/EmptyState";
import { StateOrb } from "@/components/ui/StateOrb";
import { FlipCard } from "@/components/ui/FlipCard";
import { WorkingPanel } from "@/components/ui/WorkingPanel";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { TAB_ORDER } from "@/constants/navigation";
import { useColorScheme } from "react-native";
import { todayISO } from "@/lib/util/todayISO";
import { TabSwipe } from "@/components/TabSwipe";
import { getDay, listDailyRecords } from "@/lib/storage";
import { mentalScore, physioScore, narrativeFor } from "@/lib/bridge";
import { calculateLBI, type LbiOutput } from "@/lib/lbi";
import { agreementForDay, type AgreementResult } from "@/lib/triangulation";
import * as Haptics from "expo-haptics";

type InsightCategory = {
  title: string;
  description: string;
  icon: string;
  color: string;
  items: { title: string; route: string; icon: string }[];
};

export default function InsightsHome() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];
  const today = todayISO();
  const [dataCount, setDataCount] = useState(0);

  // Today's balance — for the hero orb + flip panel
  const [physio, setPhysio] = useState<number | null>(null);
  const [mental, setMental] = useState<number | null>(null);
  const [lbi, setLbi] = useState<LbiOutput | null>(null);
  const [orbFlipped, setOrbFlipped] = useState(false);
  const [agreement, setAgreement] = useState<AgreementResult | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const records = await listDailyRecords(30);
        if (!alive) return;
        setDataCount(records.filter((r) => r.lbi != null).length);

        const day = await getDay(today);
        if (!alive) return;
        setPhysio(day ? physioScore(day) : null);
        setMental(day ? mentalScore(day) : null);
        if (day?.wearable || day?.checkIn) {
          const out = calculateLBI({
            recovery: day.wearable?.recovery ?? 50,
            sleepHours: day.wearable?.sleepHours ?? 7,
            strain: day.wearable?.strain,
            checkIn: day.checkIn ?? null,
          });
          if (alive) setLbi(out);
        } else if (alive) {
          setLbi(null);
        }

        // Triangulation across the four modalities captured so far.
        if (alive) setAgreement(day ? agreementForDay(day) : null);
      })();
      return () => { alive = false; };
    }, [today])
  );

  const hasOrbData = physio != null || mental != null;
  const narrative = narrativeFor(physio, mental);

  const categories: InsightCategory[] = [
    {
      title: "Your Score",
      description: "Understand what drives your balance score and what-if scenarios",
      icon: "lightbulb.fill",
      color: isDark ? "#FBBF24" : "#D97706",
      items: [
        { title: "Why this score", route: "/insights/explain", icon: "lightbulb.fill" },
        { title: "Score breakdown", route: "/insights/integration", icon: "slider.horizontal.3" },
        { title: "Personal baseline", route: "/insights/baseline", icon: "chart.bar" },
      ],
    },
    {
      title: "Your Patterns",
      description: "Discover trends, correlations, and what affects your wellbeing",
      icon: "chart.line.uptrend.xyaxis",
      color: isDark ? "#57D6A4" : "#2FA37A",
      items: [
        { title: "Mind–Body Bridge", route: "/insights/bridge", icon: "heart.text.square" },
        { title: "Trends", route: "/insights/trends", icon: "chart.line.uptrend.xyaxis" },
        { title: "Correlations", route: "/insights/correlations", icon: "arrow.triangle.branch" },
        { title: "Patterns", route: "/insights/patterns", icon: "square.grid.2x2" },
        { title: "Consistency", route: "/insights/consistency", icon: "checkmark.circle" },
        { title: "Emotions", route: "/insights/emotions", icon: "heart.text.square" },
      ],
    },
    {
      title: "Your Plan",
      description: "Track adherence, risk outlook, and weekly reflections",
      icon: "checklist",
      color: isDark ? "#8B7FE8" : "#6B5DD3",
      items: [
        { title: "Adherence & LBI", route: "/insights/adherence", icon: "checklist" },
        { title: "Risk outlook", route: "/insights/risk", icon: "exclamationmark.triangle" },
        { title: "Weekly reflection", route: "/insights/weekly", icon: "text.book.closed" },
      ],
    },
  ];

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll>
        <Text style={{ fontSize: 28, fontWeight: "900", color: c.text.primary, letterSpacing: -0.3 }}>
          Insights
        </Text>
        <Text style={{ marginTop: 4, color: c.text.secondary, fontSize: 14 }}>
          {dataCount > 0
            ? `Based on ${dataCount} days of your data`
            : "Your data, a little unpacked. Things moving together isn't the same as one causing the other."}
        </Text>

        {hasOrbData ? (
          <View style={{ marginTop: Spacing.lg }}>
            <FlipCard
              flipped={orbFlipped}
              onToggle={() => setOrbFlipped((v) => !v)}
              accessibilityLabel={`Today's balance. Tap to ${orbFlipped ? "hide" : "show"} the maths.`}
              front={
                <GlassCard padding="lg">
                  <Text style={{ color: c.text.tertiary, fontSize: 10, letterSpacing: 1.2, fontWeight: "800", textAlign: "center" }}>
                    TODAY'S BALANCE
                  </Text>
                  <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "700", textAlign: "center", marginTop: 8, lineHeight: 22 }}>
                    {narrative}
                  </Text>
                  <View style={{ alignItems: "center", marginTop: Spacing.base }} pointerEvents="none">
                    <StateOrb
                      physio={physio}
                      mental={mental}
                      lbi={lbi ? lbi.lbi : null}
                      size={200}
                    />
                  </View>
                  {agreement && agreement.modalities >= 2 ? (
                    <View
                      style={{
                        marginTop: Spacing.base,
                        alignSelf: "center",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: c.border.light,
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor:
                            agreement.label === "converging"
                              ? c.lime
                              : agreement.label === "mostly agreeing"
                                ? c.accent.primaryLight
                                : c.warning,
                        }}
                      />
                      <Text
                        style={{
                          color: c.text.secondary,
                          fontSize: 11,
                          fontWeight: "800",
                          letterSpacing: 0.6,
                        }}
                      >
                        {agreement.label.toUpperCase()} · {agreement.modalities}/4 SIGNALS
                      </Text>
                    </View>
                  ) : null}
                  <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: Spacing.base, textAlign: "center", fontWeight: "600" }}>
                    Tap to show the maths
                  </Text>
                </GlassCard>
              }
              back={
                lbi ? (
                  <WorkingPanel
                    summary="How your balance score for today was put together."
                    inputs={[
                      `Recovery sub-score: ${Math.round(lbi.subscores.recovery)} / 100`,
                      `Sleep sub-score: ${Math.round(lbi.subscores.sleep)} / 100`,
                      `Mood sub-score: ${Math.round(lbi.subscores.mood)} / 100`,
                      `Stress sub-score: ${Math.round(lbi.subscores.stress)} / 100`,
                    ]}
                    method="Body side (recovery + sleep, weighted equally) counts for 70%. Mind side (mood + stress, weighted equally) counts for 30%. Add them up, round to a whole number."
                    result={`Balance score ${lbi.lbi} / 100 · ${lbi.classification} · confidence ${lbi.confidence}`}
                    footnote="The orb shows the feel; this shows the maths behind it."
                  />
                ) : (
                  <WorkingPanel
                    summary="There's not quite enough saved for today to work out a balance score yet."
                    method="Add a quick check-in or sync a wearable to see the breakdown."
                  />
                )
              }
            />
          </View>
        ) : null}

        {dataCount === 0 ? (
          <GlassCard style={{ marginTop: Spacing.lg }}>
            <EmptyState
              icon="chart.bar.xaxis"
              title="No insights yet"
              description="Complete a few days of check-ins and sync your wearable to unlock personalised insights."
              actionLabel="Start Check-in"
              onAction={() => router.push("/checkin" as any)}
            />
          </GlassCard>
        ) : (
          <View style={{ gap: Spacing.md, marginTop: Spacing.base }}>
            {categories.map((cat) => (
              <GlassCard key={cat.title} padding="base">
                {/* Category header */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.sm }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      backgroundColor: cat.color + "18",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSymbol name={cat.icon as any} size={20} color={cat.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17 }}>{cat.title}</Text>
                    <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 2 }}>{cat.description}</Text>
                  </View>
                </View>

                {/* Category items */}
                <View style={{ gap: 2 }}>
                  {cat.items.map((item, i) => (
                    <Pressable
                      key={item.route}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({ pathname: item.route, params: { date: today } } as any);
                      }}
                      style={({ pressed }) => [
                        {
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          paddingVertical: 12,
                          paddingHorizontal: 4,
                          borderTopWidth: i > 0 ? 1 : 0,
                          borderTopColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                        },
                        pressed && { opacity: 0.6 },
                      ]}
                    >
                      <IconSymbol name={item.icon as any} size={16} color={c.text.secondary} />
                      <Text style={{ flex: 1, color: c.text.primary, fontWeight: "600", fontSize: 15 }}>
                        {item.title}
                      </Text>
                      <IconSymbol name="chevron.right" size={12} color={c.text.tertiary} />
                    </Pressable>
                  ))}
                </View>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Advanced — for the curious */}
        <GlassCard style={{ marginTop: Spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: c.glass.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSymbol name="cpu" size={16} color={c.text.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.text.primary }}>How the score holds up</Text>
              <Text style={{ fontSize: 12, color: c.text.secondary }}>For when you want to peek under the hood</Text>
            </View>
            <Pressable
              onPress={() => router.push("/insights/performance" as any)}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.accent.primary }}>View</Text>
            </Pressable>
          </View>
        </GlassCard>

        {/* Detailed numbers */}
        <GlassCard style={{ marginTop: Spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: c.glass.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconSymbol name="doc.text" size={16} color={c.text.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: c.text.primary }}>All the numbers</Text>
              <Text style={{ fontSize: 12, color: c.text.secondary }}>Every stat the app has worked out from your data</Text>
            </View>
            <Pressable
              onPress={() => router.push("/insights/analytics" as any)}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.accent.primary }}>View</Text>
            </Pressable>
          </View>
        </GlassCard>

        {/* Transparency */}
        <View style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: 12, color: c.text.tertiary, textAlign: "center", lineHeight: 16 }}>
            Patterns are things to notice, not rules · Less data means less confident · Nothing here is a diagnosis
          </Text>
        </View>
      </Screen>
    </TabSwipe>
  );
}
