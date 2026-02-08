import { Stack, router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { InsightsDatePicker } from "@/components/InsightsDatePicker";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { computeBaseline } from "@/lib/baseline";
import { calculateLBI } from "@/lib/lbi";
import { buildDayExplain } from "@/lib/explain";
import { buildCounterfactuals } from "@/lib/counterfactual";
import { getInsightsSelectedDate, setInsightsSelectedDate } from "@/lib/insightsDate";
import { getDay, loadPlan, type StoredPlan } from "@/lib/storage";
import type { ISODate } from "@/lib/types";

function toDateParam(p: string | string[] | undefined) {
  if (!p) return undefined;
  return Array.isArray(p) ? p[0] : p;
}

function ProgressRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontWeight: "700", color }}>{label}</Text>
        <Text style={{ fontWeight: "800", color }}>{pct}</Text>
      </View>
      <View
        style={{
          marginTop: 8,
          height: 10,
          borderRadius: 999,
          backgroundColor: "rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 10,
            width: `${pct}%`,
            borderRadius: 999,
            backgroundColor: "rgba(0,0,0,0.18)",
          }}
        />
      </View>
    </View>
  );
}

export default function ExplainScoreScreen() {
  const [date, setDate] = useState<ISODate | undefined>(undefined);

  const scheme = useColorScheme();

  // Load persisted selected date once
  useEffect(() => {
    (async () => {
      const saved = await getInsightsSelectedDate();
      setDate(saved);
    })();
  }, []);

  // Persist when user changes date
  useEffect(() => {
    (async () => {
      if (!date) return;
      await setInsightsSelectedDate(date);
    })();
  }, [date]);
  const c = Colors[scheme ?? "light"] as any;

  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const [subscores, setSubscores] = useState<{ recovery: number; sleep: number; mood: number; stress: number } | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [lbi, setLbi] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!date) return;

        const day = await getDay(date);
        setCounterfactuals(buildCounterfactuals({ date, wearable: day?.wearable ?? null, checkIn: day?.checkIn ?? null }));
        const b = await computeBaseline(7);
        const p = await loadPlan(date);

        let computedLbi = p?.lbi;
        let computedSub = null as any;

        if (day?.wearable) {
          const out = calculateLBI({
            recovery: day.wearable.recovery,
            sleepHours: day.wearable.sleepHours,
            strain: day.wearable.strain,
            checkIn: day.checkIn,
          });
          computedLbi = out.lbi;
          computedSub = out.subscores;
        }

        if (!alive) return;
        setPlan(p);
        setBaseline(b);
        setLbi(computedLbi ?? null);
        setSubscores(computedSub);
      })();
      return () => {
        alive = false;
      };
    }, [date])
  );

  const [dayExplain, setDayExplain] = useState<ReturnType<typeof buildDayExplain> | null>(null);
  const [counterfactuals, setCounterfactuals] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!date) return;
        const record = await getDay(date);
        // Prefer recomputed lbi, fallback to saved plan lbi
        const value = (lbi ?? plan?.lbi ?? 0) as number;
        const b = baseline ?? null;
        const ex = buildDayExplain({ date, lbi: value, baseline: b, record });
        if (!alive) return;
        setDayExplain(ex);
      })();
      return () => {
        alive = false;
      };
    }, [date, lbi, baseline, plan?.lbi])
  );

  const titleDelta = dayExplain?.delta;
  const deltaText = titleDelta == null ? "—" : `${titleDelta > 0 ? "+" : ""}${titleDelta}`;

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: "Why this score", headerShown: false }} />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 26, fontWeight: "900", color: c.text }}>Why this score</Text>
          <Text style={{ marginTop: 6, color: c.muted }}>{date ?? "No date"}</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            {
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <IconSymbol name="chevron.left" size={18} color={c.text} />
        </Pressable>
      </View>

      <GlassCard style={{ marginTop: 14 }}>
        <Text style={{ color: c.text, fontWeight: "900" }}>Today</Text>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, marginTop: 10 }}>
          <Text style={{ fontSize: 44, fontWeight: "900", color: c.text }}>{dayExplain?.lbi ?? plan?.lbi ?? "—"}</Text>
          <Text style={{ fontSize: 16, fontWeight: "800", color: c.muted }}>Δ {deltaText} vs baseline</Text>
        </View>
        <Text style={{ marginTop: 10, color: c.muted }}>
          This is explainable by design: it uses baseline comparison + observable inputs. No black-box model is required to justify decisions.
        </Text>
      </GlassCard>

      {date ? (
        <View style={{ marginTop: 14 }}>
          <InsightsDatePicker
            date={date}
            onChange={setDate}
            title="As of"
            helperText="Explainability is shown for the selected day. Pick Today or any past date."
          />
        </View>
      ) : null}

      {/* Subscores */}
      <GlassCard style={{ marginTop: 12 }}>
        <Text style={{ color: c.text, fontWeight: "900" }}>What contributed</Text>
        <Text style={{ marginTop: 6, color: c.muted }}>
          Subscores are scaled 0–100. These are the inputs the index is based on.
        </Text>

        {subscores ? (
          <>
            <ProgressRow label="Recovery" value={subscores.recovery} color={c.text} />
            <ProgressRow label="Sleep" value={subscores.sleep} color={c.text} />
            <ProgressRow label="Mood" value={subscores.mood} color={c.text} />
            <ProgressRow label="Stress" value={subscores.stress} color={c.text} />
          </>
        ) : (
          <Text style={{ marginTop: 10, color: c.muted }}>
            Subscores are unavailable (wearables missing). Import wearables to unlock this breakdown.
          </Text>
        )}
      </GlassCard>

      {/* Drivers */}
      <GlassCard style={{ marginTop: 12 }}>
        <Text style={{ color: c.text, fontWeight: "900" }}>Top drivers</Text>
        <Text style={{ marginTop: 6, color: c.muted }}>
          The app highlights the strongest contributors so recommendations feel justified.
        </Text>

        <View style={{ marginTop: 10, gap: 10 }}>
          {(dayExplain?.drivers ?? []).map((d, i) => (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: "800" }}>{d.label}</Text>
                {d.detail ? <Text style={{ marginTop: 2, color: c.muted }}>{d.detail}</Text> : null}
              </View>
              <Text style={{ color: c.muted, fontWeight: "800" }}>{d.direction === "up" ? "↑" : "↓"} {d.strength}</Text>
            </View>
          ))}
        </View>

        {plan?.explanation ? (
          <Text style={{ marginTop: 12, color: c.muted }}>
            Saved plan rationale: {plan.explanation}
          </Text>
        ) : null}
      </GlassCard>

      {/* Uncertainty */}
      <GlassCard style={{ marginTop: 12 }}>
        <Text style={{ color: c.text, fontWeight: "900" }}>Accuracy and uncertainty</Text>
        <Text style={{ marginTop: 6, color: c.muted }}>
          Rather than pretending to be perfect, the system communicates what data is missing.
        </Text>

        <View style={{ marginTop: 10, gap: 10 }}>
          {(dayExplain?.accuracyReasons ?? []).map((r, i) => (
            <View key={i} style={{ gap: 2 }}>
              <Text style={{ color: c.text, fontWeight: "800" }}>
                {r.ok ? "✅" : "⚠️"} {r.label}
              </Text>
              <Text style={{ color: c.muted }}>{r.detail}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

{(dayExplain?.contextTags ?? []).length ? (
  <GlassCard style={{ marginTop: 12 }}>
    <Text style={{ color: c.text, fontSize: 14, fontWeight: "800" }}>Context tags</Text>
    <Text style={{ color: c.muted, marginTop: 6 }}>
      These help avoid misattributing physiological changes to “stress” when there’s a clear confound.
    </Text>

    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
      {(dayExplain?.contextTags ?? []).map((t: string) => (
        <View
          key={t}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)",
          }}
        >
          <Text style={{ color: c.text, fontWeight: "700" }}>{t.replaceAll("_", " ")}</Text>
        </View>
      ))}
    </View>
  </GlassCard>
) : null}

      <View style={{ marginTop: 14 }}>
        <Button title="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
