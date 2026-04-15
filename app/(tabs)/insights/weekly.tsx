import React, { useEffect, useState } from "react";
import { Text, View, useColorScheme } from "react-native";
import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { Colors } from "@/constants/Colors";
import { getPlanAdherenceSummary, listDailyRecords, listEmotions, listPlans } from "@/lib/storage";
import type { EmotionValue } from "@/lib/types";
import { quadrantOf } from "@/lib/emotion";
import { NUDGE_ENABLED_KEY, STREAKS_ENABLED_KEY, getBooleanSetting } from "@/lib/privacy";
import { Spacing, BorderRadius } from "@/constants/Spacing";

function quadrantLabel(q: string): string {
  if (q === "pleasantCalm") return "calm and positive";
  if (q === "pleasantActivated") return "energised and positive";
  if (q === "unpleasantCalm") return "low and drained";
  if (q === "unpleasantActivated") return "tense and stressed";
  return q;
}

export default function WeeklyInsights() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const glowPrimary = isDark ? "rgba(125,136,255,0.28)" : "rgba(138,124,255,0.28)";

  const [valueTop, setValueTop] = useState<{ value: EmotionValue; count: number }[]>([]);
  const [regSummary, setRegSummary] = useState<string>("");
  const [quadrantSummary, setQuadrantSummary] = useState<string>("");
  const [adherenceLine, setAdherenceLine] = useState<string>("");
  const [adherenceVsLbi, setAdherenceVsLbi] = useState<string>("");
  const [weeklyMeaning, setWeeklyMeaning] = useState<string>("");

  useEffect(() => {
    (async () => {
      const streakToggle = await getBooleanSetting(STREAKS_ENABLED_KEY, true);
      const emos = await listEmotions(30);
      if (emos.length) {
        const freq: Record<string, number> = {};
        const reg: Record<string, number> = {};
        const quad: Record<string, number> = {};
        emos.forEach((e) => {
          freq[e.valueChosen] = (freq[e.valueChosen] ?? 0) + 1;
          reg[e.regulation] = (reg[e.regulation] ?? 0) + 1;
          const q = quadrantOf(e.valence, e.arousal);
          quad[q] = (quad[q] ?? 0) + 1;
        });
        setValueTop(Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([value, count]) => ({ value, count })));
        const regSkew = Object.entries(reg).sort((a, b) => b[1] - a[1])[0];
        if (regSkew) setRegSummary(`You've mostly been feeling ${regSkew[0] === "handled" ? "in control" : regSkew[0] === "manageable" ? "like things are manageable" : "overwhelmed"} (${regSkew[1]} days).`);
        const quadTop = Object.entries(quad).sort((a, b) => b[1] - a[1])[0];
        if (quadTop) setQuadrantSummary(`You've spent most of your time feeling ${quadrantLabel(quadTop[0])}.`);
      }

      const adh = await getPlanAdherenceSummary(7);
      setAdherenceLine(
        streakToggle
          ? `You completed your plan on ${adh.completedDays} out of ${adh.totalDays} days this week (${adh.adherencePct}%), with a ${adh.streak}-day streak.`
          : `You completed your plan on ${adh.completedDays} out of ${adh.totalDays} days this week (${adh.adherencePct}%).`
      );

      const plans = await listPlans(14);
      const records = await listDailyRecords(14);
      const pairs: Array<{ x: number; y: number }> = [];
      for (const p of plans) {
        const rec = records.find((r) => r.date === p.date);
        if (!rec || typeof rec.lbi !== "number") continue;
        const done = (p.completedActions ?? []).filter(Boolean).length;
        if (!p.actions.length) continue;
        pairs.push({ x: done / p.actions.length, y: rec.lbi });
      }
      if (pairs.length >= 5) {
        const mx = pairs.reduce((s, v) => s + v.x, 0) / pairs.length;
        const my = pairs.reduce((s, v) => s + v.y, 0) / pairs.length;
        const cov = pairs.reduce((s, v) => s + (v.x - mx) * (v.y - my), 0);
        const sx = Math.sqrt(pairs.reduce((s, v) => s + Math.pow(v.x - mx, 2), 0));
        const sy = Math.sqrt(pairs.reduce((s, v) => s + Math.pow(v.y - my, 2), 0));
        const r = sx && sy ? cov / (sx * sy) : 0;
        if (r > 0.3) setAdherenceVsLbi("It looks like completing your plan tends to go hand-in-hand with a better score the next day.");
        else if (r < -0.3) setAdherenceVsLbi("Interestingly, your score doesn't seem to improve when you complete more actions. This might mean the actions need adjusting.");
        else setAdherenceVsLbi("There's no clear link yet between completing your plan and your score. More data will help clarify this.");
      } else {
        setAdherenceVsLbi("We need a few more days of data before we can spot any patterns here.");
      }

      const recentRecords = await listDailyRecords(14);
      const last7 = recentRecords.slice(-7).filter((r) => typeof r.lbi === "number");
      const prev7 = recentRecords.slice(-14, -7).filter((r) => typeof r.lbi === "number");
      if (last7.length >= 3 && prev7.length >= 3) {
        const avg = (xs: typeof last7) => Math.round(xs.reduce((s, r) => s + (r.lbi ?? 0), 0) / xs.length);
        const delta = avg(last7) - avg(prev7);
        setWeeklyMeaning(
          delta === 0
            ? "Your balance has been steady this week — no big swings either way."
            : delta > 0
            ? `Things are looking up — your average balance improved by ${delta} points compared to last week.`
            : `Your balance dipped by ${Math.abs(delta)} points this week. Check if sleep, stress, or routine changes might be behind it.`
        );
      } else {
        setWeeklyMeaning("Keep logging for another week and we'll be able to show you how things are trending.");
      }
    })();
  }, []);

  return (
    <Screen scroll title="Your week" subtitle="A look at how your week has gone">
      {/* Values */}
      <GlassCard>
        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17, marginBottom: 4 }}>Values you showed up for</Text>
        {valueTop.length === 0 ? (
          <Text style={{ color: c.text.tertiary }}>Log a few days to see which values come through most.</Text>
        ) : (
          <>
            <Text style={{ color: c.text.tertiary, marginTop: 4, marginBottom: 8 }}>These are the values you connected with most often.</Text>
            {valueTop.map((v, i) => (
              <View key={v.value} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: i === 0 ? glowPrimary : c.glass.primary, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 13 }}>{i + 1}</Text>
                </View>
                <Text style={{ color: c.text.primary, fontWeight: "700", fontSize: 15, flex: 1 }}>{v.value}</Text>
                <Text style={{ color: c.text.tertiary, fontSize: 13 }}>{v.count} time{v.count === 1 ? "" : "s"}</Text>
              </View>
            ))}
          </>
        )}
      </GlassCard>

      {/* Emotional state */}
      <GlassCard>
        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17, marginBottom: 4 }}>How you've been feeling</Text>
        <Text style={{ color: c.text.tertiary, marginTop: 6 }}>{regSummary || "Not enough data yet."}</Text>
        <Text style={{ color: c.text.tertiary, marginTop: 6 }}>{quadrantSummary || ""}</Text>
      </GlassCard>

      {/* Adherence */}
      <GlassCard>
        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17, marginBottom: 4 }}>Following through</Text>
        <Text style={{ color: c.text.tertiary }}>{adherenceLine || "No plan data yet."}</Text>
        <Text style={{ color: c.text.tertiary, marginTop: 8 }}>{adherenceVsLbi}</Text>
      </GlassCard>

      {/* Weekly trend */}
      <GlassCard>
        <Text style={{ color: c.text.primary, fontWeight: "800", fontSize: 17, marginBottom: 4 }}>The bigger picture</Text>
        <Text style={{ color: c.text.tertiary }}>{weeklyMeaning}</Text>
      </GlassCard>

      <Text style={{ color: c.text.tertiary, fontSize: 12, textAlign: "center", marginTop: Spacing.lg, lineHeight: 16 }}>
        These patterns are observational — they show what happened, not what caused it.
      </Text>
    </Screen>
  );
}
