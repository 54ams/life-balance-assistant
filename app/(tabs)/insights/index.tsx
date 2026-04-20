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
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { TAB_ORDER } from "@/constants/navigation";
import { useColorScheme } from "react-native";
import { todayISO } from "@/lib/util/todayISO";
import { TabSwipe } from "@/components/TabSwipe";
import { getDay, listDailyRecords, loadPlan, type StoredPlan } from "@/lib/storage";
import { mentalScore, physioScore, narrativeFor } from "@/lib/bridge";
import { calculateLBI, type LbiOutput } from "@/lib/lbi";
import { computeBaseline } from "@/lib/baseline";
import { getCachedRecommendation, type SmartRecommendation } from "@/lib/smartRecommendation";
import { formatDateFriendly } from "@/lib/util/formatDate";
import type { DailyRecord } from "@/lib/types";
import * as Haptics from "expo-haptics";

/* ── plain-English helpers ─────────────────────────── */

function scoreWord(score: number): string {
  if (score >= 75) return "great";
  if (score >= 60) return "good";
  if (score >= 45) return "okay";
  if (score >= 30) return "low";
  return "very low";
}

function sleepSummary(hours: number | undefined): string {
  if (hours == null) return "No sleep data yet.";
  const h = Math.round(hours * 10) / 10;
  if (h >= 8) return `You got ${h} hours of sleep — that's solid rest.`;
  if (h >= 7) return `${h} hours of sleep — decent, but a bit more wouldn't hurt.`;
  if (h >= 6) return `Only ${h} hours of sleep. Your body could use more.`;
  return `${h} hours of sleep — that's quite low. Prioritise rest tonight.`;
}

function recoverySummary(recovery: number | undefined): string {
  if (recovery == null) return "No recovery data yet.";
  if (recovery >= 67) return `Recovery at ${recovery}% — your body is feeling ready.`;
  if (recovery >= 34) return `Recovery at ${recovery}% — your body is getting there.`;
  return `Recovery at ${recovery}% — take it easy, your body needs time.`;
}

function strainSummary(strain: number | undefined): string {
  if (strain == null) return "";
  if (strain >= 18) return `Yesterday's strain was very high (${strain.toFixed(1)}). Be kind to yourself today.`;
  if (strain >= 14) return `Good effort yesterday (strain ${strain.toFixed(1)}). Balance it with some recovery today.`;
  if (strain >= 8) return `Moderate activity yesterday (strain ${strain.toFixed(1)}). You're in a good place.`;
  return `Light activity yesterday (strain ${strain.toFixed(1)}). You've got energy to use.`;
}

function mindBodyInsight(physio: number | null, mental: number | null): { front: string; back: string } {
  if (physio == null && mental == null) {
    return {
      front: "How your body and mind compare",
      back: "Check in and sync your wearable to see how your physical and mental sides line up.",
    };
  }
  if (physio == null) {
    return {
      front: "Your mind has checked in",
      back: "Sync your wearable to see the full picture of how body and mind compare.",
    };
  }
  if (mental == null) {
    return {
      front: "Your body data is in",
      back: "Do a quick check-in so we can show how your mind and body line up today.",
    };
  }
  const gap = Math.abs(physio - mental);
  const bodyAhead = physio > mental;
  if (gap <= 10) {
    const avg = (physio + mental) / 2;
    if (avg >= 60) return { front: "Body and mind are in sync today", back: "Both sides are doing well and agree with each other. A good day to be productive or enjoy yourself." };
    if (avg <= 35) return { front: "Both body and mind are feeling low", back: "Your physical and mental sides are both struggling. Focus on rest, food, and gentle care today." };
    return { front: "Body and mind are balanced", back: "Neither side is pulling ahead. A steady, unremarkable day — and that's perfectly fine." };
  }
  if (bodyAhead) {
    if (gap >= 30) return { front: "Your body is doing better than your mind", back: "Physically you're in decent shape, but mentally things are harder. Try something that lifts your mood — a walk, music, or talking to someone." };
    return { front: "Body slightly ahead of mind today", back: "Your physical side is a bit stronger than how you're feeling mentally. Nothing to worry about, but check in with yourself." };
  }
  if (gap >= 30) return { front: "Your mind is doing better than your body", back: "Mentally you're in a good place, but your body needs attention. Prioritise sleep, nutrition, and lighter activity." };
  return { front: "Mind slightly ahead of body today", back: "You're feeling mentally sharper than your body is. Give your body a bit of extra care." };
}

