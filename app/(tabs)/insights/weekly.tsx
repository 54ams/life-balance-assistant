import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { Screen } from "@/components/Screen";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAppTheme } from "@/theme/tokens";
import { getPlanAdherenceSummary, listDailyRecords, listEmotions, listPlans } from "@/lib/storage";
import type { EmotionValue } from "@/lib/types";
import { quadrantOf } from "@/lib/emotion";
import { NUDGE_ENABLED_KEY, STREAKS_ENABLED_KEY, getBooleanSetting } from "@/lib/privacy";

export default function WeeklyInsights() {
  const t = useAppTheme();
  const [valueTop, setValueTop] = useState<{ value: EmotionValue; count: number }[]>([]);
  const [regSummary, setRegSummary] = useState<string>("");
  const [quadrantSummary, setQuadrantSummary] = useState<string>("");
  const [adherenceLine, setAdherenceLine] = useState<string>("");
  const [adherenceVsLbi, setAdherenceVsLbi] = useState<string>("");
  const [showStreaks, setShowStreaks] = useState(true);
  const [nudgeEnabled, setNudgeEnabled] = useState(true);
  const [weeklyMeaning, setWeeklyMeaning] = useState<string>("");

  useEffect(() => {
    (async () => {
      const streakToggle = await getBooleanSetting(STREAKS_ENABLED_KEY, true);
      const nudgeToggle = await getBooleanSetting(NUDGE_ENABLED_KEY, true);
      setShowStreaks(streakToggle);
      setNudgeEnabled(nudgeToggle);
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
        if (regSkew) setRegSummary(`Mostly ${regSkew[0]} (${regSkew[1]} days).`);
        const quadTop = Object.entries(quad).sort((a, b) => b[1] - a[1])[0];
        if (quadTop) setQuadrantSummary(`Often in ${quadTop[0].replace("pleasant", "pleasant ").replace("unpleasant", "unpleasant ")}.`);
      }

      const adh = await getPlanAdherenceSummary(7);
      setAdherenceLine(
        streakToggle
          ? `Weekly adherence ${adh.adherencePct}% (${adh.completedDays}/${adh.totalDays} days), streak ${adh.streak} day(s).`
          : `Weekly adherence ${adh.adherencePct}% (${adh.completedDays}/${adh.totalDays} days).`
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
        setAdherenceVsLbi(`Adherence vs LBI (14d): r=${r.toFixed(2)} (exploratory).`);
      } else {
        setAdherenceVsLbi("Adherence vs LBI needs at least 5 matched days.");
      }

      const recentRecords = await listDailyRecords(14);
      const last7 = recentRecords.slice(-7).filter((r) => typeof r.lbi === "number");
      const prev7 = recentRecords.slice(-14, -7).filter((r) => typeof r.lbi === "number");
      if (last7.length >= 3 && prev7.length >= 3) {
        const avg = (xs: typeof last7) => Math.round(xs.reduce((s, r) => s + (r.lbi ?? 0), 0) / xs.length);
        const delta = avg(last7) - avg(prev7);
        setWeeklyMeaning(
          delta === 0
            ? "Your average balance is broadly stable week to week."
            : delta > 0
            ? `Your average balance is improving week to week (${delta > 0 ? "+" : ""}${delta}).`
            : `Your average balance is softer than the previous week (${delta}). Review whether recovery-biased days or stress indicators have been recurring.`
        );
      } else {
        setWeeklyMeaning("You need more history before week-on-week interpretation becomes meaningful.");
      }
    })();
  }, []);

  return (
    <Screen scroll title="Weekly reflection" subtitle="Narrative-first; observational only">
      <GlassCard>
        <Text style={{ color: t.textPrimary, fontWeight: "800", fontSize: 16, marginBottom: 4 }}>Values you showed up for</Text>
        {valueTop.length === 0 ? (
          <Text style={{ color: t.textMuted }}>Log a few days to see patterns.</Text>
        ) : (
          valueTop.map((v) => (
            <Text key={v.value} style={{ color: t.textPrimary, fontWeight: "800", marginTop: 6 }}>
              {v.value}: {v.count} times
            </Text>
          ))
        )}
      </GlassCard>

      <GlassCard>
        <Text style={{ color: t.textPrimary, fontWeight: "800", fontSize: 16, marginBottom: 4 }}>Regulation</Text>
        <Text style={{ color: t.textMuted, marginTop: 6 }}>{regSummary || "No data yet."}</Text>
      </GlassCard>

      <GlassCard>
        <Text style={{ color: t.textPrimary, fontWeight: "800", fontSize: 16, marginBottom: 4 }}>Affect space</Text>
        <Text style={{ color: t.textMuted, marginTop: 6 }}>{quadrantSummary || "No data yet."}</Text>
        <Text style={{ color: t.textMuted, marginTop: 6 }}>Patterns are observational. Correlation ≠ causation.</Text>
      </GlassCard>

      <GlassCard>
        <Text style={{ color: t.textPrimary, fontWeight: "800", fontSize: 16, marginBottom: 4 }}>Adherence</Text>
        <Text style={{ color: t.textMuted }}>{adherenceLine || "No plan adherence data yet."}</Text>
        <Text style={{ color: t.textMuted, marginTop: 6 }}>{adherenceVsLbi}</Text>
        <Text style={{ color: t.textMuted, marginTop: 6 }}>{weeklyMeaning}</Text>
        <Text style={{ color: t.textMuted, marginTop: 6 }}>
          Evening nudges are {nudgeEnabled ? "enabled" : "disabled"}.
        </Text>
      </GlassCard>
    </Screen>
  );
}