function baselineInsight(lbi: number, baseline: number | null): { front: string; back: string } {
  if (baseline == null) {
    return {
      front: "Building your personal baseline",
      back: "After a few more days of data, the app will learn what's normal for you personally — so it can spot when things shift.",
    };
  }
  const diff = lbi - baseline;
  if (Math.abs(diff) <= 5) {
    return {
      front: "Right around your normal",
      back: `Your score today (${lbi}) is close to your usual baseline (${baseline}). Things are steady.`,
    };
  }
  if (diff > 0) {
    return {
      front: `${diff} points above your normal`,
      back: `You're scoring ${lbi} today, which is ${diff} points above your usual ${baseline}. Whatever you're doing is working.`,
    };
  }
  return {
    front: `${Math.abs(diff)} points below your normal`,
    back: `You're at ${lbi} today, which is ${Math.abs(diff)} points below your usual ${baseline}. It might be worth slowing down and giving yourself some extra care.`,
  };
}

function labelFor(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yISO = yesterday.toISOString().slice(0, 10);
  if (iso === yISO) return "Yesterday";
  return formatDateFriendly(iso);
}

export default function InsightsHome() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = Colors[scheme ?? "light"];
  const today = todayISO();
  const [dataCount, setDataCount] = useState(0);

  const [physio, setPhysio] = useState<number | null>(null);
  const [mental, setMental] = useState<number | null>(null);
  const [lbi, setLbi] = useState<LbiOutput | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const [smartRec, setSmartRec] = useState<SmartRecommendation | null>(null);
  const [recentRecords, setRecentRecords] = useState<DailyRecord[]>([]);
  const [wearable, setWearable] = useState<DailyRecord["wearable"] | null>(null);

  // Flip states for each card
  const [flipBalance, setFlipBalance] = useState(false);
  const [flipBody, setFlipBody] = useState(false);

  const [flipBridge, setFlipBridge] = useState(false);
  const [flipBaseline, setFlipBaseline] = useState(false);
  const [flipPlan, setFlipPlan] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const records = await listDailyRecords(30);
        if (!alive) return;
        const withData = records.filter((r) => r.lbi != null);
        setDataCount(withData.length);
        setRecentRecords(
          records
            .filter((r) => r.checkIn != null || r.emotion != null)
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .slice(0, 5),
        );

        const day = await getDay(today);
        if (!alive) return;
        setPhysio(day ? physioScore(day) : null);
        setMental(day ? mentalScore(day) : null);
        setWearable(day?.wearable ?? null);
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

        const [bl, p, rec] = await Promise.all([
          computeBaseline(7),
          loadPlan(today),
          getCachedRecommendation(today),
        ]);
        if (!alive) return;
        setBaseline(bl);
        setPlan(p);
        if (rec) setSmartRec(rec);
      })();
      return () => { alive = false; };
    }, [today]),
  );

  const hasOrbData = physio != null || mental != null;
  const narrative = narrativeFor(physio, mental);
  const bridge = mindBodyInsight(physio, mental);
  const baselineInfo = lbi ? baselineInsight(lbi.lbi, baseline) : null;

  return (
    <TabSwipe order={TAB_ORDER}>
      <Screen scroll>
        {/* Header */}
        <Text
          style={{
            color: c.text.tertiary,
            fontSize: Typography.fontSize.xs,
            fontFamily: Typography.fontFamily.bold,
            letterSpacing: Typography.letterSpacing.allcaps,
            fontWeight: "800",
          }}
        >
          YOUR DATA
        </Text>
        <Text
          style={{
            color: c.text.primary,
            fontSize: 38,
            fontFamily: Typography.fontFamily.serifItalic,
            letterSpacing: -0.3,
            marginTop: 4,
            lineHeight: 44,
          }}
        >
          Insights
        </Text>
        <Text style={{ marginTop: 6, color: c.text.secondary, fontSize: 14, lineHeight: 20 }}>
          {dataCount > 0
            ? `Based on ${dataCount} days of your data. Tap any card to learn more.`
            : "Your data, unpacked in plain English. Check in and sync to get started."}
        </Text>

        {dataCount === 0 ? (
          <GlassCard style={{ marginTop: Spacing.lg }}>
            <EmptyState
              icon="chart.bar.xaxis"
              title="No insights yet"
              description="Complete a few check-ins and sync your wearable to unlock personalised insights about your wellbeing."
              actionLabel="Start Check-in"
              onAction={() => router.push("/checkin" as any)}
            />
          </GlassCard>
        ) : (
          <View style={{ gap: Spacing.sm, marginTop: Spacing.lg }}>
            {/* ── Today's Balance (hero flip card) ── */}
            {hasOrbData && (
              <FlipCard
                flipped={flipBalance}
                onToggle={() => setFlipBalance((v) => !v)}
                accessibilityLabel={`Today's balance. Tap to ${flipBalance ? "hide" : "see"} details.`}
                front={
                  <GlassCard padding="lg">
                    <Text style={{ color: c.text.tertiary, fontSize: 10, letterSpacing: 1.2, fontWeight: "800", textAlign: "center" }}>
                      HOW YOU'RE DOING TODAY
                    </Text>
                    <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "700", textAlign: "center", marginTop: 8, lineHeight: 22 }}>
                      {narrative}
                    </Text>
                    <View style={{ alignItems: "center", marginTop: Spacing.base }} pointerEvents="none">
                      <StateOrb physio={physio} mental={mental} lbi={lbi ? lbi.lbi : null} size={180} />
                    </View>
                    {lbi && (
                      <Text style={{ color: c.text.secondary, fontSize: 13, textAlign: "center", marginTop: Spacing.sm, fontWeight: "600" }}>
                        Balance score: {lbi.lbi} — that's {scoreWord(lbi.lbi)}
                      </Text>
                    )}
                    <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: Spacing.sm, textAlign: "center", fontWeight: "600" }}>
                      Tap to see what's behind this
                    </Text>
                  </GlassCard>
                }
                back={
                  <GlassCard padding="lg">
                    <Text style={{ color: c.text.tertiary, fontSize: 10, letterSpacing: 1.2, fontWeight: "800" }}>
                      WHAT MAKES UP YOUR SCORE
                    </Text>
                    {lbi ? (
                      <View style={{ marginTop: Spacing.sm, gap: 10 }}>
                        <Text style={{ color: c.text.primary, fontSize: 14, lineHeight: 20 }}>
                          Your balance score combines how your body is doing (recovery and sleep) with how your mind is doing (mood and stress). The body side counts a bit more because physical signals are measured, while mental signals come from your check-in.
                        </Text>
                        <View style={{ gap: 6, marginTop: 4 }}>
                          <ScoreRow label="Recovery" value={lbi.subscores.recovery} c={c} />
                          <ScoreRow label="Sleep" value={lbi.subscores.sleep} c={c} />
                          <ScoreRow label="Mood" value={lbi.subscores.mood} c={c} />
                          <ScoreRow label="Stress" value={lbi.subscores.stress} c={c} />
                        </View>
                        <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 6 }}>
                          Confidence: {lbi.confidence === "high" ? "Good amount of data" : lbi.confidence === "medium" ? "Some data missing" : "Limited data — check in or sync for better accuracy"}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ color: c.text.secondary, fontSize: 14, marginTop: Spacing.sm }}>
                        Not enough data to break down yet. Complete your check-in or sync your wearable.
                      </Text>
                    )}
                    <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: Spacing.sm, textAlign: "center", fontWeight: "600" }}>
                      Tap to go back
                    </Text>
                  </GlassCard>
                }
              />
            )}

            {/* ── Smart Recommendation ── */}
            {smartRec && (
              <GlassCard padding="base">
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: c.lime + "28", alignItems: "center", justifyContent: "center" }}>
                    <IconSymbol name="lightbulb.fill" size={15} color={c.accent.primary} />
                  </View>
                  <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }}>TODAY'S SUGGESTION</Text>
                </View>
                <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15, lineHeight: 20 }}>
                  {smartRec.headline}
                </Text>
                <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                  {smartRec.text}
                </Text>
              </GlassCard>
            )}

            {/* ── Body Card ── */}
            {wearable && (
              <FlipCard
                flipped={flipBody}
                onToggle={() => setFlipBody((v) => !v)}
                accessibilityLabel="Body insights"
                front={
                  <GlassCard padding="base">
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: "#E86B6B22", alignItems: "center", justifyContent: "center" }}>
                        <IconSymbol name="heart.fill" size={15} color="#E86B6B" />
                      </View>
                      <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }}>YOUR BODY</Text>
                    </View>
                    <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15, lineHeight: 20 }}>
                      {recoverySummary(wearable.recovery)}
                    </Text>
                    <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                      {sleepSummary(wearable.sleepHours)}
                    </Text>
                    <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 8, fontWeight: "600" }}>
                      Tap for more detail
                    </Text>
                  </GlassCard>
                }
                back={
                  <GlassCard padding="base">
                    <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8 }}>BODY DETAILS</Text>
                    <View style={{ gap: 8 }}>
                      <DetailRow label="Recovery" value={wearable.recovery != null ? `${wearable.recovery}%` : "—"} c={c} />
                      <DetailRow label="Sleep" value={wearable.sleepHours != null ? `${(Math.round(wearable.sleepHours * 10) / 10)}h` : "—"} c={c} />
                      {wearable.strain != null && <DetailRow label="Strain" value={wearable.strain.toFixed(1)} c={c} />}
                      {wearable.strain != null && (
                        <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                          {strainSummary(wearable.strain)}
                        </Text>
                      )}
                    </View>
                    <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 8, textAlign: "center", fontWeight: "600" }}>
                      Tap to go back
                    </Text>
                  </GlassCard>
                }
              />
            )}

            {/* ── Mind-Body Bridge Card ── */}
            <FlipCard
              flipped={flipBridge}
              onToggle={() => setFlipBridge((v) => !v)}
              accessibilityLabel="Mind-body bridge"
              front={
                <GlassCard padding="base">
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: c.accent.primary + "22", alignItems: "center", justifyContent: "center" }}>
                      <IconSymbol name="arrow.left.arrow.right" size={15} color={c.accent.primary} />
                    </View>
                    <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }}>MIND–BODY CONNECTION</Text>
                  </View>
                  <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15, lineHeight: 20 }}>
                    {bridge.front}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
                    {physio != null && (
                      <View style={{ alignItems: "center" }}>
                        <Text style={{ color: c.text.primary, fontSize: 22, fontWeight: "900" }}>{Math.round(physio)}</Text>
                        <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>BODY</Text>
                      </View>
                    )}
                    {mental != null && (
                      <View style={{ alignItems: "center" }}>
                        <Text style={{ color: c.text.primary, fontSize: 22, fontWeight: "900" }}>{Math.round(mental)}</Text>
                        <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>MIND</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 8, fontWeight: "600" }}>
                    Tap to understand what this means
                  </Text>
                </GlassCard>
              }
              back={
                <GlassCard padding="base">
                  <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8 }}>WHAT THIS MEANS</Text>
                  <Text style={{ color: c.text.primary, fontSize: 14, lineHeight: 20 }}>
                    {bridge.back}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      router.push({ pathname: "/insights/bridge", params: { date: today } } as any);
                    }}
                    style={({ pressed }) => [{ marginTop: 12 }, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={{ color: c.accent.primary, fontWeight: "700", fontSize: 13 }}>
                      See the full trend over time →
                    </Text>
                  </Pressable>
                  <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 8, textAlign: "center", fontWeight: "600" }}>
                    Tap to go back
                  </Text>
                </GlassCard>
              }
            />

            {/* ── Baseline Card ── */}
            {baselineInfo && (
              <FlipCard
                flipped={flipBaseline}
                onToggle={() => setFlipBaseline((v) => !v)}
                accessibilityLabel="Personal baseline"
                front={
                  <GlassCard padding="base">
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: "#57D6A422", alignItems: "center", justifyContent: "center" }}>
                        <IconSymbol name="chart.bar" size={15} color="#57D6A4" />
                      </View>
                      <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }}>YOUR BASELINE</Text>
                    </View>
                    <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15, lineHeight: 20 }}>
                      {baselineInfo.front}
                    </Text>
                    <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 8, fontWeight: "600" }}>
                      Tap to learn more
                    </Text>
                  </GlassCard>
                }
                back={
                  <GlassCard padding="base">
                    <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8 }}>YOUR BASELINE</Text>
                    <Text style={{ color: c.text.primary, fontSize: 14, lineHeight: 20 }}>
                      {baselineInfo.back}
                    </Text>
                    <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 8, lineHeight: 17 }}>
                      Your baseline is the middle of your scores over the last 7 days. It updates as you go, so it always reflects your recent normal.
                    </Text>
                    <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 8, textAlign: "center", fontWeight: "600" }}>
                      Tap to go back
                    </Text>
                  </GlassCard>
                }
              />
            )}

            {/* ── Today's Plan Card ── */}
            {plan && (
              <FlipCard
                flipped={flipPlan}
                onToggle={() => setFlipPlan((v) => !v)}
                accessibilityLabel="Today's plan"
                front={
                  <GlassCard padding="base">
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: "#E0B27822", alignItems: "center", justifyContent: "center" }}>
                        <IconSymbol name="checklist" size={15} color="#E0B278" />
                      </View>
                      <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }}>TODAY'S PLAN</Text>
                    </View>
                    <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15, lineHeight: 20 }}>
                      {plan.focus}
                    </Text>
                    <Text style={{ color: c.text.secondary, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                      {plan.actions.length} action{plan.actions.length !== 1 ? "s" : ""} suggested for you today
                    </Text>
                    <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 8, fontWeight: "600" }}>
                      Tap to see your actions
                    </Text>
                  </GlassCard>
                }
                back={
                  <GlassCard padding="base">
                    <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8 }}>YOUR ACTIONS</Text>
                    <View style={{ gap: 10 }}>
                      {plan.actions.map((action, i) => (
                        <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.accent.primary + "18", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                            <Text style={{ color: c.accent.primary, fontSize: 11, fontWeight: "800" }}>{i + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: c.text.primary, fontSize: 14, lineHeight: 19, fontWeight: "600" }}>{action}</Text>
                            {plan.actionReasons?.[i] && (
                              <Text style={{ color: c.text.tertiary, fontSize: 12, marginTop: 2, lineHeight: 16 }}>
                                {plan.actionReasons[i]}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                    {plan.explanation && (
                      <Text style={{ color: c.text.secondary, fontSize: 12, marginTop: 10, lineHeight: 17, fontStyle: "italic" }}>
                        {plan.explanation}
                      </Text>
                    )}
                    <Text style={{ color: c.text.tertiary, fontSize: 11, marginTop: 8, textAlign: "center", fontWeight: "600" }}>
                      Tap to go back
                    </Text>
                  </GlassCard>
                }
              />
            )}

            {/* ── Explore More ── */}
            <View style={{ marginTop: Spacing.sm }}>
              <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: Spacing.xs }}>
                DIVE DEEPER
              </Text>
              <GlassCard padding="base">
                <View style={{ gap: 2 }}>
                  {[
                    { title: "Trends over time", route: "/insights/trends", icon: "chart.line.uptrend.xyaxis" },
                    { title: "What affects what", route: "/insights/correlations", icon: "arrow.triangle.branch" },
                    { title: "Your patterns", route: "/insights/patterns", icon: "square.grid.2x2" },
                    { title: "Emotional log", route: "/insights/emotions", icon: "heart.text.square" },
                    { title: "Consistency", route: "/insights/consistency", icon: "checkmark.circle" },
                    { title: "Weekly reflection", route: "/insights/weekly", icon: "text.book.closed" },
                  ].map((item, i) => (
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
            </View>

            {/* ── Recent Check-ins ── */}
            {recentRecords.length > 0 && (
              <View style={{ marginTop: Spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xs }}>
                  <Text style={{ color: c.text.tertiary, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 }}>
                    RECENT CHECK-INS
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      router.push("/checkins" as any);
                    }}
                    style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                  >
                    <Text style={{ color: c.accent.primary, fontSize: 12, fontWeight: "700" }}>See all</Text>
                  </Pressable>
                </View>
                <GlassCard padding="base">
                  {recentRecords.map((r, i) => {
                    const p = physioScore(r);
                    const m = mentalScore(r);
                    return (
                      <Pressable
                        key={r.date}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          router.push({ pathname: "/day/[date]", params: { date: r.date } } as any);
                        }}
                        style={({ pressed }) => [
                          {
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 10,
                            gap: 12,
                            borderTopWidth: i > 0 ? 1 : 0,
                            borderTopColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                          },
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 14 }}>
                            {labelFor(r.date)}
                          </Text>
                          <View style={{ flexDirection: "row", gap: 12, marginTop: 3 }}>
                            {p != null && <Text style={{ color: c.text.secondary, fontSize: 12 }}>Body {Math.round(p)}</Text>}
                            {m != null && <Text style={{ color: c.text.secondary, fontSize: 12 }}>Mind {Math.round(m)}</Text>}
                          </View>
                        </View>
                        <IconSymbol name="chevron.right" size={12} color={c.text.tertiary} />
                      </Pressable>
                    );
                  })}
                </GlassCard>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={{ marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: 12, color: c.text.tertiary, textAlign: "center", lineHeight: 16 }}>
            Patterns are things to notice, not rules. Nothing here is a diagnosis.
          </Text>
        </View>
      </Screen>
    </TabSwipe>
  );
}

/* ── Small reusable components ─────────────────────── */

function ScoreRow({ label, value, c }: { label: string; value: number; c: typeof Colors.light }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text style={{ color: c.text.secondary, fontSize: 13, fontWeight: "600", width: 70 }}>{label}</Text>
      <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(44,54,42,0.08)", overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", borderRadius: 3, backgroundColor: pct >= 60 ? c.success ?? c.accent.primary : c.accent.primary }} />
      </View>
      <Text style={{ color: c.text.primary, fontSize: 13, fontWeight: "700", width: 28, textAlign: "right" }}>{pct}</Text>
    </View>
  );
}

function DetailRow({ label, value, c }: { label: string; value: string; c: typeof Colors.light }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ color: c.text.secondary, fontSize: 14, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: c.text.primary, fontSize: 16, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}
